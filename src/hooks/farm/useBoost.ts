import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  decodeEventLog,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { MASTERCHEF_ABI } from "@/abis";

interface BoostStakeParams {
  poolId: number;
  amount: bigint;
}

interface BoostUnstakeParams extends BoostStakeParams {}

interface BoostResult {
  hash: Hash;
  amount: bigint;
  events: {
    boostStake?: {
      user: Address;
      pid: bigint;
      amount: bigint;
    };
    boostUnstake?: {
      user: Address;
      pid: bigint;
      amount: bigint;
    };
  };
}

export function useBoostStake(): UseMutationResult<
  BoostResult,
  Error,
  BoostStakeParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: BoostStakeParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.masterChef.address,
        abi: MASTERCHEF_ABI,
        functionName: "boostStake",
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

      let boostStakeEvent;
      const boostStakeLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === sdk.masterChef.address.toLowerCase() &&
          log.topics[0] ===
            "0x4ed4c68f13abf9c0a138434c6d868b44a80834f36c55b9fb945c7672ff919ea0"
      );

      if (boostStakeLog) {
        const decoded = decodeEventLog({
          abi: MASTERCHEF_ABI,
          data: boostStakeLog.data,
          topics: boostStakeLog.topics,
          eventName: "BoostStake",
        });
        boostStakeEvent = {
          user: decoded.args.user,
          pid: decoded.args.pid,
          amount: decoded.args.amount,
        };
      }

      return {
        hash,
        amount: boostStakeEvent?.amount || params.amount,
        events: {
          boostStake: boostStakeEvent,
        },
      };
    },
  });
}

export function useBoostUnstake(): UseMutationResult<
  BoostResult,
  Error,
  BoostUnstakeParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: BoostUnstakeParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.masterChef.address,
        abi: MASTERCHEF_ABI,
        functionName: "boostUnstake",
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

      let boostUnstakeEvent;
      const boostUnstakeLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === sdk.masterChef.address.toLowerCase() &&
          log.topics[0] ===
            "0x6f498a6d2e0937b2d3ab5c89c4d3981571a77e3359c503c5080c75b9c847a0e2"
      );

      if (boostUnstakeLog) {
        const decoded = decodeEventLog({
          abi: MASTERCHEF_ABI,
          data: boostUnstakeLog.data,
          topics: boostUnstakeLog.topics,
          eventName: "BoostUnstake",
        });
        boostUnstakeEvent = {
          user: decoded.args.user,
          pid: decoded.args.pid,
          amount: decoded.args.amount,
        };
      }

      return {
        hash,
        amount: boostUnstakeEvent?.amount || params.amount,
        events: {
          boostUnstake: boostUnstakeEvent,
        },
      };
    },
  });
}
