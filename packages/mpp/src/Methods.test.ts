import { expect, test } from "bun:test";
import { Challenge } from "mppx";
import { accounts, makeChallenge, token } from "../test/utils.js";
import * as Methods from "./Methods.js";

test("charge has correct name and intent", () => {
  expect(Methods.charge.name).toBe("monad");
  expect(Methods.charge.intent).toBe("charge");
});

test("charge creates a challenge from the method", () => {
  const challenge = Challenge.fromMethod(Methods.charge, {
    realm: "test.example.com",
    id: "test-id",
    request: {
      amount: "1.50",
      currency: token,
      decimals: 6,
      recipient: accounts.recipient.address,
    },
  });

  expect(challenge.method).toBe("monad");
  expect(challenge.intent).toBe("charge");
  expect(challenge.realm).toBe("test.example.com");
  // amount should be converted to raw units (1.50 * 10^6 = 1500000)
  expect(challenge.request.amount).toBe("1500000");
  expect(challenge.request.currency).toBe(token);
  expect(challenge.request.recipient).toBe(accounts.recipient.address);
});

test("charge supports chainId in methodDetails", () => {
  const challenge = Challenge.fromMethod(Methods.charge, {
    realm: "test.example.com",
    id: "test-id",
    request: {
      amount: "1",
      currency: token,
      decimals: 6,
      chainId: 10143,
      recipient: accounts.recipient.address,
    },
  });

  expect(
    (challenge.request.methodDetails as Record<string, unknown>)?.chainId,
  ).toBe(10143);
});

test("charge omits methodDetails when no chainId", () => {
  const challenge = Challenge.fromMethod(Methods.charge, {
    realm: "test.example.com",
    id: "test-id",
    request: {
      amount: "1",
      currency: token,
      decimals: 6,
      recipient: accounts.recipient.address,
    },
  });

  expect(challenge.request.methodDetails).toBeUndefined();
});

test("charge supports optional description and externalId", () => {
  const challenge = Challenge.fromMethod(Methods.charge, {
    realm: "test.example.com",
    id: "test-id",
    request: {
      amount: "10",
      currency: token,
      decimals: 6,
      description: "Test payment",
      externalId: "order-123",
      recipient: accounts.recipient.address,
    },
  });

  expect(challenge.request.description).toBe("Test payment");
  expect(challenge.request.externalId).toBe("order-123");
});

test("charge serializes and deserializes challenge", () => {
  const challenge = makeChallenge();
  const serialized = Challenge.serialize(challenge);
  expect(typeof serialized).toBe("string");
  expect(serialized.length).toBeGreaterThan(0);

  const deserialized = Challenge.deserialize(serialized);
  expect(deserialized.method).toBe("monad");
  expect(deserialized.intent).toBe("charge");
  expect(deserialized.request.amount).toBe("1000000");
});
