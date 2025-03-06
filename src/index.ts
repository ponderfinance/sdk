import {
  type PublicClient,
  type WalletClient,
  type Address,
  createPublicClient,
  http,
  Hash,
} from "viem";
import {
  type SupportedChainId,
  SUPPORTED_CHAINS,
  getChainFromId,
} from "./constants/chains";
import { Factory, type PonderFactory } from "./contracts/factory";
import { Pair, type PonderPair } from "./contracts/pair";
import { Router, type PonderRouter } from "./contracts/router";
import {
  MasterChef,
  type PonderMasterChef,
  type PoolInfo,
  type UserInfo,
} from "./contracts/masterchef";
import { LaunchToken, type PonderLaunchToken } from "./contracts/launchtoken";
import { Pondertoken } from "./contracts/pondertoken";
import {
  FiveFiveFiveLauncher,
  type PonderLauncher,
  type LaunchInfo,
  type SaleInfo,
  type CreateLaunchParams,
} from "./contracts/launcher";
import {
  PriceOracle,
  type PonderPriceOracle,
  type Observation,
} from "./contracts/oracle";
import {
  KKUBUnwrapper,
  type PonderKKUBUnwrapper,
} from "./contracts/kkubunwrapper";
import { Staking, type PonderStaking } from "./contracts/staking";
import {
  FeeDistributor,
  type PonderFeeDistributor,
} from "./contracts/feedistributor";
import {
  BRIDGE_ADDRESSES,
  KKUB_ADDRESS,
  PONDER_ADDRESSES,
} from "@/constants/addresses";
import { Bridge } from "@/contracts/bridge";

interface SDKConfig {
  chainId: SupportedChainId;
  publicClient?: PublicClient;
  walletClient?: WalletClient;
}

export class PonderSDK {
  public readonly chainId: SupportedChainId;
  public readonly chain: ReturnType<typeof getChainFromId>;
  public readonly publicClient: PublicClient;
  private _walletClient?: WalletClient;
  private _factory: Factory;
  private _router: Router;
  private _masterChef: MasterChef;
  private _launcher: FiveFiveFiveLauncher;
  private _oracle: PriceOracle;
  private _kkubUnwrapper: KKUBUnwrapper;
  private _pairs: Map<Address, Pair>;
  private _launchTokens: Map<Address, LaunchToken>;
  private _ponder: Pondertoken;
  private _staking: Staking;
  private _feeDistributor: FeeDistributor;
  private _bridge: Bridge;

