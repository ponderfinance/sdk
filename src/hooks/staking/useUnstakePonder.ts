import { useMutation } from "@tanstack/react-query";
import { type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface UnstakeParams {
  shares: bigint;
}

export function useUnstakePonder() {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ shares }: UnstakeParams): Promise<Hash> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      return await sdk.staking.leave(shares);
    },
  });
}
