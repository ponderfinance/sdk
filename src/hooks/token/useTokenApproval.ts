import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash, ContractFunctionExecutionError } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";

interface ApprovalParams {
  token: Address;
  spender: Address;
  amount: bigint;
  useUnlimited?: boolean;
}

interface ApprovalResult {
  hash: Hash;
  spender: Address;
  amount: bigint;
}

// Extended ABI with both allowance and allowances functions
const extendedErc20Abi = [
  ...erc20Abi,
  {
    name: "allowances",
    type: "function",
    stateMutability: "view",
    inputs: [
      { name: "owner", type: "address" },
      { name: "spender", type: "address" },
    ],
    outputs: [{ name: "", type: "uint256" }],
  },
] as const;

export function useTokenApproval(
  token: Address | undefined,
  spender: Address | undefined,
  options = {},
  enabled = true
): {
  allowance: UseQueryResult<bigint>;
  approve: UseMutationResult<ApprovalResult, Error, ApprovalParams>;
  isApproved: (amount: bigint) => boolean;
} {
  const sdk = usePonderSDK();

  // Get current allowance with fallback to allowances
  const allowance = useQuery({
    queryKey: ["ponder", "token", "allowance", token, spender],
    queryFn: async () => {
      if (!token || !spender || !sdk.walletClient?.account) {
        throw new Error("Token, spender and connected wallet required");
      }

      try {
        // Try standard allowance first
        return (await sdk.publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [sdk.walletClient.account.address, spender],
        })) as bigint;
      } catch (err) {
        if (err instanceof ContractFunctionExecutionError) {
          console.log("Trying allowances function as fallback");

          // Try allowances as fallback
          return (await sdk.publicClient.readContract({
            address: token,
            abi: extendedErc20Abi,
            functionName: "allowances",
            args: [sdk.walletClient.account.address, spender],
          })) as bigint;
        }
        throw err;
      }
    },
    enabled: enabled && !!token && !!spender && !!sdk.walletClient?.account,
    staleTime: 5_000, // 5 seconds
  });

  // Helper for getting appropriate approval amount
  const getApprovalAmount = async (
    requestedAmount: bigint,
    useUnlimited = false
  ) => {
    if (!useUnlimited) return requestedAmount;

    try {
      // Get token decimals
      const decimals = (await sdk.publicClient.readContract({
        address: token as Address,
        abi: erc20Abi,
        functionName: "decimals",
      })) as number;

      // For 6 decimal tokens, use a safer max value
      if (decimals <= 6) {
        return 2n ** 64n - 1n;
      } else {
        return 2n ** 256n - 1n;
      }
    } catch (err) {
      console.error("Error determining token decimals:", err);
      return requestedAmount;
    }
  };

  // Approve spending with fallback
  const approve = useMutation({
    mutationFn: async ({
      token,
      spender,
      amount,
      useUnlimited = false,
    }: ApprovalParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Try to check allowance with fallback
      let currentAllowance: bigint;
      try {
        currentAllowance = (await sdk.publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [sdk.walletClient.account.address, spender],
        })) as bigint;
      } catch (err) {
        if (err instanceof ContractFunctionExecutionError) {
          console.log("Checking allowances as fallback");
          try {
            currentAllowance = (await sdk.publicClient.readContract({
              address: token,
              abi: extendedErc20Abi,
              functionName: "allowances",
              args: [sdk.walletClient.account.address, spender],
            })) as bigint;
          } catch (innerErr) {
            console.error(
              "Both allowance checks failed, assuming zero allowance",
              innerErr
            );
            currentAllowance = 0n;
          }
        } else {
          console.error("Unknown error checking allowance, assuming zero", err);
          currentAllowance = 0n;
        }
      }

      // Determine approval amount (unlimited or specific)
      const approvalAmount = await getApprovalAmount(amount, useUnlimited);

      if (currentAllowance >= approvalAmount) {
        throw new Error("Already approved");
      }

      let hash: Hash;

      // Try to reset allowance if needed
      if (currentAllowance > 0n) {
        try {
          console.log("Resetting allowance to zero first");
          const resetHash = await sdk.walletClient.writeContract({
            address: token,
            abi: erc20Abi,
            functionName: "approve",
            args: [spender, BigInt(0)],
            chain: sdk.walletClient.chain,
            account: sdk.walletClient.account,
          });
          await sdk.publicClient.waitForTransactionReceipt({ hash: resetHash });
        } catch (err) {
          console.warn(
            "Failed to reset approval, continuing with new approval anyway",
            err
          );
        }
      }

      // Approve new amount
      hash = await sdk.walletClient.writeContract({
        address: token,
        abi: erc20Abi,
        functionName: "approve",
        args: [spender, approvalAmount],
        chain: sdk.walletClient.chain,
        account: sdk.walletClient.account,
      });

      await sdk.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        spender,
        amount: approvalAmount,
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
