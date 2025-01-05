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
    factory: "0xEE9986f7fe032eA7b548cb72647ac9f48d2C65b6",
    router: "0x91A3c86Ca30A389353121fF022c04d69F9b163AF",
    masterChef: "0x034519bfBDAdA5DEFFc4111B9494ea0202a7e479",
    launcher: "0x8ebDCB2cB008923a8f9C8Ef926B9eC980DE751F4",
    oracle: "0x79c4320F86F519f9a21422bc123cBF3015C67DcD",
    kkubUnwrapper: "0xd8Ef4C188D875e336Dd339Dd21C7F27381ECfe6a",
    ponderToken: "0x986d56796f3B335B7564097fa1A7A31AEb7B3928",
    staking: "0x92aDFeE704D67baD9dd56c857Dadbc0b2BD2B689",
    feeDistributor: "0x535a3bce8e5eA197BE2976744003CBc05c0DBB31",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
