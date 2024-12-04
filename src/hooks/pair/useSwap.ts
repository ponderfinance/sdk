import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type Address, type Hash, decodeEventLog } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { PAIR_ABI, ROUTER_ABI } from "@/abis";

interface SwapExactTokensForTokensParams {
  amountIn: bigint;
  amountOutMin: bigint;
  path: Address[];
  to: Address;
  deadline: bigint;
}

export interface SwapResult {
  hash: Hash;
  amounts: {
    amountIn: bigint;
    amountOut: bigint;
  };
  events: {
    swap?: {
      sender: Address;
      amount0In: bigint;
      amount1In: bigint;
      amount0Out: bigint;
      amount1Out: bigint;
      to: Address;
    };
    transfers: Array<{
      from: Address;
      to: Address;
      value: bigint;
    }>;
  };
}

export function useSwap(): UseMutationResult<
  SwapResult,
  Error,
  SwapExactTokensForTokensParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: SwapExactTokensForTokensParams) => {
      if (params.path.length < 2) {
        throw new Error("Invalid swap path");
      }

      // Get pair for first hop (for direct swaps this is the only pair)
      const firstPairAddress = await sdk.factory.getPair(
        params.path[0],
        params.path[1]
      );
      if (
        !firstPairAddress ||
        firstPairAddress === "0x0000000000000000000000000000000000000000"
      ) {
        throw new Error("Pair does not exist");
      }

      // Execute swap
      const hash = await sdk.router.swapExactTokensForTokens({
        amountIn: params.amountIn,
        amountOutMin: params.amountOutMin,
        path: params.path,
        to: params.to,
        deadline: params.deadline,
      });

      // Wait for transaction receipt
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Track transfers and swaps across all pairs in path
      const transfers: Array<{ from: Address; to: Address; value: bigint }> =
        [];
      let finalSwapEvent;

      // Process all logs
      for (const log of receipt.logs) {
        try {
          // Check for Transfer events
          if (
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
          ) {
            const decoded = decodeEventLog({
              abi: PAIR_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "Transfer",
            });
            transfers.push({
              from: decoded.args.from,
              to: decoded.args.to,
              value: decoded.args.value,
            });
          }
          // Check for Swap events
          else if (
            log.topics[0] ===
            "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"
          ) {
            const decoded = decodeEventLog({
              abi: PAIR_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "Swap",
            });
            // For multi-hop swaps, we're most interested in the final swap event
            finalSwapEvent = {
              sender: decoded.args.sender,
              amount0In: decoded.args.amount0In,
              amount1In: decoded.args.amount1In,
              amount0Out: decoded.args.amount0Out,
              amount1Out: decoded.args.amount1Out,
              to: decoded.args.to,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
          continue;
        }
      }

      // Get actual amounts from the first and last transfers
      const firstTransfer = transfers.find(
        (t) => t.from.toLowerCase() === params.path[0].toLowerCase()
      );
      const lastTransfer = transfers.find(
        (t) => t.to.toLowerCase() === params.to.toLowerCase()
      );

      return {
        hash,
        amounts: {
          amountIn: firstTransfer?.value || params.amountIn,
          amountOut: lastTransfer?.value || 0n,
        },
        events: {
          swap: finalSwapEvent,
          transfers,
        },
      };
    },
    onError: (error) => {
      console.error("Swap error:", error);
      throw error;
    },
  });
}
