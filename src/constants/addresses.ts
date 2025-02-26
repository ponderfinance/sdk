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
    factory: "0x5435d2df927c8f46Ef4B03335845E25cd5FA0a99",
    router: "0x3A409cdF2A2cED6e430F4C683358F33D385AC755",
    masterChef: "0x8aa4Fee4eb62CeC98905372683efd79069b47926",
    launcher: "0xBc1173af98Bb6718F51dD756eA89dCF3C03d7f23",
    oracle: "0xD2E53a971E9c951369CcD1cd13f9D5eb237b0F51",
    kkubUnwrapper: "0x7ACbD741967D41912977eC305b460120E99a815F",
    ponderToken: "0x53Fc2AD8F36BCeFE7a933E1237B45c7A70AD80a5",
    staking: "0x660FA3948d97111c0F5044d4EBCD39C09EF5dF84",
    feeDistributor: "0x75DEe461ceb26e43585f89E5D0fDc94cad20f1Dc",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
