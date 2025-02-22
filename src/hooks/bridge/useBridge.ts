import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { usePonderSDK } from "@/context/PonderContext";
import {
  type BridgeParams,
  type NativeBridgeParams,
  type BridgeResult,
} from "@/contracts/bridge";

export function useBridgeTokens(): UseMutationResult<
  BridgeResult,
  Error,
  BridgeParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: BridgeParams): Promise<BridgeResult> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Get bridge info before executing
      const info = await sdk.bridge.getBridgeInfo(
        params.token,
        params.destChainID
      );

      if (!info.enabled) {
        throw new Error("Bridge not enabled");
      }

      const hash = await sdk.bridge.bridgeTokens(params);

      return {
        hash,
        info,
      };
    },
  });
}

export function useBridgeNative(): UseMutationResult<
  BridgeResult,
  Error,
  { params: NativeBridgeParams; value: bigint }
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({ params, value }): Promise<BridgeResult> => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const hash = await sdk.bridge.bridgeNative(params, value);
      const info = await sdk.bridge.getBridgeInfo(
        "0xFFfFfFffFFfffFFfFFfFFFFFffFFFffffFfFFFfF", // NATIVE_REPRESENTATION
        params.destChainID
      );

      return {
        hash,
        info,
      };
    },
  });
}
