import {
  useMutation,
  type UseMutationResult,
  useQuery,
} from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
  zeroAddress,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { PAIR_ABI, ROUTER_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

interface AddLiquidityParams {
  tokenA: Address;
  tokenB: Address;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  to: Address;
  deadline: bigint;
}

interface AddLiquidityResult {
  hash: Hash;
  amounts: {
    amountA: bigint;
    amountB: bigint;
    liquidity: bigint;
  };
  events: {
    transfer?: {
      from: Address;
      to: Address;
      value: bigint;
    };
    mint?: {
      sender: Address;
      amount0: bigint;
      amount1: bigint;
    };
  };
}

// Define event types
type TransferEvent = {
  eventName: "Transfer";
  args: {
    from: Address;
    to: Address;
    value: bigint;
  };
};

type MintEvent = {
  eventName: "Mint";
  args: {
    sender: Address;
    amount0: bigint;
    amount1: bigint;
  };
};

export function useAddLiquidity(): UseMutationResult<
  AddLiquidityResult,
  Error,
  AddLiquidityParams
> {
  const sdk = usePonderSDK();

  // Get KKUB (WETH) address to compare
  const { data: wethAddress } = useQuery({
    queryKey: ["router", "KKUB"],
    queryFn: async () => {
      if (!sdk.router) return null;
      return sdk.router.KKUB();
    },
    enabled: !!sdk.router,
  });

  return useMutation({
    mutationFn: async (params: AddLiquidityParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Get pair address first
      const pairAddress = await sdk.factory.getPair(
        params.tokenA,
        params.tokenB
      );

      // If pair doesn't exist, we need to create it
      const createPair =
        !pairAddress ||
        pairAddress === "0x0000000000000000000000000000000000000000";

      let hash: Hash;

      // IMPORTANT: Only use addLiquidityETH for native KUB
      // Check if we're adding liquidity with native KUB (zero address)
      const isNativeETHPair =
        params.tokenA.toLowerCase() === zeroAddress.toLowerCase() ||
        params.tokenB.toLowerCase() === zeroAddress.toLowerCase();

      if (isNativeETHPair) {
        // Handle native KUB pair
        console.log("Using addLiquidityETH for native KUB pair");

        // Determine which token is the non-ETH token
        const isTokenANative =
          params.tokenA.toLowerCase() === zeroAddress.toLowerCase();
        const token = isTokenANative ? params.tokenB : params.tokenA;
        const amountToken = isTokenANative
          ? params.amountBDesired
          : params.amountADesired;
        const amountTokenMin = isTokenANative
          ? params.amountBMin
          : params.amountAMin;
        const amountETH = isTokenANative
          ? params.amountADesired
          : params.amountBDesired;
        const amountETHMin = isTokenANative
          ? params.amountAMin
          : params.amountBMin;

        console.log("addLiquidityETH params:", {
          token,
          amountToken: amountToken.toString(),
          amountTokenMin: amountTokenMin.toString(),
          amountETHMin: amountETHMin.toString(),
          to: params.to,
          deadline: params.deadline.toString(),
          value: amountETH.toString(),
        });

        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "addLiquidityETH",
          args: [
            token,
            amountToken,
            amountTokenMin,
            amountETHMin,
            params.to,
            params.deadline,
          ],
          account: sdk.walletClient.account.address,
          chain: bitkubTestnetChain,
          value: amountETH,
        });

        hash = await sdk.walletClient.writeContract(
          request as WriteContractParameters
        );
      } else {
        // Handle regular token pair (including KKUB token pairs)
        console.log(
          "Using standard addLiquidity for token pair or KKUB token pair"
        );

        console.log("addLiquidity params:", {
          tokenA: params.tokenA,
          tokenB: params.tokenB,
          amountADesired: params.amountADesired.toString(),
          amountBDesired: params.amountBDesired.toString(),
          amountAMin: params.amountAMin.toString(),
          amountBMin: params.amountBMin.toString(),
          to: params.to,
          deadline: params.deadline.toString(),
        });

        const { request } = await sdk.publicClient.simulateContract({
          address: sdk.router.address,
          abi: ROUTER_ABI,
          functionName: "addLiquidity",
          args: [
            params.tokenA,
            params.tokenB,
            params.amountADesired,
            params.amountBDesired,
            params.amountAMin,
            params.amountBMin,
            params.to,
            params.deadline,
          ],
          account: sdk.walletClient.account.address,
          chain: bitkubTestnetChain,
        });

        hash = await sdk.walletClient.writeContract(
          request as WriteContractParameters
        );
      }

      // Wait for transaction receipt
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // If we're creating a new pair, we need to get the pair address again
      let finalPairAddress = pairAddress;
      if (createPair) {
        finalPairAddress = await sdk.factory.getPair(
          params.tokenA,
          params.tokenB
        );
        if (
          !finalPairAddress ||
          finalPairAddress === "0x0000000000000000000000000000000000000000"
        ) {
          throw new Error("Failed to create pair");
        }
      }

      // Decode Mint event
      const mintLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === finalPairAddress.toLowerCase() &&
          log.topics[0] ===
            "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"
      );

      let mintEvent;
      if (mintLog) {
        try {
          const decoded = decodeEventLog({
            abi: PAIR_ABI,
            data: mintLog.data,
            topics: mintLog.topics,
            eventName: "Mint",
          }) as MintEvent;

          mintEvent = {
            sender: decoded.args.sender,
            amount0: decoded.args.amount0,
            amount1: decoded.args.amount1,
          };
        } catch (error) {
          console.error("Failed to decode Mint event:", error);
        }
      }

      // Decode Transfer event for LP tokens
      const transferLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === finalPairAddress.toLowerCase() &&
          log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" &&
          log.topics[2]?.toLowerCase() ===
            params.to.toLowerCase().padStart(66, "0")
      );

      let transferEvent;
      if (transferLog) {
        try {
          const decoded = decodeEventLog({
            abi: PAIR_ABI,
            data: transferLog.data,
            topics: transferLog.topics,
            eventName: "Transfer",
          }) as TransferEvent;

          transferEvent = {
            from: decoded.args.from,
            to: decoded.args.to,
            value: decoded.args.value,
          };
        } catch (error) {
          console.error("Failed to decode Transfer event:", error);
        }
      }

      return {
        hash,
        amounts: {
          amountA: mintEvent?.amount0 || 0n,
          amountB: mintEvent?.amount1 || 0n,
          liquidity: transferEvent?.value || 0n,
        },
        events: {
          transfer: transferEvent,
          mint: mintEvent,
        },
      };
    },
    onError: (error) => {
      console.error("Add liquidity error:", error);
      throw error;
    },
  });
}
