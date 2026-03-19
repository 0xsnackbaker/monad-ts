import type { Method } from "mppx";
import { charge as charge_ } from "./Charge.js";

/**
 * Creates a Monad `charge` client method.
 *
 * @example
 * ```ts
 * import { Mppx } from 'mppx/client'
 * import { monad } from '@monad-crypto/mpp/client'
 *
 * const mppx = Mppx.create({
 *   methods: [monad({ account })],
 * })
 * ```
 */
export function monad(
  parameters: monad.Parameters = {},
): readonly [Method.AnyClient] {
  return [charge_(parameters)] as const;
}

export namespace monad {
  export type Parameters = charge_.Parameters;

  /** Creates a Monad `charge` client method for one-time ERC-20 token transfers. */
  export const charge = charge_;
}
