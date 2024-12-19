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

      // Check direct pair first
      const directPair = await sdk.factory.getPair(tokenIn, tokenOut);

      if (directPair !== "0x0000000000000000000000000000000000000000") {
        const pair = sdk.getPair(directPair);
        const [token0, reserves] = await Promise.all([
          pair.token0(),
          pair.getReserves(),
        ]);

        // Handle fee calculation based on pair type
        const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
        const [reserveIn, reserveOut] = isToken0In
          ? [reserves.reserve0, reserves.reserve1]
          : [reserves.reserve1, reserves.reserve0];

        // Determine pair type and fees
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

        // Calculate amounts with fees
        const totalFee = protocolFee + creatorFee;
        let amountOutWithFees: bigint = 0n;

        if (amountIn) {
          const effectiveAmountIn =
            (amountIn * (BASIS_POINTS - totalFee)) / BASIS_POINTS;
          amountOutWithFees = await sdk.router.getAmountOut(
            effectiveAmountIn,
            reserveIn,
            reserveOut
          );
        } else if (amountOut) {
          const amountInWithFees = await sdk.router.getAmountIn(
            amountOut,
            reserveIn,
            reserveOut
          );
          const effectiveAmountIn =
            (amountInWithFees * BASIS_POINTS) / (BASIS_POINTS - totalFee);
          amountOutWithFees = amountOut;
        } else {
          throw new Error("Either amountIn or amountOut must be provided");
        }

        // Calculate price impact
        const priceImpact = calculatePriceImpact(
          amountIn || 0n,
          amountOutWithFees,
          reserveIn,
          reserveOut
        );

        return {
          path: [tokenIn, tokenOut],
          pairs: [directPair],
          amountIn: amountIn || 0n,
          amountOut: amountOutWithFees,
          priceImpact,
          totalFee: ((amountIn || 0n) * totalFee) / BASIS_POINTS,
          hops: [
            {
              pair: directPair,
              tokenIn,
              tokenOut,
              amountIn: amountIn || 0n,
              amountOut: amountOutWithFees,
              fee: ((amountIn || 0n) * totalFee) / BASIS_POINTS,
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

      if (routes.length === 0) {
        throw new Error("No route found");
      }

      // Calculate amounts for each route considering fees
      const routeDetails = await Promise.all(
        routes.map(async (route) => {
          // Get amounts through the path
          const amounts = amountIn
            ? await sdk.router.getAmountsOut(amountIn, route)
            : await sdk.router.getAmountsIn(amountOut!, route);

          let totalPriceImpact = 0;
          let totalFees = 0n;
          const hops: SwapRoute["hops"] = [];

          // Calculate per-hop details
          for (let i = 0; i < route.length - 1; i++) {
            const tokenIn = route[i];
            const tokenOut = route[i + 1];
            const pair = await sdk.factory.getPair(tokenIn, tokenOut);
            const pairContract = sdk.getPair(pair);
            const [token0, reserves] = await Promise.all([
              pairContract.token0(),
              pairContract.getReserves(),
            ]);

            const isToken0In = tokenIn.toLowerCase() === token0.toLowerCase();
            const [reserveIn, reserveOut] = isToken0In
              ? [reserves.reserve0, reserves.reserve1]
              : [reserves.reserve1, reserves.reserve0];

            const hopAmountIn = amounts[i];
            const hopAmountOut = amounts[i + 1];

            // Calculate fees for this hop
            const isLaunchToken = await isTokenLaunchToken(sdk, tokenIn);
            const isPonderPair = await isPonderTokenPair(
              sdk,
              tokenIn,
              tokenOut
            );

            let hopFee: bigint;
            if (isLaunchToken) {
              if (isPonderPair) {
                hopFee =
                  (hopAmountIn * (PONDER_LP_FEE + PONDER_CREATOR_FEE)) /
                  BASIS_POINTS;
              } else {
                hopFee =
                  (hopAmountIn * (KUB_LP_FEE + KUB_CREATOR_FEE)) / BASIS_POINTS;
              }
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
            totalFee: totalFees,
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
  const ponderAddress = await sdk.getPonderToken().getAddress();
  return (
    token0.toLowerCase() === ponderAddress.toLowerCase() ||
    token1.toLowerCase() === ponderAddress.toLowerCase()
  );
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
  if (amountIn === 0n) return 0;
  const exactQuote = (amountIn * reserveOut) / reserveIn;
  const slippage = ((exactQuote - amountOut) * 10000n) / exactQuote;
  return Number(slippage) / 100;
}
