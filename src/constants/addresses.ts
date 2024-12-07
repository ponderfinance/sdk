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
    factory: "0x15fb02586ef8be84b5C98a0cC76CBC22071E2B6b",
    router: "0xee41fB4Cb99Bd1a45e2234966019d3cB491a5550",
    masterChef: "0x0050CB3a18D8606aC43AC9c8ef1A2feDDC5cBaa8",
    launcher: "0xCa096622DBa5652332D242B36367c0F16B2805b8",
    oracle: "0x1c4f6D74Dd9D5Ae0C89E2d8A3Cf63e085893D9C9",
    kkubUnwrapper: "0xB649125e340609921D9aB7d438467b53AFcfA8fE",
    ponderToken: "0xBe5977Aa8fEcd5A20365498e4B5a5D68E7165057",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0x1de8A5c87d421f53eE4ae398cc766e62E88e9518",
} as const;

// mainnet - 0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5
