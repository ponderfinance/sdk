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
    factory: "0xe4b1ae98b1aacb15A635FD38f7Ea0890075241bC",
    router: "0xaDA797DC870a9AA771E8Ed767837821F159f2312",
    masterChef: "0xbc2c290737E51C68Da2A7F39e6D3178Cf1388734",
    launcher: "0x18e9cCB2e39faABE5C9E58Ce1C1f957f4BB03417",
    oracle: "0x1240580515A6D4055F528F61074876F632006208",
    kkubUnwrapper: "0xfB9a3dBe054B6c3C9c8B38ccDF35F369c05459fA",
    ponderToken: "0x394c708B7Bd536C9961EA1748389F5bBDE3b480D",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
