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
  slippageBps: number; // e.g., 50 = 0.5%
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

      const {
        exactIn = true,
        tokenIn,
        tokenOut,
        amount,
        slippageBps,
        recipient = sdk.walletClient.account.address,
        deadline = BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes
      } = params;

      // Get optimal path
      const path = [tokenIn, tokenOut];

      // Check if this involves ETH/KKUB
      const weth = await sdk.router.WETH();
      const isEthIn = tokenIn.toLowerCase() === weth.toLowerCase();
      const isEthOut = tokenOut.toLowerCase() === weth.toLowerCase();

      // Calculate minimum output or maximum input based on slippage
      let amountMin: bigint | undefined;
      let amountMax: bigint | undefined;

      if (exactIn) {
        const [, amountOut] = await sdk.router.getAmountsOut(amount, path);
        amountMin = (amountOut * BigInt(10000 - slippageBps)) / 10000n;
      } else {
        const [amountIn] = await sdk.router.getAmountsIn(amount, path);
        amountMax = (amountIn * BigInt(10000 + slippageBps)) / 10000n;
      }

      let functionName: string;
      let args: any[];
      let value = 0n;

      if (isEthIn) {
        functionName = "swapExactETHForTokens";
        args = [amountMin!, path, recipient, deadline];
        value = amount;
      } else if (isEthOut) {
        if (exactIn) {
          functionName = "swapExactTokensForETH";
          args = [amount, amountMin!, path, recipient, deadline];
        } else {
          functionName = "swapTokensForExactETH";
          args = [amount, amountMax!, path, recipient, deadline];
        }
      } else {
        if (exactIn) {
          functionName = "swapExactTokensForTokens";
          args = [amount, amountMin!, path, recipient, deadline];
        } else {
          functionName = "swapTokensForExactTokens";
          args = [amount, amountMax!, path, recipient, deadline];
        }
      }

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
    },
    enabled: enabled && !!params && !!sdk.walletClient?.account,
    staleTime: 10_000, // 10 seconds
  });
}
