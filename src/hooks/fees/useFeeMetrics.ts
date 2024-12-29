import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface TokenMetrics {
  token: Address;
  symbol: string;
  totalCollected: bigint;
  totalConverted: bigint;
  valueInKUB: bigint;
}

export interface FeeMetrics {
  // Distribution metrics
  totalDistributed: {
    staking: bigint;
    treasury: bigint;
    team: bigint;
    total: bigint;
  };
  // Time-based metrics
  daily: {
    distributions: number;
    volume: bigint;
    avgDistributionSize: bigint;
  };
  weekly: {
    distributions: number;
    volume: bigint;
    avgDistributionSize: bigint;
  };
  monthly: {
    distributions: number;
    volume: bigint;
    avgDistributionSize: bigint;
  };
  // Token specific metrics
  tokenMetrics: TokenMetrics[];
  // Performance metrics
  projectedAnnualFees: bigint;
  averageDistributionTime: bigint;
  revenueGrowth: {
    daily: number; // Percentage change
    weekly: number; // Percentage change
    monthly: number; // Percentage change
  };
}

async function getTimeRangeMetrics(
  sdk: ReturnType<typeof usePonderSDK>,
  startTime: bigint
) {
  const events = await sdk.publicClient.getContractEvents({
    address: sdk.feeDistributor.address,
    abi: sdk.feeDistributor.abi,
    eventName: "FeesDistributed",
    fromBlock: startTime,
  });

  let totalVolume = 0n;
  const distributions = events.length;

  for (const event of events) {
    const amount = (event.args?.totalAmount as bigint) || 0n;
    totalVolume += amount;
  }

  return {
    distributions,
    volume: totalVolume,
    avgDistributionSize:
      distributions > 0 ? totalVolume / BigInt(distributions) : 0n,
  };
}

export function useFeeMetrics(enabled = true) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["feeMetrics"],
    queryFn: async (): Promise<FeeMetrics> => {
      const now = BigInt(Math.floor(Date.now() / 1000));
      const dayAgo = now - BigInt(86400);
      const weekAgo = now - BigInt(604800);
      const monthAgo = now - BigInt(2592000);

      // Get metrics for different time periods
      const [dailyMetrics, weeklyMetrics, monthlyMetrics] = await Promise.all([
        getTimeRangeMetrics(sdk, dayAgo),
        getTimeRangeMetrics(sdk, weekAgo),
        getTimeRangeMetrics(sdk, monthAgo),
      ]);

      // Get all unique tokens that have had fees collected
      const feeEvents = await sdk.publicClient.getContractEvents({
        address: sdk.feeDistributor.address,
        abi: sdk.feeDistributor.abi,
        eventName: "FeesCollected",
        fromBlock: monthAgo,
      });

      const tokenSet = new Set<Address>();
      for (const event of feeEvents) {
        const token = event.args?.token as Address;
        if (token) tokenSet.add(token);
      }

      // Get token metrics
      const tokenMetrics: TokenMetrics[] = await Promise.all(
        Array.from(tokenSet).map(async (token) => {
          const [symbol, totalCollected, totalConverted] = await Promise.all([
            sdk.publicClient.readContract({
              address: token,
              abi: ["function symbol() view returns (string)"] as const,
              functionName: "symbol",
            }),
            // Sum up all collected fees for this token
            feeEvents
              .filter((e) => (e.args?.token as Address) === token)
              .reduce((sum, e) => sum + ((e.args?.amount as bigint) || 0n), 0n),
            // Get conversion events for this token
            sdk.publicClient
              .getContractEvents({
                address: sdk.feeDistributor.address,
                abi: sdk.feeDistributor.abi,
                eventName: "FeesConverted",
                args: { token: token },
                fromBlock: monthAgo,
              })
              .then((events) =>
                events.reduce(
                  (sum, e) => sum + ((e.args?.tokenAmount as bigint) || 0n),
                  0n
                )
              ),
          ]);

          // Calculate KUB value through router
          let valueInKUB = 0n;
          try {
            const weth = await sdk.router.WETH();
            const pair = await sdk.factory.getPair(token, weth);
            if (pair) {
              const pairContract = sdk.getPair(pair);
              const [token0, reserves] = await Promise.all([
                pairContract.token0(),
                pairContract.getReserves(),
              ]);
              const isToken0 = token.toLowerCase() === token0.toLowerCase();
              const tokenReserve = isToken0
                ? reserves.reserve0
                : reserves.reserve1;
              const kubReserve = isToken0
                ? reserves.reserve1
                : reserves.reserve0;

              if (tokenReserve > 0n) {
                valueInKUB = (totalCollected * kubReserve) / tokenReserve;
              }
            }
          } catch (err) {
            console.warn(`Failed to get KUB value for token ${symbol}:`, err);
          }

          return {
            token,
            symbol: symbol as string,
            totalCollected,
            totalConverted,
            valueInKUB,
          };
        })
      );

      // Calculate total distributions
      const totalDistributed = monthlyMetrics.volume;
      const { stakingRatio, treasuryRatio, teamRatio } =
        await sdk.feeDistributor.getDistributionRatios();

      const denominator = stakingRatio + treasuryRatio + teamRatio;

      return {
        totalDistributed: {
          staking: (totalDistributed * stakingRatio) / denominator,
          treasury: (totalDistributed * treasuryRatio) / denominator,
          team: (totalDistributed * teamRatio) / denominator,
          total: totalDistributed,
        },
        daily: dailyMetrics,
        weekly: weeklyMetrics,
        monthly: monthlyMetrics,
        tokenMetrics,
        projectedAnnualFees: monthlyMetrics.volume * 12n,
        averageDistributionTime: BigInt(86400), // 24 hours, as per contract
        revenueGrowth: {
          daily:
            dailyMetrics.volume > 0n
              ? Number((dailyMetrics.volume * 10000n) / monthlyMetrics.volume) /
                  100 -
                100
              : 0,
          weekly:
            weeklyMetrics.volume > 0n
              ? Number(
                  (weeklyMetrics.volume * 10000n) / monthlyMetrics.volume
                ) /
                  100 -
                100
              : 0,
          monthly:
            monthlyMetrics.volume > 0n
              ? Number(
                  (monthlyMetrics.volume * 10000n) /
                    (monthlyMetrics.volume + dailyMetrics.volume)
                ) /
                  100 -
                100
              : 0,
        },
      };
    },
    enabled: enabled && !!sdk.feeDistributor && !!sdk.publicClient,
    refetchInterval: 300000, // 5 minutes
  });
}
