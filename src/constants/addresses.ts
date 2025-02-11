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
    factory: "0xAE0288F60E91f345C609188a3AD91b05c32fB054",
    router: "0x4c3550e8AabD5Cd8182b9CE97dD26d87DDDee255",
    masterChef: "0xdbe0AC1c77c1A24295F0d545d9642Bd204F57301",
    launcher: "0xbdb6aDCB59bfb49A543ea50692e4D183b24F37EC",
    oracle: "0x187732d5fde32780e2770186A405205F70b49057",
    kkubUnwrapper: "0xFBAe128c6848C8e786e89aF4FeAF1f700cF1A7fA",
    ponderToken: "0x9661CfaEa26227F72b160c1B8c3baa9DF12d4f62",
    staking: "0xf3E99591EAaa4024c5F97Ce2b80C618255b6FAf5",
    feeDistributor: "0x243BFbA562d7C2a6987aedcd769C88Dd0992f54d",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
