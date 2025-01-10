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
    factory: "0x5be12FBB04c0d68c152116F585924685D7543380",
    router: "0xd415AC7F0f10E69fc73619E51b35E92b023Ee9DD",
    masterChef: "0x5348c74e61F6743df18D115307Ef613489b4aB61",
    launcher: "0x814D44db0CC2571e5ABAC551690Ba5B61522f338",
    oracle: "0x898746D578CD783156e14df889Ea240135C385Bb",
    kkubUnwrapper: "0x0C3324973d47D51967DD2ba917c89a91232433CF",
    ponderToken: "0x9c3ae329a6BcCd5d18c45a80d01f8f149a73D3a9",
    staking: "0xbE924aDDa8057FfAB2a9839302CE230Aa54Fe205",
    feeDistributor: "0x0199a9a083183ACd0b4e9059D82A1dE819f550C6",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
