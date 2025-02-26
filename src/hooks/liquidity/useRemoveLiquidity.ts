import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { bitkubTestnetChain } from "@/constants/chains";
import { ROUTER_ABI, PAIR_ABI } from "@/abis";

// Interface for standard token-token pair removal
interface RemoveLiquidityParams {
  pairAddress: Address;
  liquidity: bigint;
  token0Min: bigint;
  token1Min: bigint;
  deadline?: bigint; // Optional deadline, defaults to 20 minutes
  toAddress?: Address; // Optional recipient, defaults to connected wallet
  // For ETH pairs
  isETHPair?: boolean;
  tokenAddress?: Address; // The non-ETH token in an ETH pair
  amountTokenMin?: bigint; // For ETH pairs: minimum token amount
  amountETHMin?: bigint; // For ETH pairs: minimum ETH amount
}

interface RemoveLiquidityResult {
  hash: Hash;
  amounts: {
    token0: bigint;
    token1: bigint;
  };
}

// Define event types
type BurnEvent = {
  eventName: "Burn";
  args: {
    sender: Address;
    amount0: bigint;
    amount1: bigint;
    to: Address;
  };
};

export function useRemoveLiquidity(): UseMutationResult<
    RemoveLiquidityResult,
    Error,
    RemoveLiquidityParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({
                         pairAddress,
                         liquidity,
                         token0Min,
                         token1Min,
                         deadline = BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes from now
                         toAddress,
                         // ETH pair specific parameters
                         isETHPair = false,
                         tokenAddress,
                         amountTokenMin,
                         amountETHMin,
                       }: RemoveLiquidityParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Get the tokens for this pair
      const pair = sdk.getPair(pairAddress);
      const [token0, token1] = await Promise.all([
        pair.token0(),
        pair.token1(),
      ]);

      // Determine if it's a WETH pair if not explicitly specified
      const wethAddress = await sdk.router.WETH();
      const isWETHPairDetected =
          token0.toLowerCase() === wethAddress.toLowerCase() ||
          token1.toLowerCase() === wethAddress.toLowerCase();

      // Use the explicit flag if provided, otherwise use the detected value
      const isWETHPairFinal = isETHPair !== undefined ? isETHPair : isWETHPairDetected;

      // Log for debugging
      console.log("Removing liquidity with params:", {
        pairAddress,
        token0,
        token1,
        wethAddress,
        isWETHPairDetected,
        isWETHPairFinal,
        liquidity: liquidity.toString(),
        token0Min: token0Min.toString(),
        token1Min: token1Min.toString(),
      });

      let hash: Hash;
      const recipient = toAddress || sdk.walletClient.account.address;

      if (isWETHPairFinal) {
        // Handle ETH/WETH pair
        let nonWethToken: Address;
        let tokenMin: bigint;
        let ethMin: bigint;

        if (tokenAddress) {
          // If tokenAddress is explicitly provided, use it
          nonWethToken = tokenAddress;
          tokenMin = amountTokenMin || BigInt(1);
          ethMin = amountETHMin || BigInt(1);
        } else {
          // Otherwise, derive it from the pair
          nonWethToken = token0.toLowerCase() === wethAddress.toLowerCase() ? token1 : token0;
          tokenMin = token0.toLowerCase() === wethAddress.toLowerCase() ? token1Min : token0Min;
          ethMin = token0.toLowerCase() === wethAddress.toLowerCase() ? token0Min : token1Min;
        }

        console.log("ETH pair removal params:", {
          nonWethToken,
          tokenMin: tokenMin.toString(),
          ethMin: ethMin.toString(),
          recipient,
          deadline: deadline.toString(),
        });

        // Simulate removeLiquidityETH - this matches the router contract's function signature
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "removeLiquidityETH",
          args: [
            nonWethToken,  // Only pass the non-ETH token address
            liquidity,     // Amount of LP tokens to burn
            tokenMin,      // Minimum token amount
            ethMin,        // Minimum ETH amount
            recipient,     // Recipient address
            deadline,      // Transaction deadline
          ],
          account: sdk.walletClient.account.address,
          chain: bitkubTestnetChain,
        });

        hash = await sdk.walletClient.writeContract(
            request as WriteContractParameters
        );
      } else {
        // Handle regular token pair
        console.log("Regular pair removal params:", {
          token0,
          token1,
          token0Min: token0Min.toString(),
          token1Min: token1Min.toString(),
          recipient,
          deadline: deadline.toString(),
        });

        // Simulate removeLiquidity - this matches the router contract's function signature
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "removeLiquidity",
          args: [
            token0,      // First token address
            token1,      // Second token address
            liquidity,   // Amount of LP tokens to burn
            token0Min,   // Minimum amount of first token
            token1Min,   // Minimum amount of second token
            recipient,   // Recipient address
            deadline,    // Transaction deadline
          ],
          account: sdk.walletClient.account.address,
          chain: bitkubTestnetChain,
        });

        hash = await sdk.walletClient.writeContract(
            request as WriteContractParameters
        );
      }

      // Wait for transaction and get removed amounts
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Find Burn event from the pair contract
      const burnLog = receipt.logs.find(
          (log) =>
              log.address.toLowerCase() === pairAddress.toLowerCase() &&
              log.topics[0] ===
              "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"
      );

      let token0Amount = 0n;
      let token1Amount = 0n;

      if (burnLog) {
        try {
          const decoded = decodeEventLog({
            abi: PAIR_ABI,
            data: burnLog.data,
            topics: burnLog.topics,
            eventName: "Burn",
          }) as BurnEvent;

          token0Amount = decoded.args.amount0;
          token1Amount = decoded.args.amount1;
        } catch (error) {
          console.error("Failed to decode Burn event:", error);
        }
      }

      return {
        hash,
        amounts: {
          token0: token0Amount,
          token1: token1Amount,
        },
      };
    },
    onError: (error) => {
      console.error("Remove liquidity error:", error);
      throw error;
    },
  });
}
