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
    factory: "0xb0e1756EE9EaeF56b2C91B4f03340c4bF52F695A",
    router: "0x86A651bF22CAA7A5110AF4b6F731511d073714f2",
    masterChef: "0xe5DCe6C02964059CE00e73B2EafA2Ded64111d1d",
    launcher: "0xe57E0458a84c702e0ED335c43aE1e0C3FDA60679",
    oracle: "0xeB77cc286Db21c8C31F1C7cC85A8906CD86f2952",
    kkubUnwrapper: "0xaeF4C5Cfecd42f2d30f325bf4c8Fad516E09671d",
    ponderToken: "0x28505E84b3AD792eb47E1654ef3E85c3E1D59856",
    staking: "0xd23e3F5e60fA10cFdB93D6c655309A71BF1fd6F3",
    feeDistributor: "0x09a5f1f2742176Bb4F1D1662eD670901a44922FF",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
