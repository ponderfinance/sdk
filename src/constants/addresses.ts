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
}

// Contract addresses for each supported chain
export const PONDER_ADDRESSES: Record<ChainId, PonderAddresses> = {
  25925: {
    factory: "0x183F545eF4a68a68a07FE698a1eaF3F8F0607f7f",
    router: "0x6cD7A27eE343a044A6C88F05B74Ae30E102a26eF",
    masterChef: "0x24c7BCBd5928b9Fec89795F260AaE1e789A71ce2",
    launcher: "0x71828EB7E171E148269a13d0f618ADEbB4d3F3cC",
    oracle: "0x8eb60ef97A4f7801faB1eD08f40B33eDCaF8ed0F",
    kkubUnwrapper: "0xd567c548766683ff7280dA8242fEa6164E062196",
    ponderToken: "0xbD54F03ab408a18Ae9EfbE0ae4662Ecd36947937",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
