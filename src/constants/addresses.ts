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
    factory: "0x6de806e7D5aabb7c71Ed4b19829AC7F68F675B76",
    router: "0xdCE4Ca4aB5Fb849AbE8A472e3F772ecCb64dab1A",
    masterChef: "0x2c44043981D5e6B3F88A24a21545D2619b57Ee92",
    launcher: "0x54CeC363bd621ffE78aB70acC017b284fcFf4637",
    oracle: "0xdC6C5C5c1C46fA25E833ae774B34235AA2EeD004",
    kkubUnwrapper: "0xe0f5afEb21B47Fe5BDE413C2fe8Eb80D86AE17D1",
    ponderToken: "0x451304289a283a2E4559F5EC61D4efeFd0314E4f",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
