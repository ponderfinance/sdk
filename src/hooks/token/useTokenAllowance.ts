import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address, ContractFunctionExecutionError } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";

export interface AllowanceData {
  amount: bigint;
  isUnlimited: boolean;
  isZero: boolean;
  hasAllowance: (required: bigint) => boolean;
}

// Modified ABI with both allowance and allowances functions
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

export function useTokenAllowance(
  token: Address | undefined,
  spender: Address | undefined,
  owner: Address | undefined,
  enabled = true
): UseQueryResult<AllowanceData> {
  const sdk = usePonderSDK();
  const MAX_UINT256 = 2n ** 256n - 1n;

  return useQuery({
    queryKey: ["ponder", "token", "allowance", token, spender, owner],
    queryFn: async () => {
      if (!token || !spender || !owner) {
        throw new Error("Token, spender and owner addresses required");
      }

      // Try the standard allowance function first
      try {
        const allowance = (await sdk.publicClient.readContract({
          address: token,
          abi: erc20Abi,
          functionName: "allowance",
          args: [owner, spender],
        })) as bigint;

        return {
          amount: allowance,
          isUnlimited: allowance === MAX_UINT256,
          isZero: allowance === 0n,
          hasAllowance: (required: bigint) => allowance >= required,
        };
      } catch (err) {
        // Check if this is a function not found error or similar contract error
        if (err instanceof ContractFunctionExecutionError) {
          console.log(
            "Standard allowance function failed, trying 'allowances'"
          );

          // Try the non-standard "allowances" function
          try {
            const allowance = (await sdk.publicClient.readContract({
              address: token,
              abi: extendedErc20Abi,
              functionName: "allowances",
              args: [owner, spender],
            })) as bigint;

            return {
              amount: allowance,
              isUnlimited: allowance === MAX_UINT256,
              isZero: allowance === 0n,
              hasAllowance: (required: bigint) => allowance >= required,
            };
          } catch (allowancesErr) {
            console.error(
              "Both allowance and allowances functions failed",
              allowancesErr
            );
            // Rethrow original error if both attempts fail
            throw err;
          }
        }

        // If it's a different type of error, just rethrow it
        throw err;
      }
    },
    enabled: enabled && !!token && !!spender && !!owner,
    staleTime: 5_000, // 5 seconds
    refetchInterval: 5_000, // Poll every 5 seconds when active
  });
}
