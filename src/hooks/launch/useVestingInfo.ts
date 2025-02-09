import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type PonderToken } from "@/contracts/pondertoken";
import { type LaunchToken } from "@/contracts/launchtoken";

export interface VestingSchedule {
  total: bigint;
  claimed: bigint;
  available: bigint;
  start: bigint;
  end: bigint;
  dailyVesting: bigint;
}

export interface DetailedVestingInfo {
  // General vesting metrics
  totalVested: bigint;
  vestedAmount: bigint;
  claimedAmount: bigint;
  availableToClaim: bigint;
  // Time info
  vestingStart: bigint;
  vestingEnd: bigint;
  nextClaimDate?: bigint;
  // Progress metrics
  percentageVested: number;
  percentageClaimed: number;
  // Status
  isFullyVested: boolean;
  isFullyClaimed: boolean;
  // Rate metrics
  dailyVestingRate: bigint;
  // Token specific (for launch tokens)
  creator?: Address;
  creatorFees?: bigint;
  // Team vesting (for PONDER token)
  teamAllocation?: bigint;
  teamClaimed?: bigint;
}

interface VestingParams {
  token: Address;
  type: "launch" | "ponder";
  account?: Address;
}

export function useVestingInfo(
  params: VestingParams,
  enabled = true
): UseQueryResult<DetailedVestingInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: [
      "ponder",
      "vesting",
      "info",
      params.token,
      params.type,
      params.account,
    ],
    queryFn: async () => {
      if (params.type === "launch") {
        return getLaunchTokenVesting(params.token, params.account, sdk);
      } else {
        return getPonderTokenVesting(params.token, params.account, sdk);
      }
    },
    enabled:
      enabled &&
      !!params.token &&
      (params.type === "ponder" || !!params.account),
    staleTime: 30_000, // 30 seconds
  });
}

async function getLaunchTokenVesting(
  tokenAddress: Address,
  account: Address | undefined,
  sdk: ReturnType<typeof usePonderSDK>
): Promise<DetailedVestingInfo> {
  const token = sdk.getLaunchToken(tokenAddress);
  const vestingInfo = await token.getVestingInfo();

  // Calculate daily vesting amount
  const totalSeconds = vestingInfo.end - vestingInfo.start;
  const dailyRate = (vestingInfo.total * 86400n) / totalSeconds;

  // Calculate next claim time if not fully vested
  const now = BigInt(Math.floor(Date.now() / 1000));
  const nextClaimDate =
    now >= vestingInfo.end
      ? undefined
      : vestingInfo.start + ((now - vestingInfo.start) / 86400n + 1n) * 86400n;

  const [creator] = await Promise.all([token.creator()]);

  return {
    totalVested: vestingInfo.total,
    vestedAmount: vestingInfo.claimed + vestingInfo.available,
    claimedAmount: vestingInfo.claimed,
    availableToClaim: vestingInfo.available,
    vestingStart: vestingInfo.start,
    vestingEnd: vestingInfo.end,
    nextClaimDate,
    percentageVested:
      Number(
        ((vestingInfo.claimed + vestingInfo.available) * 10000n) /
          vestingInfo.total
      ) / 100,
    percentageClaimed:
      Number((vestingInfo.claimed * 10000n) / vestingInfo.total) / 100,
    isFullyVested: now >= vestingInfo.end,
    isFullyClaimed: vestingInfo.claimed >= vestingInfo.total,
    dailyVestingRate: dailyRate,
    creator,
  };
}

async function getPonderTokenVesting(
  tokenAddress: Address,
  account: Address | undefined,
  sdk: ReturnType<typeof usePonderSDK>
): Promise<DetailedVestingInfo> {
  const ponder = sdk.ponder;

  const [deploymentTime, teamTokensClaimed] = await Promise.all([
    ponder.deploymentTime(),
    ponder.teamTokensClaimed(),
  ]);

  const now = BigInt(Math.floor(Date.now() / 1000));
  const vestingStart = deploymentTime;
  const vestingEnd = vestingStart + ponder.VESTING_DURATION;
  const timeElapsed = now - vestingStart;

  // Calculate team vesting
  const teamAllocation = ponder.TEAM_ALLOCATION;
  const vestedAmount =
    timeElapsed >= ponder.VESTING_DURATION
      ? teamAllocation
      : (teamAllocation * timeElapsed) / ponder.VESTING_DURATION;

  const availableToClaim =
    vestedAmount > teamTokensClaimed ? vestedAmount - teamTokensClaimed : 0n;

  const dailyRate = (teamAllocation * 86400n) / ponder.VESTING_DURATION;

  const nextClaimDate =
    now >= vestingEnd
      ? undefined
      : vestingStart + (timeElapsed / 86400n + 1n) * 86400n;

  return {
    totalVested: teamAllocation,
    vestedAmount,
    claimedAmount: teamTokensClaimed,
    availableToClaim,
    vestingStart,
    vestingEnd,
    nextClaimDate,
    percentageVested: Number((vestedAmount * 10000n) / teamAllocation) / 100,
    percentageClaimed:
      Number((teamTokensClaimed * 10000n) / teamAllocation) / 100,
    isFullyVested: now >= vestingEnd,
    isFullyClaimed: teamTokensClaimed >= teamAllocation,
    dailyVestingRate: dailyRate,
    teamAllocation,
    teamClaimed: teamTokensClaimed,
  };
}
