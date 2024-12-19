import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
  type SimulateContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { PAIR_ABI, ROUTER_ABI } from "@/abis";

type RouterFunctionName =
  | "swapExactTokensForTokens"
  | "swapTokensForExactTokens"
  | "swapExactETHForTokens"
  | "swapETHForExactTokens"
  | "swapExactTokensForETH"
  | "swapTokensForExactETH";

type SwapFunctionArgs = {
  swapExactTokensForTokens: readonly [
    bigint,
    bigint,
    readonly `0x${string}`[],
    `0x${string}`,
    bigint
  ];
  swapTokensForExactTokens: readonly [
    bigint,
    bigint,
    readonly `0x${string}`[],
    `0x${string}`,
    bigint
  ];
  swapExactETHForTokens: readonly [
    bigint,
    readonly `0x${string}`[],
    `0x${string}`,
    bigint
  ];
  swapETHForExactTokens: readonly [
    bigint,
    readonly `0x${string}`[],
    `0x${string}`,
    bigint
  ];
  swapExactTokensForETH: readonly [
    bigint,
    bigint,
    readonly `0x${string}`[],
    `0x${string}`,
    bigint
  ];
  swapTokensForExactETH: readonly [
    bigint,
    bigint,
    readonly `0x${string}`[],
    `0x${string}`,
    bigint
  ];
};

interface BaseSwapParams {
  path: Address[];
  to: Address;
  deadline: bigint;
}

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

type SwapParams =
  | { type: "exactTokensForTokens"; params: SwapExactTokensForTokensParams }
  | { type: "tokensForExactTokens"; params: SwapTokensForExactTokensParams }
  | {
      type: "exactETHForTokens";
      params: SwapExactETHForTokensParams;
      value: bigint;
    }
  | { type: "ETHForExactTokens"; params: SwapETHForExactTokensParams }
  | { type: "exactTokensForETH"; params: SwapExactTokensForETHParams }
  | { type: "tokensForExactETH"; params: SwapTokensForExactETHParams };

// Response types
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

function getFunctionName(type: SwapParams["type"]): RouterFunctionName {
  switch (type) {
    case "exactTokensForTokens":
      return "swapExactTokensForTokens";
    case "tokensForExactTokens":
      return "swapTokensForExactTokens";
    case "exactETHForTokens":
      return "swapExactETHForTokens";
    case "ETHForExactTokens":
      return "swapETHForExactTokens";
    case "exactTokensForETH":
      return "swapExactTokensForETH";
    case "tokensForExactETH":
      return "swapTokensForExactETH";
  }
}

function getSwapArgs(
  swapData: SwapParams
): SwapFunctionArgs[RouterFunctionName] {
  const path = swapData.params.path as readonly `0x${string}`[];
  const to = swapData.params.to as `0x${string}`;
  const deadline = swapData.params.deadline;

  switch (swapData.type) {
    case "exactTokensForTokens":
    case "exactTokensForETH":
      return [
        swapData.params.amountIn,
        swapData.params.amountOutMin,
        path,
        to,
        deadline,
      ] as const;

    case "tokensForExactTokens":
    case "tokensForExactETH":
      return [
        swapData.params.amountOut,
        swapData.params.amountInMax,
        path,
        to,
        deadline,
      ] as const;

    case "exactETHForTokens":
      return [swapData.params.amountOutMin, path, to, deadline] as const;

    case "ETHForExactTokens":
      return [swapData.params.amountOut, path, to, deadline] as const;
  }
}

function getSimulateParams(
  sdk: any,
  swapData: SwapParams,
  functionName: RouterFunctionName,
  args: SwapFunctionArgs[RouterFunctionName]
): SimulateContractParameters {
  const baseParams = {
    address: sdk.router.address as `0x${string}`,
    abi: ROUTER_ABI,
    account: sdk.walletClient.account.address,
  };

  if (
    functionName === "swapExactETHForTokens" ||
    functionName === "swapETHForExactTokens"
  ) {
    return {
      ...baseParams,
      functionName,
      args: args as readonly [
        bigint,
        readonly `0x${string}`[],
        `0x${string}`,
        bigint
      ],
      value: "value" in swapData ? swapData.value : 0n,
    };
  }

  return {
    ...baseParams,
    functionName,
    args: args as readonly [
      bigint,
      bigint,
      readonly `0x${string}`[],
      `0x${string}`,
      bigint
    ],
  };
}

