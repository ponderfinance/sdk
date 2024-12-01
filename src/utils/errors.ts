import { type Address } from 'viem'

// Base SDK Error class
export class PonderError extends Error {
    constructor(message: string) {
        super(message)
        this.name = 'PonderError'
    }
}

// Contract Interaction Errors
export class ContractCallError extends PonderError {
    constructor(
        public readonly contractName: string,
        public readonly methodName: string,
        public readonly originalError: unknown
    ) {
        super(
            `Failed to call ${methodName} on ${contractName}: ${
                originalError instanceof Error ? originalError.message : 'Unknown error'
            }`
        )
        this.name = 'ContractCallError'
    }
}

// Validation Errors
export class ValidationError extends PonderError {
    constructor(message: string) {
        super(message)
        this.name = 'ValidationError'
    }
}

// Token Related Errors
export class InsufficientBalanceError extends PonderError {
    constructor(token: Address, required: bigint, available: bigint) {
        super(
            `Insufficient balance for token ${token}. Required: ${required.toString()}, Available: ${available.toString()}`
        )
        this.name = 'InsufficientBalanceError'
    }
}

export class InsufficientAllowanceError extends PonderError {
    constructor(token: Address, spender: Address, required: bigint, current: bigint) {
        super(
            `Insufficient allowance for token ${token}. Required: ${required.toString()}, Current allowance: ${current.toString()} for spender ${spender}`
        )
        this.name = 'InsufficientAllowanceError'
    }
}

// Liquidity Related Errors
export class InsufficientLiquidityError extends PonderError {
    constructor(pairAddress: Address, amount0: bigint, amount1: bigint) {
        super(
            `Insufficient liquidity in pair ${pairAddress}. Requested: ${amount0.toString()}, ${amount1.toString()}`
        )
        this.name = 'InsufficientLiquidityError'
    }
}

// Price Impact Errors
export class ExcessivePriceImpactError extends PonderError {
    constructor(impact: number) {
        super(`Price impact too high: ${impact.toFixed(2)}%`)
        this.name = 'ExcessivePriceImpactError'
    }
}

// Deadline Errors
export class DeadlineExpiredError extends PonderError {
    constructor(deadline: bigint, currentTimestamp: bigint) {
        super(
            `Transaction deadline expired. Deadline: ${deadline.toString()}, Current: ${currentTimestamp.toString()}`
        )
        this.name = 'DeadlineExpiredError'
    }
}

// Configuration Errors
export class ChainUnsupportedError extends PonderError {
    constructor(chainId: number) {
        super(`Chain ID ${chainId} is not supported`)
        this.name = 'ChainUnsupportedError'
    }
}

// Transaction Errors
export class TransactionFailedError extends PonderError {
    constructor(
        public readonly txHash: string,
        public readonly reason: string
    ) {
        super(`Transaction failed: ${reason} (tx: ${txHash})`)
        this.name = 'TransactionFailedError'
    }
}

// Helper function to wrap contract calls with error handling
export async function handleContractCall<T>(
    contractName: string,
    methodName: string,
    call: () => Promise<T>
): Promise<T> {
    try {
        return await call()
    } catch (error) {
        throw new ContractCallError(contractName, methodName, error)
    }
}

// Validation helpers
export function validateAddress(address: string, paramName: string): void {
    if (!/^0x[a-fA-F0-9]{40}$/.test(address)) {
        throw new ValidationError(`Invalid address for ${paramName}: ${address}`)
    }
}

export function validateAmount(amount: bigint, paramName: string): void {
    if (amount <= 0n) {
        throw new ValidationError(`Invalid amount for ${paramName}: ${amount.toString()}`)
    }
}

export function validateDeadline(deadline: bigint): void {
    const currentTimestamp = BigInt(Math.floor(Date.now() / 1000))
    if (deadline <= currentTimestamp) {
        throw new DeadlineExpiredError(deadline, currentTimestamp)
    }
}
