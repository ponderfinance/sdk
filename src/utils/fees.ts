import { type Address, type PublicClient } from "viem";
import { type PonderPair } from "@/contracts/pair";
import {launchtokenAbi} from "@ponderfinance/dex";

export interface FeeInfo {
  lpFee: bigint;
  creatorFee: bigint;
  recipient: `0x${string}`;
}

export class FeeCalculator {
  private static LP_FEE_BASE = 3n;
  private static LP_FEE_WITH_CREATOR = 2n;
  private static CREATOR_FEE = 1n;
  private static FEE_DENOMINATOR = 1000n;
  private static ZERO_ADDRESS =
    "0x0000000000000000000000000000000000000000" as `0x${string}`;

  static async getFeeInfo(
    pair: PonderPair,
    tokenIn: Address,
    publicClient: PublicClient
  ): Promise<FeeInfo> {
    try {
      // Use launchtokenAbi for token calls
      const tokenLauncher = (await publicClient.readContract({
        address: tokenIn,
        abi: launchtokenAbi,
        functionName: "launcher",
      })) as `0x${string}`;

      const factoryLauncher = await pair.launcher();

      if (tokenLauncher === factoryLauncher) {
        const creator = (await publicClient.readContract({
          address: tokenIn,
          abi: launchtokenAbi,
          functionName: "creator",
        })) as `0x${string}`;

        return {
          lpFee: this.LP_FEE_WITH_CREATOR,
          creatorFee: this.CREATOR_FEE,
          recipient: creator,
        };
      }
    } catch {
      // Not a LaunchToken or call failed - use standard fees
    }

    return {
      lpFee: this.LP_FEE_BASE,
      creatorFee: 0n,
      recipient: this.ZERO_ADDRESS,
    };
  }

  static getAmountOut(
    amountIn: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeInfo: FeeInfo
  ): bigint {
    if (amountIn <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;

    const totalFee = feeInfo.lpFee + feeInfo.creatorFee;
    const amountInWithFee = amountIn * (this.FEE_DENOMINATOR - totalFee);
    const numerator = amountInWithFee * reserveOut;
    const denominator = reserveIn * this.FEE_DENOMINATOR + amountInWithFee;
    return numerator / denominator;
  }

  static getAmountIn(
    amountOut: bigint,
    reserveIn: bigint,
    reserveOut: bigint,
    feeInfo: FeeInfo
  ): bigint {
    if (amountOut <= 0n || reserveIn <= 0n || reserveOut <= 0n) return 0n;

    const totalFee = feeInfo.lpFee + feeInfo.creatorFee;
    const numerator = reserveIn * amountOut * this.FEE_DENOMINATOR;
    const denominator =
      (reserveOut - amountOut) * (this.FEE_DENOMINATOR - totalFee);
    return numerator / denominator + 1n;
  }
}
