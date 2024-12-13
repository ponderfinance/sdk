import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { type Chain } from "viem/chains";
import { launchtokenAbi } from "@ponderfinance/dex";
import { type SupportedChainId } from "@/constants/chains";
import { getChainFromId } from "@/constants/chains";

export interface VestingInfo {
  total: bigint;
  claimed: bigint;
  available: bigint;
  start: bigint;
  end: bigint;
}

export class LaunchToken {
  public readonly chainId: SupportedChainId;
  public readonly address: Address;
  public readonly chain: Chain;
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;

  constructor(
    chainId: SupportedChainId,
    tokenAddress: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient
  ) {
    this.chainId = chainId;
    this.chain = getChainFromId(chainId);
    this.address = tokenAddress;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  // Read Methods
  async name(): Promise<string> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "name",
    });
  }

  async symbol(): Promise<string> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "symbol",
    });
  }

  async decimals(): Promise<number> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "decimals",
    });
  }

  async totalSupply(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "totalSupply",
    });
  }

  async balanceOf(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "balanceOf",
      args: [account],
    });
  }

  async allowance(owner: Address, spender: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "allowance",
      args: [owner, spender],
    });
  }

  // Launch Token specific read methods
  async launcher(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "launcher",
    });
  }

  async factory(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "factory",
    });
  }

  async router(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "router",
    });
  }

  async creator(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "creator",
    });
  }

  async vestingStart(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "vestingStart",
    });
  }

  async vestingEnd(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "vestingEnd",
    });
  }

  async totalVestedAmount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "totalVestedAmount",
    });
  }

  async vestedClaimed(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "vestedClaimed",
    });
  }

  async TOTAL_SUPPLY(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "TOTAL_SUPPLY",
    });
  }

  async VESTING_DURATION(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "VESTING_DURATION",
    });
  }

  async creatorFee(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: launchtokenAbi,
      functionName: "PONDER_CREATOR_FEE",
    }) as Promise<bigint>;
  }

  async getVestingInfo(): Promise<VestingInfo> {
    const [total, claimed, available, start, end] =
      (await this.publicClient.readContract({
        address: this.address,
        abi: launchtokenAbi,
        functionName: "getVestingInfo",
      })) as readonly [bigint, bigint, bigint, bigint, bigint];

    return {
      total,
      claimed,
      available,
      start,
      end,
    };
  }

  // Write Methods
  async approve(spender: Address, value: bigint): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: launchtokenAbi,
      functionName: "approve",
      args: [spender, value],
    } as unknown as WriteContractParameters);
  }

  async transfer(to: Address, value: bigint): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: launchtokenAbi,
      functionName: "transfer",
      args: [to, value],
    } as unknown as WriteContractParameters);
  }

  async transferFrom(from: Address, to: Address, value: bigint): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: launchtokenAbi,
      functionName: "transferFrom",
      args: [from, to, value],
    } as unknown as WriteContractParameters);
  }

  async setupVesting(creator: Address, amount: bigint): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: launchtokenAbi,
      functionName: "setupVesting",
      args: [creator, amount],
    } as unknown as WriteContractParameters);
  }

  async enableTransfers(): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: launchtokenAbi,
      functionName: "enableTransfers",
    } as unknown as WriteContractParameters);
  }

  async claimVestedTokens(): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: launchtokenAbi,
      functionName: "claimVestedTokens",
    } as unknown as WriteContractParameters);
  }
}

export type PonderLaunchToken = LaunchToken;
