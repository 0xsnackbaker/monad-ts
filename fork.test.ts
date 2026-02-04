import { test, expect } from "bun:test";
import { createPublicClient, http } from "viem";
import { rpcUrl } from "./test.setup";

test("should read block number from forked mainnet", async () => {
  const client = createPublicClient({
    transport: http(rpcUrl),
  });

  const blockNumber = await client.getBlockNumber();

  expect(blockNumber).toBeGreaterThan(0n);
  console.log(`Current block number: ${blockNumber}`);
});
