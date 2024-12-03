import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { type PonderPair } from "@/contracts/pair";
import { usePairFees } from "./usePairFees";

interface TradeInfo {
  priceImpact: number; // In percentage (e.g., 0.5 = 0.5%)
  minimumReceived: bigint; // Accounting for slippage
  fee: {
    lp: bigint; // LP fee amount
    creator: bigint; // Creator fee amount if applicable
    total: bigint; // Total fee
  };
}

export function useTradeInfo(
  pair: PonderPair,
  tokenIn: Address,
  amountIn: bigint,
  slippageTolerance = 0.5, // Default 0.5%
  enabled = true
): UseQueryResult<TradeInfo> {
  const { data: feeInfo, isLoading: isLoadingFees } = usePairFees(
    pair,
    tokenIn
  );

  return useQuery({
    queryKey: [
      "ponder",
      "tradeInfo",
      pair.address,
      tokenIn,
      amountIn.toString(),
      slippageTolerance,
    ],
    queryFn: async () => {
      if (!feeInfo) throw new Error("Fee info not loaded");

      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const [reserveIn, reserveOut] =
        tokenIn === token0
          ? [reserves.reserve0, reserves.reserve1]
          : [reserves.reserve1, reserves.reserve0];

      // Calculate fees
      const totalFee = feeInfo.lpFee + feeInfo.creatorFee;
      const feeAmount = (amountIn * totalFee) / 1000n;
      const lpFee = (amountIn * feeInfo.lpFee) / 1000n;
      const creatorFee = (amountIn * feeInfo.creatorFee) / 1000n;

      // Calculate price impact
      const amountInAfterFee = amountIn - feeAmount;
      const newReserveIn = reserveIn + amountInAfterFee;
      const newReserveOut = (reserveIn * reserveOut) / newReserveIn;
      const amountOut = reserveOut - newReserveOut;

      const priceImpact =
        Number((amountOut * 10000n) / reserveOut - 10000n) / 100;

      // Calculate minimum received with slippage
      const minimumReceived =
        amountOut -
        (amountOut * BigInt(Math.floor(slippageTolerance * 10))) / 1000n;

      return {
        priceImpact,
        minimumReceived,
        fee: {
          lp: lpFee,
          creator: creatorFee,
          total: feeAmount,
        },
      };
    },
    enabled: enabled && !isLoadingFees && !!feeInfo && amountIn > 0n,
    staleTime: 5_000,
  });
}
