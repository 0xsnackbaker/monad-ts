import { expect, test } from "bun:test";
import { Credential } from "mppx";
import {
  accounts,
  createTestClient,
  fundUSDC,
  makeChallenge,
  setBalance,
  testChainId,
  token,
} from "../../test/utils.js";
import { RPC_URL } from "../../test/setup.js";
import { charge as clientCharge } from "../client/Charge.js";
import * as defaults from "../defaults.js";
import { charge } from "./Charge.js";

test("server charge creates method with correct name and intent", () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });
  expect(method.name).toBe("monad");
  expect(method.intent).toBe("charge");
});

test("server charge throws when ERC-3009 token used without account", () => {
  expect(() =>
    charge({
      recipient: accounts.recipient.address,
      currency: token,
    }),
  ).toThrow("requires an `account` parameter");
});

test("server charge allows non-ERC-3009 token without account", () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    currency: "0x0000000000000000000000000000000000000001",
    getClient: () => client,
  });
  expect(method).toBeDefined();
});

test("server charge rejects expired challenge", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const challenge = makeChallenge({ expires: "2020-01-01T00:00:00Z" });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "hash",
          hash: "0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef",
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("Payment expired");
});

test("server charge rejects authorization without server account", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    currency: "0x0000000000000000000000000000000000000001",
    getClient: () => client,
  });

  const challenge = makeChallenge();

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "authorization",
          from: accounts.payer.address,
          to: accounts.recipient.address,
          value: "1000000",
          validAfter: "0",
          validBefore: String(Math.floor(Date.now() / 1000) + 3600),
          nonce: `0x${"00".repeat(32)}`,
          signature: `0x${"00".repeat(32)}${"00".repeat(32)}1b`,
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("no server `account` is configured");
});

test("server charge rejects authorization with mismatched recipient", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const challenge = makeChallenge({ recipient: accounts.server.address });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "authorization",
          from: accounts.payer.address,
          to: accounts.payer.address, // wrong — should be server
          value: "1000000",
          validAfter: "0",
          validBefore: String(Math.floor(Date.now() / 1000) + 3600),
          nonce: `0x${"00".repeat(32)}`,
          signature: `0x${"00".repeat(32)}${"00".repeat(32)}1b`,
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("recipient does not match");
});

test("server charge rejects authorization with mismatched amount", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const challenge = makeChallenge({ recipient: accounts.server.address });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "authorization",
          from: accounts.payer.address,
          to: accounts.server.address,
          value: "999999", // wrong amount
          validAfter: "0",
          validBefore: String(Math.floor(Date.now() / 1000) + 3600),
          nonce: `0x${"00".repeat(32)}`,
          signature: `0x${"00".repeat(32)}${"00".repeat(32)}1b`,
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("amount does not match");
});

test("server charge rejects expired authorization", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const challenge = makeChallenge({ recipient: accounts.server.address });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "authorization",
          from: accounts.payer.address,
          to: accounts.server.address,
          value: "1000000",
          validAfter: "0",
          validBefore: "1000", // expired
          nonce: `0x${"00".repeat(32)}`,
          signature: `0x${"00".repeat(32)}${"00".repeat(32)}1b`,
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("authorization expired");
});

test("server charge rejects when server account does not match recipient", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.server, // different from recipient
    getClient: () => client,
  });

  const challenge = makeChallenge({
    recipient: accounts.recipient.address,
  });

  await expect(
    method.verify({
      credential: {
        challenge,
        payload: {
          type: "authorization",
          from: accounts.payer.address,
          to: accounts.recipient.address,
          value: "1000000",
          validAfter: "0",
          validBefore: String(Math.floor(Date.now() / 1000) + 3600),
          nonce: `0x${"00".repeat(32)}`,
          signature: `0x${"00".repeat(32)}${"00".repeat(32)}1b`,
        },
      },
      request: { ...challenge.request, chainId: testChainId },
    }),
  ).rejects.toThrow("Server account address does not match");
});

