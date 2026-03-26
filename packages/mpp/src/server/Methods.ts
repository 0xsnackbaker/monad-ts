import type { Method } from "mppx";
import { charge as charge_ } from "./Charge.js";

/**
 * Creates a Monad `charge` server method.
 *
 * @example
 * ```ts
 * import { Mppx } from 'mppx/server'
 * import { monad } from '@monad-crypto/mpp/server'
 *
 * const mppx = Mppx.create({
 *   methods: [monad({ recipient: '0x...', currency: '0x...' })],
 * })
 * ```
 */
export function monad(
  parameters?: monad.Parameters,
): readonly [Method.AnyServer] {
  return [monad.charge(parameters)] as const;
}

export namespace monad {
  export type Parameters = charge_.Parameters;

  /** Creates a Monad `charge` method for one-time ERC-20 token transfers. */
  export const charge = charge_;
}
