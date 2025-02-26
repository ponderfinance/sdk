import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
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
      if (
        !pairAddress ||
        pairAddress === "0x0000000000000000000000000000000000000000"
      ) {
        throw new Error("Pair does not exist");
      }

      // Check if we're adding liquidity with ETH/WETH
      const wethAddress = await sdk.router.KKUB();
      const isETHPair =
        params.tokenA.toLowerCase() === wethAddress.toLowerCase() ||
        params.tokenB.toLowerCase() === wethAddress.toLowerCase();

      let hash: Hash;

      if (isETHPair) {
        // Handle ETH pair
        const token =
          params.tokenA === wethAddress ? params.tokenB : params.tokenA;
        const amountToken =
          params.tokenA === wethAddress
            ? params.amountBDesired
            : params.amountADesired;
        const amountTokenMin =
          params.tokenA === wethAddress ? params.amountBMin : params.amountAMin;
        const amountETH =
          params.tokenA === wethAddress
            ? params.amountADesired
            : params.amountBDesired;
        const amountETHMin =
          params.tokenA === wethAddress ? params.amountAMin : params.amountBMin;

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
        // Handle regular token pair
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

      // Decode Mint event
      const mintLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === pairAddress.toLowerCase() &&
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
          log.address.toLowerCase() === pairAddress.toLowerCase() &&
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
