import { Challenge } from "mppx";
import type { Address } from "viem";
import { createClient, http } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import * as defaults from "../src/defaults.js";
import * as Methods from "../src/Methods.js";
import { RPC_URL } from "./setup.js";

/** Monad mainnet chain ID (forked by anvil). */
export const testChainId = defaults.chainId.mainnet;

/** Default test token (USDC). */
export const token: Address = defaults.tokens.usdc;

/** USDC whale on Monad mainnet at the fork block. */
export const WHALE: Address = "0xfc08DB693D20F8F5dE32aC93816fA0ec2d6a221D";

/**
 * Test accounts.
 *
 * These are NOT the default anvil/hardhat accounts — the well-known addresses
 * (0xf39F..., 0x7099..., etc.) have contracts deployed on Monad mainnet,
 * which breaks ERC-3009 signature verification (the on-chain SignatureChecker
 * uses EIP-1271 for addresses with code instead of ecrecover).
 */
export const accounts = {
  payer: privateKeyToAccount(
    "0xacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacacac",
  ),
  recipient: privateKeyToAccount(
    "0xadadadadadadadadadadadadadadadadadadadadadadadadadadadadadadadad",
  ),
  server: privateKeyToAccount(
    "0xaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeaeae",
  ),
};

/** Creates a viem client connected to the forked anvil instance. */
export function createTestClient() {
  return createClient({
    chain: { id: testChainId } as never,
    transport: http(RPC_URL),
  });
}

/** Sets the ETH balance of an address on the anvil fork. */
export async function setBalance(
  client: ReturnType<typeof createTestClient>,
  address: Address,
  value: bigint,
) {
  await client.request({
    method: "anvil_setBalance" as never,
    params: [address, `0x${value.toString(16)}`] as never,
  });
}

/** Impersonates a whale to transfer USDC to a target address. */
export async function fundUSDC(
  client: ReturnType<typeof createTestClient>,
  to: Address,
  amount: bigint,
) {
  const { encodeFunctionData, erc20Abi } = await import("viem");
  await setBalance(client, WHALE, 10n ** 18n);
  await client.request({
    method: "anvil_impersonateAccount" as never,
    params: [WHALE] as never,
  });
  await client.request({
    method: "eth_sendTransaction" as never,
    params: [
      {
        from: WHALE,
        to: token,
        data: encodeFunctionData({
          abi: erc20Abi,
          functionName: "transfer",
          args: [to, amount],
        }),
      },
    ] as never,
  });
  await client.request({
    method: "anvil_stopImpersonatingAccount" as never,
    params: [WHALE] as never,
  });
}

/** Creates a challenge for testing. */
export function makeChallenge(
  overrides: {
    amount?: string;
    currency?: string;
    recipient?: string;
    expires?: string;
  } = {},
) {
  return Challenge.fromMethod(Methods.charge, {
    realm: "test.example.com",
    id: "test-id",
    ...(overrides.expires ? { expires: overrides.expires } : {}),
    request: {
      amount: overrides.amount ?? "1",
      currency: overrides.currency ?? token,
      decimals: 6,
      recipient: overrides.recipient ?? accounts.recipient.address,
    },
  });
}
