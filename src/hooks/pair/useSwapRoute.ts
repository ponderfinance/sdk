import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

// Constants from PonderPair.sol
const BASIS_POINTS = 10000n;
const STANDARD_FEE = 30n; // 0.3% (30/10000)
const KUB_LP_FEE = 20n; // 0.2% (20/10000)
const KUB_CREATOR_FEE = 10n; // 0.1% (10/10000)
const PONDER_LP_FEE = 15n; // 0.15% (15/10000)
const PONDER_CREATOR_FEE = 15n; // 0.15% (15/10000)

export interface SwapRoute {
  path: Address[];
  pairs: Address[];
  amountIn: bigint;
  amountOut: bigint;
  priceImpact: number;
  totalFee: bigint;
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
): UseQueryResult<SwapRoute | null> {
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
      if (!params) return null;
      const { tokenIn, tokenOut, amountIn, amountOut, maxHops = 3 } = params;

      if (!amountIn && !amountOut) return null;

      try {
        // Check direct pair first
        const directPair = await sdk.factory.getPair(tokenIn, tokenOut);

        if (directPair !== "0x0000000000000000000000000000000000000000") {
          const pair = sdk.getPair(directPair);
          const [token0, reserves] = await Promise.all([
            pair.token0(),
            pair.getReserves(),
          ]);

          const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
          const [reserveIn, reserveOut] = isToken0In
            ? [reserves.reserve0, reserves.reserve1]
            : [reserves.reserve1, reserves.reserve0];

          // Determine pair type and fees for display purposes
          const isLaunchToken = await isTokenLaunchToken(sdk, tokenIn);
          const isPonderPair = await isPonderTokenPair(sdk, tokenIn, tokenOut);

          let protocolFee: bigint;
          let creatorFee: bigint;

          if (isLaunchToken) {
            if (isPonderPair) {
              protocolFee = PONDER_LP_FEE;
              creatorFee = PONDER_CREATOR_FEE;
            } else {
              protocolFee = KUB_LP_FEE;
              creatorFee = KUB_CREATOR_FEE;
            }
          } else {
            protocolFee = STANDARD_FEE;
            creatorFee = 0n;
          }

          const totalFee = protocolFee + creatorFee;
          let amountOutWithFees: bigint;
          let actualAmountIn: bigint;

          if (amountIn) {
            // For exact input, let router handle the 0.3% fee
            amountOutWithFees = await sdk.router.getAmountOut(
              amountIn, // Use full amount - router handles fee
              reserveIn,
              reserveOut
            );
            actualAmountIn = amountIn;
          } else if (amountOut) {
            // For exact output, let router calculate required input
            actualAmountIn = await sdk.router.getAmountIn(
              amountOut,
              reserveIn,
              reserveOut
            );
            amountOutWithFees = amountOut;
          } else {
            throw new Error("Either amountIn or amountOut must be provided");
          }

          // Calculate fee amount for display - separate from swap calculations
          const feeAmount = (actualAmountIn * totalFee) / BASIS_POINTS;

          // Calculate price impact
          const priceImpact = calculatePriceImpact(
            actualAmountIn,
            amountOutWithFees,
            reserveIn,
            reserveOut
          );

          return {
            path: [tokenIn, tokenOut],
            pairs: [directPair],
            amountIn: actualAmountIn,
            amountOut: amountOutWithFees,
            priceImpact,
            totalFee: feeAmount, // This is just for display
            hops: [
              {
                pair: directPair,
                tokenIn,
                tokenOut,
                amountIn: actualAmountIn,
                amountOut: amountOutWithFees,
                fee: feeAmount,
                priceImpact,
              },
            ],
          };
        }

        // Find multi-hop route if no direct pair exists
        const allPairs = await getAllPairs(sdk);
        const routes = await findAllRoutes(
          sdk,
          allPairs,
          tokenIn,
          tokenOut,
          maxHops
        );

        if (routes.length === 0) return null;

        // Calculate amounts for each route
        const routeDetails = await Promise.all(
          routes.map(async (route) => {
            try {
              // Let router handle all fees for multi-hop routes
              const amounts = amountIn
                ? await sdk.router.getAmountsOut(amountIn, route)
                : await sdk.router.getAmountsIn(amountOut!, route);

              let totalPriceImpact = 0;
              let totalFees = 0n;
              const hops: SwapRoute["hops"] = [];

              for (let i = 0; i < route.length - 1; i++) {
                const hopTokenIn = route[i];
                const hopTokenOut = route[i + 1];
                const pair = await sdk.factory.getPair(hopTokenIn, hopTokenOut);
                const pairContract = sdk.getPair(pair);
                const [token0, reserves] = await Promise.all([
                  pairContract.token0(),
                  pairContract.getReserves(),
                ]);

                const isToken0In =
                  hopTokenIn.toLowerCase() === token0.toLowerCase();
                const [reserveIn, reserveOut] = isToken0In
                  ? [reserves.reserve0, reserves.reserve1]
                  : [reserves.reserve1, reserves.reserve0];

                const hopAmountIn = amounts[i];
                const hopAmountOut = amounts[i + 1];

                // Calculate fees for display only
                const isLaunchToken = await isTokenLaunchToken(sdk, hopTokenIn);
                const isPonderPair = await isPonderTokenPair(
                  sdk,
                  hopTokenIn,
                  hopTokenOut
                );

                let hopFee: bigint;
                if (isPonderPair) {
                  hopFee =
                    (hopAmountIn * (PONDER_LP_FEE + PONDER_CREATOR_FEE)) /
                    BASIS_POINTS;
                } else if (isLaunchToken) {
                  hopFee =
                    (hopAmountIn * (KUB_LP_FEE + KUB_CREATOR_FEE)) /
                    BASIS_POINTS;
                } else {
                  hopFee = (hopAmountIn * STANDARD_FEE) / BASIS_POINTS;
                }

                const hopImpact = calculatePriceImpact(
                  hopAmountIn,
                  hopAmountOut,
                  reserveIn,
                  reserveOut
                );

                totalPriceImpact += hopImpact;
                totalFees += hopFee;

                hops.push({
                  pair,
                  tokenIn: hopTokenIn,
                  tokenOut: hopTokenOut,
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
                totalFee: totalFees,
                hops,
              };
            } catch (error) {
              console.error("Error calculating route:", error);
              return null;
            }
          })
        );

        const validRoutes = routeDetails.filter(
          (route): route is SwapRoute => route !== null
        );
        if (validRoutes.length === 0) return null;

        // Return best route based on output amount
        return validRoutes.reduce((best, current) => {
          if (!best) return current;
          return amountIn
            ? current.amountOut > best.amountOut
              ? current
              : best
            : current.amountIn < best.amountIn
            ? current
            : best;
        });
      } catch (error) {
        console.error("Error in useSwapRoute:", error);
        return null;
      }
    },
    enabled: enabled && !!params && (!!params.amountIn || !!params.amountOut),
    staleTime: 10_000,
  });
}

