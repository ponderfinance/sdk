import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";
import { type SupportedChainId } from "@/constants/chains";
import { Pair } from "@/contracts/pair";

export interface PairInfo {
  // Basic pair data
  address: Address;
  token0: Address;
  token1: Address;
  token0Symbol: string;
  token1Symbol: string;
  token0Decimals: number;
  token1Decimals: number;
  reserve0: bigint;
  reserve1: bigint;
  totalSupply: bigint;
  kLast: bigint;

  // Fee configuration
  fee: {
    LP: bigint; // 30 = 0.3% by default
    creator: bigint; // 10 = 0.1% if launch token
    recipient?: Address; // Creator address if launch token
  };

  // Launch token specific info
  launch?: {
    token: Address; // Which token is the launch token
    creator: Address; // Creator address
    launcher: Address; // Launcher contract
    isPair0Launch: boolean; // Whether token0 is launch token
  };
}

export function usePairInfo(
  pairAddress: Address | undefined,
  enabled = true
): UseQueryResult<PairInfo & { asPair: () => Pair }> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "pair", "info", pairAddress],
    queryFn: async () => {
      if (!pairAddress) throw new Error("Pair address required");

      const pair = sdk.getPair(pairAddress);

      // Fetch basic pair data
      const [token0, token1, reserves, totalSupply, kLast] = await Promise.all([
        pair.token0(),
        pair.token1(),
        pair.getReserves(),
        pair.totalSupply(),
        pair.kLast(),
      ]);

      async function getTokenInfo(tokenAddress: Address) {
        const [symbol, decimals] = await Promise.all([
          sdk.publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "symbol",
          }),
          sdk.publicClient.readContract({
            address: tokenAddress,
            abi: erc20Abi,
            functionName: "decimals",
          }),
        ]);

        return { symbol: symbol as string, decimals: decimals as number };
      }

      const [token0Info, token1Info] = await Promise.all([
        getTokenInfo(token0),
        getTokenInfo(token1),
      ]);

      const pairInfo: PairInfo = {
        address: pairAddress,
        token0,
        token1,
        token0Symbol: token0Info.symbol,
        token1Symbol: token1Info.symbol,
        token0Decimals: token0Info.decimals,
        token1Decimals: token1Info.decimals,
        reserve0: reserves.reserve0,
        reserve1: reserves.reserve1,
        totalSupply,
        kLast,
        fee: {
          LP: 30n,
          creator: 0n,
        },
      };

      return {
        ...pairInfo,
        asPair: () =>
          new Pair(1 as SupportedChainId, pairInfo.address, sdk.publicClient),
      };
    },
    enabled: enabled && !!pairAddress,
    staleTime: 30_000, // 30 seconds
  });
}
