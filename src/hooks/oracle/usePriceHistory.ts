import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type PonderPair } from "@/contracts/pair";

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
}

interface UsePriceHistoryParams {
  pair: PonderPair;
  tokenIn: Address;
  period: "1h" | "24h" | "7d" | "30d";
  interval?: number; // Interval in seconds between points
}

export function usePriceHistory({
  pair,
  tokenIn,
  period,
  interval,
}: UsePriceHistoryParams): UseQueryResult<PriceHistory> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "priceHistory", pair.address, tokenIn, period],
    queryFn: async () => {
      // Get all observations from oracle
      const observations = await sdk.oracle.getPriceHistory(pair.address);
      const baseAmount = 10n ** 18n;

      // Filter observations based on period
      const periodSeconds = {
        "1h": 3600,
        "24h": 86400,
        "7d": 604800,
        "30d": 2592000,
      }[period];

      const now = Math.floor(Date.now() / 1000);
      const startTime = now - periodSeconds;

      const relevantObs = observations.filter(
        (obs) => Number(obs.timestamp) >= startTime
      );

      // Calculate prices for each observation
      const points: PricePoint[] = await Promise.all(
        relevantObs.map(async (obs) => {
          // Use cumulative price differences to calculate spot price
          const spotPrice = Number(obs.price0Cumulative) / Number(baseAmount);

          // Get volume data from pair events
          const volume = 0n; // TODO: Implement volume tracking

          return {
            timestamp: Number(obs.timestamp),
            price: spotPrice,
            priceUSD: spotPrice, // TODO: Implement USD conversion
            volume,
          };
        })
      );

      // Calculate statistics
      const prices = points.map((p) => p.price);
      const minPrice = Math.min(...prices);
      const maxPrice = Math.max(...prices);
      const averagePrice = prices.reduce((a, b) => a + b, 0) / prices.length;
      const totalVolume = points.reduce((a, b) => a + b.volume, 0n);

      return {
        points: points.sort((a, b) => a.timestamp - b.timestamp),
        minPrice,
        maxPrice,
        averagePrice,
        totalVolume,
      };
    },
    staleTime: 60_000, // 1 minute
  });
}
