import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairInfo } from "./usePairInfo";

interface QuoteParams {
  tokenA: Address;
  tokenB: Address;
  amountADesired?: bigint;
  amountBDesired?: bigint;
}

export interface PairQuote {
  amountA: bigint;
  amountB: bigint;
  share: number;
  amountAMin: bigint;
  amountBMin: bigint;
  priceImpact: number;
}

export function usePairQuote(
  params: QuoteParams | undefined,
  slippageBps = 50, // 0.5% default slippage
  enabled = true
): UseQueryResult<PairQuote> {
  const sdk = usePonderSDK();
  const { data: pairAddress } = useQuery({
    queryKey: ["ponder", "factory", "pair", params?.tokenA, params?.tokenB],
    queryFn: async () => {
      if (!params) return undefined;
      return await sdk.factory.getPair(params.tokenA, params.tokenB);
    },
    enabled: enabled && !!params,
  });

  const { data: pairInfo } = usePairInfo(pairAddress, enabled && !!pairAddress);

  return useQuery({
    queryKey: ["ponder", "pair", "quote", params, slippageBps],
    queryFn: async () => {
      if (!params || !pairInfo) {
        throw new Error("Params and pair info required");
      }

      const { tokenA, tokenB, amountADesired, amountBDesired } = params;

      // Handle first liquidity provision
      if (pairInfo.reserve0 === 0n && pairInfo.reserve1 === 0n) {
        if (!amountADesired || !amountBDesired) {
          throw new Error("Both amounts required for first liquidity");
        }

        return {
          amountA: amountADesired,
          amountB: amountBDesired,
          share: 100, // First LP gets 100% share
          amountAMin: (amountADesired * BigInt(10000 - slippageBps)) / 10000n,
          amountBMin: (amountBDesired * BigInt(10000 - slippageBps)) / 10000n,
          priceImpact: 0, // No price impact for first liquidity
        };
      }

      // Calculate amounts based on reserves
      const calculateQuote = (
        amountIn: bigint,
        reserveIn: bigint,
        reserveOut: bigint
      ): bigint => {
        if (amountIn === 0n || reserveIn === 0n || reserveOut === 0n) return 0n;
        return (amountIn * reserveOut) / reserveIn;
      };

      let amountA: bigint;
      let amountB: bigint;

      const [reserve0, reserve1] = [pairInfo.reserve0, pairInfo.reserve1];
      const isAToken0 = tokenA.toLowerCase() < tokenB.toLowerCase();

      if (amountADesired && !amountBDesired) {
        // Quote B amount based on A
        amountA = amountADesired;
        amountB = calculateQuote(
          amountA,
          isAToken0 ? reserve0 : reserve1,
          isAToken0 ? reserve1 : reserve0
        );
      } else if (!amountADesired && amountBDesired) {
        // Quote A amount based on B
        amountB = amountBDesired;
        amountA = calculateQuote(
          amountB,
          isAToken0 ? reserve1 : reserve0,
          isAToken0 ? reserve0 : reserve1
        );
      } else if (amountADesired && amountBDesired) {
        // Use optimal ratio
        const optimalB = calculateQuote(
          amountADesired,
          isAToken0 ? reserve0 : reserve1,
          isAToken0 ? reserve1 : reserve0
        );

        if (optimalB <= amountBDesired) {
          amountA = amountADesired;
          amountB = optimalB;
        } else {
          amountB = amountBDesired;
          amountA = calculateQuote(
            amountB,
            isAToken0 ? reserve1 : reserve0,
            isAToken0 ? reserve0 : reserve1
          );
        }
      } else {
        throw new Error("At least one amount required");
      }

      // Calculate share of pool
      const share =
        Number(
          (amountA * amountB * 10000n) /
            ((reserve0 + amountA) * (reserve1 + amountB))
        ) / 100;

      // Calculate minimum amounts with slippage
      const amountAMin = (amountA * BigInt(10000 - slippageBps)) / 10000n;
      const amountBMin = (amountB * BigInt(10000 - slippageBps)) / 10000n;

      // Calculate price impact
      const priceRatioBefore = Number(reserve0) / Number(reserve1);
      const priceRatioAfter =
        Number(reserve0 + amountA) / Number(reserve1 + amountB);
      const priceImpact = Math.abs(
        ((priceRatioAfter - priceRatioBefore) / priceRatioBefore) * 100
      );

      return {
        amountA,
        amountB,
        share,
        amountAMin,
        amountBMin,
        priceImpact,
      };
    },
    enabled: enabled && !!params && !!pairInfo,
    staleTime: 10_000, // 10 seconds
  });
}
