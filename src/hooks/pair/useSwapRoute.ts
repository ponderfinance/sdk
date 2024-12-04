import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export interface SwapRoute {
  path: Address[];
  pairs: Address[];
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  totalFee: bigint;
  // Per hop details
  hops: Array<{
    pair: Address;
    tokenIn: Address;
    tokenOut: Address;
    amountIn: bigint;
    amountOut: bigint;
    fee: bigint;
    priceImpact: number;
  }>;
}

interface SwapRouteParams {
  tokenIn: Address;
  tokenOut: Address;
  amountIn?: bigint;
  amountOut?: bigint;
  maxHops?: number;
}

export function useSwapRoute(
  params: SwapRouteParams | undefined,
  enabled = true
): UseQueryResult<SwapRoute> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: [
      "ponder",
      "route",
      {
        ...params,
        amountIn: params?.amountIn?.toString(),
        amountOut: params?.amountOut?.toString(),
      },
    ],
    queryFn: async () => {
      if (!params) throw new Error("Params required");
      const { tokenIn, tokenOut, amountIn, amountOut, maxHops = 3 } = params;

      if (!amountIn && !amountOut) {
        throw new Error("Either amountIn or amountOut required");
      }

      // Direct pair check first
      const directPair = await sdk.factory.getPair(tokenIn, tokenOut);
      if (directPair !== "0x0000000000000000000000000000000000000000") {
        // Calculate direct route
        const pair = sdk.getPair(directPair);
        const [token0, reserves] = await Promise.all([
          pair.token0(),
          pair.getReserves(),
        ]);

        const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
        const [reserveIn, reserveOut] = isToken0In
          ? [reserves.reserve0, reserves.reserve1]
          : [reserves.reserve1, reserves.reserve0];

        if (amountIn) {
          const amountOutDirect = await sdk.router.getAmountOut(
            amountIn,
            reserveIn,
            reserveOut
          );

          // Calculate price impact
          const priceImpact = calculatePriceImpact(
            amountIn,
            amountOutDirect,
            reserveIn,
            reserveOut
          );

          return {
            path: [tokenIn, tokenOut],
            pairs: [directPair],
            amountIn,
            amountOut: amountOutDirect,
            priceImpact,
            totalFee: (amountIn * 3n) / 1000n, // 0.3% fee
            hops: [
              {
                pair: directPair,
                tokenIn,
                tokenOut,
                amountIn,
                amountOut: amountOutDirect,
                fee: (amountIn * 3n) / 1000n,
                priceImpact,
              },
            ],
          };
        }
      }

      // Get all pairs for finding routes
      const allPairs = await getAllPairs(sdk);
      const routes = await findAllRoutes(
        sdk,
        allPairs,
        tokenIn,
        tokenOut,
        maxHops
      );

      if (routes.length === 0) {
        throw new Error("No route found");
      }

      // Calculate amounts for each route
      const routeDetails = await Promise.all(
        routes.map(async (route) => {
          const amounts = amountIn
            ? await sdk.router.getAmountsOut(amountIn, route)
            : await sdk.router.getAmountsIn(amountOut!, route);

          let totalPriceImpact = 0;
          let totalFee = 0n;
          const hops: SwapRoute["hops"] = [];

          // Calculate per-hop details
          for (let i = 0; i < route.length - 1; i++) {
            const tokenIn = route[i];
            const tokenOut = route[i + 1];
            const pair = await sdk.factory.getPair(tokenIn, tokenOut);
            const pairContract = sdk.getPair(pair);
            const reserves = await pairContract.getReserves();
            const token0 = await pairContract.token0();

            const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
            const [reserveIn, reserveOut] = isToken0In
              ? [reserves.reserve0, reserves.reserve1]
              : [reserves.reserve1, reserves.reserve0];

            const hopAmountIn = amounts[i];
            const hopAmountOut = amounts[i + 1];
            const hopFee = (hopAmountIn * 3n) / 1000n;
            const hopImpact = calculatePriceImpact(
              hopAmountIn,
              hopAmountOut,
              reserveIn,
              reserveOut
            );

            totalPriceImpact += hopImpact;
            totalFee += hopFee;

            hops.push({
              pair,
              tokenIn,
              tokenOut,
              amountIn: hopAmountIn,
              amountOut: hopAmountOut,
              fee: hopFee,
              priceImpact: hopImpact,
            });
          }

          return {
            path: route,
            pairs: hops.map((h) => h.pair),
            amountIn: amounts[0],
            amountOut: amounts[amounts.length - 1],
            priceImpact: totalPriceImpact,
            totalFee,
            hops,
          };
        })
      );

      // Return best route based on output amount
      return routeDetails.reduce((best, current) => {
        if (!best) return current;
        return amountIn
          ? current.amountOut > best.amountOut
            ? current
            : best
          : current.amountIn < best.amountIn
          ? current
          : best;
      });
    },
    enabled: enabled && !!params && (!!params.amountIn || !!params.amountOut),
    staleTime: 10_000, // 10 seconds
  });
}

