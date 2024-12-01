import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { fivefivefivelauncherAbi } from '@ponderfinance/dex'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'
import { PONDER_ADDRESSES } from '@/constants/addresses'

export interface LaunchInfo {
    tokenAddress: Address
    name: string
    symbol: string
    imageURI: string
    totalRaised: bigint
    launched: boolean
    lpUnlockTime: bigint
}

export interface SaleInfo {
    tokenPrice: bigint
    tokensForSale: bigint
    tokensSold: bigint
    totalRaised: bigint
    launched: boolean
    remainingTokens: bigint
}

export interface CreateLaunchParams {
    name: string
    symbol: string
    imageURI: string
}

export type CreateLaunchResult = {
    hash: Hash
    wait: () => Promise<{
        launchId: bigint
        tokenAddress: Address
    }>
}

export class FiveFiveFiveLauncher {
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
        this.address = PONDER_ADDRESSES[chainId].launcher
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods
    async factory(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'factory'
        })
    }

    async router(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'router'
        })
    }

    async owner(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'owner'
        })
    }

    async feeCollector(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'feeCollector'
        })
    }

    async launchCount(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'launchCount'
        })
    }

    async TARGET_RAISE(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'TARGET_RAISE'
        })
    }

    async TOTAL_SUPPLY(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'TOTAL_SUPPLY'
        })
    }

    async getLaunchInfo(launchId: bigint): Promise<LaunchInfo> {
        const [
            tokenAddress,
            name,
            symbol,
            imageURI,
            totalRaised,
            launched,
            lpUnlockTime
        ] = await this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'getLaunchInfo',
            args: [launchId]
        }) as readonly [Address, string, string, string, bigint, boolean, bigint]

        return {
            tokenAddress,
            name,
            symbol,
            imageURI,
            totalRaised,
            launched,
            lpUnlockTime
        }
    }

    async getSaleInfo(launchId: bigint): Promise<SaleInfo> {
        const [
            tokenPrice,
            tokensForSale,
            tokensSold,
            totalRaised,
            launched,
            remainingTokens
        ] = await this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'getSaleInfo',
            args: [launchId]
        }) as readonly [bigint, bigint, bigint, bigint, boolean, bigint]

        return {
            tokenPrice,
            tokensForSale,
            tokensSold,
            totalRaised,
            launched,
            remainingTokens
        }
    }

    // Write Methods
    async createLaunch(params: CreateLaunchParams): Promise<CreateLaunchResult> {
        if (!this.walletClient) throw new Error('Wallet client required')

        const hash = await this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'createLaunch',
            args: [params.name, params.symbol, params.imageURI]
        } as unknown as WriteContractParameters)

        const wait = async () => {
            const receipt = await this.publicClient.waitForTransactionReceipt({ hash })
            const launchCreatedLog = receipt.logs.find(log =>
                log.topics[0] === '0x21a4dad170a6bf476c31bbf74b1e6416c50bb31c38fba37cb54387f2d88af654' // LaunchCreated event signature
            )
            if (!launchCreatedLog || !launchCreatedLog.topics[1] || !launchCreatedLog.topics[2]) {
                throw new Error('Launch creation failed')
            }

            return {
                launchId: BigInt('0x' + launchCreatedLog.topics[1].slice(2)),
                tokenAddress: `0x${launchCreatedLog.topics[2].slice(26)}` as Address
            }
        }

        return { hash, wait }
    }

    async contribute(launchId: bigint, value: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'contribute',
            args: [launchId],
            value
        } as unknown as WriteContractParameters)
    }

    async withdrawLP(launchId: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'withdrawLP',
            args: [launchId]
        } as unknown as WriteContractParameters)
    }
}

export type PonderLauncher = FiveFiveFiveLauncher
