import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface StakingInfo {
  totalStaked: bigint;
  exchangeRate: number;
  lastRebaseTime: bigint;
  nextRebaseTime: bigint;
  minimumFirstStake: bigint;
  userBalance: bigint;
  userShares: bigint;
  owner: Address;
  pendingOwner: Address | undefined;
}

export function useStakingInfo(address?: Address) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["stakingInfo", address],
    queryFn: async (): Promise<StakingInfo> => {
      if (!address) throw new Error("No address provided");

      const [
        totalSupply,
        ponderBalance,
        lastRebase,
        userShares,
        minimumFirstStake,
        owner,
        pendingOwner
      ] = await Promise.all([
        sdk.staking.totalSupply(),
        sdk.ponder.balanceOf(sdk.staking.address),
        sdk.staking.lastRebaseTime(),
        sdk.staking.balanceOf(address),
        sdk.staking.minimumFirstStake(),
        sdk.staking.owner(),
        sdk.staking.pendingOwner()
      ]);

      // Calculate exchange rate with 18 decimals precision
      const exchangeRate =
          totalSupply > 0n
              ? Number((ponderBalance * BigInt(1e18)) / totalSupply) / 1e18
              : 1;

      // Calculate user's equivalent PONDER balance
      const userBalance =
          (userShares * BigInt(Math.floor(exchangeRate * 1e18))) / BigInt(1e18);

      // 24 hours rebase delay from contract
      const REBASE_DELAY = BigInt(24 * 60 * 60);

      return {
        totalStaked: ponderBalance,
        exchangeRate,
        lastRebaseTime: lastRebase,
        nextRebaseTime: lastRebase + REBASE_DELAY,
        minimumFirstStake,
        userBalance,
        userShares,
        owner,
        pendingOwner: pendingOwner === "0x0000000000000000000000000000000000000000" ? undefined : pendingOwner
      };
    },
    enabled: !!address && !!sdk.staking,
  });
}
