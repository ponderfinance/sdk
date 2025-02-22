import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

export function useBridgeFees(
  token: Address,
  destChainId: bigint,
  amount: bigint
) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["bridgeFees", token, destChainId, amount],
    queryFn: async () => {
      return sdk.bridge.computeFee(token, destChainId, amount);
    },
    enabled: amount > 0n,
  });
}
