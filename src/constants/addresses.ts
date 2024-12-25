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
    factory: "0xd6B234Fa9eC32ADB15362A1a0C739e71d902A712",
    router: "0xf2DcB6A37B8697Eb4B5f19E44897a7745ca2CA2a",
    masterChef: "0x096cb97f8CB98CB5DFB2206A5ca86DfAbC1c45B4",
    launcher: "0xD32973925f645839E10012E560f573a7d1784d38",
    oracle: "0x1E0843B7629967C8f8EB3eE2E9469606926b157e",
    kkubUnwrapper: "0xDeC5c2afdd05A34712381781a4dEbDf5b4F70e94",
    ponderToken: "0x8BeF84489bCafbFF56d3E6877199a58877a9f260",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
