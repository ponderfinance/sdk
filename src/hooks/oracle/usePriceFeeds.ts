import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type PonderPair } from "@/contracts/pair";

export interface AggregatedPrice {
  token: Address;
  price: number;
  confidence: number;
  sources: {
    twap: number;
    spot: number;
    impact: number;
  };
}

export function usePriceFeeds(
  pairs: PonderPair[],
  quoteToken: Address,
  enabled = true
): UseQueryResult<Record<string, AggregatedPrice>> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "prices", pairs.map((p) => p.address), quoteToken],
    queryFn: async () => {
      const prices: Record<string, AggregatedPrice> = {};
      const baseAmount = 10n ** 18n;

      for (const pair of pairs) {
        const [token0, token1] = await Promise.all([
          pair.token0(),
          pair.token1(),
        ]);

        const tokenIn =
          token0.toLowerCase() === quoteToken.toLowerCase() ? token1 : token0;

        try {
          // Get TWAP price
          const twapAmount = await sdk.oracle.consult(
            pair.address,
            tokenIn,
            baseAmount,
            1800 // 30 minutes
          );
          const twapPrice = Number(twapAmount) / Number(baseAmount);

          // Get spot price from reserves
          const { reserve0, reserve1 } = await pair.getReserves();
          const spotPrice =
            token0.toLowerCase() === quoteToken.toLowerCase()
              ? Number(reserve0) / Number(reserve1)
              : Number(reserve1) / Number(reserve0);

          // Calculate price impact for 1% of liquidity
          const impact = Math.abs((twapPrice - spotPrice) / spotPrice) * 100;

          // Confidence score based on price deviation
          const confidence = Math.max(0, 100 - impact * 10); // Reduce confidence as impact increases

          prices[tokenIn] = {
            token: tokenIn,
            price: twapPrice,
            confidence,
            sources: {
              twap: twapPrice,
              spot: spotPrice,
              impact,
            },
          };
        } catch (error) {
          console.warn(`Failed to get price for ${tokenIn}:`, error);
        }
      }

      return prices;
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });
}
