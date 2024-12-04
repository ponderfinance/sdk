import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Address, encodeFunctionData } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type SwapRoute } from "@/hooks";
import { ROUTER_ABI } from "@/abis";

interface SwapCallbackParams {
  route?: SwapRoute;
  recipient?: Address;
  slippageBps?: number; // e.g., 50 = 0.5%
  deadline?: bigint;
}

interface SwapCalldata {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  gasLimit: bigint;
}

export function useSwapCallback(params: SwapCallbackParams): {
  calldata: SwapCalldata | null;
  error?: string;
} {
  const sdk = usePonderSDK();

  // Fetch WETH address
  const { data: wethAddress } = useQuery({
    queryKey: ["ponder", "router", "weth"],
    queryFn: () => sdk.router.WETH(),
    enabled: !!params.route,
  });

  return useMemo(() => {
    if (!params.route || !sdk.walletClient?.account || !wethAddress) {
      return { calldata: null };
    }

    try {
      const {
        route,
        recipient = sdk.walletClient.account.address,
        slippageBps = 50, // 0.5% default slippage
        deadline = BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes
      } = params;

      // Calculate minimum output amount with slippage
      const amountOutMin =
        (route.amountOut * BigInt(10000 - slippageBps)) / BigInt(10000);

      // Check if it's an ETH trade by comparing first token with WETH
      const isETHIn = route.path[0].toLowerCase() === wethAddress.toLowerCase();

      const functionNameTyped = isETHIn
        ? "swapExactETHForTokens"
        : ("swapExactTokensForTokens" as const);

      const argsTyped = isETHIn
        ? ([amountOutMin, route.path, recipient, deadline] as const)
        : ([
            route.amountIn,
            amountOutMin,
            route.path,
            recipient,
            deadline,
          ] as const);

      // Encode the function call
      const data = encodeFunctionData({
        abi: ROUTER_ABI,
        functionName: functionNameTyped,
        args: argsTyped,
      });

      // Estimate gas limit with buffer
      const gasLimit =
        BigInt(route.hops.length) * BigInt(150000) + BigInt(50000);

      return {
        calldata: {
          to: sdk.router.address,
          data,
          value: isETHIn ? route.amountIn : BigInt(0),
          gasLimit,
        },
      };
    } catch (error) {
      return {
        calldata: null,
        error:
          error instanceof Error
            ? error.message
            : "Failed to generate swap calldata",
      };
    }
  }, [params, sdk.walletClient?.account, wethAddress, sdk.router.address]);
}
