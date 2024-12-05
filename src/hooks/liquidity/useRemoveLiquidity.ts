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

interface RemoveLiquidityParams {
  pairAddress: Address;
  liquidity: bigint;
  token0Min: bigint;
  token1Min: bigint;
  deadline?: bigint; // Optional deadline, defaults to 20 minutes
  toAddress?: Address; // Optional recipient, defaults to connected wallet
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

      // Check if we're removing liquidity from a WETH pair
      const isWETHPair =
        token0 === (await sdk.router.WETH()) ||
        token1 === (await sdk.router.WETH());

      let hash: Hash;
      const recipient = toAddress || sdk.walletClient.account.address;

      if (isWETHPair) {
        // Handle ETH/WETH pair
        const token = token0 === (await sdk.router.WETH()) ? token1 : token0;
        const amountTokenMin =
          token0 === (await sdk.router.WETH()) ? token1Min : token0Min;
        const amountETHMin =
          token0 === (await sdk.router.WETH()) ? token0Min : token1Min;

        // Simulate removeLiquidityETH
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "removeLiquidityETH",
          args: [
            token,
            liquidity,
            amountTokenMin,
            amountETHMin,
            recipient,
            deadline,
          ],
          account: sdk.walletClient.account.address,
          chain: bitkubTestnetChain,
        });

        hash = await sdk.walletClient.writeContract(
          request as WriteContractParameters
        );
      } else {
        // Handle regular token pair
        // Simulate removeLiquidity
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "removeLiquidity",
          args: [
            token0,
            token1,
            liquidity,
            token0Min,
            token1Min,
            recipient,
            deadline,
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
