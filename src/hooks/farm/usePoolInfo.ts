import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { usePonderSDK } from "@/context/PonderContext";
import { type PoolInfo } from "@/contracts/masterchef";

export interface DetailedPoolInfo extends PoolInfo {
  poolId: number;
  totalStakedUSD: bigint;
  apr: number;
  rewardsPerDay: bigint;
}

export function usePoolInfo(
  poolId: number,
  enabled = true
): UseQueryResult<DetailedPoolInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "farm", "pool", poolId],
    queryFn: async () => {

      const poolInfo = await sdk.masterChef.poolInfo(BigInt(poolId));

      const ponderPerSecond = await sdk.masterChef.ponderPerSecond();

      const totalAllocPoint = await sdk.masterChef.totalAllocPoint();

      // Calculate rewards per day for this pool
      const poolRewardsPerSecond =
        totalAllocPoint === 0n
          ? 0n
          : (ponderPerSecond * poolInfo.allocPoint) / totalAllocPoint;

      const rewardsPerDay = poolRewardsPerSecond * 86400n;

      // Get total staked value in USD
      const pair = sdk.getPair(poolInfo.lpToken);

      const [token0, token1, reserves] = await Promise.all([
        pair.token0(),
        pair.token1(),
        pair.getReserves(),
      ]);

      // This should be expanded to get actual USD value using price oracle
      const totalStakedUSD =
        poolInfo.totalStaked === 0n ? 1n : poolInfo.totalStaked;

      // Calculate APR (this is simplified - should use actual token prices)
      const apr = Number((rewardsPerDay * 36500n) / totalStakedUSD) / 100;

      const result = {
        ...poolInfo,
        poolId,
        totalStakedUSD,
        apr,
        rewardsPerDay,
      };
      return result;
    },
    enabled,
    staleTime: 30_000,
  });
}
