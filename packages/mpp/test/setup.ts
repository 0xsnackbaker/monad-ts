import { afterAll, beforeAll } from "bun:test";
import { Instance, Server } from "prool";

const FORK_URL = "https://rpc2.monad.xyz";
export const FORK_BLOCK_NUMBER = 54_000_000n;
export const RPC_URL = `http://localhost:8545/1`;

let teardown: (() => Promise<void>) | undefined;

beforeAll(async () => {
  const server = Server.create({
    instance: Instance.anvil({
      forkUrl: FORK_URL,
      forkBlockNumber: FORK_BLOCK_NUMBER,
    }),
    port: 8545,
  });

  teardown = await server.start();
});

afterAll(async () => {
  await teardown?.();
});
