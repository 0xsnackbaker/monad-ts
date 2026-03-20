import { monad } from "@monad-crypto/mpp/server";
import { Hono } from "hono";
import { Mppx } from "mppx/hono";
import { privateKeyToAccount } from "viem/accounts";

const account = privateKeyToAccount(
  process.env.SERVER_PRIVATE_KEY as `0x${string}`,
);

const mppx = Mppx.create({
  methods: [
    monad({
      recipient: account.address,
      account,
      testnet: true,
    }),
  ],
});

const app = new Hono();

app.get("/", (c) => c.text("Monad MPP Example Server"));

app.get("/premium", mppx.charge({ amount: "0.01" }), (c) =>
  c.json({ data: "You have accessed premium content!" }),
);

app.get("/expensive", mppx.charge({ amount: "1.00" }), (c) =>
  c.json({ data: "This is expensive content worth 1 USDC." }),
);

export default {
  port: 3000,
  fetch: app.fetch,
};
