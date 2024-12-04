import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export function useTokenBalance(
  tokenAddress: Address,
  account: Address | undefined,
  enabled = true
): UseQueryResult<bigint> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "token", "balance", tokenAddress, account],
    queryFn: async () => {
      if (!account) throw new Error("No account provided");
      const token = sdk.getLaunchToken(tokenAddress);
      return token.balanceOf(account);
    },
    enabled: enabled && !!account,
    staleTime: 10_000, // 10 seconds
  });
}
