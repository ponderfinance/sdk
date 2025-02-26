import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { type Chain } from "viem/chains";
import {
  fivefivefivelauncherAbi,
  ponderfactoryAbi,
  ponderrouterAbi,
  ponderpriceoracleAbi,
} from "@ponderfinance/dex";
import { type SupportedChainId } from "@/constants/chains";
import { getChainFromId } from "@/constants/chains";
import { PONDER_ADDRESSES } from "@/constants/addresses";

export interface LaunchInfo {
  tokenAddress: Address;
  name: string;
  symbol: string;
  imageURI: string;
  totalRaised: bigint;
  launched: boolean;
  creator: Address;
  lpUnlockTime: bigint;
  tokenPrice: bigint;
  tokensForSale: bigint;
  tokensSold: bigint;
  ponderRequired: bigint;
  ponderCollected: bigint;
}

export interface SaleInfo {
  tokenPrice: bigint;
  tokensForSale: bigint;
  tokensSold: bigint;
  totalRaised: bigint;
  launched: boolean;
  remainingTokens: bigint;
}

export interface CreateLaunchParams {
  name: string;
  symbol: string;
  imageURI: string;
}

export interface PonderMetrics {
  lpAllocation: bigint; // 50% to launch token/PONDER LP
  protocolLPAllocation: bigint; // 30% to PONDER/KUB LP
  burnAmount: bigint; // 20% burned
  requiredAmount: bigint; // Total PONDER needed
}

interface PoolInfo {
  memeKubPair: `0x${string}`;
  memePonderPair: `0x${string}`;
  hasSecondaryPool: boolean;
}

interface ContributionInfo {
  kubCollected: bigint;
  ponderCollected: bigint;
  ponderValueCollected: bigint;
  totalValue: bigint;
}

export class FiveFiveFiveLauncher {
  public readonly chainId: SupportedChainId;
  public readonly address: Address;
  public readonly chain: Chain;
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;

  // Protocol constants from contract
  public readonly TARGET_RAISE = 5555n * 10n ** 18n; // 5,555 KUB
  public readonly TOTAL_SUPPLY = 555_555_555n * 10n ** 18n; // 555,555,555 tokens
  public readonly LP_ALLOCATION = 10n; // 10% of launch tokens for LP
  public readonly CREATOR_ALLOCATION = 10n; // 10% to creator
  public readonly CONTRIBUTOR_ALLOCATION = 80n; // 80% for sale
  public readonly LP_LOCK_PERIOD = 180n * 24n * 60n * 60n; // 180 days in seconds

  // PONDER distribution ratios
  public readonly PONDER_LP_ALLOCATION = 50n; // 50% to launch token/PONDER LP
  public readonly PONDER_PROTOCOL_LP = 30n; // 30% to PONDER/KUB LP
  public readonly PONDER_BURN = 20n; // 20% burned

  public readonly BASIS_POINTS = 10000n;
  public readonly KUB_TO_MEME_KUB_LP = 6000n;
  public readonly KUB_TO_MEME_PONDER_LP = 2000n;
  public readonly KUB_TO_PONDER_KUB_LP = 2000n;
  public readonly PONDER_TO_BURN = 2000n;
  public readonly PONDER_TO_MEME_PONDER = 8000n;
  public readonly PRICE_STALENESS_THRESHOLD = 7200n;

