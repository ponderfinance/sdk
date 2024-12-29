import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface StakingStats {
  // Total stats
  totalStaked: bigint;
  totalStakers: number;
  averageStakeSize: bigint;

  // APR/APY stats
  currentAPR: number;
  averageAPR30d: number;
  projectedAPY: number;

  // Distribution stats
  lastRebase: bigint;
  nextRebase: bigint;
  averageRebaseAmount: bigint;

  // Historical performance
  valueGrowth24h: number;
  valueGrowth7d: number;
  valueGrowth30d: number;

  // Top stakers
  topStakers: Array<{
    address: Address;
    stakedAmount: bigint;
    percentageOfTotal: number;
  }>;
}

export function useStakingStats() {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["stakingStats"],
    queryFn: async (): Promise<StakingStats> => {
      // Get total supply and PONDER balance
      const [totalSupply, ponderBalance, lastRebaseTime] = await Promise.all([
        sdk.staking.totalSupply(),
        sdk.ponder.balanceOf(sdk.staking.address),
        sdk.staking.lastRebaseTime(),
      ]);

      // Next rebase is 24 hours after last rebase
      const nextRebase = lastRebaseTime + BigInt(86400); // 24 hours

      // Get historical rebase events for APR calculation
      const rebaseEvents = await sdk.publicClient.getContractEvents({
        address: sdk.staking.address,
        abi: sdk.staking.abi,
        eventName: "RebasePerformed",
        fromBlock: BigInt(Math.floor(Date.now() / 1000 - 2592000)), // 30 days
      });

      // Calculate APR from rebase events
      let totalRebaseValue = 0n;
      for (const event of rebaseEvents) {
        const supply = event.args?.totalSupply as bigint;
        const balance = event.args?.totalPonderBalance as bigint;
        if (supply && balance) {
          totalRebaseValue += balance - supply;
        }
      }

      // Calculate APR (annualized from 30-day data)
      const aprBasisPoints =
        rebaseEvents.length > 0
          ? Number(
              (totalRebaseValue * BigInt(36500)) / (ponderBalance * BigInt(30))
            )
          : 0;
      const currentAPR = aprBasisPoints / 100;

      // Calculate projected APY using compound interest formula
      // APY = (1 + r/n)^n - 1, where r is APR and n is compounds per year (365)
      const projectedAPY = (Math.pow(1 + currentAPR / 365, 365) - 1) * 100;

      // Get value growth periods
      const day = BigInt(86400);
      const valueGrowth24h = await getValueGrowth(sdk, day);
      const valueGrowth7d = await getValueGrowth(sdk, day * BigInt(7));
      const valueGrowth30d = await getValueGrowth(sdk, day * BigInt(30));

      // Get top stakers
      const stakeEvents = await sdk.publicClient.getContractEvents({
        address: sdk.staking.address,
        abi: sdk.staking.abi,
        eventName: "Staked",
        fromBlock: BigInt(Math.floor(Date.now() / 1000 - 2592000)), // 30 days
      });

      const stakerMap = new Map<Address, bigint>();
      for (const event of stakeEvents) {
        const user = event.args?.user as Address;
        const amount = event.args?.xPonderAmount as bigint;
        if (user && amount) {
          const current = await sdk.staking.balanceOf(user);
          if (current > 0n) {
            stakerMap.set(user, current);
          }
        }
      }

      // Sort and get top 10 stakers
      const topStakers = Array.from(stakerMap.entries())
        .sort(([, a], [, b]) => Number(b - a))
        .slice(0, 10)
        .map(([address, stakedAmount]) => ({
          address,
          stakedAmount,
          percentageOfTotal:
            Number((stakedAmount * BigInt(10000)) / totalSupply) / 100,
        }));

      return {
        totalStaked: ponderBalance,
        totalStakers: stakerMap.size,
        averageStakeSize: ponderBalance / BigInt(Math.max(1, stakerMap.size)),
        currentAPR,
        averageAPR30d: currentAPR, // Using current as average for now
        projectedAPY,
        lastRebase: lastRebaseTime,
        nextRebase,
        averageRebaseAmount:
          rebaseEvents.length > 0
            ? totalRebaseValue / BigInt(rebaseEvents.length)
            : 0n,
        valueGrowth24h,
        valueGrowth7d,
        valueGrowth30d,
        topStakers,
      };
    },
    enabled: !!sdk.staking && !!sdk.publicClient,
    refetchInterval: 60000, // 1 minute
  });
}

// Helper function to calculate value growth over a period
async function getValueGrowth(
  sdk: ReturnType<typeof usePonderSDK>,
  period: bigint
): Promise<number> {
  const now = BigInt(Math.floor(Date.now() / 1000));
  const periodStart = now - period;

  const events = await sdk.publicClient.getContractEvents({
    address: sdk.staking.address,
    abi: sdk.staking.abi,
    eventName: "RebasePerformed",
    fromBlock: periodStart,
  });

  if (events.length < 2) return 0;

  const firstEvent = events[0];
  const lastEvent = events[events.length - 1];

  const startRatio = firstEvent.args?.totalPonderBalance as bigint;
  const endRatio = lastEvent.args?.totalPonderBalance as bigint;

  if (!startRatio || !endRatio || startRatio === 0n) return 0;

  return Number(((endRatio - startRatio) * BigInt(10000)) / startRatio) / 100;
}
