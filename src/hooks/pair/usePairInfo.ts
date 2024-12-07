import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";
import { launchtokenAbi } from "@ponderfinance/dex";

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
    LP: bigint;                // 30 = 0.3% by default
    creator: bigint;           // 10 = 0.1% if launch token
    recipient?: Address;       // Creator address if launch token
  };

  // Launch token specific info
  launch?: {
    token: Address;           // Which token is the launch token
    creator: Address;         // Creator address
    launcher: Address;        // Launcher contract
    isPair0Launch: boolean;   // Whether token0 is launch token
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
        pair.kLast(),
      ]);

      // Function to safely get token info including launch token check
      async function getTokenInfo(tokenAddress: Address) {
        let isLaunchToken = false;
        let launchData: {
          creator: Address;
          launcher: Address;
        } | undefined;

        try {
          // Try to read launcher() to check if it's a launch token
          const launcher = await sdk.publicClient.readContract({
            address: tokenAddress,
            abi: launchtokenAbi,
            functionName: "launcher",
          }) as Address;

          if (launcher === sdk.launcher.address) {
            isLaunchToken = true;
            const creator = await sdk.publicClient.readContract({
              address: tokenAddress,
              abi: launchtokenAbi,
              functionName: "creator",
            }) as Address;

            launchData = {
              creator,
              launcher
            };
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
          launchData
        };
      }

      // Get info for both tokens in parallel
      const [token0Info, token1Info] = await Promise.all([
        getTokenInfo(token0),
        getTokenInfo(token1),
      ]);

      // Determine fee configuration based on launch token status
      let lpFee = 30n; // Default 0.3%
      let creatorFee = 0n;
      let creatorAddress: Address | undefined;
      let launchInfo;

      if (token0Info.isLaunchToken && token0Info.launchData) {
        lpFee = 20n; // 0.2%
        creatorFee = 10n; // 0.1%
        creatorAddress = token0Info.launchData.creator;
        launchInfo = {
          token: token0,
          creator: token0Info.launchData.creator,
          launcher: token0Info.launchData.launcher,
          isPair0Launch: true
        };
      } else if (token1Info.isLaunchToken && token1Info.launchData) {
        lpFee = 20n; // 0.2%
        creatorFee = 10n; // 0.1%
        creatorAddress = token1Info.launchData.creator;
        launchInfo = {
          token: token1,
          creator: token1Info.launchData.creator,
          launcher: token1Info.launchData.launcher,
          isPair0Launch: false
        };
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
          LP: lpFee,
          creator: creatorFee,
          recipient: creatorAddress
        },
        launch: launchInfo
      };
    },
    enabled: enabled && !!pairAddress,
    staleTime: 30_000, // 30 seconds
  });
}
