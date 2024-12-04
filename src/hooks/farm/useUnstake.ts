import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type Address, type Hash, decodeEventLog } from "viem";
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
      const hash = await sdk.masterChef.withdraw(
        BigInt(params.poolId),
        params.amount
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Decode Withdraw event
      const withdrawLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === sdk.masterChef.address.toLowerCase() &&
          log.topics[0] ===
            "0xf279e6a1f5e320cca91135676d9cb6e44ca8a08c0b88342bcdb1144f6511b568"
      );

      let withdrawEvent;
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
