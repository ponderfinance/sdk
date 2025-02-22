import {
  type PublicClient,
  type WalletClient,
  type Address,
  type Hash,
  type WriteContractParameters,
} from "viem";
import { type Chain } from "viem/chains";
import { BRIDGE_ABI } from "../abis";
import { getChainFromId } from "@/constants/chains";
import bridgeAbi from "@/abis/bridge";

export enum DEST_TOKEN_TYPE {
  INVALID_0,
  NATIVE,
  ERC20,
  NATIVE_ERC20,
}

export enum FEE_TYPE {
  NO_FEE,
  FIX,
  PERCENTAGE,
}

export enum TOKEN_STRATEGY {
  LOCK,
  BURN,
}

export type BridgeInfo = {
  enabled: boolean;
  token: Address;
  chainID: bigint;
  allowedDestTokenTypes: DEST_TOKEN_TYPE;
  feeReceiver: Address;
  fee: bigint;
  feeType: FEE_TYPE;
  strategy: TOKEN_STRATEGY;
  receiver: Address;
};

export type ChainIDAndAllowedDestTokenTypes = {
  chainID: bigint;
  allowedDestTokenTypes: DEST_TOKEN_TYPE;
};

export type BridgeResult = {
  hash: Hash;
  info: BridgeInfo;
  events?: {
    bridge?: {
      token: Address;
      from: Address;
      amount: bigint;
      destChainID: bigint;
      destTokenType: DEST_TOKEN_TYPE;
    };
  };
};

export interface BridgeParams {
  token: Address;
  amount: bigint;
  destChainID: bigint;
  destTokenType: DEST_TOKEN_TYPE;
}

export interface NativeBridgeParams {
  destChainID: bigint;
  destTokenType: DEST_TOKEN_TYPE;
}

export class Bridge {
  public readonly chainId: number;
  public readonly address: Address;
  public readonly chain: Chain;
  private readonly publicClient: PublicClient;
  private readonly walletClient?: WalletClient;

  constructor(
    chainId: 96 | 25925 | 1,
    address: Address,
    publicClient: PublicClient,
    walletClient?: WalletClient
  ) {
    this.chainId = chainId;
    this.address = address;
    this.chain = getChainFromId(chainId);
    this.publicClient = publicClient;
    this.walletClient = walletClient;
  }

  // Read Methods
  async getBridgeInfo(token: Address, chainId: bigint): Promise<BridgeInfo> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: bridgeAbi,
      functionName: "bridgeMap",
      args: [token, chainId],
    });

    return {
      enabled: result[0],
      token: result[1],
      chainID: result[2],
      allowedDestTokenTypes: Number(result[3]) as DEST_TOKEN_TYPE,
      feeReceiver: result[4],
      fee: result[5],
      feeType: Number(result[6]) as FEE_TYPE,
      strategy: Number(result[7]) as TOKEN_STRATEGY,
      receiver: result[8],
    };
  }
  async computeFee(
    token: Address,
    destChainId: bigint,
    amount: bigint
  ): Promise<bigint> {
    return this.publicClient.readContract({
      address: this.address,
      abi: BRIDGE_ABI,
      functionName: "computeFeeByFeeType",
      args: [token, destChainId, amount],
    });
  }

  async getDestChainIDs(
    token: Address
  ): Promise<ChainIDAndAllowedDestTokenTypes[]> {
    const result = await this.publicClient.readContract({
      address: this.address,
      abi: bridgeAbi,
      functionName: "getDestChainIDsAndAllowedTokenTypes",
      args: [token],
    });

    return result.map((item) => ({
      chainID: item.chainID,
      allowedDestTokenTypes: Number(
        item.allowedDestTokenTypes
      ) as DEST_TOKEN_TYPE,
    }));
  }

  async isPaused(): Promise<boolean> {
    return this.publicClient.readContract({
      address: this.address,
      abi: BRIDGE_ABI,
      functionName: "paused",
    });
  }

  // Write Methods
  async bridgeTokens(params: BridgeParams): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: BRIDGE_ABI,
      functionName: "bridge",
      args: [
        params.token,
        params.amount,
        params.destChainID,
        params.destTokenType,
      ],
    } as unknown as WriteContractParameters);
  }

  async bridgeNative(params: NativeBridgeParams, value: bigint): Promise<Hash> {
    if (!this.walletClient) throw new Error("Wallet client required");

    return this.walletClient.writeContract({
      chain: this.chain,
      address: this.address,
      abi: BRIDGE_ABI,
      functionName: "bridge",
      args: [params.destChainID, params.destTokenType],
      value,
    } as unknown as WriteContractParameters);
  }
}

export type PonderBridge = Bridge;
