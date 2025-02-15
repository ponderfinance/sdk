import { useMutation } from "@tanstack/react-query";
import { type Hash, type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface StakeParams {
  amount: bigint;
  recipient?: Address;
}

export function useStakePonder() {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ amount, recipient }: StakeParams): Promise<Hash> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Check minimum first stake if total supply is 0
      const [totalSupply, minimumFirstStake] = await Promise.all([
        sdk.staking.totalSupply(),
        sdk.staking.minimumFirstStake(),
      ]);

      if (totalSupply === 0n && amount < minimumFirstStake) {
        throw new Error("First stake must be at least " + minimumFirstStake.toString());
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

      // Then stake, using recipient or sender address
      return await sdk.staking.enter(
          amount,
          recipient || sdk.walletClient.account.address
      );
    },
  });
}
