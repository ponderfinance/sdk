import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairInfo } from "./usePairInfo";

export interface PositionValue {
  // Token amounts
  token0Amount: bigint;
  token1Amount: bigint;
  token0Symbol: string;
  token1Symbol: string;

  // Share info
  lpBalance: bigint;
  sharePercent: number;

  // USD Values (optional if oracle available)
  token0ValueUSD?: number;
  token1ValueUSD?: number;
  totalValueUSD?: number;

  // Additional metrics
  impermanentLoss?: {
    percent: number;
    valueUSD?: number;
  };
  feesEarned?: {
    token0Amount: bigint;
    token1Amount: bigint;
    valueUSD?: number;
  };
}

export function usePositionValue(
  pairAddress: Address | undefined,
  account: Address | undefined,
  enabled = true
): UseQueryResult<PositionValue> {
  const sdk = usePonderSDK();
  const { data: pairInfo } = usePairInfo(pairAddress, enabled);

  return useQuery({
    queryKey: ["ponder", "position", "value", pairAddress, account],
    queryFn: async () => {
      if (!pairAddress || !account || !pairInfo) {
        throw new Error("Pair address, account, and pair info required");
      }

      const pair = sdk.getPair(pairAddress);

      // Get LP token data
      const [lpBalance, totalSupply] = await Promise.all([
        pair.balanceOf(account),
        pair.totalSupply(),
      ]);

      if (lpBalance === 0n) {
        return {
          token0Amount: 0n,
          token1Amount: 0n,
          token0Symbol: pairInfo.token0Symbol,
          token1Symbol: pairInfo.token1Symbol,
          lpBalance: 0n,
          sharePercent: 0,
        };
      }

      // Calculate share of pool
      const sharePercent = Number((lpBalance * 10000n) / totalSupply) / 100;

      // Calculate token amounts
      const token0Amount = (BigInt(pairInfo.reserve0)* lpBalance) / totalSupply;
      const token1Amount = (BigInt(pairInfo.reserve1)* lpBalance) / totalSupply;

      // Try to get USD values if oracle is available
      let token0ValueUSD: number | undefined;
      let token1ValueUSD: number | undefined;
      let totalValueUSD: number | undefined;
      let token0PriceUSD: bigint | undefined;
      let token1PriceUSD: bigint | undefined;

      try {
        // Get oracle prices
        [token0PriceUSD, token1PriceUSD] = await Promise.all([
          sdk.oracle.consult(
            pairAddress,
            pairInfo.token0,
            10n ** 18n, // 1 token
            1800 // 30 min average
          ),
          sdk.oracle.consult(
            pairAddress,
            pairInfo.token1,
            10n ** 18n, // 1 token
            1800 // 30 min average
          ),
        ]);

        // Calculate USD values
        token0ValueUSD = Number(token0PriceUSD * token0Amount) / 1e18;
        token1ValueUSD = Number(token1PriceUSD * token1Amount) / 1e18;
        totalValueUSD = token0ValueUSD + token1ValueUSD;
      } catch {
        // Oracle not available or error calculating USD value
      }

      // Calculate impermanent loss if we have price data
      let impermanentLoss: { percent: number; valueUSD?: number } | undefined;
      if (token0PriceUSD && token1PriceUSD) {
        try {
          // Get initial deposit ratio from first Mint event
          const mintFilter = await sdk.publicClient.createEventFilter({
            address: pairAddress,
            event: {
              type: "event",
              name: "Mint",
              inputs: [
                { type: "address", name: "sender", indexed: true },
                { type: "uint256", name: "amount0" },
                { type: "uint256", name: "amount1" },
              ],
            },
            fromBlock: "earliest",
          });

          const mintLogs = await sdk.publicClient.getFilterLogs({
            filter: mintFilter,
          });
          const firstMint = mintLogs[0];

          if (firstMint) {
            const initialAmount0 = BigInt(firstMint.args.amount0 || 0);
            const initialAmount1 = BigInt(firstMint.args.amount1 || 0);

            // Calculate IL using standard formula
            const initialValue =
              Number(
                initialAmount0 * token0PriceUSD +
                  initialAmount1 * token1PriceUSD
              ) / 1e18;
            const currentValue = totalValueUSD || 0;
            const ilPercent = (currentValue / initialValue - 1) * 100;
            const ilUSD = currentValue - initialValue;

            impermanentLoss = {
              percent: ilPercent,
              valueUSD: ilUSD,
            };
          }
        } catch {
          // Error calculating IL
        }
      }

      // Calculate fees earned if possible
      let feesEarned:
        | { token0Amount: bigint; token1Amount: bigint; valueUSD?: number }
        | undefined;
      try {
        const events = await sdk.publicClient.getContractEvents({
          address: pairAddress,
          abi: [
            {
              type: "event",
              name: "Mint",
              inputs: [
                { type: "address", name: "sender", indexed: true },
                { type: "uint256", name: "amount0" },
                { type: "uint256", name: "amount1" },
              ],
            },
          ],
          fromBlock: "earliest",
        });

        // Sum up fees from events
        const token0Fees = events.reduce(
          (acc, event) => acc + (BigInt(event.args.amount0 || 0) * 3n) / 1000n,
          0n
        );
        const token1Fees = events.reduce(
          (acc, event) => acc + (BigInt(event.args.amount1 || 0) * 3n) / 1000n,
          0n
        );

        feesEarned = {
          token0Amount: token0Fees,
          token1Amount: token1Fees,
          valueUSD:
            token0PriceUSD && token1PriceUSD
              ? Number(
                  token0Fees * token0PriceUSD + token1Fees * token1PriceUSD
                ) / 1e18
              : undefined,
        };
      } catch {
        // Error calculating fees
      }

      return {
        token0Amount,
        token1Amount,
        token0Symbol: pairInfo.token0Symbol,
        token1Symbol: pairInfo.token1Symbol,
        lpBalance,
        sharePercent,
        token0ValueUSD,
        token1ValueUSD,
        totalValueUSD,
        impermanentLoss,
        feesEarned,
      };
    },
    enabled: enabled && !!pairAddress && !!account && !!pairInfo,
    staleTime: 30_000, // 30 seconds
  });
}
