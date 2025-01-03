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
    factory: "0xF4EEd61c190faEFf321fDF7A8d8a952F5d45159E",
    router: "0x6928e375215DA29f43D450791A6cBC91eefC26da",
    masterChef: "0x94959f5C8aa277D8D6c2e291B02453e3bE2da017",
    launcher: "0x9cBd3911f9D68f36aFe49a46e233f0783e424214",
    oracle: "0xe0443a99df6c939874D98Ba936dfB4416A38d646",
    kkubUnwrapper: "0x12C1c7f49C97ed5B7ac6D022a6F678f6f64200FE",
    ponderToken: "0xFccD21D36D2C06837C8e43db3169592BB042E256",
    staking: "0x2F19Ff0cDeE7987A4c95f095c8DAE16959Ea9883",
    feeDistributor: "0x79Eb1F93608eDBca73735BE94F731339A27dB5c2",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
