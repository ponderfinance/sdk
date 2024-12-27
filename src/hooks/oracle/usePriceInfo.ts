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
  pair: PonderPair | undefined,
  tokenIn: Address | undefined,
  enabled = true
): UseQueryResult<TokenPrice> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "price", pair?.address, tokenIn],
    queryFn: async () => {
      if (!pair || !tokenIn) {
        throw new Error("Pair and tokenIn are required");
      }

      // Get current TWAP price (30 min)
      const baseAmount = 10n ** 18n; // 1 token

      try {
        const [amount30min, amount24h, amount7d] = await Promise.all([
          // Current price (30 min TWAP)
          sdk.oracle.consult(
            pair.address,
            tokenIn,
            baseAmount,
            1800 // 30 minutes
          ),
          // 24h price
          sdk.oracle
            .consult(
              pair.address,
              tokenIn,
              baseAmount,
              86400 // 24 hours
            )
            .catch(() => undefined),
          // 7d price
          sdk.oracle
            .consult(
              pair.address,
              tokenIn,
              baseAmount,
              604800 // 7 days
            )
            .catch(() => undefined),
        ]);

        if (!amount30min) {
          throw new Error("Failed to fetch current price");
        }

        // Calculate price changes
        const currentPrice = Number(amount30min) / Number(baseAmount);
        const price24h = amount24h
          ? Number(amount24h) / Number(baseAmount)
          : currentPrice;
        const price7d = amount7d
          ? Number(amount7d) / Number(baseAmount)
          : currentPrice;

        // Calculate changes (default to 0 if historical prices unavailable)
        const change24h =
          price24h !== currentPrice
            ? ((currentPrice - price24h) / price24h) * 100
            : 0;
        const change7d =
          price7d !== currentPrice
            ? ((currentPrice - price7d) / price7d) * 100
            : 0;

        return {
          current: currentPrice,
          change24h,
          change7d,
          lastUpdate: Math.floor(Date.now() / 1000),
          baseAmount,
          quoteAmount: amount30min,
        };
      } catch (error) {
        console.error("Error fetching price info:", error);
        throw error;
      }
    },
    enabled: enabled && !!pair && !!tokenIn,
    staleTime: 30_000, // 30 seconds
  });
}
