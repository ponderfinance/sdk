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
  stakingRatio: bigint;
  teamRatio: bigint;
  team: Address;
  pendingFees: {
    ponder: bigint;
    otherTokens: TokenFeesInfo[];
  };
  lastDistribution?: bigint;
  nextDistribution?: bigint;
  totalValueLocked?: bigint;
  totalDistributed24h?: bigint;
  distributionCount24h?: number;
}

export function useFeeDistributorInfo(enabled = true) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["feeDistributorInfo"],
    queryFn: async (): Promise<FeeDistributorInfo> => {
      // Get current distribution ratios
      const [ratios, teamAddress] = await Promise.all([
        sdk.feeDistributor.getDistributionRatios(),
        sdk.feeDistributor.team(),
      ]);

      // Get PONDER balance
      const ponderBalance = await sdk.ponder.balanceOf(sdk.feeDistributor.address);

      // Get tracked tokens and their balances
      const otherTokens: TokenFeesInfo[] = [];
      const trackedTokens = await Promise.all(
          (await sdk.publicClient.getContractEvents({
            address: sdk.feeDistributor.address,
            abi: sdk.feeDistributor.abi,
            eventName: "FeesCollected",
            fromBlock: BigInt(Math.floor(Date.now() / 1000 - 86400)), // Last 24h
          })).map(async (event) => {
            const token = event.args?.token as Address;
            if (token === sdk.ponder.address) return null;

            const [balance, symbol] = await Promise.all([
              sdk.publicClient.readContract({
                address: token,
                abi: ["function balanceOf(address) view returns (uint256)"] as const,
                functionName: "balanceOf",
                args: [sdk.feeDistributor.address],
              }),
              sdk.publicClient.readContract({
                address: token,
                abi: ["function symbol() view returns (string)"] as const,
                functionName: "symbol",
              }),
            ]);

            return {
              token,
              symbol: symbol as string,
              balance: balance as bigint,
            };
          })
      );

      // Filter out nulls and calculate KUB values
      const validTokens = trackedTokens.filter((t): t is TokenFeesInfo => t !== null);
      for (const token of validTokens) {
        if (token.balance > 0n) {
          otherTokens.push(token);
        }
      }

      return {
        stakingRatio: ratios.stakingRatio,
        teamRatio: ratios.teamRatio,
        team: teamAddress,
        pendingFees: {
          ponder: ponderBalance,
          otherTokens,
        },
        // Add remaining data later when implementing
        lastDistribution: undefined,
        nextDistribution: undefined,
      };
    },
    enabled: enabled && !!sdk.feeDistributor && !!sdk.publicClient,
    refetchInterval: 30000, // 30 seconds
  });
}
