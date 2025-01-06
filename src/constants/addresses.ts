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
    factory: "0x9EA2E906aF77559E06d8f38f9011D6f8B5d77E4F",
    router: "0xCd4bE81D8cEf1a500341dA46892a1B22Fa1Ca805",
    masterChef: "0xe129905e62e145BfB2AF748BE24D23d9117Fdf17",
    launcher: "0xA8FAc76c44E072D64f68eF7B667a23824db23F01",
    oracle: "0xB62a0E7C58De8B10Df89668f166BA702C2F6Af1c",
    kkubUnwrapper: "0x8eb74feA576fac16fc432B2f82786d090587383e",
    ponderToken: "0xC85689A776d8178e952bd0E58675d274bb62A797",
    staking: "0xAC587382D08B74DCFfB033F548ce37BF90AbcCb2",
    feeDistributor: "0x70c92Fae9C265F1A61D44A8A6e781D23d5BC555E",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
