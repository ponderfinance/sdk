import { useMutation } from "@tanstack/react-query";
import { type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface StakeParams {
  amount: bigint;
}

export function useStakePonder() {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ amount }: StakeParams): Promise<Hash> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // First approve staking contract
      const allowance = await sdk.ponder.allowance(
        sdk.walletClient.account.address,
        sdk.staking.address
      );

      if (allowance < amount) {
        const approvalTx = await sdk.ponder.approve(
          sdk.staking.address,
          amount
        );
        await sdk.publicClient.waitForTransactionReceipt({ hash: approvalTx });
      }

      // Then stake
      return await sdk.staking.enter(amount);
    },
  });
}