test("server charge request hook resolves chainId from client", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const requestHook = method.request as (params: never) => Promise<{ chainId: number }>;
  const result = await requestHook({
    request: {
      amount: "1000000",
      currency: token,
      recipient: accounts.recipient.address,
    },
  } as never);

  expect(result.chainId).toBe(testChainId);
});

test("server charge request hook uses testnet chainId when configured", async () => {
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    testnet: true,
    getClient: ({ chainId }) => {
      const { createClient, http } = require("viem") as typeof import("viem");
      const id = chainId ?? defaults.chainId.testnet;
      return createClient({ chain: { id } as never, transport: http(RPC_URL) });
    },
  });

  const requestHook = method.request as (params: never) => Promise<{ chainId: number }>;
  const result = await requestHook({
    request: {
      amount: "1000000",
      currency: token,
      recipient: accounts.recipient.address,
    },
  } as never);

  expect(result.chainId).toBe(defaults.chainId.testnet);
});

test("server charge request hook uses explicit chainId from request", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const requestHook = method.request as (params: never) => Promise<{ chainId: number }>;
  const result = await requestHook({
    request: {
      amount: "1000000",
      currency: token,
      recipient: accounts.recipient.address,
      chainId: testChainId,
    },
  } as never);

  expect(result.chainId).toBe(testChainId);
});

test("server charge request hook throws when client chainId mismatches", async () => {
  const client = createTestClient();
  const method = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const requestHook = method.request as (params: never) => Promise<unknown>;
  await expect(
    requestHook({
      request: {
        amount: "1000000",
        currency: token,
        recipient: accounts.recipient.address,
        chainId: 99999,
      },
    } as never),
  ).rejects.toThrow("Client not configured with chainId 99999");
});

test("defaults resolveCurrency returns USDC for mainnet", () => {
  expect(defaults.resolveCurrency({})).toBe(token);
});

test("defaults resolveCurrency returns USDC for testnet", () => {
  expect(defaults.resolveCurrency({ testnet: true })).toBe(token);
});

test("defaults ERC-3009 ABI has receiveWithAuthorization", () => {
  const fn = defaults.erc3009Abi.find(
    (item) => item.name === "receiveWithAuthorization",
  );
  expect(fn).toBeDefined();
  expect(fn?.inputs.length).toBe(9);
});

test("defaults ERC-3009 ABI has transferWithAuthorization", () => {
  const fn = defaults.erc3009Abi.find(
    (item) => item.name === "transferWithAuthorization",
  );
  expect(fn).toBeDefined();
  expect(fn?.inputs.length).toBe(9);
});

test("server charge verifies a push (hash) credential end-to-end", async () => {
  const client = createTestClient();

  await fundUSDC(client, accounts.payer.address, 10_000_000n);
  await setBalance(client, accounts.payer.address, 10n ** 18n);

  const serverMethod = charge({
    recipient: accounts.recipient.address,
    account: accounts.recipient,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "push",
    getClient: () => client,
  });

  const challenge = makeChallenge({ amount: "1" });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});

test("server charge verifies a pull (authorization) credential end-to-end", async () => {
  const client = createTestClient();

  await fundUSDC(client, accounts.payer.address, 10_000_000n);
  await setBalance(client, accounts.server.address, 10n ** 18n);

  const serverMethod = charge({
    recipient: accounts.server.address,
    account: accounts.server,
    getClient: () => client,
  });

  const clientMethod = clientCharge({
    account: accounts.payer,
    mode: "pull",
    getClient: () => client,
  });

  const challenge = makeChallenge({
    amount: "1",
    recipient: accounts.server.address,
  });
  const credentialStr = await clientMethod.createCredential({
    challenge,
  } as never);
  const credential = Credential.deserialize(credentialStr);

  const receipt = await serverMethod.verify({
    credential,
    request: { ...challenge.request, chainId: testChainId },
  });

  expect(receipt.status).toBe("success");
  expect(receipt.reference).toMatch(/^0x[0-9a-f]{64}$/);
});
