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
}

// Contract addresses for each supported chain
export const PONDER_ADDRESSES: Record<ChainId, PonderAddresses> = {
  25925: {
    factory: "0x33AE1320627196289207906Ed1E90417E22dF5Ca",
    router: "0x4a77e889D0522166f52F0751537651dEf9Cc2861",
    masterChef: "0x36CE2214D088B1a13971b7C1A6f788F399b11Fac",
    launcher: "0xFEf3d1348eCB06e93b0F5747548c96f0B5538fc1",
    oracle: "0xA103CDdE10b5c61bB50D3162311e5Af3C31a82A3",
    kkubUnwrapper: "0xE59E5E261B463e07a52264D85D11e38A73fF9d75",
    ponderToken: "0x6965390e80681768e359bC43C0f9c9344a1a702A",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5"
} as const;
