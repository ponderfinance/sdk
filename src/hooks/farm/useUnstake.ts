import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { MASTERCHEF_ABI } from "@/abis";

interface UnstakeParams {
  poolId: number;
  amount: bigint;
}

interface UnstakeResult {
  hash: Hash;
  amount: bigint;
  events: {
    withdraw?: {
      user: Address;
      pid: bigint;
      amount: bigint;
    };
  };
}

export function useUnstake(): UseMutationResult<
  UnstakeResult,
  Error,
  UnstakeParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: UnstakeParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.masterChef.address,
        abi: MASTERCHEF_ABI,
        functionName: "withdraw",
        args: [BigInt(params.poolId), params.amount],
        account: sdk.walletClient.account.address,
        chain: sdk.walletClient.chain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      let withdrawEvent;
      const withdrawLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === sdk.masterChef.address.toLowerCase() &&
          log.topics[0] ===
            "0xf279e6a1f5e320cca91135676d9cb6e44ca8a08c0b88342bcdb1144f6511b568"
      );

      if (withdrawLog) {
        const decoded = decodeEventLog({
          abi: MASTERCHEF_ABI,
          data: withdrawLog.data,
          topics: withdrawLog.topics,
          eventName: "Withdraw",
        });
        withdrawEvent = {
          user: decoded.args.user,
          pid: decoded.args.pid,
          amount: decoded.args.amount,
        };
      }

      return {
        hash,
        amount: withdrawEvent?.amount || params.amount,
        events: {
          withdraw: withdrawEvent,
        },
      };
    },
    onError: (error) => {
      console.error("Unstake error:", error);
      throw error;
    },
  });
}
