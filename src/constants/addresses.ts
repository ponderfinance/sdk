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
    factory: "0x9f9F5F722F5AeCf8e0968b4bC4ff641660e2A9ac",
    router: "0x8F3eD06ca173c09B175cf164e991Bc6325a8F298",
    masterChef: "0x95c491a4C1AE977Ed778CF22042B5050Dc1D9988",
    launcher: "0xfAe8bf1385A1c8C603730dA5c326B17C392Ad51E",
    oracle: "0xae5c8eDE1E9Db00419925eE675257a31266a6022",
    kkubUnwrapper: "0xDb5cCF0449Fff51603D2aa69fa3F19be94262858",
    ponderToken: "0xA3f5c38D0C1F2D65381562a66F6C8391cecfa549",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
