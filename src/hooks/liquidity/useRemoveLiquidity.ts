import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import {
  type Address,
  type Hash,
  decodeEventLog,
  type WriteContractParameters,
} from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { ROUTER_ABI, PAIR_ABI } from "@/abis";

// Interface for standard token-token pair removal
interface RemoveLiquidityParams {
  pairAddress: Address;
  liquidity: bigint;
  token0Min: bigint;
  token1Min: bigint;
  deadline?: bigint; // Optional deadline, defaults to 20 minutes
  toAddress?: Address; // Optional recipient, defaults to connected wallet
  // For ETH pairs
  isETHPair?: boolean;
  tokenAddress?: Address; // The non-ETH token in an ETH pair
  amountTokenMin?: bigint; // For ETH pairs: minimum token amount
  amountETHMin?: bigint; // For ETH pairs: minimum ETH amount
  // For fee-on-transfer tokens
  supportsFeeOnTransfer?: boolean; // Flag to use fee-on-transfer function
}

interface RemoveLiquidityResult {
  hash: Hash;
  amounts: {
    token0: bigint;
    token1: bigint;
  };
}

// Define event types
type BurnEvent = {
  eventName: "Burn";
  args: {
    sender: Address;
    amount0: bigint;
    amount1: bigint;
    to: Address;
  };
};

export function useRemoveLiquidity(): UseMutationResult<
  RemoveLiquidityResult,
  unknown,
  RemoveLiquidityParams,
  unknown
