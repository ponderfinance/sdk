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
    factory: "0xB8CBD6AbC91Cd1c3873F619ac43EC76C2C566F2B",
    router: "0xd0B42867F3104b01b38AB486af026daf56D2e5Dc",
    masterChef: "0x1063C12D13EE0B73780aD3bc84a8E24AbB76cb29",
    launcher: "0x51d8025de7b901744cA4d8e3620Ce2929d21AF69",
    oracle: "0x6290f8C6E54e8DFB28b3BA79b5e8A93F694471f5",
    kkubUnwrapper: "0x45EfA905Db5931aE1181b0963Fd8d9514FBb4132",
    ponderToken: "0xfCf1899E63De93dE288379A264A19003c526a9c5",
    staking: "0x308BB483252C99C2b8f32FA64c4DB59203E1860C",
    feeDistributor: "0x611854770978637Efa655a7BE863e1954F3eb701"

  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
