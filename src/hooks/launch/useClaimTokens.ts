import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type Address, type Hash, decodeEventLog } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCH_TOKEN_ABI } from "@/abis";

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

      const token = sdk.getLaunchToken(tokenAddress);
      const hash = await token.claimVestedTokens();

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      const events: ClaimTokensResult["events"] = {};

      for (const log of receipt.logs) {
        try {
          if (
            log.topics[0] ===
            "0x21e127d1db6adff787adddf58c5c02e8fd5d51abca071510431632aa82deadf7"
          ) {
            // TokensClaimed event
            const decoded = decodeEventLog({
              abi: LAUNCH_TOKEN_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "TokensClaimed",
            } as const);

            events.tokensClaimed = {
              creator: decoded.args.creator,
              amount: decoded.args.amount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
          continue;
        }
      }

      return {
        hash,
        amount: events.tokensClaimed?.amount || 0n,
        events,
      };
    },
    onError: (error) => {
      console.error("Token claim error:", error);
      throw error;
    },
  });
}
