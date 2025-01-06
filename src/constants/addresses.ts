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
    factory: "0xf51341Dc6CF4cf5D1833432e56F3722032751E94",
    router: "0x02175d8906db58BD4cCc2b288f3eF8cFaC324242",
    masterChef: "0xAB3F7E630746FB3d145373b8BC1bF1a0C114D701",
    launcher: "0x6a738eB41e38A46F74Bcd395405429aF8528D421",
    oracle: "0x9bF6898a97e13a83F1dB40c373A099FD3dCC6762",
    kkubUnwrapper: "0x09C7433E4cA9E57d5169e03324f3a553b60163b0",
    ponderToken: "0xbBf29f5b04d2469E9ebB12caBa0D902Ae59699Ff",
    staking: "0x5D83925Db026782308d8Ec3A374108eFBe3df676",
    feeDistributor: "0x9a2daF6BB52BE938eB3770E40bE67ef0D6c75ef3",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
