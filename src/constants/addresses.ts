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
    factory: "0x8A33A0A9E776055C70EddcC18b734d013834f32a",
    router: "0xA1aa463a168BB2886791841dd7305a27526d87F3",
    masterChef: "0xf2146D6f1315622EbD8f8E0d53F78a1BC61885AD",
    launcher: "0x7b521Cc0d4ACcf35EFe0dEBD110468D407e9e6F9",
    oracle: "0xdA57C5d8B1d050169fc1F95483094770861d8f99",
    kkubUnwrapper: "0xf77569517479CF9006654C00e29c363F35789FD1",
    ponderToken: "0xa6980c964b43B9bAfA521f39ac5Bd084F94F59D5",
    staking: "0x6dE7F4e380d6c0011677b30746E97Cca25be9ca3",
    feeDistributor: "0xD835Af9AE39a5A7246FD63399b30afe42E6D8d6C",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
