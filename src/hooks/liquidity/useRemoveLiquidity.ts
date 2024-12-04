import { useMutation, type UseMutationResult } from "@tanstack/react-query";
import { type Address, type Hash } from "viem";
import { usePonderSDK } from "@/context/PonderContext";

interface RemoveLiquidityParams {
  pairAddress: Address;
  liquidity: bigint;
  token0Min: bigint;
  token1Min: bigint;
  deadline?: bigint; // Optional deadline, defaults to 20 minutes
  toAddress?: Address; // Optional recipient, defaults to connected wallet
}

interface RemoveLiquidityResult {
  hash: Hash;
  amounts: {
    token0: bigint;
    token1: bigint;
  };
}

export function useRemoveLiquidity(): UseMutationResult<
  RemoveLiquidityResult,
  Error,
  RemoveLiquidityParams
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
    }: RemoveLiquidityParams) => {
      if (!sdk.walletClient?.account) {
        throw new Error("Wallet not connected");
      }

      const pair = sdk.getPair(pairAddress);
      const [token0, token1] = await Promise.all([
        pair.token0(),
        pair.token1(),
      ]);

      // Check if we're removing liquidity from a KKUB pair
      const isKKUBPair =
        token0 === (await sdk.router.WETH()) ||
        token1 === (await sdk.router.WETH());

      let hash: Hash;
      if (isKKUBPair) {
        const token = token0 === (await sdk.router.WETH()) ? token1 : token0;
        const amountTokenMin =
          token0 === (await sdk.router.WETH()) ? token1Min : token0Min;
        const amountETHMin =
          token0 === (await sdk.router.WETH()) ? token0Min : token1Min;

        hash = await sdk.router.removeLiquidityETH({
          token,
          liquidity,
          amountTokenMin,
          amountETHMin,
          to: toAddress || sdk.walletClient.account.address,
          deadline,
        });
      } else {
        hash = await sdk.router.removeLiquidity({
          tokenA: token0,
          tokenB: token1,
          liquidity,
          amountAMin: token0Min,
          amountBMin: token1Min,
          to: toAddress || sdk.walletClient.account.address,
          deadline,
        });
      }

      // Wait for transaction and get removed amounts
      const receipt = await sdk.publicClient.waitForTransactionReceipt({
        hash,
      });

      // Find Burn event from the pair contract
      const burnLog = receipt.logs.find(
        (log) =>
          log.address.toLowerCase() === pairAddress.toLowerCase() &&
          log.topics[0] ===
            "0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496" // Burn event signature
      );

      let token0Amount = BigInt(0),
        token1Amount = BigInt(0);
      if (burnLog) {
        // Parse the burn event data
        const burnData = burnLog.data.slice(2); // Remove '0x' prefix
        token0Amount = BigInt("0x" + burnData.slice(0, 64));
        token1Amount = BigInt("0x" + burnData.slice(64, 128));
      }

      return {
        hash,
        amounts: {
          token0: token0Amount,
          token1: token1Amount,
        },
      };
    },
  });
}