// Helper function to get all pairs
async function getAllPairs(sdk: any) {
  const length = await sdk.factory.allPairsLength();
  const pairs: Address[] = [];
  for (let i = 0; i < Number(length); i++) {
    pairs.push(await sdk.factory.allPairs(i));
  }
  return pairs;
}

// Helper function to find all possible routes
async function findAllRoutes(
  sdk: any,
  allPairs: Address[],
  tokenIn: Address,
  tokenOut: Address,
  maxHops: number,
  currentRoute: Address[] = [],
  visited: Set<string> = new Set(),
  routes: Address[][] = []
): Promise<Address[][]> {
  if (currentRoute.length === 0) {
    currentRoute = [tokenIn];
  }

  if (currentRoute.length > maxHops + 1) {
    return routes;
  }

  for (const pair of allPairs) {
    if (visited.has(pair)) continue;

    const pairContract = sdk.getPair(pair);
    const [token0, token1] = await Promise.all([
      pairContract.token0(),
      pairContract.token1(),
    ]);

    const currentToken = currentRoute[currentRoute.length - 1];
    let nextToken: Address | null = null;

    if (token0.toLowerCase() === currentToken.toLowerCase()) {
      nextToken = token1;
    } else if (token1.toLowerCase() === currentToken.toLowerCase()) {
      nextToken = token0;
    }

    if (nextToken) {
      if (nextToken.toLowerCase() === tokenOut.toLowerCase()) {
        routes.push([...currentRoute, tokenOut]);
      } else if (currentRoute.length < maxHops + 1) {
        visited.add(pair);
        await findAllRoutes(
          sdk,
          allPairs,
          tokenIn,
          tokenOut,
          maxHops,
          [...currentRoute, nextToken],
          visited,
          routes
        );
        visited.delete(pair);
      }
    }
  }

  return routes;
}

// Helper function to calculate price impact
function calculatePriceImpact(
  amountIn: bigint,
  amountOut: bigint,
  reserveIn: bigint,
  reserveOut: bigint
): number {
  const exactQuote = (amountIn * reserveOut) / reserveIn;
  const slippage = ((exactQuote - amountOut) * 10000n) / exactQuote;
  return Number(slippage) / 100;
}

// Types for route finding
export interface RouteHop {
  pair: Address;
  tokenIn: Address;
  tokenOut: Address;
  amountIn: bigint;
  amountOut: bigint;
  fee: bigint;
  priceImpact: number;
}

export interface RouteOptions {
  maxHops?: number;
  includedPairs?: Address[];
  excludedPairs?: Address[];
  maxImpact?: number; // Max acceptable price impact percentage
}

// Export helper functions that could be useful elsewhere
export function getBestRoute(
  routes: SwapRoute[],
  amountIn: boolean
): SwapRoute {
  return routes.reduce((best, current) => {
    if (!best) return current;
    return amountIn
      ? current.amountOut > best.amountOut
        ? current
        : best
      : current.amountIn < best.amountIn
      ? current
      : best;
  });
}

export function computeRouteMetrics(route: SwapRoute): {
  totalGasEstimate: bigint;
  totalMinReceived: bigint;
  averagePriceImpact: number;
} {
  const totalGasEstimate = BigInt(route.hops.length) * BigInt(150000); // Approximate gas per hop
  const totalMinReceived = (route.amountOut * 997n) / 1000n; // 0.3% slippage per hop
  const averagePriceImpact = route.priceImpact / route.hops.length;

  return {
    totalGasEstimate,
    totalMinReceived,
    averagePriceImpact,
  };
}
