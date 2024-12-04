import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type UserInfo } from "@/contracts/masterchef";

export interface DetailedStakeInfo extends UserInfo {
  poolId: number;
  pendingRewards: bigint;
  lpToken: Address;
  boost: {
    multiplier: number;
    ponderRequired: bigint;
    additionalRewards: bigint;
  };
}

export function useStakeInfo(
  poolId: number,
  account: Address | undefined,
  enabled = true
): UseQueryResult<DetailedStakeInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "farm", "stake", poolId, account],
    queryFn: async () => {
      if (!account) throw new Error("No account provided");

      const [userInfo, poolInfo, pendingRewards] = await Promise.all([
        sdk.masterChef.userInfo(BigInt(poolId), account),
        sdk.masterChef.poolInfo(BigInt(poolId)),
        sdk.masterChef.pendingPonder(BigInt(poolId), account),
      ]);

      // Calculate boost requirements and rewards
      const baseRewards = pendingRewards;
      const boostMultiplier = poolInfo.boostMultiplier;
      const maxBoostRewards = (baseRewards * BigInt(boostMultiplier)) / 10000n;
      const additionalRewards = maxBoostRewards - baseRewards;

      // Calculate PONDER required for max boost (this is a simplified example)
      const ponderRequired = userInfo.amount / 10n; // 10% of staked amount for max boost

      return {
        ...userInfo,
        poolId,
        pendingRewards,
        lpToken: poolInfo.lpToken,
        boost: {
          multiplier: boostMultiplier,
          ponderRequired,
          additionalRewards,
        },
      };
    },
    enabled: enabled && !!account,
    staleTime: 10_000, // 10 seconds
  });
}
