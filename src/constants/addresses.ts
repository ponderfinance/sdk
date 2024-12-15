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
    factory: "0x8bbF4D401CEf727fE6f9481d921e4a95E74e4d5A",
    router: "0x423F20A48Acb0DA3fCeE26EeF478bFbDA81f342A",
    masterChef: "0x03BcEb600169a54994aee2102CCB8A2BFcB0f777",
    launcher: "0x508e58280e8F6F569fB76abccA4D9d0C2628eCCF",
    oracle: "0x5F055c897d554ae343cF2687C85779Df6F26eA5c",
    kkubUnwrapper: "0xEda13a68B5dd1390D0820578241363f03CA57031",
    ponderToken: "0xd12f107F292f6A169EEbB78dD21b0D1C30DB1832",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
