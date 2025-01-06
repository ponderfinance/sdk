// src/contracts/staking.ts
import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { type Chain } from "viem/chains";
import { ponderstakingAbi } from "@ponderfinance/dex";
import { type SupportedChainId } from "@/constants/chains";
import { getChainFromId } from "@/constants/chains";
import { PONDER_ADDRESSES } from "@/constants/addresses";

export class Staking {
  public readonly chainId: SupportedChainId;
  public readonly address: Address;
  public readonly chain: Chain;
  public readonly abi = ponderstakingAbi;
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;

  constructor(
    chainId: SupportedChainId,
    publicClient: PublicClient,
    walletClient?: WalletClient
  ) {
    this.chainId = chainId;
    this.chain = getChainFromId(chainId);
    this.address = PONDER_ADDRESSES[chainId].staking;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  // Read Methods
  async ponder(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "ponder",
    });
  }

  async totalSupply(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "totalSupply",
    });
  }

  async balanceOf(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "balanceOf",
      args: [account],
    });
  }

  async lastRebaseTime(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "lastRebaseTime",
    });
  }

  async getPonderAmount(shares: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "getPonderAmount",
      args: [shares],
    });
  }

  async getSharesAmount(amount: bigint): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "getSharesAmount",
      args: [amount],
    });
  }

  // Write Methods
  async enter(amount: bigint): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "enter",
      args: [amount],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async leave(shares: bigint): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "leave",
      args: [shares],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async rebase(): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "rebase",
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }
}

export type PonderStaking = Staking;