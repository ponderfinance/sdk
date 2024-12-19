import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { type Address, encodeFunctionData } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type SwapRoute } from "@/hooks";
import { ROUTER_ABI } from "@/abis";

// Constants for calculations
const BASIS_POINTS = 10000n;

interface SwapCallbackParams {
  route?: SwapRoute;
  recipient?: Address;
  slippageBps?: number; // e.g., 50 = 0.5%
  deadline?: bigint;
  exactIn?: boolean;
}

interface SwapCalldata {
  to: Address;
  data: `0x${string}`;
  value: bigint;
  gasLimit: bigint;
}

type RouterFunction =
  | "swapExactETHForTokens"
  | "swapETHForExactTokens"
  | "swapExactTokensForETH"
  | "swapTokensForExactETH"
  | "swapExactTokensForTokens"
  | "swapTokensForExactTokens";

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
        slippageBps = 50,
        deadline = BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes
        exactIn = true,
      } = params;

      // Determine token paths and check ETH involvement
      const isETHIn = route.path[0].toLowerCase() === wethAddress.toLowerCase();
      const isETHOut =
        route.path[route.path.length - 1].toLowerCase() ===
        wethAddress.toLowerCase();

      // Calculate amounts with slippage
      const amountOutMin = exactIn
        ? (route.amountOut * BigInt(10000 - slippageBps)) / BigInt(10000)
        : route.amountOut;
      const amountInMax = !exactIn
        ? (route.amountIn * BigInt(10000 + slippageBps)) / BigInt(10000)
        : route.amountIn;

      let functionName: RouterFunction;
      let args: unknown[];
      let value = 0n;

      // Determine function and arguments based on swap type
      if (isETHIn) {
        if (exactIn) {
          functionName = "swapExactETHForTokens";
          args = [amountOutMin, route.path, recipient, deadline];
          value = route.amountIn; // Full ETH amount - fees taken in contract
        } else {
          functionName = "swapETHForExactTokens";
          args = [route.amountOut, route.path, recipient, deadline];
          value = amountInMax;
        }
      } else if (isETHOut) {
        if (exactIn) {
          functionName = "swapExactTokensForETH";
          args = [
            route.amountIn, // Full token amount - fees taken in contract
            amountOutMin,
            route.path,
            recipient,
            deadline,
          ];
        } else {
          functionName = "swapTokensForExactETH";
          args = [
            route.amountOut,
            amountInMax,
            route.path,
            recipient,
            deadline,
          ];
        }
      } else {
        if (exactIn) {
          functionName = "swapExactTokensForTokens";
          args = [
            route.amountIn, // Full token amount - fees taken in contract
            amountOutMin,
            route.path,
            recipient,
            deadline,
          ];
        } else {
          functionName = "swapTokensForExactTokens";
          args = [
            route.amountOut,
            amountInMax,
            route.path,
            recipient,
            deadline,
          ];
        }
      }

      // Encode function call
      const data = encodeFunctionData({
        abi: ROUTER_ABI,
        functionName,
        args: args as any, // Type assertion needed due to complex ABI types
      });

      // Calculate gas limit based on path length and swap type
      const baseGas = 150000n;
      const hopGas = 100000n;
      const gasLimit = baseGas + BigInt(route.hops.length) * hopGas;

      // Return formatted calldata
      return {
        calldata: {
          to: sdk.router.address,
          data,
          value,
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
