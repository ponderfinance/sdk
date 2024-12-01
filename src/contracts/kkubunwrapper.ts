import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { kkubunwrapperAbi } from '@ponderfinance/dex'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'
import { PONDER_ADDRESSES } from '@/constants/addresses'

export class KKUBUnwrapper {
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
        this.address = PONDER_ADDRESSES[chainId].kkubUnwrapper
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods
    async KKUB(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'KKUB'
        })
    }

    async owner(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'owner'
        })
    }

    async pendingOwner(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'pendingOwner'
        })
    }

    // Write Methods
    async unwrapKKUB(amount: bigint, recipient: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'unwrapKKUB',
            args: [amount, recipient]
        } as unknown as WriteContractParameters)
    }

    async transferOwnership(newOwner: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'transferOwnership',
            args: [newOwner]
        } as unknown as WriteContractParameters)
    }

    async acceptOwnership(): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'acceptOwnership'
        } as unknown as WriteContractParameters)
    }

    async emergencyWithdraw(): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'emergencyWithdraw'
        } as unknown as WriteContractParameters)
    }

    async emergencyWithdrawTokens(token: Address): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: kkubunwrapperAbi,
            functionName: 'emergencyWithdrawTokens',
            args: [token]
        } as unknown as WriteContractParameters)
    }
}

export type PonderKKUBUnwrapper = KKUBUnwrapper
