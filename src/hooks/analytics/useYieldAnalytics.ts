import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface PoolYield {
  poolId: number;
  pair: Address;
  apr: number;
  apy: number;
  rewardsPerDay: bigint;
  tvl: bigint;
  boostedApr?: number;
  ponderRequired: bigint;
}

export interface YieldAnalytics {
  pools: PoolYield[];
  aggregatedMetrics: {
    totalStaked: bigint;
    totalPonderStaked: bigint;
    averageApr: number;
    totalRewardsPerDay: bigint;
    stakerCount: number;
    averageBoostMultiplier: number;
  };
}

export function useYieldAnalytics(
  enabled = true
): UseQueryResult<YieldAnalytics> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "analytics", "yield"],
    queryFn: async () => {
      const poolLength = await sdk.masterChef.poolLength();
      const pools: PoolYield[] = [];

      let totalStaked = 0n;
      let totalPonderStaked = 0n;
      let totalApr = 0;
      let totalMultiplier = 0;
      let activePoolCount = 0;
      const stakers = new Set<string>();

      for (let i = 0; i < Number(poolLength); i++) {
        const pool = await sdk.masterChef.poolInfo(BigInt(i));

        if (pool.allocPoint > 0n) {
          activePoolCount++;
          const pair = sdk.getPair(pool.lpToken);
          const [reserves] = await Promise.all([pair.getReserves()]);

          // Calculate pool TVL (simplified)
          const tvl = (reserves.reserve0 + reserves.reserve1) * 2n;
          totalStaked += pool.totalStaked;

          // Calculate rewards
          const ponderPerSecond = await sdk.masterChef.ponderPerSecond();
          const totalAllocPoint = await sdk.masterChef.totalAllocPoint();
          const poolRewardsPerDay =
            (ponderPerSecond * 86400n * pool.allocPoint) / totalAllocPoint;

          // Calculate APR
          const yearlyRewards = poolRewardsPerDay * 365n;
          const apr =
            Number((yearlyRewards * 10000n) / (pool.totalStaked || 1n)) / 100;

          // Calculate APY (compounded daily)
          const dailyRate = apr / 365;
          const apy = (Math.pow(1 + dailyRate, 365) - 1) * 100;

          // Calculate boost requirements
          const ponderRequired = pool.totalStaked / 10n; // 10% of staked for max boost

          // Track stakers
          const stakerFilter = await sdk.publicClient.createEventFilter({
            address: sdk.masterChef.address,
            event: {
              type: "event",
              name: "Deposit",
              inputs: [
                { type: "address", name: "user", indexed: true },
                { type: "uint256", name: "pid", indexed: true },
                { type: "uint256", name: "amount" },
              ],
            },
            fromBlock: -200000n,
          });

          const stakeEvents = await sdk.publicClient.getFilterLogs({
            filter: stakerFilter,
          });
          stakeEvents.forEach((event) => {
            if (event.args.user) {
              stakers.add(event.args.user.toLowerCase());
              if (event.args.pid === BigInt(i)) {
                totalPonderStaked += event.args.amount as bigint;
              }
            }
          });

          // Calculate boosted APR
          const boostedApr = (apr * Number(pool.boostMultiplier)) / 10000;
          totalMultiplier += Number(pool.boostMultiplier);

          pools.push({
            poolId: i,
            pair: pool.lpToken,
            apr,
            apy,
            rewardsPerDay: poolRewardsPerDay,
            tvl,
            boostedApr,
            ponderRequired,
          });

          totalApr += apr;
        }
      }

      return {
        pools: pools.sort((a, b) => b.apr - a.apr),
        aggregatedMetrics: {
          totalStaked,
          totalPonderStaked,
          averageApr: activePoolCount > 0 ? totalApr / activePoolCount : 0,
          totalRewardsPerDay: pools.reduce(
            (acc, pool) => acc + pool.rewardsPerDay,
            0n
          ),
          stakerCount: stakers.size,
          averageBoostMultiplier:
            activePoolCount > 0 ? totalMultiplier / activePoolCount : 0,
        },
      };
    },
    enabled,
    staleTime: 60_000, // 1 minute
  });
}
