# @monad-crypto/mpp

Monad payment method for the [Machine Payments Protocol](https://mpp.dev) (`mppx`).

> **Warning:** This package is under active development.

## Install

```bash
npm install @monad-crypto/mpp mppx viem
```

## Features

- **Charge** — One-time ERC-20 token transfers. Supports push mode (client broadcasts) and pull mode (server broadcasts).
- **Session** — Streaming pay-as-you-go payments over payment channels with cumulative vouchers. *(Coming soon)*

## Usage

### Server

```ts
import { Mppx } from 'mppx/server'
import { monad } from '@monad-crypto/mpp/server'

const mppx = Mppx.create({
  methods: [
    monad.charge({
      recipient: '0x...', // address that receives payments
      currency: '0x...',  // ERC-20 token contract address
    }),
  ],
})
```

### Client

```ts
import { Mppx } from 'mppx/client'
import { monad } from '@monad-crypto/mpp/client'
import { privateKeyToAccount } from 'viem/accounts'

const mppx = Mppx.create({
  methods: [
    monad.charge({
      account: privateKeyToAccount('0x...'),
    }),
  ],
})
```

<!-- ## Exports

| Path | Description |
|------|-------------|
| `@monad-crypto/mpp` | Base method definition (`charge`) |
| `@monad-crypto/mpp/client` | Client-side charge with `createCredential` |
| `@monad-crypto/mpp/server` | Server-side charge with `verify` |

## Client Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `account` | `Account \| Address` | Wallet account for signing transactions |
| `getClient` | `(params) => Client` | Custom viem client resolver by chain ID |
| `mode` | `'push' \| 'pull'` | `push`: client broadcasts an ERC-20 transfer (default for JSON-RPC accounts). `pull`: client signs an ERC-3009 `TransferWithAuthorization` for the server to submit (default for local accounts) |

## Server Parameters

| Parameter | Type | Default | Description |
|-----------|------|---------|-------------|
| `recipient` | `string` | &mdash; | Address that receives payments |
| `currency` | `string` | USDC | ERC-20 token contract address |
| `decimals` | `number` | `6` | Token decimals |
| `amount` | `string` | &mdash; | Default payment amount (human-readable) |
| `getClient` | `(params) => Client` | Built-in | Custom viem client resolver by chain ID |
| `testnet` | `boolean` | `false` | Use testnet chain ID |
| `waitForConfirmation` | `boolean` | `true` | Wait for on-chain confirmation before returning receipt |
| `account` | `Account \| Address` | &mdash; | Server wallet for broadcasting `receiveWithAuthorization` (required when `serverPaysGas` is `true`) |
| `serverPaysGas` | `boolean` | `false` | Server pays gas via ERC-3009. Requires an ERC-3009 token (e.g. USDC) and `account` | -->

## Example

See [`example/`](./example) for a complete Hono server and client demo using the Monad payment method on testnet.

## Specification

The formal protocol specification is available at [`spec/draft-monad-charge-00.md`](./spec/draft-monad-charge-00.md).

## How It Works

1. Server issues a `402 Payment Required` challenge via `mppx` with method `monad` and intent `charge`.
2. Client creates a credential based on the mode:
   - **Push mode**: Client broadcasts an ERC-20 `transfer(to, amount)` transaction and returns the tx hash.
   - **Pull mode**: Client signs an ERC-3009 `TransferWithAuthorization` and returns the signature. Server calls `receiveWithAuthorization` to execute the transfer and pay gas.
3. Server verifies the payment matches the challenge (amount, recipient, currency).
4. Server returns a `Payment-Receipt` header on success.

## License

MIT