  constructor(
    chainId: SupportedChainId,
    publicClient: PublicClient,
    walletClient?: WalletClient
  ) {
    this.chainId = chainId;
    this.chain = getChainFromId(chainId);
    this.address = PONDER_ADDRESSES[chainId].launcher;
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  // Read Methods
  async factory(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "FACTORY",
    });
  }

  async router(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "ROUTER",
    });
  }

  async owner(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "OWNER",
    });
  }

  async feeCollector(): Promise<Address> {
    return this.publicClient.readContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "FEE_COLLECTOR",
    });
  }

  async launchCount(): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "launchCount",
    });
  }

  async getLaunchInfo(launchId: bigint): Promise<LaunchInfo> {
    const info = (await this.publicClient.readContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "getLaunchInfo",
      args: [launchId],
    })) as any;

    return {
      tokenAddress: info[0],
      name: info[1],
      symbol: info[2],
      imageURI: info[3],
      totalRaised: info[4],
      launched: info[5],
      creator: info[6],
      lpUnlockTime: info[7],
      tokenPrice: info[8],
      tokensForSale: info[9],
      tokensSold: info[10],
      ponderRequired: info[11],
      ponderCollected: info[12],
    };
  }

  // Add new method for getting pool info
  async getPoolInfo(launchId: bigint): Promise<PoolInfo> {
    const [memeKubPair, memePonderPair, hasSecondaryPool] =
      (await this.publicClient.readContract({
        address: this.address,
        abi: fivefivefivelauncherAbi,
        functionName: "getPoolInfo",
        args: [launchId],
      })) as readonly [`0x${string}`, `0x${string}`, boolean];

    return {
      memeKubPair,
      memePonderPair,
      hasSecondaryPool,
    };
  }

  // Add method for getting contribution info

  async getContributionInfo(launchId: bigint): Promise<ContributionInfo> {
    const [kubCollected, ponderCollected, ponderValueCollected, totalValue] =
      (await this.publicClient.readContract({
        address: this.address,
        abi: fivefivefivelauncherAbi,
        functionName: "getContributionInfo",
        args: [launchId],
      })) as readonly [bigint, bigint, bigint, bigint];

    return {
      kubCollected,
      ponderCollected,
      ponderValueCollected,
      totalValue,
    };
  }

  async calculatePonderRequirements(): Promise<PonderMetrics> {
    const [factoryAddress, routerAddress] = await Promise.all([
      this.factory(),
      this.router(),
    ]);

    try {
      const KKUB = (await this.publicClient.readContract({
        address: routerAddress,
        abi: ponderrouterAbi,
        functionName: "KKUB",
      })) as Address;

      const ponderPair = (await this.publicClient.readContract({
        address: factoryAddress,
        abi: ponderfactoryAbi,
        functionName: "getPair",
        args: [PONDER_ADDRESSES[this.chainId].ponderToken, KKUB],
      })) as Address;

      // Use TARGET_RAISE constant from the class
      const requiredAmount = (await this.publicClient.readContract({
        address: PONDER_ADDRESSES[this.chainId].oracle,
        abi: ponderpriceoracleAbi,
        functionName: "consult",
        args: [ponderPair, KKUB, this.TARGET_RAISE, Number(15 * 60)]
      })) as bigint;

      return {
        lpAllocation: (requiredAmount * this.PONDER_LP_ALLOCATION) / 100n,
        protocolLPAllocation: (requiredAmount * this.PONDER_PROTOCOL_LP) / 100n,
        burnAmount: (requiredAmount * this.PONDER_BURN) / 100n,
        requiredAmount,
      };
    } catch (error) {
      console.error("Failed to get PONDER requirement:", error);
      // Return a default or minimum value if oracle fails
      const defaultRequired = this.TARGET_RAISE;
      return {
        lpAllocation: (defaultRequired * this.PONDER_LP_ALLOCATION) / 100n,
        protocolLPAllocation:
          (defaultRequired * this.PONDER_PROTOCOL_LP) / 100n,
        burnAmount: (defaultRequired * this.PONDER_BURN) / 100n,
        requiredAmount: defaultRequired,
      };
    }
  }
  // Write Methods
  async createLaunch(params: CreateLaunchParams): Promise<Hash> {
    if (!this.walletClient?.account?.address)
      throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "createLaunch",
      args: [
        { name: params.name, symbol: params.symbol, imageURI: params.imageURI },
      ],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  // Update method name to match contract
  async contributeKUB(launchId: bigint, amount: bigint): Promise<Hash> {
    if (!this.walletClient?.account?.address)
      throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "contributeKUB",
      args: [launchId],
      account: this.walletClient.account.address,
      chain: this.chain,
      value: amount, // Now amount is defined
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  // Add new method for PONDER contribution
  async contributePONDER(launchId: bigint, amount: bigint): Promise<Hash> {
    if (!this.walletClient?.account?.address)
      throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "contributePONDER",
      args: [launchId, amount],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }

  async withdrawLP(launchId: bigint): Promise<Hash> {
    if (!this.walletClient?.account?.address)
      throw new Error("Wallet client required");

    const { request } = await this.publicClient.simulateContract({
      address: this.address,
      abi: fivefivefivelauncherAbi,
      functionName: "withdrawLP",
      args: [launchId],
      account: this.walletClient.account.address,
      chain: this.chain,
    });

    return this.walletClient.writeContract(request as WriteContractParameters);
  }
}

export type PonderLauncher = FiveFiveFiveLauncher;
