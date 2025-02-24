import { type Address } from "viem";
import { type ChainId } from "@/types/common";

export interface PonderAddresses {
  factory: Address;
  router: Address;
  masterChef: Address;
  launcher: Address;
  oracle: Address;
  kkubUnwrapper: Address;
  ponderToken: Address;
  staking: Address;
  feeDistributor: Address;
}

import { type SupportedChainId } from "./chains";

interface BridgeAddresses {
  bridge: `0x${string}`;
}

export const BRIDGE_ADDRESSES: Record<SupportedChainId, BridgeAddresses> = {
  1: {
    bridge: "0x89943b2499d678fb2d382c66b7baed00b732e753" as `0x${string}`,
  },
  96: {
    bridge: "0x89943b2499d678fb2d382C66b7BaeD00b732e753" as `0x${string}`,
  },
  25925: {
    bridge: "0x0000000000000000000000000000000000000000" as `0x${string}`,
  },
} as const;

// Contract addresses for each supported chain
export const PONDER_ADDRESSES: Record<ChainId, PonderAddresses> = {
  25925: {
    factory: "0x25C0257a0BCd9B2513CC418915DB3dDc952e8CDF",
    router: "0x954470777C9EACCa1Aab9057373d702bb16Be122",
    masterChef: "0xfbC42e3660D6FAdE12fea395E0b9f669168F073D",
    launcher: "0x24126A7C828f2EdAcbEdd8bdd4913b3af9a0cF90",
    oracle: "0x9183572473F22dCF75fd1C5FEff09dbA76043238",
    kkubUnwrapper: "0xDB7110380AC098a195Fa59e6F8d14DCb88c580c1",
    ponderToken: "0xe456B9B279e159842a91375e382804F7980e8Aa7",
    staking: "0x9dA057261A26AC41c3F5a7972FC0e35D438251af",
    feeDistributor: "0xD8A3642B027498fa710391e5cDc859FE6E526761",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
