import { Credential, Method, z } from "mppx";
import type { Account, Address, Chain, Client } from "viem";
import { encodeFunctionData, erc20Abi } from "viem";
import { parseAccount } from "viem/accounts";
import { sendTransactionSync, signTypedData } from "viem/actions";
import * as defaults from "../defaults.js";
import * as Methods from "../Methods.js";
import type { MaybePromise } from "../types.js";

/**
 * Creates a Monad charge method intent for usage on the client.
 *
 * @example
 * ```ts
 * import { monad } from '@monad-crypto/mpp/client'
 * import { privateKeyToAccount } from 'viem/accounts'
 *
 * const charge = monad.charge({
 *   account: privateKeyToAccount('0x...'),
 * })
 * ```
 */
export function charge(parameters: charge.Parameters = {}) {
  const resolveAccount = (
    client: Client,
    override?: Account | Address | undefined,
  ): Account => {
    const raw = override ?? parameters.account;
    if (raw) return typeof raw === "string" ? parseAccount(raw) : raw;
    if (client.account) return client.account;
    throw new Error(
      "No `account` provided. Pass `account` to parameters or context.",
    );
  };

  const resolveClient = (
    chainId?: number | undefined,
  ): MaybePromise<Client> => {
    if (parameters.getClient) return parameters.getClient({ chainId });
    const id = chainId ?? defaults.chainId.mainnet;
    const url = defaults.rpcUrl[id];
    if (!url) throw new Error(`No RPC URL configured for chainId ${id}.`);
    const { createClient, http } = require("viem") as typeof import("viem");
    return createClient({ chain: { id } as Chain, transport: http(url) });
  };

  return Method.toClient(Methods.charge, {
    context: z.object({
      account: z.optional(z.custom<Account | Address>()),
      mode: z.optional(z.enum(["push", "pull"])),
    }),

    async createCredential({ challenge, context }) {
      const chainId = challenge.request.methodDetails?.chainId as
        | number
        | undefined;
      const client = await resolveClient(chainId);
      const account = resolveAccount(client, context?.account);

      const mode =
        context?.mode ??
        parameters.mode ??
        (account.type === "json-rpc" ? "push" : "pull");

      const { request } = challenge;
      const amount = BigInt(request.amount);
      const currency = request.currency as Address;
      const recipient = request.recipient as Address;

      if (mode === "pull") {
        const tokenMeta = defaults.erc3009Tokens[currency.toLowerCase()];
        if (!tokenMeta) {
          throw new Error(
            `Token ${currency} does not support ERC-3009 (TransferWithAuthorization). ` +
              `Cannot use pull mode.`,
          );
        }

        const resolvedChainId = chainId ?? client.chain?.id;
        if (!resolvedChainId)
          throw new Error("Could not determine chainId for EIP-712 domain.");

        const { name: tokenName, version: tokenVersion } = tokenMeta;

        const validAfter = 0n;
        const validBefore = challenge.expires
          ? BigInt(Math.floor(new Date(challenge.expires).getTime() / 1000))
          : BigInt(Math.floor(Date.now() / 1000) + 3600); // 1 hour default
        const nonce =
          `0x${[...crypto.getRandomValues(new Uint8Array(32))].map((b) => b.toString(16).padStart(2, "0")).join("")}` as `0x${string}`;

        const signature = await signTypedData(client, {
          account,
          domain: {
            name: tokenName,
            version: tokenVersion,
            chainId: resolvedChainId,
            verifyingContract: currency,
          },
          types: {
            TransferWithAuthorization: [
              { name: "from", type: "address" },
              { name: "to", type: "address" },
              { name: "value", type: "uint256" },
              { name: "validAfter", type: "uint256" },
              { name: "validBefore", type: "uint256" },
              { name: "nonce", type: "bytes32" },
            ],
          },
          primaryType: "TransferWithAuthorization",
          message: {
            from: account.address,
            to: recipient,
            value: amount,
            validAfter,
            validBefore,
            nonce,
          },
        });

        return Credential.serialize({
          challenge,
          payload: {
            type: "authorization" as const,
            from: account.address,
            to: recipient,
            value: amount.toString(),
            validAfter: validAfter.toString(),
            validBefore: validBefore.toString(),
            nonce,
            signature,
          },
          source: `did:pkh:eip155:${resolvedChainId}:${account.address}`,
        });
      }

      if (mode === "push") {
        const receipt = await sendTransactionSync(client, {
          account,
          chain: client.chain,
          to: currency,
          data: encodeFunctionData({
            abi: erc20Abi,
            functionName: "transfer",
            args: [recipient, amount],
          }),
        });
        const hash = receipt.transactionHash;
        return Credential.serialize({
          challenge,
          payload: { hash, type: "hash" },
          source: `did:pkh:eip155:${chainId ?? client.chain?.id}:${account.address}`,
        });
      }

      throw new Error(`Unsupported mode: ${mode}`);
    },
  });
}

export declare namespace charge {
  type Parameters = {
    /** Account to use for signing. */
    account?: Account | Address | undefined;
    /** Function that returns a viem Client for the given chain ID. */
    getClient?:
      | ((parameters: { chainId?: number | undefined }) => MaybePromise<Client>)
      | undefined;
    /**
     * Controls how the charge transaction is submitted.
     *
     * - `'push'`: Client broadcasts the transaction and sends the tx hash.
     * - `'pull'`: Client signs an ERC-3009 TransferWithAuthorization
     *   message. Server calls `transferWithAuthorization` and pays gas.
     *
     * @default `'push'` for JSON-RPC accounts, `'pull'` for local accounts.
     */
    mode?: "push" | "pull" | undefined;
  };
}
