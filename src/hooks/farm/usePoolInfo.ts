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
      console.log("Fetching pool info for pid:", poolId);

      const poolInfo = await sdk.masterChef.poolInfo(BigInt(poolId));
      console.log("Pool info:", poolInfo);

      const ponderPerSecond = await sdk.masterChef.ponderPerSecond();
      console.log("Ponder per second:", ponderPerSecond);

      const totalAllocPoint = await sdk.masterChef.totalAllocPoint();
      console.log("Total alloc point:", totalAllocPoint);

      // Calculate rewards per day for this pool
      const poolRewardsPerSecond =
        totalAllocPoint === 0n
          ? 0n
          : (ponderPerSecond * poolInfo.allocPoint) / totalAllocPoint;

      const rewardsPerDay = poolRewardsPerSecond * 86400n;

      // Get total staked value in USD
      const pair = sdk.getPair(poolInfo.lpToken);
      console.log("LP Token:", poolInfo.lpToken);

      const [token0, token1, reserves] = await Promise.all([
        pair.token0(),
        pair.token1(),
        pair.getReserves(),
      ]);
      console.log("Pair info:", { token0, token1, reserves });

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
      console.log("Final pool info:", result);
      return result;
    },
    enabled,
    staleTime: 30_000,
  });
}
