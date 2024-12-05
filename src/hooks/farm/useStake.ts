import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { MASTERCHEF_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

interface StakeParams {
  poolId: number;
  amount: bigint;
}

interface StakeResult {
  hash: Hash;
  amount: bigint;
  events: {
    deposit?: {
      user: Address;
      pid: bigint;
      amount: bigint;
    };
  };
}

export function useStake(): UseMutationResult<StakeResult, Error, StakeParams> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: StakeParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.masterChef.address,
        abi: MASTERCHEF_ABI,
        functionName: "deposit",
        args: [BigInt(params.poolId), params.amount],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      let depositEvent;
      const depositLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15"
      );

      if (depositLog) {
        const decoded = decodeEventLog({
          abi: MASTERCHEF_ABI,
          data: depositLog.data,
          topics: depositLog.topics,
          eventName: "Deposit",
        });
        depositEvent = {
          user: decoded.args.user,
          pid: decoded.args.pid,
          amount: decoded.args.amount,
        };
      }

      return {
        hash,
        amount: depositEvent?.amount || params.amount,
        events: {
          deposit: depositEvent,
        },
      };
    },
    onError: (error) => {
      console.error("Stake error:", error);
      throw error;
    },
  });
}
