import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface PairExistsResult {
  exists: boolean;
  pairAddress: Address | null;
  canCreate: boolean;
  token0: Address | null;
  token1: Address | null;
}

export function usePairExists(
  tokenA: Address | undefined,
  tokenB: Address | undefined,
  enabled = true
): UseQueryResult<PairExistsResult> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "pair", "exists", tokenA, tokenB],
    queryFn: async () => {
      if (!tokenA || !tokenB) {
        throw new Error("Both token addresses required");
      }

      // Check if tokens are the same
      if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
        return {
          exists: false,
          pairAddress: null,
          canCreate: false,
          token0: null,
          token1: null,
        };
      }

      // Sort tokens to get canonical ordering
      const [token0, token1] =
        tokenA.toLowerCase() < tokenB.toLowerCase()
          ? [tokenA, tokenB]
          : [tokenB, tokenA];

      // Check if pair exists
      const pairAddress = await sdk.factory.getPair(token0, token1);
      const exists =
        pairAddress !== "0x0000000000000000000000000000000000000000";

      // A pair can be created if it doesn't exist and tokens are valid
      const canCreate =
        !exists &&
        token0 !== "0x0000000000000000000000000000000000000000" &&
        token1 !== "0x0000000000000000000000000000000000000000";

      return {
        exists,
        pairAddress: exists ? pairAddress : null,
        canCreate,
        token0: token0,
        token1: token1,
      };
    },
    enabled: enabled && !!tokenA && !!tokenB,
    staleTime: 30_000, // 30 seconds
  });
}
