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
  // For fee-on-transfer tokens
  supportsFeeOnTransfer?: boolean; // Flag to use fee-on-transfer function
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
    unknown,
    RemoveLiquidityParams,
    unknown
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
                         // Fee-on-transfer support
                         supportsFeeOnTransfer = false,
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

      // Determine if it's a KKUB pair if not explicitly specified
      // Changed from WETH to KKUB to match contract naming
      const kkubAddress = await sdk.router.KKUB();
      const isKKUBPairDetected =
          token0.toLowerCase() === kkubAddress.toLowerCase() ||
          token1.toLowerCase() === kkubAddress.toLowerCase();

      // Use the explicit flag if provided, otherwise use the detected value
      const isKKUBPairFinal = isETHPair !== undefined ? isETHPair : isKKUBPairDetected;

      // Get recipient address (default to connected wallet)
      const recipient = toAddress || sdk.walletClient.account.address;

      // Log for debugging
      console.log("Removing liquidity with params:", {
        pairAddress,
        token0,
        token1,
        kkubAddress,
        isKKUBPairDetected,
        isKKUBPairFinal,
        liquidity: liquidity.toString(),
        token0Min: token0Min.toString(),
        token1Min: token1Min.toString(),
        supportsFeeOnTransfer,
      });

      let hash: Hash;

      if (isKKUBPairFinal) {
        // Handle ETH/KKUB pair
        let nonKKUBToken: Address;
        let tokenMin: bigint;
        let ethMin: bigint;

        // Determine non-KKUB token and min amounts
        if (tokenAddress) {
          // If tokenAddress is explicitly provided, use it
          nonKKUBToken = tokenAddress;
          tokenMin = amountTokenMin || token0Min || token1Min || BigInt(1);
          ethMin = amountETHMin || token0Min || token1Min || BigInt(1);
        } else {
          // Otherwise, derive it from the pair
          if (token0.toLowerCase() === kkubAddress.toLowerCase()) {
            nonKKUBToken = token1;
            tokenMin = token1Min;
            ethMin = token0Min;
          } else {
            nonKKUBToken = token0;
            tokenMin = token0Min;
            ethMin = token1Min;
          }
        }

        console.log("ETH pair removal params:", {
          nonKKUBToken,
          tokenMin: tokenMin.toString(),
          ethMin: ethMin.toString(),
          recipient,
          deadline: deadline.toString(),
          supportsFeeOnTransfer,
        });

        // Choose the appropriate function based on fee-on-transfer support
        const functionName = supportsFeeOnTransfer
            ? "removeLiquidityETHSupportingFeeOnTransferTokens"
            : "removeLiquidityETH";

        // Simulate removeLiquidity for ETH pairs
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: functionName,
          args: [
            nonKKUBToken, // Only pass the non-ETH token address
            liquidity, // Amount of LP tokens to burn
            tokenMin, // Minimum token amount
            ethMin, // Minimum ETH amount
            recipient, // Recipient address
            deadline, // Transaction deadline
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

        // Use tokens in exact order expected by router (no sorting needed, contract handles it)
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "removeLiquidity",
          args: [
            token0, // First token as returned by pair.token0()
            token1, // Second token as returned by pair.token1()
            liquidity, // Amount of LP tokens to burn
            token0Min, // Minimum amount of first token
            token1Min, // Minimum amount of second token
            recipient, // Recipient address
            deadline, // Transaction deadline
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
              "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496" // Burn event signature
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
      } else {
        console.warn("Burn event not found in transaction logs");
      }

      return {
        hash,
        amounts: {
          token0: token0Amount,
          token1: token1Amount,
        },
      };
    },
    onError: (error: unknown) => {
      // Attempt to match contract-specific errors
      const errorMsg = error instanceof Error ? error.message : String(error);

      // Map error messages to more user-friendly versions based on contract errors
      if (errorMsg.includes("ExpiredDeadline")) {
        throw new Error("Transaction deadline has expired");
      } else if (
          errorMsg.includes("InsufficientAAmount") ||
          errorMsg.includes("InsufficientBAmount")
      ) {
        throw new Error(
            "Slippage too high - try increasing your slippage tolerance"
        );
      } else if (errorMsg.includes("TransferFailed")) {
        throw new Error("Token transfer failed - check your token approvals");
      } else if (errorMsg.includes("ApprovalFailed")) {
        throw new Error("KKUB approval failed");
      } else if (errorMsg.includes("UnwrapFailed")) {
        throw new Error("Failed to unwrap KKUB to native ETH");
      } else {
        console.error("Remove liquidity error:", error);
        throw error;
      }
    },
  });
}
