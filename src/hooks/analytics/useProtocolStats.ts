import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface ProtocolStats {
  tvl: bigint;
  volume24h: bigint;
  volume7d: bigint;
  totalPairs: number;
  totalLaunches: number;
  totalFees: {
    protocol: bigint;
    creators: bigint;
    lps: bigint;
  };
  uniqueUsers: number;
  ponderMetrics: {
    price: number;
    marketCap: bigint;
    circulatingSupply: bigint;
    totalSupply: bigint;
    holders: number;
  };
}

// export function useProtocolStats(
//   enabled = true
// ): UseQueryResult<ProtocolStats> {
//   const sdk = usePonderSDK();
//
//   return useQuery({
//     queryKey: ["ponder", "stats", "protocol"],
//     queryFn: async () => {
//       // Get all pairs
//       const pairCount = await sdk.factory.allPairsLength();
//       const pairs: Address[] = [];
//
//       for (let i = 0n; i < pairCount; i++) {
//         pairs.push(await sdk.factory.allPairs(Number(i)));
//       }
//
//       // Calculate TVL and volumes
//       let tvl = 0n;
//       let volume24h = 0n;
//       let volume7d = 0n;
//
//       for (const pairAddress of pairs) {
//         const pair = sdk.getPair(pairAddress);
//         const [token0, token1, reserves] = await Promise.all([
//           pair.token0(),
//           pair.token1(),
//           pair.getReserves(),
//         ]);
//
//         // Get token prices from price oracle
//         const token0Price = await sdk.oracle.consult(
//           pairAddress,
//           token0,
//           10n ** 18n,
//           1800
//         );
//         const token1Price = await sdk.oracle.consult(
//           pairAddress,
//           token1,
//           10n ** 18n,
//           1800
//         );
//
//         // Calculate TVL (simplified - should use proper price aggregation)
//         const pairTVL =
//           (reserves.reserve0 * token0Price + reserves.reserve1 * token1Price) /
//           10n ** 18n;
//         tvl += pairTVL;
//
//         // Get volume from events
//         const swapFilter = await sdk.publicClient.createEventFilter({
//           address: pairAddress,
//           event: {
//             type: "event",
//             name: "Swap",
//             inputs: [
//               { type: "address", name: "sender", indexed: true },
//               { type: "uint256", name: "amount0In" },
//               { type: "uint256", name: "amount1In" },
//               { type: "uint256", name: "amount0Out" },
//               { type: "uint256", name: "amount1Out" },
//               { type: "address", name: "to", indexed: true },
//             ],
//           },
//           fromBlock: -7200n, // ~24h of blocks
//         });
//
//         const swapLogs = await sdk.publicClient.getFilterLogs({
//           filter: swapFilter,
//         });
//
//         for (const log of swapLogs) {
//           const volumeInToken0 =
//             (log.args.amount0In as bigint) + (log.args.amount0Out as bigint);
//           volume24h += (volumeInToken0 * token0Price) / 10n ** 18n;
//         }
//       }
//
//       // Get PONDER token metrics
//       const ponderToken = await sdk.masterChef.ponder();
//       const [totalSupply, circulatingSupply] = await Promise.all([
//         ponderToken.totalSupply(),
//         ponderToken.totalSupply() -
//           (await ponderToken.balanceOf(sdk.masterChef.address)),
//       ]);
//
//       // Get launch platform stats
//       const launchCount = await sdk.launcher.launchCount();
//
//       return {
//         tvl,
//         volume24h,
//         volume7d: volume24h * 7n, // Simplified - should calculate actual 7d volume
//         totalPairs: Number(pairCount),
//         totalLaunches: Number(launchCount),
//         totalFees: {
//           protocol: (tvl * 55n) / 10000n, // 0.55% protocol fee
//           creators: (tvl * 255n) / 10000n, // 2.55% creator fee
//           lps: (tvl * 300n) / 10000n, // 3% LP fee
//         },
//         uniqueUsers: 0, // Would need indexer data for this
//         ponderMetrics: {
//           price: 0, // Would need price feed
//           marketCap: circulatingSupply, // Simplified - should multiply by price
//           circulatingSupply,
//           totalSupply,
//           holders: 0, // Would need indexer data
//         },
//       };
//     },
//     enabled,
//     staleTime: 60_000, // 1 minute
//   });
// }
