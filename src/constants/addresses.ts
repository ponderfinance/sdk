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
    factory: "0x6a8544937Bf6b571b30f3D8598031820BF23b473",
    router: "0x1e49DCB960A1bd190E920B86cc555387c087a8cD",
    masterChef: "0x65F62f97ea6a2D5CDf0cf63111A76f06401871Db",
    launcher: "0xb877FB9458DB764c754Faa796c1E021940ea18c1",
    oracle: "0x916B8cbeBb06958d5034786c65B0CE85161b5D00",
    kkubUnwrapper: "0x34661a3428527B54F9d21A4c669240a41eDbB6A3",
    ponderToken: "0xbf4DfF8892e19E5503A0eC19915832CdE91e43Da",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
