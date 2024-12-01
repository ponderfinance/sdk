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
        factory: '0xE5bc8AA76Eb3195cd6E6C36B1774b68FF454ee83',
        router: '0x47B5a769b02BF467c664562D49604fD478Ba10b2',
        masterChef: '0xEC3aa68029Bb5523f9075B513F1EFCa22FF45410',
        launcher: '0x9465ab01507ef9c84750b7db8ff43E33ba2E373c',
        oracle: '0xA960e511436Aa56F0f40184dB7DB19a1816E0e7D',
        kkubUnwrapper: '0x88176f55c2a15a6f56d8E3B504EaDcB7EeF6cF9D'
    },
} as const

// WETH addresses for each chain
export const WETH_ADDRESSES: Record<ChainId, Address> = {
    25925: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
} as const
