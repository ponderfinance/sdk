import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { erc20Abi } from "viem";

export interface AllowanceData {
  amount: bigint;
  isUnlimited: boolean;
  isZero: boolean;
  hasAllowance: (required: bigint) => boolean;
}

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
    },
    enabled: enabled && !!token && !!spender && !!owner,
    staleTime: 5_000, // 5 seconds
    refetchInterval: 5_000, // Poll every 5 seconds when active
  });
}
