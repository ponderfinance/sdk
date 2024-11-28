import { z } from 'zod'
import { Address } from 'viem'

// Chain ID validation
export const ChainIdSchema = z.enum(['1', '42161', '10', '8453']).transform(Number)
export type ChainId = z.infer<typeof ChainIdSchema>

// Address validation
export const AddressSchema = z.string().refine(
    (addr): addr is Address => /^0x[a-fA-F0-9]{40}$/.test(addr),
    { message: 'Invalid Ethereum address' }
)

// Common types used across the SDK
export const TokenSchema = z.object({
    address: AddressSchema,
    symbol: z.string(),
    decimals: z.number(),
    name: z.string()
})

export const PairSchema = z.object({
    id: z.string(),
    token0: AddressSchema,
    token1: AddressSchema,
    reserve0: z.bigint(),
    reserve1: z.bigint(),
    totalSupply: z.bigint()
})

export const ReservesSchema = z.object({
    reserve0: z.bigint(),
    reserve1: z.bigint(),
    blockTimestampLast: z.number()
})

// Export inferred types
export type Token = z.infer<typeof TokenSchema>
export type Pair = z.infer<typeof PairSchema>
export type Reserves = z.infer<typeof ReservesSchema>

// Useful type utilities
export type AddressMap = Record<ChainId, Address>

// Common parameter types
export interface CommonParams {
    chainId: ChainId
}
