import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { type PonderPair } from "@/contracts/pair";
import { type FeeInfo, FeeCalculator } from "@/utils/fees";
import { usePonderSDK } from "@/context/PonderContext";

export function usePairFees(
  pair: PonderPair,
  tokenIn: Address,
  enabled = true
): UseQueryResult<FeeInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "fees", pair.address, tokenIn],
    queryFn: async () => {
      return FeeCalculator.getFeeInfo(pair, tokenIn, sdk.publicClient);
    },
    enabled,
    staleTime: 30_000, // 30s
  });
}
