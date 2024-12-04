import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairInfo } from "./usePairInfo";

export interface Swap {
  hash: Hash;
  timestamp: number;
  pair: Address;
  sender: Address;
  recipient: Address;
  // Token amounts
  amountIn: bigint;
  amountOut: bigint;
  tokenIn: Address;
  tokenOut: Address;
  // Derived data
  priceImpact: number;
  valueUSD?: number;
  // Optional token info if available
  tokenInSymbol?: string;
  tokenOutSymbol?: string;
}

interface UseRecentSwapsParams {
  pair?: Address;
  account?: Address; // Optional - filter by trader
  limit?: number;
  fromBlock?: bigint;
}

export function useRecentSwaps(
  params?: UseRecentSwapsParams,
  enabled = true
): UseQueryResult<Swap[]> {
  const sdk = usePonderSDK();
  const { data: pairInfo } = usePairInfo(
    params?.pair,
    enabled && !!params?.pair
  );

  return useQuery({
    queryKey: ["ponder", "swaps", "recent", params],
    queryFn: async () => {
      const limit = params?.limit || 100;
      const fromBlock = params?.fromBlock || -3000n; // ~1 day of blocks by default

      // Create event filter
      const swapFilter = await sdk.publicClient.createEventFilter({
        address: params?.pair,
        event: {
          type: "event",
          name: "Swap",
          inputs: [
            { type: "address", name: "sender", indexed: true },
            { type: "uint256", name: "amount0In" },
            { type: "uint256", name: "amount1In" },
            { type: "uint256", name: "amount0Out" },
            { type: "uint256", name: "amount1Out" },
            { type: "address", name: "to", indexed: true },
          ],
        },
        fromBlock,
      });

      // Get logs
      let swapLogs = await sdk.publicClient.getFilterLogs({
        filter: swapFilter,
      });

      // Filter by account if specified
      if (params?.account) {
        swapLogs = swapLogs.filter((log) => {
          const sender = log.args.sender as Address;
          const to = log.args.to as Address;
          return (
            sender.toLowerCase() === params.account?.toLowerCase() ||
            to.toLowerCase() === params.account?.toLowerCase()
          );
        });
      }

      // Sort by timestamp desc
      swapLogs.sort((a, b) => Number(b.blockNumber) - Number(a.blockNumber));

      // Limit results
      swapLogs = swapLogs.slice(0, limit);

      // Get blocks for timestamps
      const blockPromises = swapLogs.map((log) =>
        sdk.publicClient.getBlock({ blockNumber: log.blockNumber })
      );
      const blocks = await Promise.all(blockPromises);

      // Process logs into Swap objects
      const swaps: Swap[] = await Promise.all(
        swapLogs.map(async (log, i) => {
          const amount0In = log.args.amount0In as bigint;
          const amount1In = log.args.amount1In as bigint;
          const amount0Out = log.args.amount0Out as bigint;
          const amount1Out = log.args.amount1Out as bigint;

          // Determine which token is being swapped in/out
          const isToken0In = amount0In > 0n;
          let tokenIn: Address,
            tokenOut: Address,
            amountIn: bigint,
            amountOut: bigint;

          if (pairInfo) {
            tokenIn = isToken0In ? pairInfo.token0 : pairInfo.token1;
            tokenOut = isToken0In ? pairInfo.token1 : pairInfo.token0;
            amountIn = isToken0In ? amount0In : amount1In;
            amountOut = isToken0In ? amount1Out : amount0Out;
          } else if (params?.pair) {
            // If no pair info, get tokens directly
            const pair = sdk.getPair(params.pair);
            [tokenIn, tokenOut] = isToken0In
              ? await Promise.all([pair.token0(), pair.token1()])
              : await Promise.all([pair.token1(), pair.token0()]);
            amountIn = isToken0In ? amount0In : amount1In;
            amountOut = isToken0In ? amount1Out : amount0Out;
          } else {
            throw new Error("Either pair info or pair address required");
          }

          // Calculate price impact
          const priceImpact = await calculatePriceImpact(
            sdk,
            params?.pair || log.address,
            amountIn,
            tokenIn
          );

          // Try to get USD value if oracle available
          let valueUSD: number | undefined;
          try {
            if (params?.pair) {
              const amountUSD = await sdk.oracle.consult(
                params.pair,
                tokenIn,
                amountIn,
                1800 // 30 min average
              );
              valueUSD = Number(amountUSD) / 1e18;
            }
          } catch {
            // Oracle not available or error
          }

          // Try to get token symbols
          let tokenInSymbol: string | undefined;
          let tokenOutSymbol: string | undefined;
          try {
            if (pairInfo) {
              tokenInSymbol = isToken0In
                ? pairInfo.token0Symbol
                : pairInfo.token1Symbol;
              tokenOutSymbol = isToken0In
                ? pairInfo.token1Symbol
                : pairInfo.token0Symbol;
            }
          } catch {
            // Token info not available
          }

          return {
            hash: log.transactionHash,
            timestamp: Number(blocks[i].timestamp),
            pair: log.address,
            sender: log.args.sender as Address,
            recipient: log.args.to as Address,
            amountIn,
            amountOut,
            tokenIn,
            tokenOut,
            priceImpact,
            valueUSD,
            tokenInSymbol,
            tokenOutSymbol,
          };
        })
      );

      return swaps;
    },
    enabled: enabled,
    staleTime: 10_000, // 10 seconds
  });
}

// Helper function to calculate price impact
async function calculatePriceImpact(
  sdk: any,
  pairAddress: Address,
  amountIn: bigint,
  tokenIn: Address
): Promise<number> {
  try {
    const pair = sdk.getPair(pairAddress);
    const reserves = await pair.getReserves();
    const token0 = await pair.token0();

    const [reserveIn, reserveOut] =
      tokenIn === token0
        ? [reserves.reserve0, reserves.reserve1]
        : [reserves.reserve1, reserves.reserve0];

    // Calculate price impact using AMM formula
    const amountInWithFee = amountIn * 997n; // 0.3% fee
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * 1000n + amountInWithFee;
    const amountOut = numerator / denominator;

    const priceImpact =
      Number(
        ((amountOut * reserveIn) / (amountIn * reserveOut) - 1n) * 10000n
      ) / 100;

    return priceImpact;
  } catch {
    return 0;
  }
}
