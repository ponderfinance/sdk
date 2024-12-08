import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCHER_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

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
  // Basic LP info
  amount: bigint;
  unlockTime: number;
  canWithdraw: boolean;
  timeRemaining?: number;
  // Token addresses
  token0: Address;
  token1: Address;
  // Pair info
  pairAddress: Address;
  // Value metrics
  totalValue?: bigint;
  token0Amount?: bigint;
  token1Amount?: bigint;
  // PONDER metrics
  ponderAmount?: bigint;
  ponderLPAmount?: bigint;
  protocolLPAmount?: bigint;
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
      // Get basic launch info
      const launchInfo = await sdk.launcher.getLaunchInfo(launchId);

      // Get WETH address for pair lookup
      const wethAddress = await sdk.router.WETH();

      // Get pair address and contract
      const pairAddress = await sdk.factory.getPair(
        launchInfo.tokenAddress,
        wethAddress
      );
      const pair = sdk.getPair(pairAddress);

      // Get token addresses and verify order
      const [token0, token1] = await Promise.all([
        pair.token0(),
        pair.token1(),
      ]);

      // Get current LP balance
      const lpBalance = await pair.balanceOf(sdk.launcher.address);

      // Get current time and calculate status
      const now = Math.floor(Date.now() / 1000);
      const canWithdraw = now >= Number(launchInfo.lpUnlockTime);
      const timeRemaining = canWithdraw
        ? undefined
        : Number(launchInfo.lpUnlockTime) - now;

      // Get reserves to calculate token amounts
      const reserves = await pair.getReserves();
      const totalSupply = await pair.totalSupply();

      // Calculate token amounts based on LP share
      const token0Amount =
        lpBalance > 0n ? (reserves.reserve0 * lpBalance) / totalSupply : 0n;
      const token1Amount =
        lpBalance > 0n ? (reserves.reserve1 * lpBalance) / totalSupply : 0n;

      // Get PONDER metrics if one of the tokens is PONDER
      let ponderAmount, ponderLPAmount, protocolLPAmount;
      const ponderAddress = sdk.ponder.address;
      if (token0 === ponderAddress || token1 === ponderAddress) {
        // Calculate PONDER amounts from LP
        const ponderReserve =
          token0 === ponderAddress ? reserves.reserve0 : reserves.reserve1;
        ponderAmount =
          lpBalance > 0n ? (ponderReserve * lpBalance) / totalSupply : 0n;

        // Get launch allocation metrics
        const ponderMetrics = await sdk.launcher.calculatePonderRequirements();
        ponderLPAmount = ponderMetrics.lpAllocation;
        protocolLPAmount = ponderMetrics.protocolLPAllocation;
      }

      return {
        amount: lpBalance,
        unlockTime: Number(launchInfo.lpUnlockTime),
        canWithdraw,
        timeRemaining,
        token0,
        token1,
        pairAddress,
        totalValue: lpBalance,
        token0Amount,
        token1Amount,
        ponderAmount,
        ponderLPAmount,
        protocolLPAmount,
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

      // Verify we can withdraw
      const lpInfo = await sdk.launcher.getLaunchInfo(launchId);
      const now = Math.floor(Date.now() / 1000);
      if (now < Number(lpInfo.lpUnlockTime)) {
        throw new Error("LP tokens still locked");
      }

      // Simulate withdrawal
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.launcher.address,
        abi: LAUNCHER_ABI,
        functionName: "withdrawLP",
        args: [launchId],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      // Execute withdrawal
      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      // Wait for confirmation and decode events
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      const events: LPWithdrawResult["events"] = {};

      // Look for LP withdrawal event
      const withdrawalLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0x8d7c3c56f4e7f949b483f37118c9b7d56c947690b5ff3db6757b7c634c23a4b9"
      );

      if (withdrawalLog) {
        const decoded = decodeEventLog({
          abi: LAUNCHER_ABI,
          data: withdrawalLog.data,
          topics: withdrawalLog.topics,
          eventName: "LPTokensWithdrawn",
        });

        events.lpWithdrawn = {
          launchId: decoded.args.launchId,
          creator: decoded.args.creator,
          amount: decoded.args.amount,
        };
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
