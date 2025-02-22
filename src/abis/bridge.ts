// src/abis/bridge.ts
export const bridgeAbi = [
  {
    inputs: [],
    name: "NATIVE_REPRESENTATION",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token_", type: "address" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
      { internalType: "uint64", name: "destChainID_", type: "uint64" },
      {
        internalType: "enum BridgeERC20V3.DEST_TOKEN_TYPE",
        name: "destTokenType_",
        type: "uint8",
      },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "uint64", name: "destChainID_", type: "uint64" },
      {
        internalType: "enum BridgeERC20V3.DEST_TOKEN_TYPE",
        name: "destTokenType_",
        type: "uint8",
      },
    ],
    name: "bridge",
    outputs: [],
    stateMutability: "payable",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "", type: "address" },
      { internalType: "uint64", name: "", type: "uint64" },
    ],
    name: "bridgeMap",
    outputs: [
      { internalType: "bool", name: "enabled", type: "bool" },
      { internalType: "address", name: "token", type: "address" },
      { internalType: "uint64", name: "chainID", type: "uint64" },
      {
        internalType: "enum BridgeERC20V3.DEST_TOKEN_TYPE",
        name: "allowedDestTokenTypes",
        type: "uint8",
      },
      { internalType: "address", name: "feeReceiver", type: "address" },
      { internalType: "uint256", name: "fee", type: "uint256" },
      {
        internalType: "enum BridgeERC20V3.FEE_TYPE",
        name: "feeType",
        type: "uint8",
      },
      {
        internalType: "enum BridgeERC20V3.TOKEN_STRATEGY",
        name: "strategy",
        type: "uint8",
      },
      { internalType: "address", name: "receiver", type: "address" },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "committee",
    outputs: [{ internalType: "address", name: "", type: "address" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [
      { internalType: "address", name: "token_", type: "address" },
      { internalType: "uint64", name: "chainID_", type: "uint64" },
      { internalType: "uint256", name: "amount_", type: "uint256" },
    ],
    name: "computeFeeByFeeType",
    outputs: [{ internalType: "uint256", name: "", type: "uint256" }],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [{ internalType: "address", name: "token_", type: "address" }],
    name: "getDestChainIDsAndAllowedTokenTypes",
    outputs: [
      {
        components: [
          { internalType: "uint248", name: "chainID", type: "uint248" },
          {
            internalType: "enum BridgeERC20V3.DEST_TOKEN_TYPE",
            name: "allowedDestTokenTypes",
            type: "uint8",
          },
        ],
        internalType: "struct BridgeERC20V3.ChainIDAndAllowedDestTokenTypes[]",
        name: "",
        type: "tuple[]",
      },
    ],
    stateMutability: "view",
    type: "function",
  },
  {
    inputs: [],
    name: "pause",
    outputs: [],
    stateMutability: "nonpayable",
    type: "function",
  },
  {
    inputs: [],
    name: "paused",
    outputs: [{ internalType: "bool", name: "", type: "bool" }],
    stateMutability: "view",
    type: "function",
  },
] as const;

export default bridgeAbi;