> {
  const sdk = usePonderSDK();

  return useMutation({
    mutationFn: async ({
      pairAddress,
      liquidity,
      token0Min,
      token1Min,
      deadline = BigInt(Math.floor(Date.now() / 1000) + 1200), // 20 minutes from now
      toAddress,
      // ETH pair specific parameters
      isETHPair = false,
      tokenAddress,
      amountTokenMin,
      amountETHMin,
      // Fee-on-transfer support
      supportsFeeOnTransfer = false,
    }: RemoveLiquidityParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      // Get the tokens for this pair
      const pair = sdk.getPair(pairAddress);
      const [token0, token1] = await Promise.all([
        pair.token0(),
        pair.token1(),
      ]);

      // Determine the recipient address (default to connected wallet)
      const recipient = toAddress || sdk.walletClient.account.address;

      // Get KKUB address
      const kkubAddress = await sdk.router.KKUB();

      // Check if this is a KKUB pair
      const isKKUBPair =
        token0.toLowerCase() === kkubAddress.toLowerCase() ||
        token1.toLowerCase() === kkubAddress.toLowerCase();

      // Use the explicit flag if provided, otherwise use the detected value
      const finalIsKKUBPair = isETHPair !== undefined ? isETHPair : isKKUBPair;

      console.log("Removing liquidity with params:", {
        pairAddress,
        token0,
        token1,
        kkubAddress,
        isKKUBPair,
        finalIsKKUBPair,
        liquidity: liquidity.toString(),
        token0Min: token0Min.toString(),
        token1Min: token1Min.toString(),
        supportsFeeOnTransfer,
      });

      let hash: Hash;

      if (finalIsKKUBPair) {
        // Handle ETH/KKUB pair
        let nonKKUBToken: Address;
        let tokenMin: bigint;
        let ethMin: bigint;

        // Determine which token is KKUB and which is not
        const isToken0KKUB = token0.toLowerCase() === kkubAddress.toLowerCase();

        if (tokenAddress) {
          // If tokenAddress is explicitly provided, use it
          nonKKUBToken = tokenAddress;
          tokenMin = amountTokenMin || (isToken0KKUB ? token1Min : token0Min);
          ethMin = amountETHMin || (isToken0KKUB ? token0Min : token1Min);
        } else {
          // Otherwise determine based on token0/token1
          nonKKUBToken = isToken0KKUB ? token1 : token0;
          tokenMin = isToken0KKUB ? token1Min : token0Min;
          ethMin = isToken0KKUB ? token0Min : token1Min;
        }

        console.log("Final ETH pair removal params:", {
          nonKKUBToken,
          tokenMin: tokenMin.toString(),
          ethMin: ethMin.toString(),
          recipient,
          deadline: deadline.toString(),
          supportsFeeOnTransfer,
        });

        // Choose appropriate function based on fee-on-transfer support
        const functionName = supportsFeeOnTransfer
          ? "removeLiquidityETHSupportingFeeOnTransferTokens"
          : "removeLiquidityETH";

        try {
          // Simulate removeLiquidity for ETH pairs
          const { request } = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: functionName,
            args: [
              nonKKUBToken,
              liquidity,
              tokenMin,
              ethMin,
              recipient,
              deadline,
            ],
            account: sdk.walletClient.account.address,
            chain: sdk.walletClient.chain,
          });

          hash = await sdk.walletClient.writeContract(
            request as WriteContractParameters
          );
        } catch (error) {
          console.error("ETH pair removal simulation error:", error);
          throw error; // Propagate error instead of using fallback
        }
      } else {
        // Handle regular token pair
        console.log("Regular pair removal params:", {
          token0,
          token1,
          token0Min: token0Min.toString(),
          token1Min: token1Min.toString(),
          recipient,
          deadline: deadline.toString(),
        });

        try {
          // Simulate removeLiquidity
          const { request } = await sdk.publicClient.simulateContract({
            address: sdk.router.address,
            abi: ROUTER_ABI,
            functionName: "removeLiquidity",
            args: [
              token0,
              token1,
              liquidity,
              token0Min,
              token1Min,
              recipient,
              deadline,
            ],
            account: sdk.walletClient.account.address,
            chain: sdk.walletClient.chain,
          });

          hash = await sdk.walletClient.writeContract(
            request as WriteContractParameters
          );
        } catch (error) {
          console.error("Standard pair removal error:", error);
          throw error; // Propagate error instead of using fallback
        }
      }

      // Wait for transaction and get removed amounts
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
        confirmations: 1,
      });

      // Find Burn event from the pair contract
      const burnLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === pairAddress.toLowerCase() &&
          log.topics[0] ===
            "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496" // Burn event signature
      );

      let token0Amount = 0n;
      let token1Amount = 0n;

      if (burnLog) {
        try {
          const decoded = decodeEventLog({
            abi: PAIR_ABI,
            data: burnLog.data,
            topics: burnLog.topics,
            eventName: "Burn",
          }) as BurnEvent;

          token0Amount = decoded.args.amount0;
          token1Amount = decoded.args.amount1;
        } catch (error) {
          console.error("Failed to decode Burn event:", error);
        }
      } else {
        console.warn("Burn event not found in transaction logs");
      }

      return {
        hash,
        amounts: {
          token0: token0Amount,
          token1: token1Amount,
        },
      };
    },
    onError: (error: unknown) => {
      // Enhanced error handling
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error("Full error:", error);

      // Map error messages to more user-friendly versions based on contract errors
      if (errorMsg.includes("ExpiredDeadline")) {
        throw new Error("Transaction deadline has expired");
      } else if (
        errorMsg.includes("InsufficientAAmount") ||
        errorMsg.includes("InsufficientBAmount")
      ) {
        throw new Error(
          "Slippage too high - try increasing your slippage tolerance"
        );
      } else if (errorMsg.includes("TransferFailed")) {
        throw new Error("Token transfer failed - check your token approvals");
      } else if (errorMsg.includes("ApprovalFailed")) {
        throw new Error("KKUB approval failed");
      } else if (errorMsg.includes("UnwrapFailed")) {
        throw new Error("Failed to unwrap KKUB to native ETH");
      } else {
        throw new Error(`Remove liquidity failed: ${errorMsg}`);
      }
    },
  });
}
