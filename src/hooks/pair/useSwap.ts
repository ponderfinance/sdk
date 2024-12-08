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

// Base swap params shared across all swap types
interface BaseSwapParams {
  path: Address[];
  to: Address;
  deadline: bigint;
}

// Specific params for each swap type
interface SwapExactTokensForTokensParams extends BaseSwapParams {
  amountIn: bigint;
  amountOutMin: bigint;
}

interface SwapTokensForExactTokensParams extends BaseSwapParams {
  amountOut: bigint;
  amountInMax: bigint;
}

interface SwapExactETHForTokensParams extends BaseSwapParams {
  amountOutMin: bigint;
}

interface SwapTokensForExactETHParams extends BaseSwapParams {
  amountOut: bigint;
  amountInMax: bigint;
}

interface SwapExactTokensForETHParams extends BaseSwapParams {
  amountIn: bigint;
  amountOutMin: bigint;
}

interface SwapETHForExactTokensParams extends BaseSwapParams {
  amountOut: bigint;
  value: bigint;
}

// Union type for all possible swap params
type SwapParams = {
  type: 'exactTokensForTokens';
  params: SwapExactTokensForTokensParams;
} | {
  type: 'tokensForExactTokens';
  params: SwapTokensForExactTokensParams;
} | {
  type: 'exactETHForTokens';
  params: SwapExactETHForTokensParams;
  value: bigint;
} | {
  type: 'tokensForExactETH';
  params: SwapTokensForExactETHParams;
} | {
  type: 'exactTokensForETH';
  params: SwapExactTokensForETHParams;
} | {
  type: 'ETHForExactTokens';
  params: SwapETHForExactTokensParams;
};

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

export function useSwap(): UseMutationResult<SwapResult, Error, SwapParams> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (swapData: SwapParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      if (swapData.params.path.length < 2) {
        throw new Error("Invalid swap path");
      }

      // Get pair for the first hop
      const firstPairAddress = await sdk.factory.getPair(
          swapData.params.path[0],
          swapData.params.path[1]
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
      if (swapData.type !== 'exactETHForTokens' && swapData.type !== 'ETHForExactTokens') {
        try {
          const launchLauncher = await sdk.getLaunchToken(swapData.params.path[0]).launcher();
          if (launchLauncher === sdk.launcher.address) {
            isLaunchToken = true;
            creator = await sdk.getLaunchToken(swapData.params.path[0]).creator();
          }
        } catch {
          // Not a launch token
        }
      }

      // Prepare transaction based on swap type
      let request;
      switch (swapData.type) {
        case 'exactTokensForTokens':
          request = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "swapExactTokensForTokens",
            args: [
              swapData.params.amountIn,
              swapData.params.amountOutMin,
              swapData.params.path,
              swapData.params.to,
              swapData.params.deadline,
            ],
            account: sdk.walletClient.account.address,
            chain: bitkubTestnetChain,
          });
          break;

        case 'exactETHForTokens':
          request = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "swapExactETHForTokens",
            args: [
              swapData.params.amountOutMin,
              swapData.params.path,
              swapData.params.to,
              swapData.params.deadline,
            ],
            value: swapData.value,
            account: sdk.walletClient.account.address,
            chain: bitkubTestnetChain,
          });
          break;

        case 'tokensForExactTokens':
          request = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "swapTokensForExactTokens",
            args: [
              swapData.params.amountOut,
              swapData.params.amountInMax,
              swapData.params.path,
              swapData.params.to,
              swapData.params.deadline,
            ],
            account: sdk.walletClient.account.address,
            chain: bitkubTestnetChain,
          });
          break;

        case 'tokensForExactETH':
          request = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "swapTokensForExactETH",
            args: [
              swapData.params.amountOut,
              swapData.params.amountInMax,
              swapData.params.path,
              swapData.params.to,
              swapData.params.deadline,
            ],
            account: sdk.walletClient.account.address,
            chain: bitkubTestnetChain,
          });
          break;

        case 'exactTokensForETH':
          request = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "swapExactTokensForETH",
            args: [
              swapData.params.amountIn,
              swapData.params.amountOutMin,
              swapData.params.path,
              swapData.params.to,
              swapData.params.deadline,
            ],
            account: sdk.walletClient.account.address,
            chain: bitkubTestnetChain,
          });
          break;

        case 'ETHForExactTokens':
          request = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "swapETHForExactTokens",
            args: [
              swapData.params.amountOut,
              swapData.params.path,
              swapData.params.to,
              swapData.params.deadline,
            ],
            value: swapData.params.value,
            account: sdk.walletClient.account.address,
            chain: bitkubTestnetChain,
          });
          break;
      }

      // Execute the swap
      const hash = await sdk.walletClient.writeContract(
          request.request as WriteContractParameters
      );

      // Wait for transaction receipt
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Track transfers and swaps
      const transfers: Array<{ from: Address; to: Address; value: bigint }> = [];
      let finalSwapEvent;
      let creatorFeeTransfer;

      // Process logs
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

      // Calculate amounts based on swap type
      let amountIn: bigint;
      let amountOut: bigint;

      if (swapData.type === 'exactETHForTokens' || swapData.type === 'ETHForExactTokens') {
        amountIn = swapData.type === 'exactETHForTokens' ? swapData.value : swapData.params.value;
        amountOut = transfers[transfers.length - 1]?.value || 0n;
      } else {
        const firstTransfer = transfers.find(
            (t) => t.from.toLowerCase() === swapData.params.path[0].toLowerCase()
        );
        const lastTransfer = transfers.find(
            (t) => t.to.toLowerCase() === swapData.params.to.toLowerCase()
        );

        amountIn = firstTransfer?.value || ('amountIn' in swapData.params ? swapData.params.amountIn : 0n);
        amountOut = lastTransfer?.value || ('amountOut' in swapData.params ? swapData.params.amountOut : 0n);
      }

      // Calculate fees
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
