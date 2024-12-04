import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface PairCreationParams {
  token0: Address;
  token1: Address;
}

interface PairCreationResult {
  hash: Hash;
  pair: Address;
  events: {
    pairCreated?: {
      token0: Address;
      token1: Address;
      pair: Address;
    };
  };
}

export interface PairCreationData {
  canCreate: boolean;
  error?: string;
  existingPair?: Address;
  sortedTokens: Address[];
  estimatedGas?: bigint;
}

export function usePairCreation(tokens?: [Address, Address]): {
  data: UseQueryResult<PairCreationData>;
  createPair: UseMutationResult<PairCreationResult, Error, PairCreationParams>;
} {
  const sdk = usePonderSDK();

  // Query to check if pair can be created
  const data = useQuery({
    queryKey: ["ponder", "pair", "creation", tokens],
    queryFn: async () => {
      if (!tokens) throw new Error("Tokens required");
      const [tokenA, tokenB] = tokens;

      // Basic validation
      if (tokenA.toLowerCase() === tokenB.toLowerCase()) {
        return {
          canCreate: false,
          error: "Identical tokens",
          sortedTokens: [tokenA, tokenB],
        };
      }

      // Sort tokens
      const [token0, token1] =
        tokenA.toLowerCase() < tokenB.toLowerCase()
          ? [tokenA, tokenB]
          : [tokenB, tokenA];

      // Check if pair exists
      const existingPair = await sdk.factory.getPair(token0, token1);
      if (existingPair !== "0x0000000000000000000000000000000000000000") {
        return {
          canCreate: false,
          error: "Pair exists",
          existingPair,
          sortedTokens: [token0, token1],
        };
      }

      // Estimate gas for creation
      let estimatedGas: bigint | undefined;
      try {
        estimatedGas = await sdk.publicClient.estimateContractGas({
          address: sdk.factory.address,
          abi: [
            {
              name: "createPair",
              type: "function",
              inputs: [
                { name: "tokenA", type: "address" },
                { name: "tokenB", type: "address" },
              ],
              outputs: [{ name: "pair", type: "address" }],
            },
          ],
          functionName: "createPair",
          args: [token0, token1],
          account: sdk.walletClient?.account?.address,
        });
      } catch {
        // Gas estimation failed
      }

      return {
        canCreate: true,
        sortedTokens: [token0, token1],
        estimatedGas,
      };
    },
    enabled: !!tokens,
  });

  // Mutation to create pair
  const createPair = useMutation({
    mutationFn: async ({ token0, token1 }: PairCreationParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const result = await sdk.factory.createPair({ tokenA: token0, tokenB: token1 });

      // Wait for confirmation and parse events
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash: result.hash,
      });

      // Find PairCreated event
      const pairCreatedLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9"
      );

      let pairCreated;
      if (pairCreatedLog) {
        pairCreated = {
          token0: `0x${pairCreatedLog?.topics[1]?.slice(26)}` as Address,
          token1: `0x${pairCreatedLog?.topics[2]?.slice(26)}` as Address,
          pair: `0x${pairCreatedLog?.topics[3]?.slice(26)}` as Address,
        };
      }

      return {
        hash: result.hash,
        pair:
          pairCreated?.pair ||
          ("0x0000000000000000000000000000000000000000" as Address),
        events: {
          pairCreated,
        },
      };
    },
  });

  return {
    data,
    createPair,
  };
}
