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
    factory: "0x4794Da996f03d561490476c643f92C26FF137321",
    router: "0x464CdA4df1A0Ea3FD588eCf5243d60353ea46247",
    masterChef: "0x8aC23dd4eF04eF44fB26997b7D58Cd989F2B5B8F",
    launcher: "0x785bDF2DBD2ccdA7fC0EFe64919aaEF34f28164A",
    oracle: "0x7896f302284ffB0cB54dB137e908fCFcF754d38d",
    kkubUnwrapper: "0xC89A5FD6C2931f709E481760b1977e725103E5c6",
    ponderToken: "0x49d233e6A933944f6c5DD5dd9d770018dAa2B368",
    staking: "0xEBA7B2733645b526095e03C94DAc1cafeE6bC3c4",
    feeDistributor: "0x74180B49AF4Fac187562d2C7D890AcF0D8064266",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
