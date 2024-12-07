import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { PAIR_ABI, ROUTER_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

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
  fees: {
    lp: bigint;
    creator?: bigint;
    recipient?: Address;
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

type SwapEvent = {
  eventName: 'Swap';
  args: {
    sender: Address;
    amount0In: bigint;
    amount1In: bigint;
    amount0Out: bigint;
    amount1Out: bigint;
    to: Address;
  };
};

type TransferEvent = {
  eventName: 'Transfer';
  args: {
    from: Address;
    to: Address;
    value: bigint;
  };
};

export function useSwap(): UseMutationResult<
    SwapResult,
    Error,
    SwapExactTokensForTokensParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: SwapExactTokensForTokensParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      if (params.path.length < 2) {
        throw new Error("Invalid swap path");
      }

      // Get first hop pair for direct swaps
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

      // Check if input token is a launch token
      let isLaunchToken = false;
      let creator: Address | undefined;
      try {
        const launchLauncher = await sdk.getLaunchToken(params.path[0]).launcher();
        if (launchLauncher === sdk.launcher.address) {
          isLaunchToken = true;
          creator = await sdk.getLaunchToken(params.path[0]).creator();
        }
      } catch {
        // Not a launch token
      }

      // Simulate the swap transaction
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.router.address,
        abi: ROUTER_ABI,
        functionName: "swapExactTokensForTokens",
        args: [
          params.amountIn,
          params.amountOutMin,
          params.path,
          params.to,
          params.deadline,
        ],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      // Execute the swap
      const hash = await sdk.walletClient.writeContract(
          request as WriteContractParameters
      );

      // Wait for transaction receipt
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Track transfers and swaps across all pairs in path
      const transfers: Array<{ from: Address; to: Address; value: bigint }> = [];
      let finalSwapEvent;
      let creatorFeeTransfer;

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
            }) as TransferEvent;

            // Track creator fee transfer if applicable
            if (creator && decoded.args.to === creator) {
              creatorFeeTransfer = {
                from: decoded.args.from,
                to: decoded.args.to,
                value: decoded.args.value,
              };
            }

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
            }) as SwapEvent;

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
        }
      }

      // Get actual amounts from the first and last transfers
      const firstTransfer = transfers.find(
          (t) => t.from.toLowerCase() === params.path[0].toLowerCase()
      );
      const lastTransfer = transfers.find(
          (t) => t.to.toLowerCase() === params.to.toLowerCase()
      );

      const amountIn = firstTransfer?.value || params.amountIn;
      const amountOut = lastTransfer?.value || 0n;

      // Calculate fees based on actual transfers
      const lpFee = (amountIn * (isLaunchToken ? 20n : 30n)) / 10000n; // 0.2% or 0.3%
      const creatorFee = creatorFeeTransfer?.value;

      return {
        hash,
        amounts: {
          amountIn,
          amountOut,
        },
        fees: {
          lp: lpFee,
          creator: creatorFee,
          recipient: creator,
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
