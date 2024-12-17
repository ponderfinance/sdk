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
    factory: "0x9Ca89d7531a4A467729e0C8858e5433a9Df4D0Cb",
    router: "0xD1e1b2Db5BeB99462787FB0921178F1A23560410",
    masterChef: "0xA97071b70cA4dFe81Edb0691d81354a2e833A9ae",
    launcher: "0x82A69Bd8081D5577997210d0a57A6c4c0B6e4AF8",
    oracle: "0x5dAB1F58411e21c8D8Fc9CA4502d9bC635A8692B",
    kkubUnwrapper: "0x962047A3884aE32cFa8bEA12785F6B44A85aE1C5",
    ponderToken: "0xb7eDD1804D10aa505aFF7655E86b40A944168045",
  },
} as const;

// KKUB addresses for each chain
export const KKUB_ADDRESSES: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
