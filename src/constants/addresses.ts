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
    factory: "0xEb3561ffDD9EfD999D3b82D0C31734b094Eff25d",
    router: "0x9A3EC404ed430945293dBf5034D2799d795dF30e",
    masterChef: "0x85C2C1f8fBf9F7455a370C9AB370f160ad31A82e",
    launcher: "0x23733788f4813B681e53A0D4FACb64db32ED6FD6",
    oracle: "0xf68Cd3c6C960141DdF38269Bb4E3F5B7828cc244",
    kkubUnwrapper: "0x429B5E4F00D5A760Bfb2aA70b6252410D8C4Dd45",
    ponderToken: "0x5bdEfB75ea3563caD7521C45179edd28AF4d5aa8",
    staking: "0xeFBfa50a6aD05326296f5ABD098894eA895dAf2a",
    feeDistributor: "0x4DAb4e6Df220fCf87aA88bEC9C5b165Bd26393BB",
  },
} as const;


// KKUB addresses for each chain
export const KKUB_ADDRESS: Record<ChainId, Address> = {
  25925: "0xBa71efd94be63bD47B78eF458DE982fE29f552f7",
  96: "0x67eBD850304c70d983B2d1b93ea79c7CD6c3F6b5",
} as const;
