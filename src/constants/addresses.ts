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
    factory: "0x6b0f773214c02bc6b605e2BE7Aa37a1CcDFf5519",
    router: "0xBF3CA9AfC8ACa568193A9A5A2561128246a74ac7",
    masterChef: "0xd287Bd07C7d69b6f46e07cC37c36acee010a2C26",
    launcher: "0xf0f5EA8D903bb3E84B3E1382458e18c54E6DE5C0",
    oracle: "0x8CAa3e6E2cdA9e3904904eFd6809f13FBe29Edf6",
    kkubUnwrapper: "0x93176b9fB420f88f9CE8248BD9957E239De504A2",
    ponderToken: "0x074282BB91529743C66D5AF429dF1ea1BB0519a0",
    staking: "0x003a0cf7DC6AF333a87C8AC1eeE54bB62fDBebAF",
    feeDistributor: "0x86bF9B1f691a8626922F3551a65737b97031Ba59"

  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
