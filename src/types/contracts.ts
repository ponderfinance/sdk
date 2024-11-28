import { type Address, type Abi, type PublicClient, type WalletClient } from 'viem'
import {
    ponderrouterAbi,
    pondertokenAbi,
    ponderfactoryAbi,
    pondermasterchefAbi,
    ponderpairAbi
} from '@ponderfinance/dex'

// Define generic contract types
export type ContractFunctions<TAbi extends Abi> = {
    read: {
        [TFunctionName in Extract<TAbi[number], { type: 'function', stateMutability: 'view' | 'pure' }>['name']]: (...args: any[]) => Promise<any>
    }
    write: {
        [TFunctionName in Extract<TAbi[number], { type: 'function', stateMutability: 'nonpayable' | 'payable' }>['name']]: (...args: any[]) => Promise<any>
    }
}

// Contract types with their specific ABIs
export type PonderFactoryContract = ContractFunctions<typeof ponderfactoryAbi>
export type PonderPairContract = ContractFunctions<typeof ponderpairAbi>
export type PonderRouterContract = ContractFunctions<typeof ponderrouterAbi>
export type PonderTokenContract = ContractFunctions<typeof pondertokenAbi>
export type PonderMasterChefContract = ContractFunctions<typeof pondermasterchefAbi>

// Function types
export type FactoryFunctions = keyof PonderFactoryContract['read'] | keyof PonderFactoryContract['write']
export type PairFunctions = keyof PonderPairContract['read'] | keyof PonderPairContract['write']
export type RouterFunctions = keyof PonderRouterContract['read'] | keyof PonderRouterContract['write']
export type TokenFunctions = keyof PonderTokenContract['read'] | keyof PonderTokenContract['write']
export type MasterChefFunctions = keyof PonderMasterChefContract['read'] | keyof PonderMasterChefContract['write']

// Contract read config type
export interface ContractReadConfig {
    chainId?: number
    address: Address
    abi: Abi
    functionName: string
    args?: any[]
}

// Contract write config type
export interface ContractWriteConfig extends ContractReadConfig {
    value?: bigint
}
