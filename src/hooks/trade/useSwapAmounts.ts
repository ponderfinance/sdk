import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { type PonderPair } from "@/contracts/pair";
import { FeeCalculator } from "@/utils/fees";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairFees } from "./usePairFees";

export function useAmountOut(
  pair: PonderPair,
  tokenIn: Address,
  amountIn: bigint,
  enabled = true
): UseQueryResult<bigint> {
  const sdk = usePonderSDK();
  const { data: feeInfo, isLoading: isLoadingFees } = usePairFees(
    pair,
    tokenIn
  );

  return useQuery({
    queryKey: [
      "ponder",
      "amountOut",
      pair.address,
      tokenIn,
      amountIn.toString(),
    ],
    queryFn: async () => {
      if (!feeInfo) throw new Error("Fee info not loaded");

      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const [reserveIn, reserveOut] =
        tokenIn === token0
          ? [reserves.reserve0, reserves.reserve1]
          : [reserves.reserve1, reserves.reserve0];

      return FeeCalculator.getAmountOut(
        amountIn,
        reserveIn,
        reserveOut,
        feeInfo
      );
    },
    enabled: enabled && !isLoadingFees && !!feeInfo && amountIn > 0n,
    staleTime: 5_000, // 5s
  });
}

export function useAmountIn(
  pair: PonderPair,
  tokenOut: Address,
  amountOut: bigint,
  enabled = true
): UseQueryResult<bigint> {
  const sdk = usePonderSDK();
  const { data: feeInfo, isLoading: isLoadingFees } = usePairFees(
    pair,
    tokenOut
  );

  return useQuery({
    queryKey: [
      "ponder",
      "amountIn",
      pair.address,
      tokenOut,
      amountOut.toString(),
    ],
    queryFn: async () => {
      if (!feeInfo) throw new Error("Fee info not loaded");

      const reserves = await pair.getReserves();
      const token0 = await pair.token0();
      const [reserveOut, reserveIn] =
        tokenOut === token0
          ? [reserves.reserve0, reserves.reserve1]
          : [reserves.reserve1, reserves.reserve0];

      return FeeCalculator.getAmountIn(
        amountOut,
        reserveIn,
        reserveOut,
        feeInfo
      );
    },
    enabled: enabled && !isLoadingFees && !!feeInfo && amountOut > 0n,
    staleTime: 5_000,
  });
}
