import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type Address, type Hash, decodeEventLog } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { PAIR_ABI } from "@/abis";

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

export function useAddLiquidity(): UseMutationResult<
  AddLiquidityResult,
  Error,
  AddLiquidityParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: AddLiquidityParams) => {
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

      // Add liquidity
      const hash = await sdk.router.addLiquidity({
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amountADesired: params.amountADesired,
        amountBDesired: params.amountBDesired,
        amountAMin: params.amountAMin,
        amountBMin: params.amountBMin,
        to: params.to,
        deadline: params.deadline,
      });

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
        const decoded = decodeEventLog({
          abi: PAIR_ABI,
          data: mintLog.data,
          topics: mintLog.topics,
          eventName: "Mint",
        });
        mintEvent = {
          sender: decoded.args.sender,
          amount0: decoded.args.amount0,
          amount1: decoded.args.amount1,
        };
      }

      // Decode Transfer event for LP tokens
      const transferLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === pairAddress.toLowerCase() &&
          log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef" &&
          log?.topics?.[2]?.toLowerCase() ===
            params.to.toLowerCase().padStart(66, "0")
      );

      let transferEvent;
      if (transferLog) {
        const decoded = decodeEventLog({
          abi: PAIR_ABI,
          data: transferLog.data,
          topics: transferLog.topics,
          eventName: "Transfer",
        });
        transferEvent = {
          from: decoded.args.from,
          to: decoded.args.to,
          value: decoded.args.value,
        };
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
