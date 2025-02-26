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
    factory: "0x407F6662FE810fF50fc8E9F4b6DFDe760892102a",
    router: "0x49AD2cf5c942e3E2E74C8A755fAF182E10643E73",
    masterChef: "0xecb8EEfC84b734b0B6313bB03F75cD7c416a6796",
    launcher: "0x433E237d9A8BCff9AAd44F8a155DF15B8425Fab1",
    oracle: "0xdB8a9eDd114a7c8EC9811B4178C1c3279dE3ad33",
    kkubUnwrapper: "0x2Da1bC2AE2F97E6d38050d1c750A646dd85fDDBE",
    ponderToken: "0xFB0b0CBFd8b2750e5a8db76aeCEA327DCc2687D6",
    staking: "0xf80733920A78B2f6b44B3095bC93D3f8b448a94C",
    feeDistributor: "0x445A788cc583cB9Eb61283C5487037B96c15d9e3",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