  constructor({ chainId, publicClient, walletClient }: SDKConfig) {
    this.chainId = chainId;
    this.chain = getChainFromId(chainId);

    this.publicClient =
      publicClient ??
      createPublicClient({
        chain: this.chain,
        transport: http(),
      });

    this._walletClient = walletClient;
    this._factory = new Factory(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._router = new Router(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._masterChef = new MasterChef(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._launcher = new FiveFiveFiveLauncher(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._oracle = new PriceOracle(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._kkubUnwrapper = new KKUBUnwrapper(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._ponder = new Pondertoken(
      this.chainId,
      PONDER_ADDRESSES[chainId].ponderToken,
      this.publicClient,
      this._walletClient
    );
    this._staking = new Staking(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._feeDistributor = new FeeDistributor(
      this.chainId,
      this.publicClient,
      this._walletClient
    );
    this._bridge = new Bridge(
      this.chainId,
      BRIDGE_ADDRESSES[chainId]?.bridge,
      this.publicClient,
      this._walletClient
    );
    this._pairs = new Map();
    this._launchTokens = new Map();
  }

  get factory(): Factory {
    return this._factory;
  }

  get router(): Router {
    return this._router;
  }

  get masterChef(): MasterChef {
    return this._masterChef;
  }

  get launcher(): FiveFiveFiveLauncher {
    return this._launcher;
  }

  get oracle(): PriceOracle {
    return this._oracle;
  }

  get kkubUnwrapper(): KKUBUnwrapper {
    return this._kkubUnwrapper;
  }

  get ponder(): Pondertoken {
    return this._ponder;
  }

  get staking(): Staking {
    return this._staking;
  }

  get feeDistributor(): FeeDistributor {
    return this._feeDistributor;
  }

  get bridge(): Bridge {
    return this._bridge;
  }

  get walletClient(): WalletClient | undefined {
    return this._walletClient;
  }

  public getPair(pairAddress: Address): Pair {
    const existingPair = this._pairs.get(pairAddress);
    if (existingPair) return existingPair;

    const pair = new Pair(
      this.chainId,
      pairAddress,
      this.publicClient,
      this._walletClient
    );
    this._pairs.set(pairAddress, pair);
    return pair;
  }

  public getLaunchToken(tokenAddress: Address): LaunchToken {
    const existingToken = this._launchTokens.get(tokenAddress);
    if (existingToken) return existingToken;

    const token = new LaunchToken(
      this.chainId,
      tokenAddress,
      this.publicClient,
      this._walletClient
    );
    this._launchTokens.set(tokenAddress, token);
    return token;
  }

  public updateWalletClient(walletClient?: WalletClient): void {
    this._walletClient = walletClient;
    this._factory = new Factory(this.chainId, this.publicClient, walletClient);
    this._router = new Router(this.chainId, this.publicClient, walletClient);
    this._masterChef = new MasterChef(
      this.chainId,
      this.publicClient,
      walletClient
    );
    this._launcher = new FiveFiveFiveLauncher(
      this.chainId,
      this.publicClient,
      walletClient
    );
    this._oracle = new PriceOracle(
      this.chainId,
      this.publicClient,
      walletClient
    );
    this._kkubUnwrapper = new KKUBUnwrapper(
      this.chainId,
      this.publicClient,
      walletClient
    );
    this._ponder = new Pondertoken(
      this.chainId,
      PONDER_ADDRESSES[this.chainId].ponderToken,
      this.publicClient,
      walletClient
    );
    this._staking = new Staking(this.chainId, this.publicClient, walletClient);
    this._feeDistributor = new FeeDistributor(
      this.chainId,
      this.publicClient,
      walletClient
    );
    this._bridge = new Bridge(
      this.chainId,
      BRIDGE_ADDRESSES[this.chainId]?.bridge,
      this.publicClient,
      walletClient
    );

    // Update existing instances
    for (const [address, _] of this._pairs) {
      this._pairs.set(
        address,
        new Pair(this.chainId, address, this.publicClient, walletClient)
      );
    }

    for (const [address, _] of this._launchTokens) {
      this._launchTokens.set(
        address,
        new LaunchToken(this.chainId, address, this.publicClient, walletClient)
      );
    }
  }

  public async getPairByTokens(
    tokenA: Address,
    tokenB: Address
  ): Promise<Pair> {
    const pairAddress = await this.factory.getPair(tokenA, tokenB);
    return this.getPair(pairAddress);
  }

  public async unwrapKKUB(amount: bigint, recipient: Address): Promise<Hash> {
    return this._kkubUnwrapper.unwrapKKUB(amount, recipient);
  }
}

// Re-export everything that should be available to SDK users
export { SUPPORTED_CHAINS, type SupportedChainId };

export { KKUB_ADDRESS };
// Contract exports
export { Factory, type PonderFactory };
export { Pair, type PonderPair };
export { Router, type PonderRouter };
export { MasterChef, type PonderMasterChef };
export { LaunchToken, type PonderLaunchToken };
export { FiveFiveFiveLauncher, type PonderLauncher };
export { PriceOracle, type PonderPriceOracle };
export { KKUBUnwrapper, type PonderKKUBUnwrapper };
export { Pondertoken };
export type { PonderToken } from "./contracts/pondertoken";
export { Staking, type PonderStaking };
export { FeeDistributor, type PonderFeeDistributor };

// Type exports
export type { SDKConfig as PonderSDKConfig };
export type { Reserves } from "./contracts/pair";
export type { VestingInfo } from "./contracts/launchtoken";
export type {
  AddLiquidityParams,
  AddLiquidityETHParams,
  RemoveLiquidityParams,
  RemoveLiquidityETHParams,
  SwapExactTokensForTokensParams,
  SwapTokensForExactTokensParams,
} from "./contracts/router";
export type { PoolInfo, UserInfo, AddPoolParams } from "./contracts/masterchef";
export type {
  LaunchInfo,
  SaleInfo,
  CreateLaunchParams,
} from "./contracts/launcher";
export type { Observation } from "./contracts/oracle";

export { Bridge };
export type { PonderBridge } from "./contracts/bridge";

export {
  DEST_TOKEN_TYPE,
  FEE_TYPE,
  TOKEN_STRATEGY,
  type BridgeInfo,
  type ChainIDAndAllowedDestTokenTypes,
  type BridgeParams,
  type NativeBridgeParams,
} from "./contracts/bridge";

// Context provider
export { usePonderSDK, PonderProvider } from "./context/PonderContext";

// Hook exports
export { type FeeInfo } from "./utils/fees";

// Token Hooks
export { useTokenInfo, type TokenInfo } from "./hooks/token/useTokenInfo";
export { useTokenBalance } from "./hooks/token/useTokenBalance";
export { useTokenApproval } from "./hooks/token/useTokenApproval";
export {
  useTokenAllowance,
  type AllowanceData,
} from "./hooks/token/useTokenAllowance";

// Trading Hooks
export { usePairFees } from "./hooks/trade/usePairFees";
export { useAmountIn, useAmountOut } from "./hooks/trade/useSwapAmounts";
export { useTradeInfo } from "./hooks/trade/useTradeInfo";
export { useSwap, type SwapResult } from "./hooks/pair/useSwap";
export { useSwapCallback } from "./hooks/pair/useSwapCallback";
export { useSwapRoute, type SwapRoute } from "./hooks/pair/useSwapRoute";
export { useSwapApproval } from "./hooks/token/useSwapApproval";

// Pair & Liquidity Hooks
export { usePairInfo, type PairInfo } from "./hooks/pair/usePairInfo";
export {
  usePairExists,
  type PairExistsResult,
} from "./hooks/pair/usePairExists";
export {
  usePairCreation,
  type PairCreationData,
} from "./hooks/pair/usePairCreation";
export { usePairQuote, type PairQuote } from "./hooks/pair/usePairQuote";
export {
  usePairLiquidity,
  type PairLiquidity,
} from "./hooks/pair/usePairLiquidity";
export { useAddLiquidity } from "./hooks/liquidity/useAddLiquidity";
export { useRemoveLiquidity } from "./hooks/liquidity/useRemoveLiquidity";
export {
  usePositionValue,
  type PositionValue,
} from "./hooks/pair/usePositionValue";
export {
  useLPTokenBalance,
  type LiquidityPosition,
} from "./hooks/pair/useLPTokenBalance";

// Farm Hooks
export { usePoolInfo, type DetailedPoolInfo } from "./hooks/farm/usePoolInfo";
export {
  useStakeInfo,
  type DetailedStakeInfo,
} from "./hooks/farm/useStakeInfo";
export { useStake } from "./hooks/farm/useStake";
export { useUnstake } from "./hooks/farm/useUnstake";
export { useHarvest } from "./hooks/farm/useHarvest";
export { useBoostStake, useBoostUnstake } from "./hooks/farm/useBoost";
export {
  usePendingRewards,
  type PendingRewards,
} from "./hooks/farm/usePendingRewards";
export { useFarmMetrics, type FarmMetrics } from "./hooks/farm/useFarmMetrics";

// Launch Platform Hooks
export {
  useLaunchInfo,
  type DetailedLaunchInfo,
} from "./hooks/launch/useLaunchInfo";
export { useCreateLaunch } from "./hooks/launch/useCreateLaunch";
export { useContribute } from "./hooks/launch/useContribute";
export {
  useVestingInfo,
  type DetailedVestingInfo,
} from "./hooks/launch/useVestingInfo";
export { useClaimTokens } from "./hooks/launch/useClaimTokens";
export { useLPInfo, useLPWithdraw } from "./hooks/launch/useLPWithdraw";

// Oracle & Price Hooks
export { usePriceInfo, type TokenPrice } from "./hooks/oracle/usePriceInfo";
export {
  usePriceHistory,
  type PriceHistory,
} from "./hooks/oracle/usePriceHistory";
export {
  useOracleStatus,
  useUpdateOracle,
} from "./hooks/oracle/useOracleUpdates";
export {
  usePriceFeeds,
  type AggregatedPrice,
} from "./hooks/oracle/usePriceFeeds";

// Analytics Hooks
export {
  useYieldAnalytics,
  type YieldAnalytics,
} from "./hooks/analytics/useYieldAnalytics";
export { useRecentSwaps, type Swap } from "./hooks/pair/useRecentSwaps";

// Transaction & Gas Hooks
export {
  useTransaction,
  type TransactionStatus,
} from "./hooks/token/useTransaction";
export { useGasEstimate, type GasEstimate } from "./hooks/trade/useGasEstimate";

// Add new Staking hooks exports
export {
  useStakingInfo,
  type StakingInfo,
} from "./hooks/staking/useStakingInfo";
export { useStakePonder } from "./hooks/staking/useStakePonder";
export { useUnstakePonder } from "./hooks/staking/useUnstakePonder";
export {
  useStakingStats,
  type StakingStats,
} from "./hooks/staking/useStakingStats";
export { useClaimFees } from "./hooks/staking/useClaimFees";

// Add new Fee Distributor hooks exports
export {
  useFeeDistributorInfo,
  type FeeDistributorInfo,
} from "./hooks/fees/useFeeDistributorInfo";
export { useDistributeFees } from "./hooks/fees/useDistributeFees";
export { useCollectFees } from "./hooks/fees/useCollectFees";
export { useFeeMetrics, type FeeMetrics } from "./hooks/fees/useFeeMetrics";
