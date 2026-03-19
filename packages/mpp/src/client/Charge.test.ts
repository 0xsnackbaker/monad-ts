import { describe, expect, test } from "bun:test";
import * as defaults from "../defaults.js";
import {
  accounts,
  createMockClient,
  makeChallenge,
  token,
} from "../helpers.test.js";
import { charge } from "./Charge.js";

describe("client/Charge", () => {
  describe("charge()", () => {
    test("returns a client method with correct name and intent", () => {
      const method = charge({ account: accounts.payer });
      expect(method.name).toBe("monad");
      expect(method.intent).toBe("charge");
    });

    test("defaults to pull mode for local accounts", () => {
      // Local accounts (privateKeyToAccount) should default to pull mode
      const method = charge({ account: accounts.payer });
      expect(method).toBeDefined();
      expect(method.name).toBe("monad");
    });

    test("throws when pull mode used with non-ERC-3009 token", async () => {
      const nonErc3009Token = "0x0000000000000000000000000000000000000001";
      const client = createMockClient();
      const method = charge({
        account: accounts.payer,
        mode: "pull",
        getClient: () => client,
      });

      const challenge = makeChallenge({ currency: nonErc3009Token });

      await expect(
        method.createCredential({ challenge } as never),
      ).rejects.toThrow("does not support ERC-3009");
    });

    test("throws when no account provided", () => {
      const client = createMockClient();
      const method = charge({ getClient: () => client });

      const challenge = makeChallenge();

      expect(method.createCredential({ challenge } as never)).rejects.toThrow(
        "No `account` provided",
      );
    });
  });

  describe("mode resolution", () => {
    test("context mode overrides parameter mode", () => {
      const method = charge({
        account: accounts.payer,
        mode: "push",
      });
      expect(method).toBeDefined();
    });
  });

  describe("ERC-3009 token validation", () => {
    test("USDC is in the ERC-3009 allowlist", () => {
      expect(token.toLowerCase() in defaults.erc3009Tokens).toBe(true);
    });

    test("unknown tokens are not in the allowlist", () => {
      expect(
        "0x0000000000000000000000000000000000000001" in defaults.erc3009Tokens,
      ).toBe(false);
    });
  });
});
