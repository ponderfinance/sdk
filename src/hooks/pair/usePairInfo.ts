import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address, erc20Abi } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type PonderPair } from "@/contracts/pair";
import { launchtokenAbi } from "@ponderfinance/dex";

export interface PairInfo {
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
  fee: {
    LP: bigint; // 0.3% by default
    creator: bigint; // 0.1% if launch token
    recipient?: Address; // Creator address if it's a launch token
  };
}

export function usePairInfo(
  pairAddress: Address | undefined,
  enabled = true
): UseQueryResult<PairInfo> {
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
        pair.kLast(), // Changed from getKLast() to kLast()
      ]);

      // Function to safely get token info
      async function getTokenInfo(tokenAddress: Address) {
        let isLaunchToken = false;
        let creator: Address | undefined;

        try {
          // Try to read launcher() to check if it's a launch token
          const launcherAddress = await sdk.publicClient.readContract({
            address: tokenAddress,
            abi: launchtokenAbi,
            functionName: "launcher",
          });

          if (launcherAddress === sdk.launcher.address) {
            isLaunchToken = true;
            creator = (await sdk.publicClient.readContract({
              address: tokenAddress,
              abi: launchtokenAbi,
              functionName: "creator",
            })) as Address;
          }
        } catch {
          // Not a launch token - this is expected for regular ERC20s
        }

        // Read basic ERC20 info
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

        return {
          symbol: symbol as string,
          decimals: decimals as number,
          isLaunchToken,
          creator,
        };
      }

      // Get info for both tokens in parallel
      const [token0Info, token1Info] = await Promise.all([
        getTokenInfo(token0),
        getTokenInfo(token1),
      ]);

      // Determine fees - 0.1% creator fee if either token is a launch token
      let creatorFee = BigInt(0);
      let creatorAddress: Address | undefined;

      if (token0Info.isLaunchToken) {
        creatorFee = BigInt(10); // 0.1%
        creatorAddress = token0Info.creator;
      } else if (token1Info.isLaunchToken) {
        creatorFee = BigInt(10); // 0.1%
        creatorAddress = token1Info.creator;
      }

      return {
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
          LP: 30n, // 0.3%
          creator: creatorFee,
          recipient: creatorAddress,
        },
      };
    },
    enabled: enabled && !!pairAddress,
    staleTime: 30_000, // 30 seconds
  });
}
