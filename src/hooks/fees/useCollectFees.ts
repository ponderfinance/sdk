import { useMutation } from "@tanstack/react-query";
import { type Hash, type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface CollectFeesParams {
  pair: Address;
}

export function useCollectFees() {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ pair }: CollectFeesParams): Promise<Hash> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      return await sdk.feeDistributor.collectFeesFromPair(pair);
    },
  });
}
