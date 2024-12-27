import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface PricePoint {
  timestamp: number;
  price: number;
  priceUSD: number;
  volume: bigint;
}

export interface PriceHistory {
  points: PricePoint[];
  minPrice: number;
  maxPrice: number;
  averagePrice: number;
  totalVolume: bigint;
  percentChange: number;
  currentPrice: number;
}

interface UsePriceHistoryParams {
  pairAddress: Address | undefined;
  tokenIn: Address | undefined;
  period: "1h" | "24h" | "7d" | "30d";
  enabled?: boolean;
  refetchInterval?: number;
}

export function usePriceHistory({
  pairAddress,
  tokenIn,
  period,
  enabled = true,
  refetchInterval,
}: UsePriceHistoryParams): UseQueryResult<PriceHistory> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "priceHistory", pairAddress, tokenIn, period],
    queryFn: async () => {
      if (!pairAddress || !tokenIn) {
        throw new Error("Pair address and tokenIn are required");
      }

      try {
        const observations = await sdk.oracle.getPriceHistory(pairAddress);
        const baseAmount = 10n ** 18n;

        const periodSeconds = {
          "1h": 3600,
          "24h": 86400,
          "7d": 604800,
          "30d": 2592000,
        }[period];

        const now = Math.floor(Date.now() / 1000);
        const startTime = now - periodSeconds;

        // Filter and validate observations
        const relevantObs = observations
          .filter((obs) => Number(obs.timestamp) >= startTime)
          .filter(
            (obs) =>
              obs.price0Cumulative !== undefined &&
              obs.price0Cumulative !== null
          );

        if (relevantObs.length === 0) {
          return {
            points: [],
            minPrice: 0,
            maxPrice: 0,
            averagePrice: 0,
            totalVolume: 0n,
            percentChange: 0,
            currentPrice: 0,
          };
        }

        const points: PricePoint[] = relevantObs
          .map((obs) => ({
            timestamp: Number(obs.timestamp),
            price: Number(obs.price0Cumulative) / Number(baseAmount),
            priceUSD: Number(obs.price0Cumulative) / Number(baseAmount),
            volume: 0n,
          }))
          .sort((a, b) => a.timestamp - b.timestamp);

        // Calculate statistics safely
        const prices = points.map((p) => p.price);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        const averagePrice =
          prices.reduce((a, b) => a + b, 0) / prices.length || 0;
        const totalVolume = points.reduce((a, b) => a + b.volume, 0n);

        // Calculate percent change safely
        const firstPrice = prices[0] || 0;
        const lastPrice = prices[prices.length - 1] || 0;
        const percentChange =
          firstPrice === 0 ? 0 : ((lastPrice - firstPrice) / firstPrice) * 100;

        return {
          points,
          minPrice,
          maxPrice,
          averagePrice,
          totalVolume,
          percentChange,
          currentPrice: lastPrice,
        };
      } catch (error) {
        console.error("Error fetching price history:", error);
        throw error;
      }
    },
    enabled: enabled && !!pairAddress && !!tokenIn,
    refetchInterval,
    staleTime: 60_000, // 1 minute stale time
    retry: 2,
  });
}
