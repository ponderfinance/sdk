import { useQuery } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import type { BridgeInfo } from "@/contracts/bridge";

export function useBridgeInfo(token: Address, destChainId: bigint) {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["bridgeInfo", token, destChainId],
    queryFn: async (): Promise<BridgeInfo> => {
      const info = await sdk.bridge.getBridgeInfo(token, destChainId);
      return {
        ...info,
        // Convert number enums to our TypeScript enums
        allowedDestTokenTypes: Number(info.allowedDestTokenTypes),
        feeType: Number(info.feeType),
        strategy: Number(info.strategy),
      };
    },
  });
}
