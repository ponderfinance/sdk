import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { ROUTER_ABI } from '../abis'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'
import { PONDER_ADDRESSES } from '@/constants/addresses'

export type AddLiquidityParams = {
    tokenA: Address
    tokenB: Address
    amountADesired: bigint
    amountBDesired: bigint
    amountAMin: bigint
    amountBMin: bigint
    to: Address
    deadline: bigint
}

export type AddLiquidityETHParams = {
    token: Address
    amountTokenDesired: bigint
    amountTokenMin: bigint
    amountETHMin: bigint
    to: Address
    deadline: bigint
}

export type RemoveLiquidityParams = {
    tokenA: Address
    tokenB: Address
    liquidity: bigint
    amountAMin: bigint
    amountBMin: bigint
    to: Address
    deadline: bigint
}

export type RemoveLiquidityETHParams = {
    token: Address
    liquidity: bigint
    amountTokenMin: bigint
    amountETHMin: bigint
    to: Address
    deadline: bigint
}

export type SwapExactTokensForTokensParams = {
    amountIn: bigint
    amountOutMin: bigint
    path: Address[]
    to: Address
    deadline: bigint
}

export type SwapTokensForExactTokensParams = {
    amountOut: bigint
    amountInMax: bigint
    path: Address[]
    to: Address
    deadline: bigint
}

export class Router {
    public readonly chainId: SupportedChainId
    public readonly address: Address
    public readonly chain: Chain
    private readonly publicClient: PublicClient
    private readonly walletClient?: WalletClient

    constructor(
        chainId: SupportedChainId,
        publicClient: PublicClient,
        walletClient?: WalletClient
    ) {
        this.chainId = chainId
        this.chain = getChainFromId(chainId)
        this.address = PONDER_ADDRESSES[chainId].router
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods
    async factory(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'factory'
        })
    }

    async WETH(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'WETH'
        })
    }

    async getAmountOut(amountIn: bigint, reserveIn: bigint, reserveOut: bigint): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'getAmountOut',
            args: [amountIn, reserveIn, reserveOut]
        })
    }

    async getAmountIn(amountOut: bigint, reserveIn: bigint, reserveOut: bigint): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'getAmountIn',
            args: [amountOut, reserveIn, reserveOut]
        })
    }

    async getAmountsOut(amountIn: bigint, path: Address[]): Promise<readonly bigint[]> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'getAmountsOut',
            args: [amountIn, path]
        })
    }

    async getAmountsIn(amountOut: bigint, path: Address[]): Promise<readonly bigint[]> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'getAmountsIn',
            args: [amountOut, path]
        })
    }

    // Write Methods - Liquidity
    async addLiquidity(params: AddLiquidityParams): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'addLiquidity',
            args: [
                params.tokenA,
                params.tokenB,
                params.amountADesired,
                params.amountBDesired,
                params.amountAMin,
                params.amountBMin,
                params.to,
                params.deadline
            ]
        } as unknown as WriteContractParameters)
    }

    async addLiquidityETH(params: AddLiquidityETHParams, value: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'addLiquidityETH',
            args: [
                params.token,
                params.amountTokenDesired,
                params.amountTokenMin,
                params.amountETHMin,
                params.to,
                params.deadline
            ],
            value
        } as unknown as WriteContractParameters)
    }

    async removeLiquidity(params: RemoveLiquidityParams): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'removeLiquidity',
            args: [
                params.tokenA,
                params.tokenB,
                params.liquidity,
                params.amountAMin,
                params.amountBMin,
                params.to,
                params.deadline
            ]
        } as unknown as WriteContractParameters)
    }

    async removeLiquidityETH(params: RemoveLiquidityETHParams): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'removeLiquidityETH',
            args: [
                params.token,
                params.liquidity,
                params.amountTokenMin,
                params.amountETHMin,
                params.to,
                params.deadline
            ]
        } as unknown as WriteContractParameters)
    }

    // Write Methods - Swaps
    async swapExactTokensForTokens(params: SwapExactTokensForTokensParams): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'swapExactTokensForTokens',
            args: [
                params.amountIn,
                params.amountOutMin,
                params.path,
                params.to,
                params.deadline
            ]
        } as unknown as WriteContractParameters)
    }

    async swapTokensForExactTokens(params: SwapTokensForExactTokensParams): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ROUTER_ABI,
            functionName: 'swapTokensForExactTokens',
            args: [
                params.amountOut,
                params.amountInMax,
                params.path,
                params.to,
                params.deadline
            ]
        } as unknown as WriteContractParameters)
    }
}

export type PonderRouter = Router
