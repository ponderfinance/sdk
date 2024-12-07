import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairInfo } from "@/hooks";

interface CreatorFees {
  // Historical metrics
  totalFeesGenerated: bigint;
  totalFeesUSD?: number;

  // Current fees
  pendingFees: bigint;
  pendingFeesUSD?: number;

  // Rate metrics
  feeRate: number; // 0.1% = 10
  feesPerDay: bigint; // Average daily fees
  feesPerDayUSD?: number;

  // Volume metrics
  totalVolume: bigint;
  volumeUSD?: number;
  volume24h: bigint;
  volume24hUSD?: number;
}

interface LaunchTokenMetrics {
  // Token data
  token: Address;
  creator: Address;
  isLaunchToken: boolean;

  // Pair data
  pairAddress: Address;
  reserves: {
    token: bigint;
    counter: bigint;
  };

  // Fee data
  creatorFeesPending: bigint;
  creatorFeesTotal: bigint;

  // Price data (if available)
  priceUSD?: number;
  priceChange24h?: number;
}

interface ClaimFeesParams {
  token: Address;
  pair: Address;
}

interface ClaimFeesResult {
  success: boolean;
  amount: bigint;
  amountUSD?: number;
}

export function useCreatorFees(
  token: Address | undefined,
  creator: Address | undefined,
  enabled = true
): {
  fees: UseQueryResult<CreatorFees>;
  metrics: UseQueryResult<LaunchTokenMetrics>;
  claimFees: UseMutationResult<ClaimFeesResult, Error, ClaimFeesParams>;
} {
  const sdk = usePonderSDK();
  const { data: pairInfo } = usePairInfo(token, enabled && !!token);

  // Query fee information
  const fees = useQuery({
    queryKey: ["ponder", "fees", "creator", token, creator],
    queryFn: async () => {
      if (!token || !creator || !pairInfo)
        throw new Error("Missing required data");

      // Get events for fee transfers to creator
      const feePaidFilter = await sdk.publicClient.createEventFilter({
        address: token,
        event: {
          type: "event",
          name: "CreatorFeePaid",
          inputs: [
            { type: "address", indexed: true, name: "creator" },
            { type: "uint256", name: "amount" },
          ],
        },
        fromBlock: -200000n, // About 1 day of blocks
      });

      const feeEvents = await sdk.publicClient.getFilterLogs({
        filter: feePaidFilter,
      });

      // Calculate total fees from events
      const totalFeesGenerated = feeEvents.reduce(
        (sum, event) => sum + (event.args.amount as bigint),
        0n
      );

      // Get trading volume over last 24h
      const volumeFilter = await sdk.publicClient.createEventFilter({
        address: pairInfo.address,
        event: {
          type: "event",
          name: "Swap",
          inputs: [
            { type: "address", indexed: true, name: "sender" },
            { type: "uint256", name: "amount0In" },
            { type: "uint256", name: "amount1In" },
            { type: "uint256", name: "amount0Out" },
            { type: "uint256", name: "amount1Out" },
            { type: "address", indexed: true, name: "to" },
          ],
        },
        fromBlock: -7200n, // Last ~6 hours
      });

      const volumeEvents = await sdk.publicClient.getFilterLogs({
        filter: volumeFilter,
      });

      // Calculate 24h metrics
      let volume24h = 0n;
      let pendingFees = 0n;

      for (const event of volumeEvents) {
        const token0 = await sdk.getPair(pairInfo.address).token0();
        const isToken0 = token.toLowerCase() === token0.toLowerCase();

        // Sum volume and calculate pending fees (0.1%)
        const tokenVolume = isToken0
          ? (event.args.amount0In as bigint) + (event.args.amount0Out as bigint)
          : (event.args.amount1In as bigint) +
            (event.args.amount1Out as bigint);

        volume24h += tokenVolume;
        pendingFees += (tokenVolume * 10n) / 10000n; // 0.1%
      }

      // Try to get USD values if price oracle available
      let volumeUSD: number | undefined;
      let totalFeesUSD: number | undefined;
      let pendingFeesUSD: number | undefined;

      try {
        const priceInUSD = await sdk.oracle.consult(
          pairInfo.address,
          token,
          10n ** 18n, // 1 token
          1800 // 30 min average
        );

        if (priceInUSD) {
          volumeUSD = Number(volume24h * priceInUSD) / 1e18;
          totalFeesUSD = Number(totalFeesGenerated * priceInUSD) / 1e18;
          pendingFeesUSD = Number(pendingFees * priceInUSD) / 1e18;
        }
      } catch {
        // Price oracle not available or error
      }

      return {
        totalFeesGenerated,
        totalFeesUSD,
        pendingFees,
        pendingFeesUSD,
        feeRate: 10, // 0.1%
        feesPerDay: (volume24h * 10n) / 10000n, // 0.1% of 24h volume
        feesPerDayUSD: volumeUSD ? volumeUSD * 0.001 : undefined,
        totalVolume: volume24h * 4n, // Extrapolate from 6h to 24h
        volumeUSD: volumeUSD ? volumeUSD * 4 : undefined,
        volume24h,
        volume24hUSD: volumeUSD,
      };
    },
    enabled: enabled && !!token && !!creator && !!pairInfo,
    staleTime: 30_000, // 30 seconds
  });

  // Query detailed metrics
  const metrics = useQuery({
    queryKey: ["ponder", "metrics", "launch", token],
    queryFn: async () => {
      if (!token || !pairInfo) throw new Error("Missing required data");

      const pair = sdk.getPair(pairInfo.address);

      const [token0, token1, reserves, creator, launchLauncher] =
        await Promise.all([
          pair.token0(),
          pair.token1(),
          pair.getReserves(),
          sdk.getLaunchToken(token).creator(),
          sdk
            .getLaunchToken(token)
            .launcher()
            .catch(() => null),
        ]);

      const isToken0 = token.toLowerCase() === token0.toLowerCase();
      const isLaunchToken = launchLauncher === sdk.launcher.address;

      let priceUSD: number | undefined;
      let priceChange24h: number | undefined;

      // Try to get USD price data
      try {
        const [currentPrice, price24hAgo] = await Promise.all([
          sdk.oracle.consult(
            pairInfo.address,
            token,
            10n ** 18n,
            1800 // 30 min
          ),
          sdk.oracle.consult(
            pairInfo.address,
            token,
            10n ** 18n,
            86400 // 24h
          ),
        ]);

        if (currentPrice && price24hAgo) {
          priceUSD = Number(currentPrice) / 1e18;
          priceChange24h =
            ((Number(currentPrice) - Number(price24hAgo)) /
              Number(price24hAgo)) *
            100;
        }
      } catch {
        // Price oracle not available or error
      }

      // Get pending and total fees
      const [pendingFees, totalFees] = await Promise.all([
        fees.data?.pendingFees || 0n,
        fees.data?.totalFeesGenerated || 0n,
      ]);

      return {
        token,
        creator,
        isLaunchToken,
        pairAddress: pairInfo.address,
        reserves: {
          token: isToken0 ? reserves.reserve0 : reserves.reserve1,
          counter: isToken0 ? reserves.reserve1 : reserves.reserve0,
        },
        creatorFeesPending: pendingFees,
        creatorFeesTotal: totalFees,
        priceUSD,
        priceChange24h,
      };
    },
    enabled: enabled && !!token && !!pairInfo,
    staleTime: 30_000,
  });

  // Mutation to claim fees
  const claimFees = useMutation({
    mutationFn: async ({ token, pair }: ClaimFeesParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Transfer events will be emitted automatically by the contract
      // Just need to check if transfer was successful
      const balanceBefore = await sdk
        .getLaunchToken(token)
        .balanceOf(sdk.walletClient.account.address);

      // Wait for transaction confirmation and events
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash: pair,
        confirmations: 1,
      });

      const balanceAfter = await sdk
        .getLaunchToken(token)
        .balanceOf(sdk.walletClient.account.address);

      const amount = balanceAfter - balanceBefore;

      // Try to get USD value
      let amountUSD: number | undefined;
      try {
        const priceInUSD = await sdk.oracle.consult(
          pair,
          token,
          10n ** 18n,
          1800
        );
        if (priceInUSD) {
          amountUSD = Number(amount * priceInUSD) / 1e18;
        }
      } catch {
        // Price oracle not available or error
      }

      return {
        success: amount > 0n,
        amount,
        amountUSD,
      };
    },
  });

  return {
    fees,
    metrics,
    claimFees,
  };
}
