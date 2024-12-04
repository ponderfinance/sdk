import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface Trade {
  hash: string;
  pair: Address;
  trader: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  timestamp: number;
}

export interface PairVolume {
  pair: Address;
  volume24h: bigint;
  volumeShare: number;
  trades: number;
  tvl: bigint;
  fee24h: bigint;
}

export interface TradingAnalytics {
  recentTrades: Trade[];
  topPairs: PairVolume[];
  aggregatedMetrics: {
    uniqueTraders24h: number;
    averageTradeSize: bigint;
    totalTrades24h: number;
    totalVolume24h: bigint;
    totalFees24h: bigint;
  };
}

// export function useTradingAnalytics(
//   enabled = true
// ): UseQueryResult<TradingAnalytics> {
//   const sdk = usePonderSDK();
//
//   return useQuery({
//     queryKey: ["ponder", "analytics", "trading"],
//     queryFn: async () => {
//       // Get all pairs first
//       const pairCount = await sdk.factory.allPairsLength();
//       const pairs: Address[] = [];
//       const pairVolumes = new Map<string, PairVolume>();
//       const recentTrades: Trade[] = [];
//       const traders = new Set<string>();
//
//       let totalVolume = 0n;
//
//       // Collect data for each pair
//       for (let i = 0n; i < pairCount; i++) {
//         const pairAddress = await sdk.factory.allPairs(Number(i));
//         pairs.push(pairAddress);
//
//         const pair = sdk.getPair(pairAddress);
//         const [token0, token1, reserves] = await Promise.all([
//           pair.token0(),
//           pair.token1(),
//           pair.getReserves(),
//         ]);
//
//         // Get recent swaps
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
//         let pairVolume = 0n;
//         let trades = 0;
//
//         // Process each swap
//         for (const log of swapLogs) {
//           const amount0In = log.args.amount0In as bigint;
//           const amount1In = log.args.amount1In as bigint;
//           const amount0Out = log.args.amount0Out as bigint;
//           const amount1Out = log.args.amount1Out as bigint;
//
//           // Determine which token was sold
//           const [tokenIn, amountIn, amountOut] =
//             amount0In > 0n
//               ? [token0, amount0In, amount1Out]
//               : [token1, amount1In, amount0Out];
//
//           const tokenOut = tokenIn === token0 ? token1 : token0;
//
//           // Create trade record
//           recentTrades.push({
//             hash: log.transactionHash,
//             pair: pairAddress,
//             trader: log.args.sender as Address,
//             tokenIn,
//             tokenOut,
//             amountIn,
//             amountOut,
//             timestamp: Number(log.blockTimestamp),
//           });
//
//           // Update metrics
//           pairVolume += amountIn;
//           trades += 1;
//           traders.add(log?.args?.sender?.toLowerCase());
//         }
//
//         // Store pair volume data
//         pairVolumes.set(pairAddress, {
//           pair: pairAddress,
//           volume24h: pairVolume,
//           volumeShare: 0, // Will calculate after getting total
//           trades,
//           tvl: reserves.reserve0 + reserves.reserve1, // Simplified - should use prices
//           fee24h: (pairVolume * 3n) / 1000n, // 0.3% fee
//         });
//
//         totalVolume += pairVolume;
//       }
//
//       // Calculate volume shares and sort pairs
//       const topPairs = Array.from(pairVolumes.values())
//         .map((pairData) => ({
//           ...pairData,
//           volumeShare:
//             totalVolume > 0n
//               ? Number((pairData.volume24h * 10000n) / totalVolume) / 100
//               : 0,
//         }))
//         .sort((a, b) => Number(b.volume24h - a.volume24h));
//
//       return {
//         recentTrades: recentTrades
//           .sort((a, b) => b.timestamp - a.timestamp)
//           .slice(0, 100), // Last 100 trades
//         topPairs: topPairs.slice(0, 10), // Top 10 pairs
//         aggregatedMetrics: {
//           uniqueTraders24h: traders.size,
//           averageTradeSize: totalVolume / BigInt(recentTrades.length || 1),
//           totalTrades24h: recentTrades.length,
//           totalVolume24h: totalVolume,
//           totalFees24h: (totalVolume * 3n) / 1000n,
//         },
//       };
//     },
//     enabled,
//     staleTime: 10_000, // 10 seconds
//   });
// }
