import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type PonderPair } from "@/contracts/pair";

export interface TokenPrice {
  current: number;
  change24h: number;
  change7d: number;
  lastUpdate: number;
  baseAmount: bigint;
  quoteAmount: bigint;
}

export function usePriceInfo(
  pair: PonderPair,
  tokenIn: Address,
  enabled = true
): UseQueryResult<TokenPrice> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "price", pair.address, tokenIn],
    queryFn: async () => {
      // Get current TWAP price (30 min)
      const baseAmount = 10n ** 18n; // 1 token
      const amount30min = await sdk.oracle.consult(
        pair.address,
        tokenIn,
        baseAmount,
        1800 // 30 minutes
      );

      // Get 24h price for comparison
      const amount24h = await sdk.oracle.consult(
        pair.address,
        tokenIn,
        baseAmount,
        86400 // 24 hours
      );

      // Get 7d price for comparison
      const amount7d = await sdk.oracle.consult(
        pair.address,
        tokenIn,
        baseAmount,
        604800 // 7 days
      );

      // Calculate price changes
      const currentPrice = Number(amount30min) / Number(baseAmount);
      const price24h = Number(amount24h) / Number(baseAmount);
      const price7d = Number(amount7d) / Number(baseAmount);

      const change24h = ((currentPrice - price24h) / price24h) * 100;
      const change7d = ((currentPrice - price7d) / price7d) * 100;

      return {
        current: currentPrice,
        change24h,
        change7d,
        lastUpdate: Math.floor(Date.now() / 1000),
        baseAmount,
        quoteAmount: amount30min,
      };
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });
}
