import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type VestingInfo } from "@/contracts/launchtoken";

export interface DetailedVestingInfo extends VestingInfo {
  percentageVested: number;
  percentageClaimed: number;
  nextClaimable: bigint;
  nextClaimDate?: number;
  isFullyVested: boolean;
  isFullyClaimed: boolean;
  dailyVesting: bigint;
}

export function useVestingInfo(
  tokenAddress: Address,
  enabled = true
): UseQueryResult<DetailedVestingInfo> {
  const sdk = usePonderSDK();
  const token = sdk.getLaunchToken(tokenAddress);

  return useQuery({
    queryKey: ["ponder", "launch", "vesting", tokenAddress],
    queryFn: async () => {
      const vestingInfo = await token.getVestingInfo();

      // Calculate vesting metrics
      const totalVested = vestingInfo.total;
      const vestedAmount = vestingInfo.claimed + vestingInfo.available;
      const percentageVested =
        Number((vestedAmount * 10000n) / totalVested) / 100;
      const percentageClaimed =
        Number((vestingInfo.claimed * 10000n) / totalVested) / 100;

      // Calculate daily vesting amount
      const vestingDuration = vestingInfo.end - vestingInfo.start;
      const dailyVesting = (totalVested / vestingDuration) * 86400n;

      // Check vesting status
      const now = BigInt(Math.floor(Date.now() / 1000));
      const isFullyVested = now >= vestingInfo.end;
      const isFullyClaimed = vestingInfo.claimed >= totalVested;

      // Calculate next claim
      const nextClaimDate =
        isFullyVested || isFullyClaimed
          ? undefined
          : Number(
              vestingInfo.start +
                ((now - vestingInfo.start) / 86400n + 1n) * 86400n
            );

      return {
        ...vestingInfo,
        percentageVested,
        percentageClaimed,
        nextClaimable: vestingInfo.available,
        nextClaimDate,
        isFullyVested,
        isFullyClaimed,
        dailyVesting,
      };
    },
    enabled,
    staleTime: 60_000, // 1 minute
  });
}
