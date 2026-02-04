import { beforeAll, afterAll } from "bun:test";
import { Instance } from "prool";

// Replace with your RPC URL or set FORK_RPC_URL environment variable
const FORK_RPC_URL = process.env.FORK_RPC_URL || "https://eth.llamarpc.com";

export const anvilInstance = Instance.anvil({
  forkUrl: FORK_RPC_URL,
});

export let rpcUrl: string;

beforeAll(async () => {
  await anvilInstance.start();
  rpcUrl = `http://${anvilInstance.host}:${anvilInstance.port}`;
});

afterAll(async () => {
  await anvilInstance.stop();
});
