import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface StakingInfo {
  totalStaked: bigint;
  exchangeRate: number;
  lastRebaseTime: bigint;
  nextRebaseTime: bigint;
  userBalance: bigint;
  userShares: bigint;
}

export function useStakingInfo(address?: Address) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["stakingInfo", address],
    queryFn: async (): Promise<StakingInfo> => {
      if (!address) throw new Error("No address provided");

      const [totalSupply, ponderBalance, lastRebase, userShares] =
          await Promise.all([
            sdk.staking.totalSupply(),
            sdk.ponder.balanceOf(sdk.staking.address),
            sdk.staking.lastRebaseTime(),
            sdk.staking.balanceOf(address),
          ]);

      // Calculate exchange rate with 18 decimals precision
      const exchangeRate =
          totalSupply > 0n
              ? Number((ponderBalance * BigInt(1e18)) / totalSupply) / 1e18
              : 1;

      // Calculate user's equivalent PONDER balance
      const userBalance =
          (userShares * BigInt(Math.floor(exchangeRate * 1e18))) / BigInt(1e18);

      return {
        totalStaked: ponderBalance,
        exchangeRate,
        lastRebaseTime: lastRebase,
        nextRebaseTime: lastRebase + BigInt(24 * 60 * 60), // 24 hours
        userBalance,
        userShares,
      };
    },
    enabled: !!address && !!sdk.staking,
  });
}
