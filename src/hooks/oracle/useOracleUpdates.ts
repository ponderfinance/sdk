import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { type PonderPair } from "@/contracts/pair";

export interface OracleStatus {
  lastUpdate: number;
  observationsCount: bigint;
  needsUpdate: boolean;
  nextUpdateTime: number;
}

interface UpdateOracleParams {
  pair: PonderPair;
}

interface UpdateOracleResult {
  hash: Hash;
  timestamp: number;
}

// Hook for checking oracle status
export function useOracleStatus(
  pair: PonderPair,
  enabled = true
): UseQueryResult<OracleStatus> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "oracle", "status", pair.address],
    queryFn: async () => {
      // Get the observation count
      const observationsCount = await sdk.oracle.observationLength(
        pair.address
      );

      // Get the latest observation
      const latest = await sdk.oracle.getLatestObservation(pair.address);
      const lastUpdate = latest ? Number(latest.timestamp) : 0;

      const now = Math.floor(Date.now() / 1000);
      const timeSinceUpdate = now - lastUpdate;

      // Oracle needs update if:
      // 1. No observations yet
      // 2. More than 30 minutes since last update
      const needsUpdate = observationsCount === 0n || timeSinceUpdate > 1800;

      // Calculate next update time (30 min intervals)
      const nextUpdateTime = lastUpdate + 1800;

      return {
        lastUpdate,
        observationsCount,
        needsUpdate,
        nextUpdateTime,
      };
    },
    enabled,
    staleTime: 60_000, // 1 minute
  });
}

// Hook for updating oracle
export function useUpdateOracle(): UseMutationResult<
  UpdateOracleResult,
  Error,
  UpdateOracleParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ pair }: UpdateOracleParams) => {
      const hash = await sdk.oracle.update(pair.address);

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      return {
        hash,
        timestamp: Math.floor(Date.now() / 1000),
      };
    },
    onError: (error) => {
      console.error("Oracle update error:", error);
      throw error;
    },
  });
}