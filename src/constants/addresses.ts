import { type Address } from 'viem'
import { type ChainId } from '@/types/common'

export interface PonderAddresses {
    factory: Address
    router: Address
    masterChef: Address
}

// Contract addresses for each supported chain
export const PONDER_ADDRESSES: Record<ChainId, PonderAddresses> = {
    1: {
        factory: '0x1234...', // Replace with actual mainnet addresses
        router: '0x5678...',
        masterChef: '0x9abc...'
    },
    42161: {
        factory: '0x1234...', // Replace with actual Arbitrum addresses
        router: '0x5678...',
        masterChef: '0x9abc...'
    },
    10: {
        factory: '0x1234...', // Replace with actual Optimism addresses
        router: '0x5678...',
        masterChef: '0x9abc...'
    },
    8453: {
        factory: '0x1234...', // Replace with actual Base addresses
        router: '0x5678...',
        masterChef: '0x9abc...'
    }
} as const

// WETH addresses for each chain
export const WETH_ADDRESSES: Record<ChainId, Address> = {
    1: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
    42161: '0x82aF49447D8a07e3bd95BD0d56f35241523fBab1',
    10: '0x4200000000000000000000000000000000000006',
    8453: '0x4200000000000000000000000000000000000006'
} as const
