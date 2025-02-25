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
    factory: "0xba09B192E033E1B6882Ec62F0107491F985d4865",
    router: "0x3d14eeBF289f83e05EEDF547b36d1Ac6B0EC0f8a",
    masterChef: "0x32E4a931BB2EF918621e1e8aBc5B0321ED39b109",
    launcher: "0x620cD4cBa6e91d2264Aa749885723A9fd6873522",
    oracle: "0xA0D965Ef31198707796F833802b71E5041781086",
    kkubUnwrapper: "0xaA48188D8E2102055a28bADA7DEBfB05b99BF028",
    ponderToken: "0x30E10c8DcdF21A97C8f95195FCFe52391025c773",
    staking: "0x82b212c166f8940985474932f11384615b2Ae7b7",
    feeDistributor: "0xAc7acE8Ee9d740D51D7fE0C54eAAf0aC2803516b",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
