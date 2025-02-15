import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface StakingStats {
  // Total stats
  totalStaked: bigint;
  totalStakers: number;
  averageStakeSize: bigint;
  minimumFirstStake: bigint;

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
      // Get contract state
      const [totalSupply, ponderBalance, lastRebaseTime, minimumFirstStake] = await Promise.all([
        sdk.staking.totalSupply(),
        sdk.ponder.balanceOf(sdk.staking.address),
        sdk.staking.lastRebaseTime(),
        sdk.staking.minimumFirstStake()
      ]);

      // Next rebase is 24 hours after last rebase
      const nextRebase = lastRebaseTime + BigInt(86400);

      // Get historical rebase events
      const rebaseEvents = await sdk.publicClient.getContractEvents({
        address: sdk.staking.address,
        abi: sdk.staking.abi,
        eventName: "RebasePerformed",
        fromBlock: BigInt(Math.floor(Date.now() / 1000 - 2592000)), // 30 days
      });

      // Calculate average rebase amount
      const rebaseAmounts = rebaseEvents.map(event => {
        const totalPonderBalance = event.args?.totalPonderBalance as bigint;
        const totalSupply = event.args?.totalSupply as bigint;
        return totalPonderBalance > totalSupply ? totalPonderBalance - totalSupply : 0n;
      }).filter(amount => amount > 0n);

      const averageRebaseAmount = rebaseAmounts.length > 0
          ? rebaseAmounts.reduce((a, b) => a + b, 0n) / BigInt(rebaseAmounts.length)
          : 0n;

      // Get value growth periods
      const day = BigInt(86400);
      const [valueGrowth24h, valueGrowth7d, valueGrowth30d] = await Promise.all([
        getValueGrowth(sdk, day),
        getValueGrowth(sdk, day * BigInt(7)),
        getValueGrowth(sdk, day * BigInt(30))
      ]);

      // Get top stakers from Staked events
      const uniqueStakers = new Set<Address>();
      const stakeEvents = await sdk.publicClient.getContractEvents({
        address: sdk.staking.address,
        abi: sdk.staking.abi,
        eventName: "Staked",
        fromBlock: BigInt(Math.floor(Date.now() / 1000 - 2592000)), // 30 days
      });

      for (const event of stakeEvents) {
        const user = event.args?.user as Address;
        if (user) {
          uniqueStakers.add(user);
        }
      }

      // Get current balances for all stakers
      const stakerBalances = await Promise.all(
          Array.from(uniqueStakers).map(async (address) => {
            const balance = await sdk.staking.balanceOf(address);
            return { address, balance };
          })
      );

      // Filter out zero balances and sort by amount
      const topStakers = stakerBalances
          .filter(({ balance }) => balance > 0n)
          .sort((a, b) => Number(b.balance - a.balance))
          .slice(0, 10)
          .map(({ address, balance }) => ({
            address,
            stakedAmount: balance,
            percentageOfTotal:
                totalSupply > 0n
                    ? Number((balance * BigInt(10000)) / totalSupply) / 100
                    : 0
          }));

      return {
        totalStaked: ponderBalance,
        totalStakers: stakerBalances.filter(s => s.balance > 0n).length,
        averageStakeSize: ponderBalance / BigInt(Math.max(1, stakerBalances.length)),
        minimumFirstStake,
        lastRebase: lastRebaseTime,
        nextRebase,
        averageRebaseAmount,
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

  const startBalance = firstEvent.args?.totalPonderBalance as bigint;
  const endBalance = lastEvent.args?.totalPonderBalance as bigint;

  if (!startBalance || !endBalance || startBalance === 0n) return 0;

  return Number(((endBalance - startBalance) * BigInt(10000)) / startBalance) / 100;
}
