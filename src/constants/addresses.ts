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
    factory: "0x4a0aB14A75eB5F1E07aC8467DCE811687cFa35B3",
    router: "0xAD17b142bD4AcFB4441e6586B9aBdfD40d1C2a29",
    masterChef: "0x65e358F9C9e3B9F0832f001cC4Cb058931fC7D7c",
    launcher: "0x0B83ecDBB4d52fb8661c0374eB20021Ef59Bfc95",
    oracle: "0xce1fdA5AC44f495321C163103B11916933851B83",
    kkubUnwrapper: "0x4B3C50378221080f1DA0768E7b848987c0A7412F",
    ponderToken: "0x33C9B02596d7b1CB4066cC2CeEdd37f3A7c7Aa07",
    staking: "0x0f9b00Cc79dFAAF3818d6219246033b4951Fb584",
    feeDistributor: "0xAf7d796A6589369AB56c423a1086CB604f8b7EFD",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
