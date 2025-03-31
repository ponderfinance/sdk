import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { usePonderSDK } from "@/context/PonderContext";

export interface RemainingToRaise {
  remainingKub: bigint;
  remainingPonder: bigint;
  totalRemaining: bigint;
}

export function useRemainingToRaise(
  launchId: bigint,
  enabled = true
): UseQueryResult<RemainingToRaise> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "launch", "remaining", launchId.toString()],
    queryFn: async () => {
      const [remainingKub, remainingPonder] = await sdk.launcher.getRemainingToRaise(launchId);
      return {
        remainingKub,
        remainingPonder,
        totalRemaining: remainingKub + remainingPonder,
      };
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });
} 