import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCH_TOKEN_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

interface ClaimTokensParams {
  tokenAddress: Address;
}

interface ClaimTokensResult {
  hash: Hash;
  amount: bigint;
  events: {
    tokensClaimed?: {
      creator: Address;
      amount: bigint;
    };
  };
}

export function useClaimTokens(): UseMutationResult<
  ClaimTokensResult,
  Error,
  ClaimTokensParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ tokenAddress }: ClaimTokensParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: tokenAddress,
        abi: LAUNCH_TOKEN_ABI,
        functionName: "claimVestedTokens",
        args: [],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      let claimedEvent;
      const claimedLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0x21e127d1db6adff787adddf58c5c02e8fd5d51abca071510431632aa82deadf7"
      );

      if (claimedLog) {
        const decoded = decodeEventLog({
          abi: LAUNCH_TOKEN_ABI,
          data: claimedLog.data,
          topics: claimedLog.topics,
          eventName: "TokensClaimed",
        });
        claimedEvent = {
          creator: decoded.args.creator,
          amount: decoded.args.amount,
        };
      }

      return {
        hash,
        amount: claimedEvent?.amount || 0n,
        events: {
          tokensClaimed: claimedEvent,
        },
      };
    },
    onError: (error) => {
      console.error("Token claim error:", error);
      throw error;
    },
  });
}
