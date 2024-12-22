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
    factory: "0x94bDD617b8859C4913e54F4f4a013CEa1DC23F55",
    router: "0xA656F7b2163FBB5b1465d904DA938D30984ed4Af",
    masterChef: "0x269dBa497E65dA4A3cC817ADD6476f5778e171F7",
    launcher: "0xf4d4fFdF189491bCD8dEBba0D79e5C25347bF3C6",
    oracle: "0xcEa8c0a96cFbf6189B16837cE6998E938C562b10",
    kkubUnwrapper: "0x374F741d9e53091D8ADaA43844ac394aDb84180A",
    ponderToken: "0x5dC2826fEaEd6B1466525a7DC7081ecA201b66E7",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
