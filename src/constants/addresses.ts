import { type Address } from 'viem'
import { type ChainId } from '@/types/common'

export interface PonderAddresses {
    factory: Address
    router: Address
    masterChef: Address
    launcher: Address
    oracle: Address
    kkubUnwrapper: Address
}

// Contract addresses for each supported chain
export const PONDER_ADDRESSES: Record<ChainId, PonderAddresses> = {
    25925: {
        factory: '0xb1a88D99293416D725c9e71aaB64E89db84d3F5B',
        router: '0xA4606e97d62F2907df9b980bf79AF7ed735ba72B',
        masterChef: '0x0047a3e93319c3226C85c764FA98cdB8EeA5Dbbc',
        launcher: '0x6eBbF400Eb0FA62D2De96771Ac7b7788C7486704',
        oracle: '0x04C3913C234F2b3AbC2d1ebcAd818D044D5de7b6',
        kkubUnwrapper: '0x467B467c33956425b735Abb5Da2C9dECF0047C71'
    },
} as const

// WETH addresses for each chain
export const WETH_ADDRESSES: Record<ChainId, Address> = {
    25925: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
} as const
