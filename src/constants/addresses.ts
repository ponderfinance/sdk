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
    factory: "0x0fD3F926b3a0BF334cD70cD97B53CCcAdc839350",
    router: "0x3c4399a996097DA414b0c29582CBbc72Af4b231c",
    masterChef: "0xEcb8FE78D583fD70eCfd77C3348128652cBb9e8B",
    launcher: "0xBa33E4A1776c69324b559236cF45166974a77531",
    oracle: "0xBF4E3393F7DDE2cf80C87241249B9721568Adde3",
    kkubUnwrapper: "0x1f34EaC1782D14F16bE42F3102b573F5DF9e9Fa1",
    ponderToken: "0x223f1397e9D1250C291a568E2F82601c62c14560",
    staking: "0x646Cd00143c4a370056437dF0E408052Aa4a792e",
    feeDistributor: "0x47013A0de06e44DB54AD9666684121a13051eA35",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
