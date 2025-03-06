import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";
import { ponderfactoryAbi } from "@ponderfinance/dex";

export interface PairSummary {
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
}

/**
 * Hook to fetch all existing pairs from the factory
 * @param options.enabled Whether the query should execute
 * @param options.includeTotalSupply Whether to fetch total supply for each pair (slightly more gas)
 * @param options.includeReserves Whether to fetch reserves for each pair (slightly more gas)
 * @returns UseQueryResult with array of all pair information
 */
export function useAllPairs(
  options: {
    enabled?: boolean;
    includeTotalSupply?: boolean;
    includeReserves?: boolean;
  } = {}
): UseQueryResult<PairSummary[]> {
  const {
    enabled = true,
    includeTotalSupply = true,
    includeReserves = true,
  } = options;
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: [
      "ponder",
      "factory",
      "allPairs",
      includeTotalSupply,
      includeReserves,
    ],
    queryFn: async () => {
      if (!sdk) {
        throw new Error("SDK not initialized");
      }

      // Get the factory contract information
      const factory = sdk.factory;

      // Get the total number of pairs from the factory
      const pairsLength = (await sdk.publicClient.readContract({
        address: factory.address,
        abi: ponderfactoryAbi,
        functionName: "allPairsLength",
      })) as bigint;

      // If there are no pairs, return empty array
      if (pairsLength === 0n) return [];

      // Create an array of indices from 0 to pairsLength-1
      const indices = Array.from({ length: Number(pairsLength) }, (_, i) => i);

      // Get all pair addresses in batches
      const chunkSize = 100;
      const allPairAddresses: Address[] = [];

      for (let i = 0; i < indices.length; i += chunkSize) {
        const chunk = indices.slice(i, i + chunkSize);
        const pairAddresses = await Promise.all(
          chunk.map(
            (index) =>
              sdk.publicClient.readContract({
                address: factory.address,
                abi: ponderfactoryAbi,
                functionName: "allPairs",
                args: [BigInt(index)],
              }) as Promise<Address>
          )
        );

        allPairAddresses.push(...pairAddresses);
      }

      // Now process pair data in smaller chunks
      const pairSummaries: PairSummary[] = [];
      const pairDataChunkSize = 10;

      for (let i = 0; i < allPairAddresses.length; i += pairDataChunkSize) {
        const chunk = allPairAddresses.slice(i, i + pairDataChunkSize);
        const chunkPromises = chunk.map(async (pairAddress) => {
          const pair = sdk.getPair(pairAddress);

          // Batch the basic pair data queries
          const [token0, token1] = await Promise.all([
            pair.token0(),
            pair.token1(),
          ]);

          // Fetch token metadata
          const [token0Symbol, token1Symbol, token0Decimals, token1Decimals] =
            await Promise.all([
              sdk.publicClient.readContract({
                address: token0,
                abi: erc20Abi,
                functionName: "symbol",
              }) as Promise<string>,
              sdk.publicClient.readContract({
                address: token1,
                abi: erc20Abi,
                functionName: "symbol",
              }) as Promise<string>,
              sdk.publicClient.readContract({
                address: token0,
                abi: erc20Abi,
                functionName: "decimals",
              }) as Promise<number>,
              sdk.publicClient.readContract({
                address: token1,
                abi: erc20Abi,
                functionName: "decimals",
              }) as Promise<number>,
            ]);

          // Conditionally fetch reserves and total supply based on options
          let reserve0 = 0n;
          let reserve1 = 0n;
          let totalSupply = 0n;

          if (includeReserves) {
            const reserves = await pair.getReserves();
            reserve0 = reserves.reserve0;
            reserve1 = reserves.reserve1;
          }

          if (includeTotalSupply) {
            totalSupply = await pair.totalSupply();
          }

          return {
            address: pairAddress,
            token0,
            token1,
            token0Symbol,
            token1Symbol,
            token0Decimals,
            token1Decimals,
            reserve0,
            reserve1,
            totalSupply,
          };
        });

        const chunkResults = await Promise.all(chunkPromises);
        pairSummaries.push(...chunkResults);

        // Add a small delay between chunks to reduce likelihood of rate limiting
        if (i + pairDataChunkSize < allPairAddresses.length) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }
      }

      return pairSummaries;
    },
    enabled: enabled && !!sdk,
    staleTime: 60_000, // 1 minute, longer than usePairInfo since this is more expensive
    refetchOnWindowFocus: false, // Prevent refetching when user switches tabs
  });
}
