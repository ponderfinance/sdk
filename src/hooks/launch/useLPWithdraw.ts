import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash, decodeEventLog } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCHER_ABI } from "@/abis";

interface LPWithdrawParams {
  launchId: bigint;
}

interface LPWithdrawResult {
  hash: Hash;
  amount: bigint;
  events: {
    lpWithdrawn?: {
      launchId: bigint;
      creator: Address;
      amount: bigint;
    };
  };
}

export interface LPInfo {
  amount: bigint;
  unlockTime: number;
  canWithdraw: boolean;
  timeRemaining?: number;
  token0: Address;
  token1: Address;
}

// Hook for checking LP withdrawal status
export function useLPInfo(
  launchId: bigint,
  enabled = true
): UseQueryResult<LPInfo> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "launch", "lp", launchId.toString()],
    queryFn: async () => {
      const launchInfo = await sdk.launcher.getLaunchInfo(launchId);
      const pairAddress = await sdk.factory.getPair(
        launchInfo.tokenAddress,
        await sdk.router.WETH()
      );

      const pair = sdk.getPair(pairAddress);
      const [token0, token1, lpBalance] = await Promise.all([
        pair.token0(),
        pair.token1(),
        pair.balanceOf(sdk.launcher.address),
      ]);

      const now = Math.floor(Date.now() / 1000);
      const canWithdraw = now >= Number(launchInfo.lpUnlockTime);
      const timeRemaining = canWithdraw
        ? undefined
        : Number(launchInfo.lpUnlockTime) - now;

      return {
        amount: lpBalance,
        unlockTime: Number(launchInfo.lpUnlockTime),
        canWithdraw,
        timeRemaining,
        token0,
        token1,
      };
    },
    enabled,
    staleTime: 30_000, // 30 seconds
  });
}

// Hook for withdrawing LP tokens
export function useLPWithdraw(): UseMutationResult<
  LPWithdrawResult,
  Error,
  LPWithdrawParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ launchId }: LPWithdrawParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const hash = await sdk.launcher.withdrawLP(launchId);

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      const events: LPWithdrawResult["events"] = {};

      for (const log of receipt.logs) {
        try {
          if (
            log.topics[0] ===
            "0x8d7c3c56f4e7f949b483f37118c9b7d56c947690b5ff3db6757b7c634c23a4b9"
          ) {
            // LPTokensWithdrawn event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "LPTokensWithdrawn",
            } as const);

            events.lpWithdrawn = {
              launchId: decoded.args.launchId,
              creator: decoded.args.creator,
              amount: decoded.args.amount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
          continue;
        }
      }

      return {
        hash,
        amount: events.lpWithdrawn?.amount || 0n,
        events,
      };
    },
    onError: (error) => {
      console.error("LP withdrawal error:", error);
      throw error;
    },
  });
}
