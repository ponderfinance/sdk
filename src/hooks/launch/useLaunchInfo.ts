import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { usePonderSDK } from "@/context/PonderContext";
import { type LaunchInfo } from "@/contracts/launcher";

export interface DetailedLaunchInfo extends LaunchInfo {
  progress: number;
  timeRemaining?: number;
  status: "upcoming" | "active" | "completed" | "failed";
  metrics: {
    participantsCount: number;
    averageContribution: bigint;
    remainingAllocation: bigint;
  };
}

export function useLaunchInfo(
    launchId: bigint,
    enabled = true
): UseQueryResult<DetailedLaunchInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "launch", "info", launchId.toString()],
    queryFn: async () => {
      const [launchInfo, contributionInfo] = await Promise.all([
        sdk.launcher.getLaunchInfo(launchId),
        sdk.launcher.getContributionInfo(launchId),
      ]);

      // Calculate progress percentage using total value
      const progress =
          Number((contributionInfo.totalValue * 10000n) / sdk.launcher.TARGET_RAISE) / 100;

      // Determine launch status
      let status: DetailedLaunchInfo["status"];
      if (!launchInfo.launched) {
        status = progress === 100 ? "completed" : "active";
      } else {
        status = contributionInfo.totalValue >= sdk.launcher.TARGET_RAISE ? "completed" : "failed";
      }

      // Calculate metrics
      const averageContribution =
          contributionInfo.totalValue /
          (launchInfo.tokensSold > 0n ? launchInfo.tokensSold : 1n);
      const remainingAllocation = launchInfo.tokensForSale - launchInfo.tokensSold;

      return {
        ...launchInfo,
        progress,
        status,
        metrics: {
          participantsCount: 0, // Would need event tracking to get actual count
          averageContribution,
          remainingAllocation,
        },
      };
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });
}

const TARGET_RAISE = 5555n * 10n ** 18n; // 5,555 ETH
