import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { PAIR_ABI } from '../abis'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'

export interface Reserves {
    reserve0: bigint
    reserve1: bigint
    blockTimestampLast: number
}

export type SwapArgs = {
    amount0Out: bigint
    amount1Out: bigint
    to: Address
    data: string
}

export type MintResult = {
    hash: Hash
    wait: () => Promise<{
        liquidity: bigint
    }>
}

export type BurnResult = {
    hash: Hash
    wait: () => Promise<{
        amount0: bigint
        amount1: bigint
    }>
}

export class Pair {
    public readonly chainId: SupportedChainId
    public readonly address: Address
    public readonly chain: Chain
    private readonly publicClient: PublicClient
    private readonly walletClient?: WalletClient

    constructor(
        chainId: SupportedChainId,
        pairAddress: Address,
        publicClient: PublicClient,
        walletClient?: WalletClient
    ) {
        this.chainId = chainId
        this.chain = getChainFromId(chainId)
        this.address = pairAddress
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods

    async MINIMUM_LIQUIDITY(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'MINIMUM_LIQUIDITY'
        })
    }

    async factory(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'factory'
        })
    }

    async token0(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'token0'
        })
    }

    async token1(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'token1'
        })
    }

    async getReserves(): Promise<Reserves> {
        const [reserve0, reserve1, blockTimestampLast] = await this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'getReserves'
        })

        return {
            reserve0,
            reserve1,
            blockTimestampLast
        }
    }

    async price0CumulativeLast(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'price0CumulativeLast'
        })
    }

    async price1CumulativeLast(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'price1CumulativeLast'
        })
    }

    async kLast(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'kLast'
        })
    }

    // ERC20 Read Methods
    async name(): Promise<string> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'name'
        })
    }

    async symbol(): Promise<string> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'symbol'
        })
    }

    async decimals(): Promise<number> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'decimals'
        })
    }

    async totalSupply(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'totalSupply'
        })
    }

    async balanceOf(account: Address): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'balanceOf',
            args: [account]
        })
    }

    async allowance(owner: Address, spender: Address): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'allowance',
            args: [owner, spender]
        })
    }

    // Write Methods

    async mint(to: Address): Promise<MintResult> {
        if (!this.walletClient) throw new Error('Wallet client required')

        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'mint',
            args: [to]
        } as unknown as WriteContractParameters)

        const wait = async () => {
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
            const mintLog = receipt.logs.find(log =>
                log.topics[0] === '0x4c209b5fc8ad50758f13e2e1088ba56a560dff690a1c6fef26394f4c03821c4f' // Mint event signature
            )
            if (!mintLog || !mintLog.data) {
                throw new Error('Mint failed')
            }

            return {
                liquidity: BigInt(mintLog.data)
            }
        }

        return { hash, wait }
    }

    async burn(to: Address): Promise<BurnResult> {
        if (!this.walletClient) throw new Error('Wallet client required')

        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'burn',
            args: [to]
        } as unknown as WriteContractParameters)

        const wait = async () => {
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
            const burnLog = receipt.logs.find(log =>
                log.topics[0] === '0xdccd412f0b1252819cb1fd330b93224ca42612892bb3f4f789976e6d81936496' // Burn event signature
            )
            if (!burnLog || !burnLog.data) {
                throw new Error('Burn failed')
            }

            // Decode the burn event data
            const data = burnLog.data.slice(2) // Remove '0x' prefix
            return {
                amount0: BigInt('0x' + data.slice(0, 64)),
                amount1: BigInt('0x' + data.slice(64, 128))
            }
        }

        return { hash, wait }
    }

    async swap({ amount0Out, amount1Out, to, data }: SwapArgs): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'swap',
            args: [amount0Out, amount1Out, to, data]
        } as unknown as WriteContractParameters)
    }

    async sync(): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'sync'
        } as unknown as WriteContractParameters)
    }

    async skim(to: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'skim',
            args: [to]
        } as unknown as WriteContractParameters)
    }

    // Standard ERC20 write methods
    async approve(spender: Address, value: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'approve',
            args: [spender, value]
        } as unknown as WriteContractParameters)
    }

    async transfer(to: Address, value: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'transfer',
            args: [to, value]
        } as unknown as WriteContractParameters)
    }

    async transferFrom(from: Address, to: Address, value: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: PAIR_ABI,
            functionName: 'transferFrom',
            args: [from, to, value]
        } as unknown as WriteContractParameters)
    }
}

export type PonderPair = Pair
