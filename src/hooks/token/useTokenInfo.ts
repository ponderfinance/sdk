import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface TokenInfo {
  name: string;
  symbol: string;
  decimals: number;
  totalSupply: bigint;
}

export function useTokenInfo(
  tokenAddress: Address,
  enabled = true
): UseQueryResult<TokenInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "token", "info", tokenAddress],
    queryFn: async () => {
      const token = sdk.getLaunchToken(tokenAddress);
      const [name, symbol, decimals, totalSupply] = await Promise.all([
        token.name(),
        token.symbol(),
        token.decimals(),
        token.totalSupply(),
      ]);

      return {
        name,
        symbol,
        decimals,
        totalSupply,
      };
    },
    enabled,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}
