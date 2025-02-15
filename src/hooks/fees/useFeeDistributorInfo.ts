import { useQuery } from "@tanstack/react-query";
import type { Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface TokenFeesInfo {
  token: Address;
  symbol: string;
  balance: bigint;
  valueInKUB?: bigint;
}

export interface FeeDistributorInfo {
  pendingFees: {
    ponder: bigint;
    otherTokens: TokenFeesInfo[];
  };
  lastDistribution: bigint;
  nextDistribution: bigint;
  minimumAmount: bigint;
  owner: Address;
  totalDistributed24h?: bigint;
  distributionCount24h?: number;
}

export function useFeeDistributorInfo(enabled = true) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["feeDistributorInfo"],
    queryFn: async (): Promise<FeeDistributorInfo> => {
      // Get current timestamp and 24h ago
      const now = BigInt(Math.floor(Date.now() / 1000));
      const dayAgo = now - BigInt(86400);

      // Fetch basic contract info
      const [owner, minimumAmount, lastDistribution] = await Promise.all([
        sdk.feeDistributor.owner(),
        sdk.feeDistributor.minimumAmount(),
        sdk.feeDistributor.lastDistributionTimestamp(),
      ]);

      // Calculate next distribution time
      const cooldownPeriod = BigInt(3600); // 1 hour from contract
      const nextDistribution = lastDistribution + cooldownPeriod;

      // Get PONDER balance
      const ponderBalance = await sdk.ponder.balanceOf(
        sdk.feeDistributor.address
      );

      // Get fee collection events from last 24h
      const feeEvents = await sdk.publicClient.getContractEvents({
        address: sdk.feeDistributor.address,
        abi: sdk.feeDistributor.abi,
        eventName: "FeesCollected",
        fromBlock: dayAgo,
      });

      // Track unique tokens and their balances
      const tokenSet = new Set<Address>();
      for (const event of feeEvents) {
        const token = event.args?.token as Address;
        if (token && token !== sdk.ponder.address) {
          tokenSet.add(token);
        }
      }

      // Get token metrics
      const otherTokens: TokenFeesInfo[] = await Promise.all(
        Array.from(tokenSet).map(async (token) => {
          try {
            const [balance, symbol] = await Promise.all([
              sdk.publicClient.readContract({
                address: token,
                abi: [
                  "function balanceOf(address) view returns (uint256)",
                ] as const,
                functionName: "balanceOf",
                args: [sdk.feeDistributor.address],
              }),
              sdk.publicClient.readContract({
                address: token,
                abi: ["function symbol() view returns (string)"] as const,
                functionName: "symbol",
              }),
            ]);

            // Calculate KUB value
            let valueInKUB: bigint | undefined;
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
                  valueInKUB =
                    ((balance as bigint) * kubReserve) / tokenReserve;
                }
              }
            } catch (err) {
              console.warn(`Failed to get KUB value for ${symbol}:`, err);
            }

            return {
              token,
              symbol: symbol as string,
              balance: balance as bigint,
              valueInKUB,
            };
          } catch (error) {
            console.error(`Error fetching info for token ${token}:`, error);
            return {
              token,
              symbol: "UNKNOWN",
              balance: 0n,
            };
          }
        })
      );

      // Get distribution metrics for last 24h
      const distributionEvents = await sdk.publicClient.getContractEvents({
        address: sdk.feeDistributor.address,
        abi: sdk.feeDistributor.abi,
        eventName: "FeesDistributed",
        fromBlock: dayAgo,
      });

      const totalDistributed24h = distributionEvents.reduce(
        (sum, event) => sum + ((event.args?.totalAmount as bigint) || 0n),
        0n
      );

      return {
        pendingFees: {
          ponder: ponderBalance,
          otherTokens: otherTokens.filter((t) => t.balance > 0n),
        },
        lastDistribution,
        nextDistribution,
        minimumAmount,
        owner,
        totalDistributed24h,
        distributionCount24h: distributionEvents.length,
      };
    },
    enabled: enabled && !!sdk.feeDistributor && !!sdk.publicClient,
    refetchInterval: 30000, // 30 seconds
  });
}
