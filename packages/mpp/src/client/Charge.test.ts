import { expect, test } from "bun:test";
import {
  accounts,
  createTestClient,
  fundUSDC,
  makeChallenge,
  setBalance,
  token,
} from "../../test/utils.js";
import * as defaults from "../defaults.js";
import { charge } from "./Charge.js";

test("client charge returns a method with correct name and intent", () => {
  const method = charge({ account: accounts.payer });
  expect(method.name).toBe("monad");
  expect(method.intent).toBe("charge");
});

test("client charge throws when no account provided", async () => {
  const client = createTestClient();
  const method = charge({ getClient: () => client });
  const challenge = makeChallenge();
  await expect(method.createCredential({ challenge } as never)).rejects.toThrow(
    "No `account` provided",
  );
});

test("client charge throws when pull mode used with non-ERC-3009 token", async () => {
  const nonErc3009Token = "0x0000000000000000000000000000000000000001";
  const client = createTestClient();
  const method = charge({
    account: accounts.payer,
    mode: "pull",
    getClient: () => client,
  });
  const challenge = makeChallenge({ currency: nonErc3009Token });
  await expect(method.createCredential({ challenge } as never)).rejects.toThrow(
    "does not support ERC-3009",
  );
});

test("USDC is in the ERC-3009 allowlist", () => {
  expect(token.toLowerCase() in defaults.erc3009Tokens).toBe(true);
});

test("unknown tokens are not in the ERC-3009 allowlist", () => {
  expect(
    "0x0000000000000000000000000000000000000001" in defaults.erc3009Tokens,
  ).toBe(false);
});

test("client charge defaults to push mode for json-rpc accounts", async () => {
  const client = createTestClient();

  await fundUSDC(client, accounts.payer.address, 10_000_000n);
  await setBalance(client, accounts.payer.address, 10n ** 18n);

  // Impersonate so anvil can sign on behalf of the account
  await client.request({
    method: "anvil_impersonateAccount" as never,
    params: [accounts.payer.address] as never,
  });

  const method = charge({
    // no explicit mode — json-rpc accounts should default to "push"
    getClient: () => client,
  });

  const challenge = makeChallenge({ amount: "1" });
  const credential = await method.createCredential({
    challenge,
    context: { account: { type: "json-rpc", address: accounts.payer.address } },
  } as never);
  expect(typeof credential).toBe("string");
  expect(credential.length).toBeGreaterThan(0);

  await client.request({
    method: "anvil_stopImpersonatingAccount" as never,
    params: [accounts.payer.address] as never,
  });
});

test("client charge uses default resolveClient when no getClient provided", async () => {
  const method = charge({
    account: accounts.payer,
    mode: "pull",
  });

  // Challenge with an unknown chainId to hit the error path in default resolveClient
  const challenge = makeChallenge({ amount: "1" });
  // Default resolveClient uses defaults.rpcUrl which points to real Monad RPC,
  // but signing should still work since pull mode only needs signTypedData
  const credential = await method.createCredential({ challenge } as never);
  expect(typeof credential).toBe("string");
  expect(credential.length).toBeGreaterThan(0);
});

test("client charge throws on unsupported mode", async () => {
  const client = createTestClient();
  const method = charge({
    account: accounts.payer,
    getClient: () => client,
  });

  const challenge = makeChallenge({ amount: "1" });
  await expect(
    method.createCredential({
      challenge,
      context: { mode: "invalid" },
    } as never),
  ).rejects.toThrow("Unsupported mode: invalid");
});

test("client charge defaults to pull mode for local accounts", async () => {
  const client = createTestClient();

  const method = charge({
    account: accounts.payer,
    // no explicit mode — local accounts should default to "pull"
    getClient: () => client,
  });

  const challenge = makeChallenge({ amount: "1" });
  const credential = await method.createCredential({ challenge } as never);
  expect(typeof credential).toBe("string");
  expect(credential.length).toBeGreaterThan(0);
});
