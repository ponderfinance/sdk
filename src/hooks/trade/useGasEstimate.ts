import { useQuery, type UseQueryResult } from "@tanstack/react-query";
import { type Address } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface GasEstimateParams {
  to: Address;
  data: `0x${string}`;
  value?: bigint;
}

export interface GasEstimate {
  estimate: bigint;
  estimateInKUB: string;
  maxFeePerGas: bigint | null;
  maxPriorityFeePerGas: bigint | null;
  gasPrice: bigint | null;
  isHighPriority?: boolean;
}

export function useGasEstimate(
  params: GasEstimateParams | undefined,
  enabled = true
): UseQueryResult<GasEstimate> {
  const sdk = usePonderSDK();

  return useQuery({
    queryKey: [
      "ponder",
      "gas",
      "estimate",
      {
        ...params,
        value: params?.value?.toString(),
      },
    ],
    queryFn: async () => {
      if (!params || !sdk.walletClient?.account) {
        throw new Error("Transaction params and connected wallet required");
      }

      const { to, data, value = 0n } = params;

      // Get gas price data
      const [gasEstimate, feeData] = await Promise.all([
        // Estimate gas
        sdk.publicClient.estimateGas({
          account: sdk.walletClient.account.address,
          to,
          data,
          value,
        }),
        // Get fee data
        sdk.publicClient.getFeeHistory({
          blockCount: 4,
          rewardPercentiles: [10, 50, 90],
        }),
      ]);

      // Get latest block's fees
      const latest = feeData.baseFeePerGas[feeData.baseFeePerGas.length - 1];
      const reward = feeData.reward?.[feeData.reward.length - 1];

      // Calculate max fees
      const maxPriorityFeePerGas = reward ? reward[1] : null; // Use 50th percentile
      const maxFeePerGas =
        latest && maxPriorityFeePerGas ? latest + maxPriorityFeePerGas : null;

      // Get regular gas price as fallback
      const gasPrice = latest ? latest : await sdk.publicClient.getGasPrice();

      // Calculate KUB cost (using either gas price or max fee)
      const gasCost = gasEstimate * (maxFeePerGas || gasPrice || 0n);
      const kubCost = Number(gasCost) / 1e18;

      // Determine if this is high priority (90th percentile of recent fees)
      const isHighPriority =
        maxPriorityFeePerGas && reward
          ? maxPriorityFeePerGas >= reward[2]
          : false;

      return {
        estimate: gasEstimate,
        estimateInKUB: kubCost.toFixed(6),
        maxFeePerGas,
        maxPriorityFeePerGas,
        gasPrice,
        isHighPriority,
      };
    },
    enabled: enabled && !!params && !!sdk.walletClient?.account,
    staleTime: 10_000, // 10 seconds
  });
}
