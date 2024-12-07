import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { type Chain } from "viem/chains";
import { type SupportedChainId, getChainFromId } from "@/constants/chains";

export class Pondertoken {
  public readonly chainId: SupportedChainId;
  public readonly address: Address;
  public readonly chain: Chain;
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;

  // Contract constants from PonderToken.sol
  public readonly MAXIMUM_SUPPLY = 1_000_000_000n * 10n ** 18n; // 1 billion PONDER
  public readonly MINTING_END = 4n * 365n * 24n * 60n * 60n; // 4 years in seconds
  public readonly TEAM_ALLOCATION = 150_000_000n * 10n ** 18n; // 15%
  public readonly VESTING_DURATION = 365n * 24n * 60n * 60n; // 1 year

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

  // Standard ERC20 Read Methods
  async name(): Promise<string> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "name",
          outputs: [{ internalType: "string", name: "", type: "string" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "name",
    });
  }

  async symbol(): Promise<string> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "symbol",
          outputs: [{ internalType: "string", name: "", type: "string" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "symbol",
    });
  }

  async decimals(): Promise<number> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "decimals",
          outputs: [{ internalType: "uint8", name: "", type: "uint8" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "decimals",
    });
  }

  async totalSupply(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "totalSupply",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "totalSupply",
    });
  }

  async balanceOf(account: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "account", type: "address" },
          ],
          name: "balanceOf",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "balanceOf",
      args: [account],
    });
  }

  async allowance(owner: Address, spender: Address): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "owner", type: "address" },
            { internalType: "address", name: "spender", type: "address" },
          ],
          name: "allowance",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "allowance",
      args: [owner, spender],
    });
  }

  // PonderToken Specific Read Methods
  async launcher(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "launcher",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "launcher",
    });
  }

  async totalBurned(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "totalBurned",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "totalBurned",
    });
  }

  async minter(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "minter",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "minter",
    });
  }

  async deploymentTime(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "deploymentTime",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "deploymentTime",
    });
  }

  async owner(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "owner",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "owner",
    });
  }

  async pendingOwner(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "pendingOwner",
          outputs: [{ internalType: "address", name: "", type: "address" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "pendingOwner",
    });
  }

  async teamTokensClaimed(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "teamTokensClaimed",
          outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
          stateMutability: "view",
          type: "function",
        },
      ],
      functionName: "teamTokensClaimed",
    });
  }

  // Write Methods
  async approve(spender: Address, amount: bigint): Promise<Hash> {
    if (!this.walletClient?.account?.address) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "spender", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          name: "approve",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "approve",
      args: [spender, amount],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async transfer(to: Address, amount: bigint): Promise<Hash> {
    if (!this.walletClient?.account?.address) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          name: "transfer",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "transfer",
      args: [to, amount],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async transferFrom(
    from: Address,
    to: Address,
    amount: bigint
  ): Promise<Hash> {
    if (!this.walletClient?.account?.address) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: [
        {
          inputs: [
            { internalType: "address", name: "from", type: "address" },
            { internalType: "address", name: "to", type: "address" },
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          name: "transferFrom",
          outputs: [{ internalType: "bool", name: "", type: "bool" }],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "transferFrom",
      args: [from, to, amount],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async burn(amount: bigint): Promise<Hash> {
    if (!this.walletClient?.account?.address) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: [
        {
          inputs: [
            { internalType: "uint256", name: "amount", type: "uint256" },
          ],
          name: "burn",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "burn",
      args: [amount],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async claimTeamTokens(): Promise<Hash> {
    if (!this.walletClient?.account?.address) throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: [
        {
          inputs: [],
          name: "claimTeamTokens",
          outputs: [],
          stateMutability: "nonpayable",
          type: "function",
        },
      ],
      functionName: "claimTeamTokens",
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }
}

export type PonderToken = Pondertoken;
