import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Hash, type TransactionReceipt } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export type TransactionState = "pending" | "confirmed" | "failed";

export interface TransactionStatus {
  state: TransactionState;
  receipt?: TransactionReceipt;
  confirmations: number;
  error?: Error;
  isLoading: boolean;
  isError: boolean;
  isSuccess: boolean;
}

export function useTransaction(
  hash: Hash | undefined,
  confirmations = 1,
  enabled = true
): UseQueryResult<TransactionStatus> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["ponder", "transaction", hash],
    queryFn: async () => {
      if (!hash) throw new Error("Transaction hash required");

      try {
        // First check if transaction is already included
        const receipt = await sdk.publicClient.waitForTransactionReceipt({
          hash,
          confirmations,
        });

        // In viem, the receipt doesn't have a status property directly
        // We need to check if the transaction was successful
        const succeeded = receipt.status === 'success';

        return {
          state: succeeded ? "confirmed" : "failed",
          receipt,
          confirmations,
          isLoading: false,
          isError: !succeeded,
          isSuccess: succeeded,
        } satisfies TransactionStatus;
      } catch (error) {
        return {
          state: "failed",
          confirmations: 0,
          error:
            error instanceof Error ? error : new Error("Transaction failed"),
          isLoading: false,
          isError: true,
          isSuccess: false,
        } satisfies TransactionStatus;
      }
    },
    enabled: enabled && !!hash,
    retry: (failureCount, error) => {
      // Only retry for network errors, not for failed transactions
      return failureCount < 3 && error.message.includes("network");
    },
  });
}