// Helper function to check if a token is a launch token
async function isTokenLaunchToken(sdk: any, token: Address): Promise<boolean> {
  try {
    const launcher = await sdk.getLaunchToken(token).launcher();
    return launcher === sdk.launcher.address;
  } catch {
    return false;
  }
}

// Helper function to check if pair involves PONDER token
async function isPonderTokenPair(
  sdk: any,
  token0: Address,
  token1: Address
): Promise<boolean> {
  try {
    const ponderAddress = await sdk.getPonderToken().getAddress();
    return (
      token0.toLowerCase() === ponderAddress.toLowerCase() ||
      token1.toLowerCase() === ponderAddress.toLowerCase()
    );
  } catch {
    return false;
  }
}

// Helper function to get all pairs
async function getAllPairs(sdk: any) {
  try {
    const length = await sdk.factory.allPairsLength();
    const pairs: Address[] = [];
    for (let i = 0; i < Number(length); i++) {
      const pair = await sdk.factory.allPairs(i);
      if (pair && pair !== "0x0000000000000000000000000000000000000000") {
        pairs.push(pair);
      }
    }
    return pairs;
  } catch (error) {
    console.error("Error getting all pairs:", error);
    return [];
  }
}

// Completely rewritten findAllRoutes function
async function findAllRoutes(
  sdk: any,
  allPairs: Address[],
  tokenIn: Address,
  tokenOut: Address,
  maxHops: number
): Promise<Address[][]> {
  const routes: Address[][] = [];
  const queue: Array<{
    path: Address[];
    visited: Set<string>;
  }> = [];

  // Initialize queue with starting token
  queue.push({
    path: [tokenIn],
    visited: new Set(),
  });

  while (queue.length > 0) {
    const { path, visited } = queue.shift()!;
    const currentToken = path[path.length - 1];

    // Skip if we've exceeded max hops
    if (path.length > maxHops + 1) continue;

    // Try each pair
    for (const pair of allPairs) {
      if (visited.has(pair)) continue;

      try {
        const pairContract = sdk.getPair(pair);
        const [token0, token1] = await Promise.all([
          pairContract.token0(),
          pairContract.token1(),
        ]);

        let nextToken: Address | null = null;

        if (token0.toLowerCase() === currentToken.toLowerCase()) {
          nextToken = token1;
        } else if (token1.toLowerCase() === currentToken.toLowerCase()) {
          nextToken = token0;
        }

        if (nextToken) {
          // Found destination
          if (nextToken.toLowerCase() === tokenOut.toLowerCase()) {
            routes.push([...path, tokenOut]);
          }
          // Continue searching if under max hops
          else if (path.length < maxHops + 1) {
            const newVisited = new Set(visited);
            newVisited.add(pair);
            queue.push({
              path: [...path, nextToken],
              visited: newVisited,
            });
          }
        }
      } catch (error) {
        console.error(`Error processing pair ${pair}:`, error);
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
  if (amountIn === 0n) return 0;
  const exactQuote = (amountIn * reserveOut) / reserveIn;
  const slippage = ((exactQuote - amountOut) * 10000n) / exactQuote;
  return Number(slippage) / 100;
}
