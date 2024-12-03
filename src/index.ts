import {type PublicClient, type WalletClient, type Address, createPublicClient, http, Hash} from 'viem'
import { type SupportedChainId, SUPPORTED_CHAINS, getChainFromId } from './constants/chains'
import { Factory, type PonderFactory } from './contracts/factory'
import { Pair, type PonderPair } from './contracts/pair'
import { Router, type PonderRouter } from './contracts/router'
import { MasterChef, type PonderMasterChef, type PoolInfo, type UserInfo } from './contracts/masterchef'
import { LaunchToken, type PonderLaunchToken } from './contracts/launchtoken'
import { FiveFiveFiveLauncher, type PonderLauncher, type LaunchInfo, type SaleInfo, type CreateLaunchParams } from './contracts/launcher'
import { PriceOracle, type PonderPriceOracle, type Observation } from './contracts/oracle'
import { KKUBUnwrapper, type PonderKKUBUnwrapper } from './contracts/kkubunwrapper'

interface SDKConfig {
    chainId: SupportedChainId
    publicClient?: PublicClient
    walletClient?: WalletClient
}

export class PonderSDK {
    public readonly chainId: SupportedChainId
    public readonly chain: ReturnType<typeof getChainFromId>
    public readonly publicClient: PublicClient
    private _walletClient?: WalletClient
    private _factory: Factory
    private _router: Router
    private _masterChef: MasterChef
    private _launcher: FiveFiveFiveLauncher
    private _oracle: PriceOracle
    private _kkubUnwrapper: KKUBUnwrapper
    private _pairs: Map<Address, Pair>
    private _launchTokens: Map<Address, LaunchToken>

    constructor({ chainId, publicClient, walletClient }: SDKConfig) {
        this.chainId = chainId
        this.chain = getChainFromId(chainId)

        this.publicClient = publicClient ?? createPublicClient({
            chain: this.chain,
            transport: http()
        })

        this._walletClient = walletClient
        this._factory = new Factory(this.chainId, this.publicClient, this._walletClient)
        this._router = new Router(this.chainId, this.publicClient, this._walletClient)
        this._masterChef = new MasterChef(this.chainId, this.publicClient, this._walletClient)
        this._launcher = new FiveFiveFiveLauncher(this.chainId, this.publicClient, this._walletClient)
        this._oracle = new PriceOracle(this.chainId, this.publicClient, this._walletClient)
        this._kkubUnwrapper = new KKUBUnwrapper(this.chainId, this.publicClient, this._walletClient)
        this._pairs = new Map()
        this._launchTokens = new Map()
    }

    get factory(): Factory {
        return this._factory
    }

    get router(): Router {
        return this._router
    }

    get masterChef(): MasterChef {
        return this._masterChef
    }

    get launcher(): FiveFiveFiveLauncher {
        return this._launcher
    }

    get oracle(): PriceOracle {
        return this._oracle
    }

    get kkubUnwrapper(): KKUBUnwrapper {
        return this._kkubUnwrapper
    }

    get walletClient(): WalletClient | undefined {
        return this._walletClient
    }

    public getPair(pairAddress: Address): Pair {
        const existingPair = this._pairs.get(pairAddress)
        if (existingPair) return existingPair

        const pair = new Pair(
            this.chainId,
            pairAddress,
            this.publicClient,
            this._walletClient
        )
        this._pairs.set(pairAddress, pair)
        return pair
    }

    public getLaunchToken(tokenAddress: Address): LaunchToken {
        const existingToken = this._launchTokens.get(tokenAddress)
        if (existingToken) return existingToken

        const token = new LaunchToken(
            this.chainId,
            tokenAddress,
            this.publicClient,
            this._walletClient
        )
        this._launchTokens.set(tokenAddress, token)
        return token
    }

    public updateWalletClient(walletClient?: WalletClient): void {
        this._walletClient = walletClient
        this._factory = new Factory(this.chainId, this.publicClient, walletClient)
        this._router = new Router(this.chainId, this.publicClient, walletClient)
        this._masterChef = new MasterChef(this.chainId, this.publicClient, walletClient)
        this._launcher = new FiveFiveFiveLauncher(this.chainId, this.publicClient, walletClient)
        this._oracle = new PriceOracle(this.chainId, this.publicClient, walletClient)
        this._kkubUnwrapper = new KKUBUnwrapper(this.chainId, this.publicClient, walletClient)

        // Update existing instances
        for (const [address, _] of this._pairs) {
            this._pairs.set(
                address,
                new Pair(this.chainId, address, this.publicClient, walletClient)
            )
        }

        for (const [address, _] of this._launchTokens) {
            this._launchTokens.set(
                address,
                new LaunchToken(this.chainId, address, this.publicClient, walletClient)
            )
        }
    }

    public async getPairByTokens(tokenA: Address, tokenB: Address): Promise<Pair> {
        const pairAddress = await this.factory.getPair(tokenA, tokenB)
        return this.getPair(pairAddress)
    }

    // Helper method for unwrapping KKUB
    public async unwrapKKUB(amount: bigint, recipient: Address): Promise<Hash> {
        return this._kkubUnwrapper.unwrapKKUB(amount, recipient)
    }
}

// Re-export everything that should be available to SDK users
export { SUPPORTED_CHAINS, type SupportedChainId }

// Contract exports
export { Factory, type PonderFactory }
export { Pair, type PonderPair }
export { Router, type PonderRouter }
export { MasterChef, type PonderMasterChef }
export { LaunchToken, type PonderLaunchToken }
export { FiveFiveFiveLauncher, type PonderLauncher }
export { PriceOracle, type PonderPriceOracle }
export { KKUBUnwrapper, type PonderKKUBUnwrapper }

// Type exports
export type { SDKConfig as PonderSDKConfig }
export type { Reserves } from './contracts/pair'
export type { VestingInfo } from './contracts/launchtoken'
export type {
    AddLiquidityParams,
    AddLiquidityETHParams,
    RemoveLiquidityParams,
    RemoveLiquidityETHParams,
    SwapExactTokensForTokensParams,
    SwapTokensForExactTokensParams
} from './contracts/router'
export type {
    PoolInfo,
    UserInfo,
    AddPoolParams
} from './contracts/masterchef'
export type {
    LaunchInfo,
    SaleInfo,
    CreateLaunchParams
} from './contracts/launcher'
export type { Observation } from './contracts/oracle'
export { PonderProvider } from './context/PonderContext'
export {
    usePairFees,
    useAmountIn,
    useAmountOut,
    type FeeInfo
} from './hooks'
