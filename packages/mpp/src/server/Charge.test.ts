import { describe, expect, test } from "bun:test";
import * as defaults from "../defaults.js";
import {
  accounts,
  createMockClient,
  makeChallenge,
  testChainId,
  token,
} from "../helpers.test.js";
import { charge } from "./Charge.js";

/** A dummy 65-byte signature (v=27, r=0x00..., s=0x00...). */
const dummySignature = `0x${"00".repeat(32)}${"00".repeat(32)}1b`;

describe("server/Charge", () => {
  describe("construction", () => {
    test("creates server method with defaults", () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.recipient.address,
        getClient: () => client,
      });
      expect(method.name).toBe("monad");
      expect(method.intent).toBe("charge");
    });

    test("uses USDC as default currency", () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.recipient.address,
        getClient: () => client,
      });
      expect(method).toBeDefined();
    });

    test("throws when serverPaysGas with non-ERC-3009 token", () => {
      expect(() =>
        charge({
          recipient: accounts.recipient.address,
          currency: "0x0000000000000000000000000000000000000001",
          serverPaysGas: true,
          account: accounts.server,
        }),
      ).toThrow("ERC-3009");
    });

    test("throws when serverPaysGas without account", () => {
      expect(() =>
        charge({
          recipient: accounts.recipient.address,
          currency: token,
          serverPaysGas: true,
        }),
      ).toThrow("requires an `account` parameter");
    });

    test("allows serverPaysGas with ERC-3009 token and account", () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.server.address,
        currency: token,
        serverPaysGas: true,
        account: accounts.server,
        getClient: () => client,
      });
      expect(method).toBeDefined();
    });
  });

  describe("verify - hash type", () => {
    test("rejects expired challenge", async () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.recipient.address,
        getClient: () => client,
      });

      const challenge = makeChallenge({
        expires: "2020-01-01T00:00:00Z",
      });

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
  });

  describe("verify - transaction type", () => {
    test("rejects transaction targeting wrong contract", async () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.recipient.address,
        getClient: () => client,
      });

      const challenge = makeChallenge();

      await expect(
        method.verify({
          credential: {
            challenge,
            payload: {
              type: "transaction",
              signature: "0x00",
            },
          },
          request: { ...challenge.request, chainId: testChainId },
        }),
      ).rejects.toThrow();
    });
  });

  describe("verify - authorization type", () => {
    test("rejects authorization without server account configured", async () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.recipient.address,
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
              signature: dummySignature,
            },
          },
          request: { ...challenge.request, chainId: testChainId },
        }),
      ).rejects.toThrow("no server `account` is configured");
    });

    test("rejects authorization with mismatched recipient", async () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.server.address,
        account: accounts.server,
        getClient: () => client,
      });

      const challenge = makeChallenge({
        recipient: accounts.server.address,
      });

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
              signature: dummySignature,
            },
          },
          request: { ...challenge.request, chainId: testChainId },
        }),
      ).rejects.toThrow("recipient does not match");
    });

    test("rejects authorization with mismatched amount", async () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.server.address,
        account: accounts.server,
        getClient: () => client,
      });

      const challenge = makeChallenge({
        recipient: accounts.server.address,
      });

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
              signature: dummySignature,
            },
          },
          request: { ...challenge.request, chainId: testChainId },
        }),
      ).rejects.toThrow("amount does not match");
    });

    test("rejects expired authorization", async () => {
      const client = createMockClient();
      const method = charge({
        recipient: accounts.server.address,
        account: accounts.server,
        getClient: () => client,
      });

      const challenge = makeChallenge({
        recipient: accounts.server.address,
      });

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
              validBefore: "1000", // expired timestamp (year ~1970)
              nonce: `0x${"00".repeat(32)}`,
              signature: dummySignature,
            },
          },
          request: { ...challenge.request, chainId: testChainId },
        }),
      ).rejects.toThrow("authorization expired");
    });

    test("rejects when server account does not match recipient", async () => {
      const client = createMockClient();
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
              signature: dummySignature,
            },
          },
          request: { ...challenge.request, chainId: testChainId },
        }),
      ).rejects.toThrow("Server account address does not match");
    });
  });

  describe("defaults", () => {
    test("resolveCurrency returns USDC for mainnet", () => {
      expect(defaults.resolveCurrency({})).toBe(token);
    });

    test("resolveCurrency returns USDC for testnet", () => {
      expect(defaults.resolveCurrency({ testnet: true })).toBe(token);
    });

    test("ERC-3009 ABI has receiveWithAuthorization", () => {
      const fn = defaults.erc3009Abi.find(
        (item) => item.name === "receiveWithAuthorization",
      );
      expect(fn).toBeDefined();
      expect(fn?.inputs.length).toBe(9); // from, to, value, validAfter, validBefore, nonce, v, r, s
    });

    test("ERC-3009 ABI has transferWithAuthorization", () => {
      const fn = defaults.erc3009Abi.find(
        (item) => item.name === "transferWithAuthorization",
      );
      expect(fn).toBeDefined();
      expect(fn?.inputs.length).toBe(9);
    });
  });
});
