import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { type Chain } from "viem/chains";
import { feedistributorAbi } from "@ponderfinance/dex";
import { type SupportedChainId } from "@/constants/chains";
import { getChainFromId } from "@/constants/chains";
import { PONDER_ADDRESSES } from "@/constants/addresses";

export class FeeDistributor {
  public readonly chainId: SupportedChainId;
  public readonly address: Address;
  public readonly chain: Chain;
  public readonly abi = feedistributorAbi;
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;

  constructor(
      chainId: SupportedChainId,
      publicClient: PublicClient,
      walletClient?: WalletClient
  ) {
    this.chainId = chainId;
    this.chain = getChainFromId(chainId);
    this.address = PONDER_ADDRESSES[chainId].feeDistributor;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  // Read Methods
  async minimumAmount(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "minimumAmount",
    });
    return result as bigint;
  }

  async lastDistributionTimestamp(): Promise<bigint> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "lastDistributionTimestamp",
    });
    return result as bigint;
  }

  async owner(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "owner",
    });
    return result as Address;
  }

  async pendingOwner(): Promise<Address> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: this.abi,
      functionName: "pendingOwner",
    });
    return result as Address;
  }

  // Write Methods
  async distribute(): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "distribute",
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async distributePairFees(pairs: Address[]): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "distributePairFees",
      args: [pairs],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async convertFees(token: Address): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "convertFees",
      args: [token],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async collectFeesFromPair(pair: Address): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "collectFeesFromPair",
      args: [pair],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async emergencyTokenRecover(
      token: Address,
      to: Address,
      amount: bigint
  ): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "emergencyTokenRecover",
      args: [token, to, amount],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async transferOwnership(newOwner: Address): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "transferOwnership",
      args: [newOwner],
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async acceptOwnership(): Promise<Hash> {
    if (!this.walletClient?.account) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: this.abi,
      functionName: "acceptOwnership",
      account: this.walletClient.account.address,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }
}

export type PonderFeeDistributor = FeeDistributor;
