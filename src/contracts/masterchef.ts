import { type PublicClient, type WalletClient, type Address, type Hash, type WriteContractParameters } from 'viem'
import { type Chain } from 'viem/chains'
import { MASTERCHEF_ABI } from '../abis'
import { type SupportedChainId } from '@/constants/chains'
import { getChainFromId } from '@/constants/chains'
import { PONDER_ADDRESSES } from '@/constants/addresses'

export interface PoolInfo {
    lpToken: Address
    allocPoint: bigint
    lastRewardTime: bigint
    accPonderPerShare: bigint
    totalStaked: bigint
    totalWeightedShares: bigint
    depositFeeBP: number
    boostMultiplier: number
}

export interface UserInfo {
    amount: bigint
    rewardDebt: bigint
    ponderStaked: bigint
}

export interface AddPoolParams {
    allocPoint: bigint
    lpToken: Address
    depositFeeBP: number
    boostMultiplier: number
    withUpdate: boolean
}

export class MasterChef {
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
        this.address = PONDER_ADDRESSES[chainId].masterChef
        this.publicClient = publicClient
        this.walletClient = walletClient
    }

    // Read Methods
    async ponder(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'ponder'
        })
    }

    async factory(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'factory'
        })
    }

    async ponderPerSecond(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'ponderPerSecond'
        })
    }

    async poolLength(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'poolLength'
        })
    }

    async poolInfo(pid: bigint): Promise<PoolInfo> {
        const [
            lpToken,
            allocPoint,
            lastRewardTime,
            accPonderPerShare,
            totalStaked,
            totalWeightedShares,
            depositFeeBP,
            boostMultiplier,
        ] = await this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'poolInfo',
            args: [pid]
        }) as readonly [Address, bigint, bigint, bigint, bigint, bigint, number, number]

        return {
            lpToken,
            allocPoint,
            lastRewardTime,
            accPonderPerShare,
            totalStaked,
            totalWeightedShares,
            depositFeeBP,
            boostMultiplier
        }
    }

    async userInfo(pid: bigint, user: Address): Promise<UserInfo> {
        const [amount, rewardDebt, ponderStaked] = await this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'userInfo',
            args: [pid, user]
        }) as readonly [bigint, bigint, bigint, bigint]

        return {
            amount,
            rewardDebt,
            ponderStaked
        }
    }

    async pendingPonder(pid: bigint, user: Address): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'pendingPonder',
            args: [pid, user]
        })
    }

    async totalAllocPoint(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'totalAllocPoint'
        })
    }

    async startTime(): Promise<bigint> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'startTime'
        })
    }

    async owner(): Promise<Address> {
        return this.publicClient.readContract({
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'owner'
        })
    }

    // Write Methods
    async add(params: AddPoolParams): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'add',
            args: [
                params.allocPoint,
                params.lpToken,
                params.depositFeeBP,
                params.boostMultiplier,
                params.withUpdate
            ]
        } as unknown as WriteContractParameters)
    }

    async set(pid: bigint, allocPoint: bigint, withUpdate: boolean): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'set',
            args: [pid, allocPoint, withUpdate]
        } as unknown as WriteContractParameters)
    }

    async deposit(pid: bigint, amount: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'deposit',
            args: [pid, amount]
        } as unknown as WriteContractParameters)
    }

    async withdraw(pid: bigint, amount: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'withdraw',
            args: [pid, amount]
        } as unknown as WriteContractParameters)
    }

    async emergencyWithdraw(pid: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'emergencyWithdraw',
            args: [pid]
        } as unknown as WriteContractParameters)
    }

    async boostStake(pid: bigint, amount: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'boostStake',
            args: [pid, amount]
        } as unknown as WriteContractParameters)
    }

    async boostUnstake(pid: bigint, amount: bigint): Promise<Hash> {
        if (!this.walletClient) throw new Error('Wallet client required')

        return this.walletClient.writeContract({
            chain: this.chain,
            address: this.address,
            abi: MASTERCHEF_ABI,
            functionName: 'boostUnstake',
            args: [pid, amount]
        } as unknown as WriteContractParameters)
    }

    // Helper Methods
    async getAllPools(): Promise<PoolInfo[]> {
        const length = await this.poolLength()
        const pools: PoolInfo[] = []

        for (let i = 0n; i < length; i++) {
            pools.push(await this.poolInfo(i))
        }

        return pools
    }

    async getUserInfoForPools(user: Address, pids: bigint[]): Promise<UserInfo[]> {
        return Promise.all(pids.map(pid => this.userInfo(pid, user)))
    }
}

export type PonderMasterChef = MasterChef
