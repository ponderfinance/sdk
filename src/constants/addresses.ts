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
    factory: "0x93540c13fd877B8933f6Fd27d353F3f2510A154F",
    router: "0xB50AaF1Ca8469eb7E257dd4E5B9567C16741454C",
    masterChef: "0x6d23711ec2399Dd3c5AA941ED0107adACA939Db5",
    launcher: "0xA409432fa99f82631e380a445bdb550aE85d269B",
    oracle: "0x103706d7A1A47729f1951da9812A116951c88e85",
    kkubUnwrapper: "0x5877964888328F26C76FD32542852F24005C5D9C",
    ponderToken: "0x14F3841761e31900332827CbD1977f3132ECC98a",
    staking: "0x572A8a67e530e6af716919c69B9B5a1c731B445e",
    feeDistributor: "0x5A03Ee21fD9095B82f2F40995c0accD2578ee16F",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
