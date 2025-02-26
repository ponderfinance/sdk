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
  // Overall metrics
  totalDistributed: bigint;
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
  try {
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
  } catch (error) {
    console.error("Error fetching time range metrics:", error);
    return {
      distributions: 0,
      volume: 0n,
      avgDistributionSize: 0n,
    };
  }
}

async function getTokenMetrics(
  sdk: ReturnType<typeof usePonderSDK>,
  fromBlock: bigint
): Promise<TokenMetrics[]> {
  try {
    // Get all fee collection events
    const collectionEvents = await sdk.publicClient.getContractEvents({
      address: sdk.feeDistributor.address,
      abi: sdk.feeDistributor.abi,
      eventName: "FeesCollected",
      fromBlock,
    });

    // Get all conversion events
    const conversionEvents = await sdk.publicClient.getContractEvents({
      address: sdk.feeDistributor.address,
      abi: sdk.feeDistributor.abi,
      eventName: "FeesConverted",
      fromBlock,
    });

    // Track unique tokens
    const tokenMap = new Map<Address, TokenMetrics>();

    // Process collection events
    for (const event of collectionEvents) {
      const token = event.args?.token as Address;
      const amount = (event.args?.amount as bigint) || 0n;

      if (!tokenMap.has(token)) {
        const symbol = await sdk.publicClient.readContract({
          address: token,
          abi: ["function symbol() view returns (string)"] as const,
          functionName: "symbol",
        });

        tokenMap.set(token, {
          token,
          symbol: symbol as string,
          totalCollected: 0n,
          totalConverted: 0n,
          valueInKUB: 0n,
        });
      }

      const metrics = tokenMap.get(token)!;
      metrics.totalCollected += amount;
    }

    // Process conversion events
    for (const event of conversionEvents) {
      const token = event.args?.token as Address;
      const amount = (event.args?.tokenAmount as bigint) || 0n;

      if (tokenMap.has(token)) {
        const metrics = tokenMap.get(token)!;
        metrics.totalConverted += amount;
      }
    }

    // Calculate KUB values
    const weth = await sdk.router.KKUB();
    const promises = Array.from(tokenMap.values()).map(async (metrics) => {
      try {
        const pair = await sdk.factory.getPair(metrics.token, weth);
        if (pair) {
          const pairContract = sdk.getPair(pair);
          const [token0, reserves] = await Promise.all([
            pairContract.token0(),
            pairContract.getReserves(),
          ]);

          const isToken0 = metrics.token.toLowerCase() === token0.toLowerCase();
          const tokenReserve = isToken0 ? reserves.reserve0 : reserves.reserve1;
          const kubReserve = isToken0 ? reserves.reserve1 : reserves.reserve0;

          if (tokenReserve > 0n) {
            metrics.valueInKUB =
              (metrics.totalCollected * kubReserve) / tokenReserve;
          }
        }
      } catch (error) {
        console.warn(`Failed to get KUB value for ${metrics.symbol}:`, error);
      }
      return metrics;
    });

    return Promise.all(promises);
  } catch (error) {
    console.error("Error fetching token metrics:", error);
    return [];
  }
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

      // Get token-specific metrics
      const tokenMetrics = await getTokenMetrics(sdk, monthAgo);

      return {
        totalDistributed: monthlyMetrics.volume,
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
