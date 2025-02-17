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
    factory: "0x07Ac7Fb45a48699c9f3eb1bd02C9e03F21e3c4eD",
    router: "0x2122754635236E6191BfA54241eC3f41728740F6",
    masterChef: "0xa129044Ad5A38BD173BF11a57f8ceE271a606250",
    launcher: "0xCC1687173299804Abeb7267686a970D6Bf4E04a3",
    oracle: "0x0Ba4AA312F8D708d9ae4f456e0bdFde0141080c9",
    kkubUnwrapper: "0x38B756c8925af4F707559aA638006e819a66619b",
    ponderToken: "0xcFfC775E261d26595C9ec17Ad36cc2783785DD84",
    staking: "0x19a6595012A7Cd65D851198764852EaC170F4B27",
    feeDistributor: "0x55C5152DbC01788FcF9B09576f46AD8Dca4207e1",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
