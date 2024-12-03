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
    factory: "0x8a2c81794dcC22c1C612a497B5D89Fe9C3cDB017",
    router: "0x1cf2e04374bC7b58CDCBCaa53Af1d58926479B40",
    masterChef: "0x1abe610C3cCc7Ad9ec0EbC0800FBB72d64bE3AFB",
    launcher: "0x680A84eaC8eBAE8dA2024D826a6bBe5Ccb7eDc4E",
    oracle: "0xb0B5ce7360541650833fb9E55bcB70BFC07A3D10",
    kkubUnwrapper: "0x04E1194d2298cA823c16D3A702af290c9c4dc3e2",
    ponderToken: "0x3b9656251F82a40118E08210823Fff1A97F60C2D",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0x1de8A5c87d421f53eE4ae398cc766e62E88e9518",
} as const;

// mainnet - 0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5
