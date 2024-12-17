import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import {
  type Address,
  encodeFunctionData,
  type EncodeFunctionDataParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { ROUTER_ABI } from "@/abis";

interface SwapCalldata {
  to: Address;
  data: `0x${string}`;
  value: bigint;
}

interface SwapCalldataParams {
  exactIn?: boolean;
  tokenIn: Address;
  tokenOut: Address;
  amount: bigint;
  slippageBps: number;
  recipient?: Address;
  deadline?: bigint;
}

export function useSwapCalldata(
    params: SwapCalldataParams | undefined,
    enabled = true
): UseQueryResult<SwapCalldata> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "swap", "calldata", params],
    queryFn: async () => {
      if (!params || !sdk.walletClient?.account) {
        throw new Error("Params and connected wallet required");
      }

      // Validate addresses
      if (!params.tokenIn || !params.tokenOut) {
        throw new Error("Invalid token addresses");
      }

      const {
        exactIn = true,
        tokenIn,
        tokenOut,
        amount,
        slippageBps,
        recipient = sdk.walletClient.account.address,
        deadline = BigInt(Math.floor(Date.now() / 1000) + 1200),
      } = params;

      // Validate path exists
      const pair = await sdk.factory.getPair(tokenIn, tokenOut);
      if (pair === "0x0000000000000000000000000000000000000000") {
        throw new Error("No liquidity pair exists");
      }

      // Get WETH address
      const weth = await sdk.router.WETH();
      const isEthIn = tokenIn.toLowerCase() === weth.toLowerCase();
      const isEthOut = tokenOut.toLowerCase() === weth.toLowerCase();

      try {
        // Calculate amounts for exact input or output
        let amountIn: bigint;
        let amountOut: bigint;
        let amountMin: bigint | undefined;
        let amountMax: bigint | undefined;

        const path = [tokenIn, tokenOut];

        if (exactIn) {
          [amountIn, amountOut] = await sdk.router.getAmountsOut(amount, path);
          amountMin = (amountOut * BigInt(10000 - slippageBps)) / 10000n;
        } else {
          [amountIn, amountOut] = await sdk.router.getAmountsIn(amount, path);
          amountMax = (amountIn * BigInt(10000 + slippageBps)) / 10000n;
        }

        // Determine function name and arguments based on swap type
        let functionName: string;
        let args: readonly unknown[];
        let value = 0n;

        if (isEthIn) {
          if (exactIn) {
            functionName = "swapExactETHForTokens";
            args = [amountMin!, path, recipient, deadline];
            value = amountIn;
          } else {
            functionName = "swapETHForExactTokens";
            args = [amountOut, path, recipient, deadline];
            value = amountMax!;
          }
        } else if (isEthOut) {
          if (exactIn) {
            functionName = "swapExactTokensForETH";
            args = [amountIn, amountMin!, path, recipient, deadline];
          } else {
            functionName = "swapTokensForExactETH";
            args = [amountOut, amountMax!, path, recipient, deadline];
          }
        } else {
          if (exactIn) {
            functionName = "swapExactTokensForTokens";
            args = [amountIn, amountMin!, path, recipient, deadline];
          } else {
            functionName = "swapTokensForExactTokens";
            args = [amountOut, amountMax!, path, recipient, deadline];
          }
        }

        // Encode function call
        const data = encodeFunctionData({
          abi: ROUTER_ABI,
          functionName,
          args,
        } as EncodeFunctionDataParameters);

        return {
          to: sdk.router.address,
          data,
          value,
        };
      } catch (error) {
        if (error instanceof Error) {
          throw new Error(`Swap calculation failed: ${error.message}`);
        }
        throw new Error("Failed to calculate swap");
      }
    },
    enabled: enabled && !!params && !!sdk.walletClient?.account,
    staleTime: 10_000,
    retry: false,
  });
}
