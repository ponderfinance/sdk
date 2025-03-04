import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";

interface ApprovalParams {
  token: Address;
  spender: Address;
  amount: bigint;
}

interface ApprovalResult {
  hash: Hash;
  spender: Address;
  amount: bigint;
}

export function useTokenApproval(
  token: Address | undefined,
  spender: Address | undefined,
  enabled = true
): {
  allowance: UseQueryResult<bigint>;
  approve: UseMutationResult<ApprovalResult, Error, ApprovalParams>;
  isApproved: (amount: bigint) => boolean;
} {
  const sdk = usePonderSDK();

  // Get current allowance
  const allowance = useQuery({
    queryKey: ["ponder", "token", "allowance", token, spender],
    queryFn: async () => {
      if (!token || !spender || !sdk.walletClient?.account) {
        throw new Error("Token, spender and connected wallet required");
      }

      return sdk.publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [sdk.walletClient.account.address, spender],
      }) as Promise<bigint>;
    },
    enabled: enabled && !!token && !!spender && !!sdk.walletClient?.account,
    staleTime: 5_000, // 5 seconds
  });

  // Approve spending
  const approve = useMutation({
    mutationFn: async ({ token, spender, amount }: ApprovalParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // First check if we already have sufficient allowance
      const currentAllowance = await sdk.publicClient.readContract({
        address: token,
        abi: erc20Abi,
        functionName: "allowance",
        args: [sdk.walletClient.account.address, spender],
      });

      if (currentAllowance >= amount) {
        throw new Error("Already approved");
      }

      // If previous allowance exists but insufficient, reset to 0 first
      if (currentAllowance > 0n) {
        const resetHash = await sdk.walletClient.writeContract({
          address: token,
          abi: erc20Abi,
          functionName: "approve",
          args: [spender, BigInt(0)],
          chain: sdk.walletClient.chain,
          account: sdk.walletClient.account,
        });
        await sdk.publicClient.waitForTransactionReceipt({ hash: resetHash });
      }

      // Approve new amount
      const hash = await sdk.walletClient.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, amount],
        chain: sdk.walletClient.chain,
        account: sdk.walletClient.account,
      });

      await sdk.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        spender,
        amount,
      };
    },
  });

  // Helper to check if an amount is approved
  const isApproved = (amount: bigint): boolean => {
    if (!allowance.data) return false;
    return allowance.data >= amount;
  };

  return {
    allowance,
    approve,
    isApproved,
  };
}
