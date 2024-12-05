import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { bitkubTestnetChain } from "@/constants/chains";
import { LAUNCHER_ABI } from "@/abis";

interface CreateLaunchParams {
  name: string;
  symbol: string;
  imageURI: string;
}

interface CreateLaunchResult {
  hash: Hash;
  launchId: bigint;
  token: {
    address: Address;
    name: string;
    symbol: string;
  };
  events: {
    launchCreated?: {
      launchId: bigint;
      token: Address;
      creator: Address;
      imageURI: string;
    };
    tokenMinted?: {
      launchId: bigint;
      token: Address;
      amount: bigint;
    };
  };
}

// Define event types
type LaunchCreatedEvent = {
  eventName: "LaunchCreated";
  args: {
    launchId: bigint;
    token: Address;
    creator: Address;
    imageURI: string;
  };
};

type TokenMintedEvent = {
  eventName: "TokenMinted";
  args: {
    launchId: bigint;
    tokenAddress: Address;
    amount: bigint;
  };
};

export function useCreateLaunch(): UseMutationResult<
  CreateLaunchResult,
  Error,
  CreateLaunchParams
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async (params: CreateLaunchParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Validate inputs
      if (!params.name || !params.symbol || !params.imageURI) {
        throw new Error("Invalid launch parameters");
      }

      // Simulate the launch creation with separate arguments
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.launcher.address,
        abi: LAUNCHER_ABI,
        functionName: "createLaunch",
        args: [params.name, params.symbol, params.imageURI],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
      });

      // Execute the launch creation
      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      // Wait for transaction receipt
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      const events: CreateLaunchResult["events"] = {};

      // Process all logs
      for (const log of receipt.logs) {
        try {
          if (
            log.topics[0] ===
            "0x21a4dad170a6bf476c31bbf74b1e6416c50bb31c38fba37cb54387f2d88af654"
          ) {
            // LaunchCreated event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "LaunchCreated",
            }) as LaunchCreatedEvent;

            events.launchCreated = {
              launchId: decoded.args.launchId,
              token: decoded.args.token,
              creator: decoded.args.creator,
              imageURI: decoded.args.imageURI,
            };
          } else if (
            log.topics[0] ===
            "0xf0c86f5052b32d6681ea46c0174f8c3bdf2514f05a4c4af3e207616cc0885c4e"
          ) {
            // TokenMinted event
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "TokenMinted",
            }) as TokenMintedEvent;

            events.tokenMinted = {
              launchId: decoded.args.launchId,
              token: decoded.args.tokenAddress,
              amount: decoded.args.amount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode log:", error);
          continue;
        }
      }

      if (!events.launchCreated) {
        throw new Error("Launch creation failed: no LaunchCreated event found");
      }

      return {
        hash,
        launchId: events.launchCreated.launchId,
        token: {
          address: events.launchCreated.token,
          name: params.name,
          symbol: params.symbol,
        },
        events,
      };
    },
    onError: (error) => {
      console.error("Launch creation error:", error);
      throw error;
    },
  });
}
