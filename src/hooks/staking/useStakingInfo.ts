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
  pendingFees: bigint;
  effectiveRate: number;
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
        pendingOwner,
        pendingFees,
      ] = await Promise.all([
        sdk.staking.totalSupply(),
        sdk.ponder.balanceOf(sdk.staking.address),
        sdk.staking.lastRebaseTime(),
        sdk.staking.balanceOf(address),
        sdk.staking.minimumFirstStake(),
        sdk.staking.owner(),
        sdk.staking.pendingOwner(),
        sdk.staking.getPendingFees(address)
      ]);

      // Calculate base exchange rate
      const exchangeRate =
          totalSupply > 0n
              ? Number(totalSupply * BigInt(1e18) / ponderBalance) / 1e18
              : 1;

      // Calculate user's equivalent base KOI balance
      const userBalance =
          (userShares * BigInt(Math.floor(exchangeRate * 1e18))) / BigInt(1e18);

      // Calculate effective rate including fees
      const effectiveRate = userShares > 0n
          ? Number((userBalance + pendingFees) * BigInt(1e18) / userShares) / 1e18
          : exchangeRate;

      const REBASE_DELAY = BigInt(24 * 60 * 60);


      return {
        totalStaked: ponderBalance,
        exchangeRate,
        effectiveRate,
        lastRebaseTime: lastRebase,
        nextRebaseTime: lastRebase + REBASE_DELAY,
        minimumFirstStake,
        userBalance,
        userShares,
        pendingFees,
        owner,
        pendingOwner:
          pendingOwner === "0x0000000000000000000000000000000000000000"
            ? undefined
            : pendingOwner,
      };
    },
    enabled: !!address && !!sdk.staking,
  });
}
