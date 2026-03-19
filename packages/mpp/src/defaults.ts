export const chainId = {
  mainnet: 143,
  testnet: 10143,
} as const;

export type ChainId = (typeof chainId)[keyof typeof chainId];

/** Token addresses. */
export const tokens = {
  usdc: "0x754704Bc059F8C67012fEd69BC8A327a5aafb603",
} as const;

/** Chain ID → default currency. */
export const currency = {
  [chainId.mainnet]: tokens.usdc,
  [chainId.testnet]: tokens.usdc,
} as const satisfies Record<ChainId, string>;

/** Default token decimals for USDC. */
export const decimals = 6;

/** Default RPC URLs per chain. */
export const rpcUrl: Record<number, string> = {
  [chainId.mainnet]: "https://rpc.monad.xyz",
  [chainId.testnet]: "https://testnet-rpc.monad.xyz",
};

/** ERC-3009 `transferWithAuthorization` and `receiveWithAuthorization` ABI. */
export const erc3009Abi = [
  {
    type: "function",
    name: "transferWithAuthorization",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "receiveWithAuthorization",
    inputs: [
      { name: "from", type: "address" },
      { name: "to", type: "address" },
      { name: "value", type: "uint256" },
      { name: "validAfter", type: "uint256" },
      { name: "validBefore", type: "uint256" },
      { name: "nonce", type: "bytes32" },
      { name: "v", type: "uint8" },
      { name: "r", type: "bytes32" },
      { name: "s", type: "bytes32" },
    ],
    outputs: [],
    stateMutability: "nonpayable",
  },
  {
    type: "function",
    name: "name",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
  {
    type: "function",
    name: "version",
    inputs: [],
    outputs: [{ name: "", type: "string" }],
    stateMutability: "view",
  },
] as const;

/**
 * Known tokens that support ERC-3009 (TransferWithAuthorization).
 * Keyed by lowercase address for case-insensitive lookup.
 */
export const erc3009Tokens: Record<string, { name: string; version: string }> =
  {
    [tokens.usdc.toLowerCase()]: { name: "USD Coin", version: "1" },
  };

/** Resolves the default currency for a given chain. */
export function resolveCurrency(parameters: {
  chainId?: number | undefined;
  testnet?: boolean | undefined;
}): string {
  const id =
    parameters.chainId ??
    (parameters.testnet ? chainId.testnet : chainId.mainnet);
  return currency[id as keyof typeof currency] ?? tokens.usdc;
}
