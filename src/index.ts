import { type PublicClient, type WalletClient, type Address, createPublicClient, http } from 'viem'
import { type SupportedChainId, SUPPORTED_CHAINS, getChainFromId } from './constants/chains'
import { Factory, type PonderFactory } from './contracts/factory'
import { Pair, type PonderPair } from './contracts/pair'
import { Router, type PonderRouter } from './contracts/router'
import { MasterChef, type PonderMasterChef, type PoolInfo, type UserInfo } from './contracts/masterchef'

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
    private _pairs: Map<Address, Pair>

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
        this._pairs = new Map()
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

    public updateWalletClient(walletClient?: WalletClient): void {
        this._walletClient = walletClient
        this._factory = new Factory(this.chainId, this.publicClient, walletClient)
        this._router = new Router(this.chainId, this.publicClient, walletClient)
        this._masterChef = new MasterChef(this.chainId, this.publicClient, walletClient)

        for (const [address, _] of this._pairs) {
            this._pairs.set(
                address,
                new Pair(this.chainId, address, this.publicClient, walletClient)
            )
        }
    }

    public async getPairByTokens(tokenA: Address, tokenB: Address): Promise<Pair> {
        const pairAddress = await this.factory.getPair(tokenA, tokenB)
        return this.getPair(pairAddress)
    }
}

// Re-export everything that should be available to SDK users
export { SUPPORTED_CHAINS, type SupportedChainId }

// Contract exports
export { Factory, type PonderFactory }
export { Pair, type PonderPair }
export { Router, type PonderRouter }
export { MasterChef, type PonderMasterChef }

// Type exports
export type { SDKConfig as PonderSDKConfig }
export type { Reserves } from './contracts/pair'
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
