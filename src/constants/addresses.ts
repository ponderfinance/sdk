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
    factory: "0xc45128D1CF63546D98e3dd28e32572E6e000283e",
    router: "0xcfd947ed2df2EFc2a3ae84C315782506ebbfC493",
    masterChef: "0xD7FbDef9ca4d89f580714249Cf57E6BBA61Eea89",
    launcher: "0xF0a25994A124FbC3381ebbbFa0f9184B36F6EEb9",
    oracle: "0x814dFD5ECd502fbb11326224E6634c85a0fB575C",
    kkubUnwrapper: "0x60e004ad624A93B16DD3Cf885E178D418941542f",
    ponderToken: "0x0E0851B73F9c1C550Bfa2f1f4E857da916aFB149",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
