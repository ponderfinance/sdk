import { useMutation } from "@tanstack/react-query";
import { type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export function useDistributeFees() {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (): Promise<Hash> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      return await sdk.feeDistributor.distribute();
    },
  });
}
