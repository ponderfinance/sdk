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
    factory: "0xB333b0B027968fAEdb678c312ea2E48cFEb7430d",
    router: "0x09bA963E1Afc4eE1B12ed7556Ec21cA515bd8311",
    masterChef: "0x55183FED801FF57F37D5f1f65508298Ec6B2BD08",
    launcher: "0x130BF578B94Eaf0e000820b6dAA9cE125Ef886CA",
    oracle: "0xec6dA6bAa2e0D6eEc978e29f563b47aeB85C1BA5",
    kkubUnwrapper: "0xf51F88D7f00dfE1174cD30FB4a11faD9E49ba2cB",
    ponderToken: "0xb94082Ab951dc01566d030e8F734cEEee6C10163",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
