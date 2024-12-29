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
    factory: "0x5279D03fC67094feffc4622C3823d5252190977B",
    router: "0xEa57ec26eEDd1F34859570044709E1e9EC918e60",
    masterChef: "0xda2C0Bc56776DCE97fa51e864c7b59A4186682cD",
    launcher: "0x325a5E3C507bC5fb2efe6C5Fb6a6C3283c1b274f",
    oracle: "0x8fffd76905BCFbf00a35F7cdEd7fd791993382Db",
    kkubUnwrapper: "0xf5FBf151373cc48e291d318c3C0b3a0125462811",
    ponderToken: "0x174859cF3Baef0d65F854398CD949447eccc5b5f",
    staking: "0xDf8B7Df70EDB112B1dAaF9029283218011502714",
    feeDistributor: "0xbFb28F44b82686a5E4C48e7f77441e8728b6Aa9A"

  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
