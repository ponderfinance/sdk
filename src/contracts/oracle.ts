import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { ponderpriceoracleAbi } from '@ponderfinance/dex'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'
import { PONDER_ADDRESSES } from '@/constants/addresses'

export interface Observation {
    timestamp: bigint
    price0Cumulative: bigint
    price1Cumulative: bigint
}

export class PriceOracle {
    public readonly chainId: SupportedChainId
    public readonly address: Address
    public readonly chain: Chain
    private readonly publicClient: PublicClient
    private readonly walletClient?: WalletClient
    public readonly PERIOD = 86400n // 24 hours in seconds

    constructor(
        chainId: SupportedChainId,
        publicClient: PublicClient,
        walletClient?: WalletClient
    ) {
        this.chainId = chainId
        this.chain = getChainFromId(chainId)
        this.address = PONDER_ADDRESSES[chainId].oracle
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods
    async factory(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ponderpriceoracleAbi,
            functionName: 'factory'
        })
    }

    async observationLength(pair: Address): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ponderpriceoracleAbi,
            functionName: 'observationLength',
            args: [pair]
        })
    }

    async observations(pair: Address, index: bigint): Promise<Observation> {
        const [timestamp, price0Cumulative, price1Cumulative] = await this.publicClient.readContract({
            address: this.address,
            abi: ponderpriceoracleAbi,
            functionName: 'observations',
            args: [pair, index]
        }) as readonly [bigint, bigint, bigint]

        return {
            timestamp,
            price0Cumulative,
            price1Cumulative
        }
    }

    async consult(
        pair: Address,
        tokenIn: Address,
        amountIn: bigint,
        periodInSeconds: number
    ): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: ponderpriceoracleAbi,
            functionName: 'consult',
            args: [pair, tokenIn, amountIn, periodInSeconds]
        })
    }

    // Write Methods
    async update(pair: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: ponderpriceoracleAbi,
            functionName: 'update',
            args: [pair]
        } as unknown as WriteContractParameters)
    }

    // Helper Methods
    async getAveragePrice(
        pair: Address,
        tokenIn: Address,
        amountIn: bigint,
        period: number = 3600 // 1 hour default
    ): Promise<{
        amountOut: bigint
        pricePerToken: number
    }> {
        if (period > Number(this.PERIOD)) {
            throw new Error('Period cannot exceed 24 hours')
        }

        const amountOut = await this.consult(pair, tokenIn, amountIn, period)
        const pricePerToken = Number((amountOut * 1000000000000000000n) / amountIn) / 1e18

        return {
            amountOut,
            pricePerToken
        }
    }

    async getLatestObservation(pair: Address): Promise<Observation | null> {
        const length = await this.observationLength(pair)
        if (length === 0n) return null

        return this.observations(pair, length - 1n)
    }

    async getPriceHistory(
        pair: Address,
        fromIndex?: bigint,
        toIndex?: bigint
    ): Promise<Observation[]> {
        const length = await this.observationLength(pair)
        if (length === 0n) return []

        const start = fromIndex ?? 0n
        const end = toIndex ?? length
        const history: Observation[] = []

        for (let i = start; i < end; i++) {
            const observation = await this.observations(pair, i)
            history.push(observation)
        }

        return history
    }

    async getPriceChange(
        pair: Address,
        tokenIn: Address,
        period: number = 3600 // 1 hour default
    ): Promise<{
        absoluteChange: number
        percentageChange: number
    }> {
        // Get current and historical prices using 1e18 as base amount
        const baseAmount = 1000000000000000000n

        const currentPrice = await this.getAveragePrice(pair, tokenIn, baseAmount, 300) // 5 min average
        const historicalPrice = await this.getAveragePrice(pair, tokenIn, baseAmount, period)

        const absoluteChange = currentPrice.pricePerToken - historicalPrice.pricePerToken
        const percentageChange = ((currentPrice.pricePerToken - historicalPrice.pricePerToken) /
            historicalPrice.pricePerToken) * 100

        return {
            absoluteChange,
            percentageChange
        }
    }
}

export type PonderPriceOracle = PriceOracle
