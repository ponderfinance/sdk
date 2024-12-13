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
    factory: "0x5F4A97D58EC1BE9b1c3E7e12fa0759709538EE60",
    router: "0xe971a0b66aa8876aC83674C6ece070093c5eEE90",
    masterChef: "0x2e68f13a1600c6d39e8386Dba13d2e56B81946BC",
    launcher: "0x6d95369Cb8Fa8564A161a3c3c4F56F2Fa83DbB98",
    oracle: "0x403D62dC2d629e49700494b4a0BD148bC1ce3E77",
    kkubUnwrapper: "0x5a71b5f16cB04eb968F7998B32f9592842f98C85",
    ponderToken: "0xF5EFfe82d0B0D950D2730D5D31CAbC047b8d81f3",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
