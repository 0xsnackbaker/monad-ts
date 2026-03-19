import { Method, z } from "mppx";
import { parseUnits } from "viem";

/**
 * Monad charge intent for one-time ERC-20 token transfers.
 */
export const charge = Method.from({
  name: "monad",
  intent: "charge",
  schema: {
    credential: {
      payload: z.discriminatedUnion("type", [
        z.object({ hash: z.hash(), type: z.literal("hash") }),
        z.object({ signature: z.signature(), type: z.literal("transaction") }),
        z.object({
          type: z.literal("authorization"),
          from: z.string(),
          to: z.string(),
          value: z.string(),
          validAfter: z.string(),
          validBefore: z.string(),
          nonce: z.string(),
          signature: z.string(),
        }),
      ]),
    },
    request: z.pipe(
      z.object({
        amount: z.amount(),
        chainId: z.optional(z.number()),
        currency: z.string(),
        decimals: z.number(),
        description: z.optional(z.string()),
        externalId: z.optional(z.string()),
        recipient: z.optional(z.string()),
      }),
      z.transform(({ amount, chainId, decimals, ...rest }) => ({
        ...rest,
        amount: parseUnits(amount, decimals).toString(),
        ...(chainId !== undefined ? { methodDetails: { chainId } } : {}),
      })),
    ),
  },
});
