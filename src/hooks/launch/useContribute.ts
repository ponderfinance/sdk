import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCHER_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

interface ContributeParams {
  launchId: bigint;
  amount: bigint;
}

interface ContributeResult {
  hash: Hash;
  contribution: {
    amount: bigint;
    tokens: bigint;
  };
  events: {
    contributed?: {
      launchId: bigint;
      contributor: Address;
      amount: bigint;
    };
    tokenPurchased?: {
      launchId: bigint;
      buyer: Address;
      kubAmount: bigint;
      tokenAmount: bigint;
    };
  };
}

export function useContribute(): UseMutationResult<
  ContributeResult,
  Error,
  ContributeParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ launchId, amount }: ContributeParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.launcher.address,
        abi: LAUNCHER_ABI,
        functionName: "contribute",
        args: [launchId],
        value: amount,
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      const events: ContributeResult["events"] = {};

      for (const log of receipt.logs) {
        try {
          if (
            log.topics[0] ===
            "0xe893c2681d327421d89e1cb54e44586c36d9a0a37c1bca6cd4e93ac234db355e"
          ) {
            // Contributed event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "Contributed",
            } as const);

            events.contributed = {
              launchId: decoded.args.launchId,
              contributor: decoded.args.contributor,
              amount: decoded.args.amount,
            };
          } else if (
            log.topics[0] ===
            "0x9c8993b809ea69f964db3a53c24ed7bc8e8935d4114a31604656125bdf32c2d0"
          ) {
            // TokenPurchased event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "TokenPurchased",
            } as const);

            events.tokenPurchased = {
              launchId: decoded.args.launchId,
              buyer: decoded.args.buyer,
              kubAmount: decoded.args.kubAmount,
              tokenAmount: decoded.args.tokenAmount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
          continue;
        }
      }

      return {
        hash,
        contribution: {
          amount: events.contributed?.amount || amount,
          tokens: events.tokenPurchased?.tokenAmount || 0n,
        },
        events,
      };
    },
    onError: (error) => {
      console.error("Contribution error:", error);
      throw error;
    },
  });
}
