import {
  useMutation,
  useQuery,
  type UseMutationResult,
  type UseQueryResult,
} from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";
import { usePairInfo } from "./usePairInfo";
import { useTokenAllowance } from "../token/useTokenAllowance";

interface AddLiquidityParams {
  tokenA: Address;
  tokenB: Address;
  amountADesired: bigint;
  amountBDesired: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  deadline?: bigint;
}

interface RemoveLiquidityParams {
  tokenA: Address;
  tokenB: Address;
  liquidity: bigint;
  amountAMin: bigint;
  amountBMin: bigint;
  deadline?: bigint;
}

interface LiquidityResult {
  hash: Hash;
  amounts: {
    amountA: bigint;
    amountB: bigint;
    liquidity: bigint;
  };
}

export interface PairLiquidity {
  tokenA: Address;
  tokenB: Address;
  balance: bigint; // LP token balance
  totalSupply: bigint;
  token0Amount: bigint;
  token1Amount: bigint;
  poolShare: number;
  approvals: {
    tokenA: bigint;
    tokenB: bigint;
    pair: bigint;
  };
}

export function usePairLiquidity(
  pair: Address | undefined,
  account: Address | undefined,
  enabled = true
): {
  data: UseQueryResult<PairLiquidity>;
  addLiquidity: UseMutationResult<LiquidityResult, Error, AddLiquidityParams>;
  removeLiquidity: UseMutationResult<
    LiquidityResult,
    Error,
    RemoveLiquidityParams
  >;
} {
  const sdk = usePonderSDK();
  const { data: pairInfo } = usePairInfo(pair, enabled);

  // Get necessary allowances
  const { data: token0Allowance } = useTokenAllowance(
    pairInfo?.token0,
    sdk.router.address,
    account,
    enabled && !!pairInfo
  );

  const { data: token1Allowance } = useTokenAllowance(
    pairInfo?.token1,
    sdk.router.address,
    account,
    enabled && !!pairInfo
  );

  const { data: pairAllowance } = useTokenAllowance(
    pair,
    sdk.router.address,
    account,
    enabled
  );

  // Query current liquidity position
  const data = useQuery({
    queryKey: ["ponder", "pair", "liquidity", pair, account],
    queryFn: async () => {
      if (!pair || !account || !pairInfo)
        throw new Error("Pair and account required");

      const pairContract = sdk.getPair(pair);
      const [balance, totalSupply] = await Promise.all([
        pairContract.balanceOf(account),
        pairContract.totalSupply(),
      ]);

      // Calculate token amounts based on share
      const share = (balance * 10000n) / totalSupply;
      const token0Amount = (BigInt(pairInfo.reserve0)* share) / 10000n;
      const token1Amount = (BigInt(pairInfo.reserve1)* share) / 10000n;

      return {
        tokenA: pairInfo.token0,
        tokenB: pairInfo.token1,
        balance,
        totalSupply,
        token0Amount,
        token1Amount,
        poolShare: Number(share) / 100,
        approvals: {
          tokenA: token0Allowance?.amount || 0n,
          tokenB: token1Allowance?.amount || 0n,
          pair: pairAllowance?.amount || 0n,
        },
      } satisfies PairLiquidity;
    },
    enabled:
      enabled &&
      !!pair &&
      !!account &&
      !!pairInfo &&
      !!token0Allowance &&
      !!token1Allowance &&
      !!pairAllowance,
  });

  // Add liquidity mutation
  const addLiquidity = useMutation({
    mutationFn: async (params: AddLiquidityParams) => {
      if (!sdk.walletClient?.account) throw new Error("Wallet not connected");

      const defaultDeadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      const hash = await sdk.router.addLiquidity({
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        amountADesired: params.amountADesired,
        amountBDesired: params.amountBDesired,
        amountAMin: params.amountAMin,
        amountBMin: params.amountBMin,
        to: sdk.walletClient.account.address,
        deadline: params.deadline || defaultDeadline,
      });

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      // Find Mint event
      const mintLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f"
      );

      let amountA = 0n,
        amountB = 0n,
        liquidity = 0n;

      if (mintLog) {
        // Parse amounts from event data
        const data = mintLog.data.slice(2);
        amountA = BigInt(`0x${data.slice(0, 64)}`);
        amountB = BigInt(`0x${data.slice(64, 128)}`);
        liquidity = BigInt(`0x${data.slice(128, 192)}`);
      }

      return {
        hash,
        amounts: {
          amountA,
          amountB,
          liquidity,
        },
      };
    },
  });

  // Remove liquidity mutation
  const removeLiquidity = useMutation({
    mutationFn: async (params: RemoveLiquidityParams) => {
      if (!sdk.walletClient?.account) throw new Error("Wallet not connected");

      const defaultDeadline = BigInt(Math.floor(Date.now() / 1000) + 1200); // 20 minutes

      const hash = await sdk.router.removeLiquidity({
        tokenA: params.tokenA,
        tokenB: params.tokenB,
        liquidity: params.liquidity,
        amountAMin: params.amountAMin,
        amountBMin: params.amountBMin,
        to: sdk.walletClient.account.address,
        deadline: params.deadline || defaultDeadline,
      });

      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      // Find Burn event
      const burnLog = receipt.logs.find(
        (log) =>
          log.topics[0] ===
          "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496"
      );

      let amountA = 0n,
        amountB = 0n;

      if (burnLog) {
        // Parse amounts from event data
        const data = burnLog.data.slice(2);
        amountA = BigInt(`0x${data.slice(0, 64)}`);
        amountB = BigInt(`0x${data.slice(64, 128)}`);
      }

      return {
        hash,
        amounts: {
          amountA,
          amountB,
          liquidity: params.liquidity,
        },
      };
    },
  });

  return {
    data,
    addLiquidity,
    removeLiquidity,
  };
}
