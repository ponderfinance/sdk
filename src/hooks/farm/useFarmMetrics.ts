import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { usePonderSDK } from "@/context/PonderContext";

export interface FarmMetrics {
  totalValueLocked: bigint;
  rewardsPerDay: bigint;
  totalStakers: number;
  averageApr: number;
  activePools: number;
}

export function useFarmMetrics(enabled = true): UseQueryResult<FarmMetrics> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "farm", "metrics"],
    queryFn: async () => {
      const poolLength = await sdk.masterChef.poolLength();
      let totalValueLocked = 0n;
      let totalStakers = 0;
      let totalApr = 0;
      let activePools = 0;

      const ponderPerSecond = await sdk.masterChef.ponderPerSecond();
      const totalRewardsPerDay = ponderPerSecond * 86400n;

      // Aggregate data from all pools
      for (let i = 0; i < Number(poolLength); i++) {
        const poolInfo = await sdk.masterChef.poolInfo(BigInt(i));
        if (poolInfo.allocPoint > 0n) {
          activePools++;
          totalValueLocked += poolInfo.totalStaked;

          // Get stakers count (this is an example - implement based on your data availability)
          // You might need to track this through events or a separate mapping
          totalStakers += 1;

          // Calculate pool APR and add to total
          const poolApr =
            Number((totalRewardsPerDay * 36500n) / poolInfo.totalStaked) / 100;
          totalApr += poolApr;
        }
      }

      return {
        totalValueLocked,
        rewardsPerDay: totalRewardsPerDay,
        totalStakers,
        averageApr: activePools > 0 ? totalApr / activePools : 0,
        activePools,
      };
    },
    enabled,
    staleTime: 60_000, // 1 minute
  });
}
