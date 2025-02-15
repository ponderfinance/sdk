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

// Contract addresses for each supported chain
export const PONDER_ADDRESSES: Record<ChainId, PonderAddresses> = {
  25925: {
    factory: "0x452c6CD78B5E1acA92359564a347Dc4F9647a349",
    router: "0x9858CF0cf76DA8fB38697242F1A1e62047c862D1",
    masterChef: "0x3E602864c1EFe22F7616b9bD46887d31459615F8",
    launcher: "0x7C1524D58E752f1646E04b27E05f54F3155a0630",
    oracle: "0xEd56450Eeb7036F725920c935617B33669c288EF",
    kkubUnwrapper: "0x684259DF743D61e45879f0b871CaB18C33A0F8A5",
    ponderToken: "0x54e75E45842855Df24d96908a229575cD101b914",
    staking: "0xaaF174930E9723CFeb4003186B6c51A26C64433E",
    feeDistributor: "0xC191A1BeC5Eacb02F58f6559Ac44Cbbef2A49F40",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
