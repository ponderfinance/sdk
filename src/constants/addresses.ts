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
    factory: "0x7f2CA4Cd1c71b0fB55Ad637306DA4A62d6a943E1",
    router: "0x9a3AAd24767DF4cDF0B48508cc8C35e06860a135",
    masterChef: "0x799e263Ae307a9C4912aFc529e6F400FC4308466",
    launcher: "0xc11562e2ceB1F4E11368789f19Cc67336935A2cA",
    oracle: "0xf28635dd13B3e4842744e5a9A4d649ad7D1BBa1A",
    kkubUnwrapper: "0x4d3fA4600f5Ad08BeD357002829B4daFEFF04f8d",
    ponderToken: "0x7D7589f8AD271fB7fDEE6C3a601231D2693C5099",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
