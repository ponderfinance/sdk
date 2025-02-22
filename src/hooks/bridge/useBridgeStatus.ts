import { useQuery } from "@tanstack/react-query";
import { usePonderSDK } from "@/context/PonderContext";

export function useBridgeStatus() {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: ["bridgeStatus"],
    queryFn: async () => {
      return sdk.bridge.isPaused();
    },
  });
}
