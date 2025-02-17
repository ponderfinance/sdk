import { useMutation } from "@tanstack/react-query";
import { type Hash, type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export function useClaimFees() {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (): Promise<Hash> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.staking.address,
        abi: sdk.staking.abi,
        functionName: "claimFees",
        args: [],
        account: sdk.walletClient.account.address,
      });

      return sdk.walletClient.writeContract(request);
    },
  });
}
