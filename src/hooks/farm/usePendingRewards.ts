import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface PendingRewards {
  base: bigint;
  boosted: bigint;
  total: bigint;
  usdValue: number;
}

export function usePendingRewards(
  poolId: number,
  account: Address | undefined,
  enabled = true
): UseQueryResult<PendingRewards> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "farm", "pendingRewards", poolId.toString(), account],
    queryFn: async () => {
      if (!account) throw new Error("No account provided");

      const [pending, poolInfo, userInfo] = await Promise.all([
        sdk.masterChef.pendingPonder(BigInt(poolId), account),
        sdk.masterChef.poolInfo(BigInt(poolId)),
        sdk.masterChef.userInfo(BigInt(poolId), account),
      ]);

      // Calculate base and boosted rewards
      const boostMultiplier = poolInfo.boostMultiplier;
      const base = pending;
      const boosted =
        userInfo.ponderStaked > 0n
          ? (pending * (BigInt(boostMultiplier) - 10000n)) / 10000n
          : 0n;
      const total = base + boosted;

      // TODO: Get actual USD value from oracle
      const usdValue = 0;

      return {
        base,
        boosted,
        total,
        usdValue,
      };
    },
    enabled: enabled && !!account,
    staleTime: 10_000, // 10 seconds
    refetchInterval: 10_000, // Poll every 10 seconds
  });
}