function calculateAmounts(
  swapData: SwapParams,
  transfers: Array<{ from: Address; to: Address; value: bigint }>
) {
  const isETHIn =
    swapData.type === "exactETHForTokens" ||
    swapData.type === "ETHForExactTokens";
  const isETHOut =
    swapData.type === "exactTokensForETH" ||
    swapData.type === "tokensForExactETH";

  let amountIn: bigint;
  let amountOut: bigint;

  if (isETHIn) {
    amountIn = "value" in swapData ? swapData.value : 0n;
    amountOut = transfers[transfers.length - 1]?.value || 0n;
  } else if (isETHOut) {
    const firstTransfer = transfers.find(
      (t) => t.from.toLowerCase() === swapData.params.path[0].toLowerCase()
    );
    amountIn = firstTransfer?.value || 0n;
    amountOut = transfers[transfers.length - 2]?.value || 0n;
  } else {
    const firstTransfer = transfers.find(
      (t) => t.from.toLowerCase() === swapData.params.path[0].toLowerCase()
    );
    const lastTransfer = transfers.find(
      (t) => t.to.toLowerCase() === swapData.params.to.toLowerCase()
    );
    amountIn = firstTransfer?.value || 0n;
    amountOut = lastTransfer?.value || 0n;
  }

  return { amountIn, amountOut };
}

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

      // Validate first pair exists
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

      // Check for launch token fees if applicable
      let isLaunchToken = false;
      let creator: Address | undefined;

      const isETHInput =
        swapData.type === "exactETHForTokens" ||
        swapData.type === "ETHForExactTokens";

      if (!isETHInput) {
        try {
          const launchLauncher = await sdk
            .getLaunchToken(swapData.params.path[0])
            .launcher();
          if (launchLauncher === sdk.launcher.address) {
            isLaunchToken = true;
            creator = await sdk
              .getLaunchToken(swapData.params.path[0])
              .creator();
          }
        } catch {
          // Not a launch token
        }
      }

      // Prepare and simulate transaction
      const functionName = getFunctionName(swapData.type);
      const args = getSwapArgs(swapData);
      const simulationParams = getSimulateParams(
        sdk,
        swapData,
        functionName,
        args
      );

      const { request } = await sdk.publicClient.simulateContract(
        simulationParams
      );

      // Execute swap
      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      // Wait for confirmation and decode events
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      const transfers: Array<{ from: Address; to: Address; value: bigint }> =
        [];
      let finalSwapEvent;
      let creatorFeeTransfer;

      // Process transaction events
      for (const log of receipt.logs) {
        try {
          if (
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
          ) {
            // Transfer event
            const decoded = decodeEventLog({
              abi: PAIR_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "Transfer",
            });

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
          } else if (
            log.topics[0] ===
            "0xd78ad95fa46c994b6551d0da85fc275fe613ce37657fb8d5e3d130840159d822"
          ) {
            // Swap event
            const decoded = decodeEventLog({
              abi: PAIR_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "Swap",
            });

            finalSwapEvent = decoded.args;
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
        }
      }

      // Calculate final amounts and fees
      const { amountIn, amountOut } = calculateAmounts(swapData, transfers);
      const lpFee = (amountIn * (isLaunchToken ? 20n : 30n)) / 10000n;

      return {
        hash,
        amounts: {
          amountIn,
          amountOut,
        },
        fees: {
          lp: lpFee,
          creator: creatorFeeTransfer?.value,
          recipient: creator,
        },
        events: {
          swap: finalSwapEvent,
          transfers,
        },
      };
    },
  });
}
