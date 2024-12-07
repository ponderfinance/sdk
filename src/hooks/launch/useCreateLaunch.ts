import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { LAUNCHER_ABI, TOKEN_ABI } from "@/abis";
import { bitkubTestnetChain } from "@/constants/chains";

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
    tokenMinted?: {
      launchId: bigint;
      token: Address;
      amount: bigint;
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
            chain: bitkubTestnetChain,
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
        args: [params.name, params.symbol, params.imageURI],
        account: sdk.walletClient.account.address,
        chain: bitkubTestnetChain,
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
          // TokenMinted event
          else if (
            eventId ===
            "0xf0c86f5052b32d6681ea46c0174f8c3bdf2514f05a4c4af3e207616cc0885c4e"
          ) {
            const decoded = decodeEventLog({
              abi: LAUNCHER_ABI,
              data: log.data,
              topics: log.topics,
              eventName: "TokenMinted",
            });
            events.tokenMinted = {
              launchId: decoded.args.launchId,
              token: decoded.args.tokenAddress,
              amount: decoded.args.amount,
            };
          }
        } catch (error) {
          console.warn("Failed to decode event:", error);
          continue;
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
