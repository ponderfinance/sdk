export type { FeeInfo } from "../utils/fees";

// Token Hooks
export { useTokenInfo, type TokenInfo } from "./token/useTokenInfo";
export { useTokenBalance } from "./token/useTokenBalance";
export { useTokenApproval } from "./token/useTokenApproval";
export { useTokenAllowance, type AllowanceData } from "./token/useTokenAllowance";

// Trading Hooks
export { usePairFees } from "./trade/usePairFees";
export { useAmountIn, useAmountOut } from "./trade/useSwapAmounts";
export { useTradeInfo } from "./trade/useTradeInfo";
export { useSwap, type SwapResult } from "./pair/useSwap";
export { useSwapCallback } from "./pair/useSwapCallback";
export { useSwapRoute, type SwapRoute } from "./pair/useSwapRoute";
export { useSwapApproval } from "./token/useSwapApproval";

// Pair & Liquidity Hooks
export { usePairInfo, type PairInfo } from "./pair/usePairInfo";
export { usePairExists, type PairExistsResult } from "./pair/usePairExists";
export { usePairCreation, type PairCreationData } from "./pair/usePairCreation";
export { usePairQuote, type PairQuote } from "./pair/usePairQuote";
export { usePairLiquidity, type PairLiquidity } from "./pair/usePairLiquidity";
export { useAddLiquidity } from "./liquidity/useAddLiquidity";
export { useRemoveLiquidity } from "./liquidity/useRemoveLiquidity";
export { usePositionValue, type PositionValue } from "./pair/usePositionValue";
export { useLPTokenBalance, type LiquidityPosition } from "./pair/useLPTokenBalance";

// Farm Hooks
export { usePoolInfo, type DetailedPoolInfo } from "./farm/usePoolInfo";
export { useStakeInfo, type DetailedStakeInfo } from "./farm/useStakeInfo";
export { useStake } from "./farm/useStake";
export { useUnstake } from "./farm/useUnstake";
export { useHarvest } from "./farm/useHarvest";
export { useBoostStake, useBoostUnstake } from "./farm/useBoost";
export { usePendingRewards, type PendingRewards } from "./farm/usePendingRewards";
export { useFarmMetrics, type FarmMetrics } from "./farm/useFarmMetrics";

// Launch Platform Hooks
export { useLaunchInfo, type DetailedLaunchInfo } from "./launch/useLaunchInfo";
export { useCreateLaunch } from "./launch/useCreateLaunch";
export { useContribute } from "./launch/useContribute";
export { useVestingInfo, type DetailedVestingInfo } from "./launch/useVestingInfo";
export { useClaimTokens } from "./launch/useClaimTokens";
export { useLPInfo, useLPWithdraw } from "./launch/useLPWithdraw";
export { useCreatorFees } from "./launch/useCreatorFees";
export { usePonderToken } from "./launch/usePonderToken";


// Oracle & Price Hooks
export { usePriceInfo, type TokenPrice } from "./oracle/usePriceInfo";
export { usePriceHistory, type PriceHistory } from "./oracle/usePriceHistory";
export { useOracleStatus, useUpdateOracle } from "./oracle/useOracleUpdates";
export { usePriceFeeds, type AggregatedPrice } from "./oracle/usePriceFeeds";

// Analytics Hooks
// export { useProtocolStats, type ProtocolStats } from "./analytics/useProtocolStats";
// export { useTradingAnalytics, type TradingAnalytics } from "./analytics/useTradingAnalytics";
export { useYieldAnalytics, type YieldAnalytics } from "./analytics/useYieldAnalytics";
export { useRecentSwaps, type Swap } from "./pair/useRecentSwaps";

// Transaction & Gas Hooks
export { useTransaction, type TransactionStatus } from "./token/useTransaction";
export { useGasEstimate, type GasEstimate } from "./trade/useGasEstimate";

export { useBridgeInfo } from "./bridge/useBridgeInfo";
export { useBridgeStatus } from "./bridge/useBridgeStatus";
export { useBridgeFees } from "./bridge/useBridgeFees";
export { useBridgeTokens, useBridgeNative } from "./bridge/useBridge";
