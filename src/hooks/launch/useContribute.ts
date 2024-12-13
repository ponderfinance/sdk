import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCHER_ABI, TOKEN_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

type ContributeType = "KUB" | "PONDER";

interface BaseContributeParams {
  launchId: bigint;
  amount: bigint;
  type: ContributeType;
}

interface ContributeResult {
  hash: Hash;
  contribution: {
    amount: bigint;
    kubValue: bigint;
  };
  ponderMetrics?: {
    lpAllocation: bigint;
    protocolLPAllocation: bigint;
    burnAmount: bigint;
  };
  events: {
    kubContributed?: {
      launchId: bigint;
      contributor: Address;
      amount: bigint;
    };
    ponderContributed?: {
      launchId: bigint;
      contributor: Address;
      amount: bigint;
      kubValue: bigint;
    };
    dualPoolsCreated?: {
      launchId: bigint;
      memeKubPair: Address;
      memePonderPair: Address;
      kubLiquidity: bigint;
      ponderLiquidity: bigint;
    };
    ponderBurned?: {
      launchId: bigint;
      amount: bigint;
    };
  };
}

export function useContribute(): UseMutationResult<
  ContributeResult,
  Error,
  BaseContributeParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ launchId, amount, type }: BaseContributeParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Get launch info and contribution info
      const [launchInfo, contributionInfo] = await Promise.all([
        sdk.launcher.getLaunchInfo(launchId),
        sdk.launcher.getContributionInfo(launchId),
      ]);

      // Validate contribution based on type
      if (type === "PONDER") {
        // Check PONDER balance
        const ponderBalance = await sdk.ponder.balanceOf(
          sdk.walletClient.account.address
        );

        if (ponderBalance < amount) {
          throw new Error("Insufficient PONDER balance");
        }

        // Check allowance and approve if needed
        const allowance = await sdk.ponder.allowance(
          sdk.walletClient.account.address,
          sdk.launcher.address
        );

        if (allowance < amount) {
          const { request: approvalRequest } =
            await sdk.publicClient.simulateContract({
              address: sdk.ponder.address,
              abi: TOKEN_ABI,
              functionName: "approve",
              args: [sdk.launcher.address, amount],
              account: sdk.walletClient.account.address,
              chain: bitkubTestnetChain,
            });

          const approvalTx = await sdk.walletClient.writeContract(
            approvalRequest as WriteContractParameters
          );
          await sdk.publicClient.waitForTransactionReceipt({
            hash: approvalTx,
          });
        }
      }

      // Prepare contract call based on type
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.launcher.address,
        abi: LAUNCHER_ABI,
        functionName: type === "KUB" ? "contributeKUB" : "contributePONDER",
        args: type === "KUB" ? [launchId] : [launchId, amount],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
        ...(type === "KUB" ? { value: amount } : {}),
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Process events
      const events: ContributeResult["events"] = {};

      for (const log of receipt.logs) {
        try {
          const eventId = log?.topics[0]?.toLowerCase();

          if (
            eventId ===
            "0xe893c2681d327421d89e1cb54e44586c36d9a0a37c1bca6cd4e93ac234db355e"
          ) {
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "KUBContributed",
            });
            events.kubContributed = {
              launchId: decoded.args.launchId,
              contributor: decoded.args.contributor,
              amount: decoded.args.amount,
            };
          } else if (
            eventId ===
            "0x74357e3e382064e1dfe9b2793e87ec9f6cd7459544e2c85c1c72e3a97591c91"
          ) {
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
              kubValue: decoded.args.kubValue,
            };
          } else if (
            eventId ===
            "0x8d7c3c56f4e7f949b483f37118c9b7d56c947690b5ff3db6757b7c634c23a4b9"
          ) {
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "DualPoolsCreated",
            });
            events.dualPoolsCreated = {
              launchId: decoded.args.launchId,
              memeKubPair: decoded.args.memeKubPair,
              memePonderPair: decoded.args.memePonderPair,
              kubLiquidity: decoded.args.kubLiquidity,
              ponderLiquidity: decoded.args.ponderLiquidity,
            };
          } else if (
            eventId ===
            "0x4859432e4c6ddb3d7e54959edea5b348d16bb60da60673621d49c2689874539c"
          ) {
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "PonderBurned",
            });
            events.ponderBurned = {
              launchId: decoded.args.launchId,
              amount: decoded.args.amount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
        }
      }

      // Calculate metrics if it's a PONDER contribution
      let ponderMetrics;
      if (type === "PONDER") {
        const metrics = await sdk.launcher.calculatePonderRequirements();
        ponderMetrics = {
          lpAllocation: metrics.lpAllocation,
          protocolLPAllocation: metrics.protocolLPAllocation,
          burnAmount: metrics.burnAmount,
        };
      }

      return {
        hash,
        contribution: {
          amount:
            type === "KUB"
              ? events.kubContributed?.amount || 0n
              : events.ponderContributed?.amount || 0n,
          kubValue:
            type === "KUB"
              ? events.kubContributed?.amount || 0n
              : events.ponderContributed?.kubValue || 0n,
        },
        ponderMetrics,
        events,
      };
    },
    onError: (error) => {
      console.error("Contribution error:", error);
      throw error;
    },
  });
}
