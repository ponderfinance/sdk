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
    ponderAmount: bigint;
    tokensReceived: bigint;
  };
  ponderMetrics: {
    lpAmount: bigint;
    protocolLPAmount: bigint;
    burnAmount: bigint;
  };
  events: {
    contributed?: {
      launchId: bigint;
      contributor: Address;
      amount: bigint;
    };
    ponderContributed?: {
      launchId: bigint;
      contributor: Address;
      amount: bigint;
    };
    tokenPurchased?: {
      launchId: bigint;
      buyer: Address;
      ponderAmount: bigint;
      tokenAmount: bigint;
    };
    ponderBurned?: {
      launchId: bigint;
      burnAmount: bigint;
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

      // Get launch info and required PONDER amount
      const [launchInfo, ponderMetrics] = await Promise.all([
        sdk.launcher.getLaunchInfo(launchId),
        sdk.launcher.calculatePonderRequirements(),
      ]);

      // Check PONDER balance
      const ponderBalance = await sdk.ponder.balanceOf(
        sdk.walletClient.account.address
      );

      // Validate PONDER balance
      if (ponderBalance < ponderMetrics.requiredAmount) {
        throw new Error("Insufficient PONDER balance");
      }

      // Contribute to launch
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.launcher.address,
        abi: LAUNCHER_ABI,
        functionName: "contribute",
        args: [launchId, amount],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      // Process events
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
            });
            events.contributed = {
              launchId: decoded.args.launchId,
              contributor: decoded.args.contributor,
              amount: decoded.args.amount,
            };
          } else if (
            log.topics[0] ===
            "0x74357e3e382064e1dfe9b2793e87ec9f6cd7459544e2c85c1c72e3a97591c91"
          ) {
            // PonderContributed event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "PonderContributed",
            });
            events.ponderContributed = {
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
            });
            events.tokenPurchased = {
              launchId: decoded.args.launchId,
              buyer: decoded.args.buyer,
              ponderAmount: decoded.args.ponderAmount,
              tokenAmount: decoded.args.tokenAmount,
            };
          } else if (
            log.topics[0] ===
            "0x4859432e4c6ddb3d7e54959edea5b348d16bb60da60673621d49c2689874539c"
          ) {
            // PonderBurned event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "PonderBurned",
            });
            events.ponderBurned = {
              launchId: decoded.args.launchId,
              burnAmount: decoded.args.burnAmount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
        }
      }

      return {
        hash,
        contribution: {
          ponderAmount:
            events.ponderContributed?.amount || ponderMetrics.requiredAmount,
          tokensReceived: events.tokenPurchased?.tokenAmount || 0n,
        },
        ponderMetrics: {
          lpAmount: ponderMetrics.lpAllocation,
          protocolLPAmount: ponderMetrics.protocolLPAllocation,
          burnAmount: ponderMetrics.burnAmount,
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
