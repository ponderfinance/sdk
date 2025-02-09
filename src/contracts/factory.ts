import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { FACTORY_ABI } from '../abis'
import { PONDER_ADDRESSES } from '@/constants/addresses'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'

export type CreatePairArgs = {
    tokenA: Address
    tokenB: Address
}

export type CreatePairResult = {
    hash: Hash
    wait: () => Promise<{
        pairAddress: Address,
        token0: Address,
        token1: Address
    }>
}

export class Factory {
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
        this.address = PONDER_ADDRESSES[chainId].factory
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods

    async getPair(tokenA: Address, tokenB: Address): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'getPair',
            args: [tokenA, tokenB]
        })
    }

    async allPairs(index: number): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'allPairs',
            args: [BigInt(index)]
        })
    }

    async allPairsLength(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'allPairsLength'
        })
    }

    async feeTo(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'feeTo'
        })
    }

    async feeToSetter(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'feeToSetter'
        })
    }


    // Write Methods

    async createPair({ tokenA, tokenB }: CreatePairArgs): Promise<CreatePairResult> {
        if (!this.walletClient) throw new Error('Wallet client required')

        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'createPair',
            args: [tokenA, tokenB]
        } as unknown as WriteContractParameters)

        const wait = async () => {
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
            // Get pair address from PairCreated event
            const pairCreatedLog = receipt.logs.find(log =>
                log.topics[0] === '0x0d3648bd0f6ba80134a33ba9275ac585d9d315f0ad8355cddefde31afa28d0e9' // PairCreated event signature
            )
            if (!pairCreatedLog || pairCreatedLog.topics.length < 4) {
                throw new Error('Pair creation failed')
            }

            // Safely access topics after check
            const topics = pairCreatedLog.topics
            return {
                pairAddress: `0x${topics?.[3]?.slice(26)}` as Address,
                token0: `0x${topics?.[1]?.slice(26)}` as Address,
                token1: `0x${topics?.[2]?.slice(26)}` as Address
            }
        }

        return { hash, wait }
    }

    async setFeeTo(newFeeTo: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'setFeeTo',
            args: [newFeeTo]
       } as unknown as WriteContractParameters)
    }

    async setFeeToSetter(newFeeToSetter: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'setFeeToSetter',
            args: [newFeeToSetter]
       } as unknown as WriteContractParameters)
    }

    async setMigrator(newMigrator: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: FACTORY_ABI,
            functionName: 'setMigrator',
            args: [newMigrator]
       } as unknown as WriteContractParameters)
    }

    // Helper Methods

    /**
     * Get all pairs created by the factory
     * @returns Array of pair addresses
     */
    async getAllPairs(): Promise<Address[]> {
        const length = await this.allPairsLength()
        const pairs: Address[] = []

        for (let i = 0; i < Number(length); i++) {
            pairs.push(await this.allPairs(i))
        }

        return pairs
    }
}

// Export the type separately to avoid declaration conflicts
export type PonderFactory = Factory
