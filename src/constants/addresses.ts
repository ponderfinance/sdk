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
    factory: "0xa3219c80961F462920e9aB88606153782a3C4e39",
    router: "0x6aAb92d538Ab1036bc433dD1f5CE3aa749486E59",
    masterChef: "0xc952914Ae9f69371581B1d6CFD906149e5DAbE32",
    launcher: "0xE67202BFf8c2fBCd8f28B3c51894d0F30172159e",
    oracle: "0xAEba2552FD46f31272ad8FcFe442638A41DDA947",
    kkubUnwrapper: "0xDd6c16abE063D7ED292Eb04C8540F916d116D815",
    ponderToken: "0xBC92F16F6763c5813633b343407C2e1f18Af35Ec",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
