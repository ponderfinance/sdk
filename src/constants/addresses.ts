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
    factory: "0x9285eca11bfBb2Ef29fc746Fee36Aa71AFF89708",
    router: "0xbb5eb065862AD7279D8ca2bb383c298a86aEC5cA",
    masterChef: "0x9e69fBa912900739Ae48D742BB1Ffc5ff3FfBcF0",
    launcher: "0x092E2922Cd4519cf5B53C380A2ABFD62883fD1CE",
    oracle: "0xad3cA3a10a72310936D97dD673c4e9cE97D5B7b4",
    kkubUnwrapper: "0x19b49138B65883d694746eA2Ca8149Aa79eb319A",
    ponderToken: "0x66Ecc3cbFAb2c9Eb8bFe91b4fE65F57129F4d164",
    staking: "0x6e0559a71760CBd2F9d31aC0D4681fa49fa65b52",
    feeDistributor: "0xE6bF34591D9e60d4aB5833fB885206D6967f811e",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
