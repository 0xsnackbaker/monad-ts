import { monad } from "@monad-crypto/mpp/client";
import { Mppx } from "mppx/client";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(
  process.env.CLIENT_PRIVATE_KEY as `0x${string}`,
);

const mppx = Mppx.create({
  methods: [monad({ account })],
});

const BASE_URL = process.env.SERVER_URL ?? "http://localhost:3000";

async function main() {
  console.log("Requesting premium content...\n");

  const response = await mppx.fetch(`${BASE_URL}/premium`);
  const data = await response.json();

  console.log("Response:", data);
}

main().catch(console.error);
