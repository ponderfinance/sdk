import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairInfo } from "./usePairInfo";

export interface LiquidityPosition {
  pairAddress: Address;
  balance: bigint;
  totalSupply: bigint;
  sharePercentage: number;
  token0Amount: bigint;
  token1Amount: bigint;
  token0Symbol: string;
  token1Symbol: string;
  usdValue?: bigint; // Optional USD value if price oracle available
}

export function useLPTokenBalance(
  pairAddress: Address | undefined,
  account: Address | undefined,
  enabled = true
): UseQueryResult<LiquidityPosition> {
  const sdk = usePonderSDK();
  const { data: pairInfo } = usePairInfo(pairAddress, enabled);

  return useQuery({
    queryKey: ["ponder", "lp", "balance", pairAddress, account],
    queryFn: async () => {
      if (!pairAddress || !account || !pairInfo) {
        throw new Error("Pair address, account, and pair info required");
      }

      const pair = sdk.getPair(pairAddress);
      const balance = await pair.balanceOf(account);

      // Calculate share of pool
      const sharePercentage =
        Number((balance * 10000n) / pairInfo.totalSupply) / 100;

      // Calculate token amounts based on reserves and share
      const token0Amount = (BigInt(pairInfo.reserve0)* balance) / pairInfo.totalSupply;
      const token1Amount = (BigInt(pairInfo.reserve1)* balance) / pairInfo.totalSupply;

      // Optional: Get USD value if oracle is available
      let usdValue: bigint | undefined;
      try {
        const token0Value = await sdk.oracle.consult(
          pairAddress,
          pairInfo.token0,
          token0Amount,
          3600 // 1 hour average
        );
        const token1Value = await sdk.oracle.consult(
          pairAddress,
          pairInfo.token1,
          token1Amount,
          3600
        );
        usdValue = token0Value + token1Value;
      } catch {
        // Oracle not available or error calculating USD value
      }

      return {
        pairAddress,
        balance,
        totalSupply: pairInfo.totalSupply,
        sharePercentage,
        token0Amount,
        token1Amount,
        token0Symbol: pairInfo.token0Symbol,
        token1Symbol: pairInfo.token1Symbol,
        usdValue,
      };
    },
    enabled: enabled && !!pairAddress && !!account && !!pairInfo,
    staleTime: 10_000, // 10 seconds
  });
}
