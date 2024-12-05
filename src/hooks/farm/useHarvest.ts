import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  type WriteContractParameters,
  decodeEventLog,
  erc20Abi,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { MASTERCHEF_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

interface HarvestParams {
  poolId: number;
}

interface HarvestResult {
  hash: Hash;
  rewards: bigint;
  events: {
    deposit?: {
      user: Address;
      pid: bigint;
      amount: bigint;
    };
    transfer?: {
      from: Address;
      to: Address;
      value: bigint;
    };
  };
}

// Type guards for event decoding
interface DepositEvent {
  eventName: "Deposit";
  args: {
    user: Address;
    pid: bigint;
    amount: bigint;
  };
}

interface TransferEvent {
  eventName: "Transfer";
  args: {
    from: Address;
    to: Address;
    value: bigint;
  };
}

// Type guard functions
function isDepositEvent(event: any): event is DepositEvent {
  return (
    event?.eventName === "Deposit" &&
    "user" in event.args &&
    "pid" in event.args &&
    "amount" in event.args
  );
}

function isTransferEvent(event: any): event is TransferEvent {
  return (
    event?.eventName === "Transfer" &&
    "from" in event.args &&
    "to" in event.args &&
    "value" in event.args
  );
}

export function useHarvest(): UseMutationResult<
  HarvestResult,
  Error,
  HarvestParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: HarvestParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.masterChef.address,
        abi: MASTERCHEF_ABI,
        functionName: "deposit",
        args: [BigInt(params.poolId), 0n],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      let rewards = 0n;
      const events: HarvestResult["events"] = {};

      for (const log of receipt.logs) {
        try {
          if (
            log.topics[0] ===
            "0x90890809c654f11d6e72a28fa60149770a0d11ec6c92319d6ceb2bb0a4ea1a15"
          ) {
            // Deposit event
            const decoded = decodeEventLog({
              abi: MASTERCHEF_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "Deposit",
            } as const);

            if (isDepositEvent(decoded)) {
              events.deposit = {
                user: decoded.args.user,
                pid: decoded.args.pid,
                amount: decoded.args.amount,
              };
            }
          } else if (
            log.topics[0] ===
            "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef"
          ) {
            // Transfer event of PONDER tokens
            const decoded = decodeEventLog({
              abi: erc20Abi,
              data: log.data,
              topics: log.topics,
              eventName: "Transfer",
            } as const);

            if (isTransferEvent(decoded)) {
              events.transfer = {
                from: decoded.args.from,
                to: decoded.args.to,
                value: decoded.args.value,
              };

              // Sum up all transfers to user
              if (
                decoded.args.to.toLowerCase() ===
                sdk.walletClient.account.address.toLowerCase()
              ) {
                rewards += decoded.args.value;
              }
            }
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
          continue;
        }
      }

      return {
        hash,
        rewards,
        events,
      };
    },
    onError: (error) => {
      console.error("Harvest error:", error);
      throw error;
    },
  });
}
