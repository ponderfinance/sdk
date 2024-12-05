import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { bitkubTestnetChain } from "@/constants/chains";
import { FACTORY_ABI } from "@/abis";

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

// Define the PairCreated event type
type PairCreatedEvent = {
  eventName: "PairCreated";
  args: {
    token0: Address;
    token1: Address;
    pair: Address;
    allPairsLength: bigint;
  };
};

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
        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.factory.address,
          abi: FACTORY_ABI,
          functionName: "createPair",
          args: [token0, token1],
          account: sdk.walletClient?.account?.address,
          chain: bitkubTestnetChain,
        });
        estimatedGas = request.gas;
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

      // Simulate the pair creation
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.factory.address,
        abi: FACTORY_ABI,
        functionName: "createPair",
        args: [token0, token1],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      // Execute the pair creation
      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      // Wait for confirmation and parse events
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Find PairCreated event
      const pairCreatedLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9"
      );

      let pairCreated;
      if (pairCreatedLog) {
        try {
          const decoded = decodeEventLog({
            abi: FACTORY_ABI,
            data: pairCreatedLog.data,
            topics: pairCreatedLog.topics,
            eventName: "PairCreated",
          }) as unknown as PairCreatedEvent;

          pairCreated = {
            token0: decoded.args.token0,
            token1: decoded.args.token1,
            pair: decoded.args.pair,
          };
        } catch (error) {
          console.error("Failed to decode PairCreated event:", error);
        }
      }

      return {
        hash,
        pair:
          pairCreated?.pair ||
          ("0x0000000000000000000000000000000000000000" as Address),
        events: {
          pairCreated,
        },
      };
    },
    onError: (error) => {
      console.error("Pair creation error:", error);
      throw error;
    },
  });

  return {
    data,
    createPair,
  };
}
