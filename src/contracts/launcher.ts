import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { fivefivefivelauncherAbi } from '@ponderfinance/dex'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'
import { PONDER_ADDRESSES } from '@/constants/addresses'

export interface LaunchInfo {
    tokenAddress: Address;
    name: string;
    symbol: string;
    imageURI: string;
    totalRaised: bigint;
    launched: boolean;
    creator: Address;
    lpUnlockTime: bigint;
    tokenPrice: bigint;
    tokensForSale: bigint;
    tokensSold: bigint;
    ponderRequired: bigint;
    ponderCollected: bigint;
}

export interface SaleInfo {
    tokenPrice: bigint;
    tokensForSale: bigint;
    tokensSold: bigint;
    totalRaised: bigint;
    launched: boolean;
    remainingTokens: bigint;
}

export interface CreateLaunchParams {
    name: string;
    symbol: string;
    imageURI: string;
}

export interface PonderMetrics {
    lpAllocation: bigint;      // 50% to launch token/PONDER LP
    protocolLPAllocation: bigint; // 30% to PONDER/KUB LP
    burnAmount: bigint;        // 20% burned
    requiredAmount: bigint;    // Total PONDER needed
}

export class FiveFiveFiveLauncher {
    public readonly chainId: SupportedChainId;
    public readonly address: Address;
    public readonly chain: Chain;
    private readonly publicClient: PublicClient;
    private readonly walletClient?: WalletClient;

    // Protocol constants from contract
    public readonly TARGET_RAISE = 5555n * 10n ** 18n; // 5,555 KUB
    public readonly TOTAL_SUPPLY = 555_555_555n * 10n ** 18n; // 555,555,555 tokens
    public readonly LP_ALLOCATION = 10n; // 10% of launch tokens for LP
    public readonly CREATOR_ALLOCATION = 10n; // 10% to creator
    public readonly CONTRIBUTOR_ALLOCATION = 80n; // 80% for sale
    public readonly LP_LOCK_PERIOD = 180n * 24n * 60n * 60n; // 180 days in seconds

    // PONDER distribution ratios
    public readonly PONDER_LP_ALLOCATION = 50n; // 50% to launch token/PONDER LP
    public readonly PONDER_PROTOCOL_LP = 30n; // 30% to PONDER/KUB LP
    public readonly PONDER_BURN = 20n; // 20% burned

    constructor(
        chainId: SupportedChainId,
        publicClient: PublicClient,
        walletClient?: WalletClient
    ) {
        this.chainId = chainId;
        this.chain = getChainFromId(chainId);
        this.address = PONDER_ADDRESSES[chainId].launcher;
        this.publicClient = publicClient;
        this.walletClient = walletClient;
    }

    // Read Methods
    async factory(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'factory'
        });
    }

    async router(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'router'
        });
    }

    async owner(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'owner'
        });
    }

    async feeCollector(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'feeCollector'
        });
    }

    async launchCount(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'launchCount'
        });
    }

    async getLaunchInfo(launchId: bigint): Promise<LaunchInfo> {
        const info = await this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'getLaunchInfo',
            args: [launchId]
        }) as any;

        return {
            tokenAddress: info[0],
            name: info[1],
            symbol: info[2],
            imageURI: info[3],
            totalRaised: info[4],
            launched: info[5],
            creator: info[6],
            lpUnlockTime: info[7],
            tokenPrice: info[8],
            tokensForSale: info[9],
            tokensSold: info[10],
            ponderRequired: info[11],
            ponderCollected: info[12]
        };
    }

    async getSaleInfo(launchId: bigint): Promise<SaleInfo> {
        const info = await this.publicClient.readContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'getSaleInfo',
            args: [launchId]
        }) as any;

        return {
            tokenPrice: info[0],
            tokensForSale: info[1],
            tokensSold: info[2],
            totalRaised: info[3],
            launched: info[4],
            remainingTokens: info[5]
        };
    }

    async calculatePonderRequirements(launchId: bigint): Promise<PonderMetrics> {
        const info = await this.getLaunchInfo(launchId);

        // Calculate PONDER allocations based on raise target
        const totalRequired = BigInt(info.ponderRequired);
        return {
            lpAllocation: (totalRequired * BigInt(this.PONDER_LP_ALLOCATION)) / 100n,
            protocolLPAllocation: (totalRequired * BigInt(this.PONDER_PROTOCOL_LP)) / 100n,
            burnAmount: (totalRequired * BigInt(this.PONDER_BURN)) / 100n,
            requiredAmount: totalRequired
        };
    }

    // Write Methods
    async createLaunch(params: CreateLaunchParams): Promise<Hash> {
        if (!this.walletClient?.account?.address) throw new Error('Wallet client required');

        const { request } = await this.publicClient.simulateContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'createLaunch',
            args: [params.name, params.symbol, params.imageURI],
            account: this.walletClient.account.address,
            chain: this.chain,
        });

        return this.walletClient.writeContract(request as WriteContractParameters);
    }

    async contribute(launchId: bigint): Promise<Hash> {
        if (!this.walletClient?.account?.address) throw new Error('Wallet client required');

        const { request } = await this.publicClient.simulateContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'contribute',
            args: [launchId],
            account: this.walletClient.account.address,
            chain: this.chain,
        });

        return this.walletClient.writeContract(request as WriteContractParameters);
    }

    async withdrawLP(launchId: bigint): Promise<Hash> {
        if (!this.walletClient?.account?.address) throw new Error('Wallet client required');

        const { request } = await this.publicClient.simulateContract({
            address: this.address,
            abi: fivefivefivelauncherAbi,
            functionName: 'withdrawLP',
            args: [launchId],
            account: this.walletClient.account.address,
            chain: this.chain,
        });

        return this.walletClient.writeContract(request as WriteContractParameters);
    }
}

export type PonderLauncher = FiveFiveFiveLauncher;
