import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { bitkubTestnetChain } from "@/constants/chains";

interface SwapApprovalParams {
  tokenIn: Address;
  amountIn: bigint;
  useUnlimited?: boolean;
}

interface ApprovalState {
  state: "unknown" | "required" | "approved";
  isUnlimited: boolean;
  currentAllowance: bigint;
}

interface SwapApprovalResult {
  hash: Hash;
  state: ApprovalState;
}

export function useSwapApproval(): UseMutationResult<
  SwapApprovalResult,
  Error,
  SwapApprovalParams
> {
  const sdk = usePonderSDK();
  const MAX_UINT256 = 2n ** 256n - 1n;

  // Get router address for approvals
  const spender = sdk.router.address;

  return useMutation({
    mutationFn: async ({
      tokenIn,
      amountIn,
      useUnlimited = false,
    }: SwapApprovalParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Check current allowance
      const currentAllowance = (await sdk.publicClient.readContract({
        address: tokenIn,
        abi: [
          {
            name: "allowance",
            type: "function",
            stateMutability: "view",
            inputs: [
              { name: "owner", type: "address" },
              { name: "spender", type: "address" },
            ],
            outputs: [{ name: "", type: "uint256" }],
          },
        ],
        functionName: "allowance",
        args: [sdk.walletClient.account.address, spender],
      })) as bigint;

      // Determine initial state
      const state: ApprovalState = {
        state: currentAllowance >= amountIn ? "approved" : "required",
        isUnlimited: currentAllowance === MAX_UINT256,
        currentAllowance,
      };

      // Return early if already approved
      if (state.state === "approved" && (!useUnlimited || state.isUnlimited)) {
        throw new Error("Already approved");
      }

      // If we have an existing allowance but want unlimited, or need to reset, clear first
      if (
        currentAllowance > 0n &&
        (useUnlimited || currentAllowance < amountIn)
      ) {
        const resetHash = await sdk.walletClient.writeContract({
          address: tokenIn,
          chain: bitkubTestnetChain,
          account: sdk.walletClient.account,
          abi: [
            {
              name: "approve",
              type: "function",
              inputs: [
                { name: "spender", type: "address" },
                { name: "amount", type: "uint256" },
              ],
              outputs: [{ name: "", type: "bool" }],
            },
          ],
          functionName: "approve",
          args: [spender, 0n],
        });
        await sdk.publicClient.waitForTransactionReceipt({ hash: resetHash });
      }

      // Approve new amount
      const approvalAmount = useUnlimited ? MAX_UINT256 : amountIn;
      const hash = await sdk.walletClient.writeContract({
        address: tokenIn,
        chain: bitkubTestnetChain,
        account: sdk.walletClient.account,
        abi: [
          {
            name: "approve",
            type: "function",
            inputs: [
              { name: "spender", type: "address" },
              { name: "amount", type: "uint256" },
            ],
            outputs: [{ name: "", type: "bool" }],
          },
        ],
        functionName: "approve",
        args: [spender, approvalAmount],
      });

      // Wait for confirmation
      await sdk.publicClient.waitForTransactionReceipt({ hash });

      return {
        hash,
        state: {
          state: "approved",
          isUnlimited: useUnlimited,
          currentAllowance: approvalAmount,
        },
      };
    },
  });
}
