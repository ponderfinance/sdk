import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCHER_ABI, TOKEN_ABI } from "@/abis";

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
  ponderMetrics: {
    required: bigint;
    lpAllocation: bigint;
    protocolLPAmount: bigint;
    burnAmount: bigint;
  };
  events: {
    launchCreated?: {
      launchId: bigint;
      token: Address;
      creator: Address;
      imageURI: string;
    };
    dualPoolsCreated?: {
      launchId: bigint;
      memeKubPair: Address;
      memePonderPair: Address;
      kubLiquidity: bigint;
      ponderLiquidity: bigint;
    };
  };
}

// Validation types
interface ValidationResult {
  isValid: boolean;
  errors: string[];
}

interface LaunchRequirements {
  ponderBalance: bigint;
  ponderRequired: bigint;
  canCreate: boolean;
  errors: string[];
}


export function useCreateLaunch(): UseMutationResult<
  CreateLaunchResult,
  Error,
  CreateLaunchParams
> {
  const sdk = usePonderSDK();

  // Helper to validate launch parameters
  const validateLaunchParams = (
    params: CreateLaunchParams
  ): ValidationResult => {
    const errors: string[] = [];

    // Name validation
    if (!params.name) errors.push("Name is required");
    if (params.name.length > 32)
      errors.push("Name too long (max 32 characters)");

    // Symbol validation
    if (!params.symbol) errors.push("Symbol is required");
    if (params.symbol.length > 8)
      errors.push("Symbol too long (max 8 characters)");

    // Image URI validation
    if (!params.imageURI) errors.push("Image URI is required");

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  // Query hook to check launch requirements
  const useLaunchRequirements = async (): Promise<LaunchRequirements> => {
    if (!sdk.walletClient?.account) {
      return {
        ponderBalance: 0n,
        ponderRequired: 0n,
        canCreate: false,
        errors: ["Wallet not connected"],
      };
    }

    const [ponderBalance, launchCount] = await Promise.all([
      sdk.ponder.balanceOf(sdk.walletClient.account.address),
      sdk.launcher.launchCount(),
    ]);

    // Calculate PONDER requirement based on launch mechanics
    const ponderRequired = sdk.launcher.TARGET_RAISE;
    const errors: string[] = [];

    if (ponderBalance < ponderRequired) {
      errors.push(
        `Insufficient PONDER balance. Required: ${ponderRequired.toString()}`
      );
    }

    return {
      ponderBalance,
      ponderRequired,
      canCreate: errors.length === 0,
      errors,
    };
  };

  return useMutation({
    mutationFn: async (params: CreateLaunchParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Validate parameters
      const validation = validateLaunchParams(params);
      if (!validation.isValid) {
        throw new Error(
          `Invalid launch parameters: ${validation.errors.join(", ")}`
        );
      }

      // Check requirements
      const requirements = await useLaunchRequirements();
      if (!requirements.canCreate) {
        throw new Error(
          `Cannot create launch: ${requirements.errors.join(", ")}`
        );
      }

      // Check and update PONDER allowance if needed
      const ponderAllowance = await sdk.ponder.allowance(
        sdk.walletClient.account.address,
        sdk.launcher.address
      );

      if (ponderAllowance < requirements.ponderRequired) {
        const { request: approvalRequest } =
          await sdk.publicClient.simulateContract({
            address: sdk.ponder.address,
            abi: TOKEN_ABI,
            functionName: "approve",
            args: [sdk.launcher.address, requirements.ponderRequired],
            account: sdk.walletClient.account.address,
            chain: sdk.walletClient.chain,
          });

        const approvalTx = await sdk.walletClient.writeContract(
          approvalRequest as WriteContractParameters
        );

        await sdk.publicClient.waitForTransactionReceipt({ hash: approvalTx });
      }

      // Create launch
      const { request } = await sdk.publicClient.simulateContract({
        address: sdk.launcher.address,
        abi: LAUNCHER_ABI,
        functionName: "createLaunch",
        args: [
          {
            name: params.name,
            symbol: params.symbol,
            imageURI: params.imageURI,
          },
        ],
        account: sdk.walletClient.account.address,
        chain: sdk.walletClient.chain,
      });

      const hash = await sdk.walletClient.writeContract(
        request as WriteContractParameters
      );

      // Process receipt and decode events
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      const events: CreateLaunchResult["events"] = {};

      for (const log of receipt.logs) {
        try {
          const eventId = log?.topics[0]?.toLowerCase();

          // LaunchCreated event
          if (
            eventId ===
            "0x21a4dad170a6bf476c31bbf74b1e6416c50bb31c38fba37cb54387f2d88af654"
          ) {
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "LaunchCreated",
            });
            events.launchCreated = {
              launchId: decoded.args.launchId,
              token: decoded.args.token,
              creator: decoded.args.creator,
              imageURI: decoded.args.imageURI,
            };
          }
          // DualPoolsCreated event
          else if (
            eventId ===
            "0x8d7c3c56f4e7f949b483f37118c9b7d56c947690b5ff3db6757b7c634c23a4b9"
          ) {
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "DualPoolsCreated",
            });
            events.dualPoolsCreated = {
              launchId: decoded.args.launchId,
              memeKubPair: decoded.args.memeKubPair,
              memePonderPair: decoded.args.memePonderPair,
              kubLiquidity: decoded.args.kubLiquidity,
              ponderLiquidity: decoded.args.ponderLiquidity,
            };
          }
        } catch (error) {
          console.warn("Failed to decode event:", error);
        }
      }

      if (!events.launchCreated) {
        throw new Error("Launch creation failed: no LaunchCreated event found");
      }

      // Calculate PONDER metrics
      const ponderMetrics = {
        required: requirements.ponderRequired,
        lpAllocation:
          (requirements.ponderRequired * sdk.launcher.PONDER_LP_ALLOCATION) /
          100n,
        protocolLPAmount:
          (requirements.ponderRequired * sdk.launcher.PONDER_PROTOCOL_LP) /
          100n,
        burnAmount:
          (requirements.ponderRequired * sdk.launcher.PONDER_BURN) / 100n,
      };

      return {
        hash,
        launchId: events.launchCreated.launchId,
        token: {
          address: events.launchCreated.token,
          name: params.name,
          symbol: params.symbol,
        },
        ponderMetrics,
        events,
      };
    },
    onError: (error) => {
      console.error("Launch creation error:", error);
      throw error;
    },
  });
}
