/**
 * Test helpers for crypto-bearing schemas.
 *
 * Per ADR-010 (G1), the runtime `validate()` defaults to
 * `{ valid: false, errors: [{ code: 'CRYPTO_DEFERRED' }] }` for any
 * schema whose TypeBox options carry `'x-crypto-bearing': true`,
 * unless the caller passes `{ acceptDeferred: true }`. Tests need
 * two distinct affordances on top of that:
 *
 *   1. Asserting the *shape* is valid without claiming to verify
 *      cryptography. `assertStructurallyValid` is the explicit name
 *      for that — using it instead of a generic `assertValid` makes
 *      the deferred-verification semantics legible at the test site.
 *
 *   2. Asserting the safe-by-default behaviour itself — i.e., that a
 *      crypto-bearing schema fails closed without `acceptDeferred`.
 *      `assertCryptoBearingFailsByDefault` is the round-trip check
 *      that the lint and runtime stay coherent.
 *
 * RULE-4 of the structural lint requires test files for crypto-bearing
 * schemas to use these helpers (or `assertCryptoBearingFailsByDefault`)
 * rather than a generic `assertValid()` call against the same schema —
 * the rename forces the test author to acknowledge they are NOT
 * verifying crypto.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import type { TSchema } from '@sinclair/typebox';
import { validate } from '../validators/index.js';

/**
 * Assert that `payload` is structurally valid against `schema` —
 * shape only, NOT a crypto-verification guarantee. Internally calls
 * `validate(schema, payload, { acceptDeferred: true })` so the safe-
 * by-default check is satisfied while still asserting the schema's
 * structural validity.
 *
 * For non-crypto-bearing schemas this is equivalent to a plain
 * `validate()` call returning `{ valid: true }`.
 *
 * Throws on structural failure; returns the (valid) result on success.
 */
export function assertStructurallyValid<T extends TSchema>(
  schema: T,
  payload: unknown,
): void {
  const result = validate(schema, payload, { acceptDeferred: true });
  if (!result.valid) {
    const id = (schema as Record<string, unknown>).$id ?? '<anonymous>';
    throw new Error(
      `assertStructurallyValid failed for ${String(id)}: ${result.errors.join('; ')}`,
    );
  }
}

/**
 * Assert that the schema is crypto-bearing AND that calling
 * `validate()` without `{ acceptDeferred: true }` produces the
 * CRYPTO_DEFERRED failure. Used to verify the safe-by-default API
 * stays coherent across the four observation surfaces (TypeBox
 * source, generated JSON Schema, runtime validate(), structural
 * lint).
 *
 * Throws if the schema is NOT crypto-bearing or if the default call
 * unexpectedly returns `{ valid: true }`.
 */
export function assertCryptoBearingFailsByDefault<T extends TSchema>(
  schema: T,
  payload: unknown,
): void {
  const flag = (schema as Record<string, unknown>)['x-crypto-bearing'];
  if (flag !== true) {
    const id = (schema as Record<string, unknown>).$id ?? '<anonymous>';
    throw new Error(
      `assertCryptoBearingFailsByDefault: ${String(id)} is NOT marked x-crypto-bearing — call assertStructurallyValid for non-crypto schemas.`,
    );
  }
  const result = validate(schema, payload);
  if (result.valid) {
    const id = (schema as Record<string, unknown>).$id ?? '<anonymous>';
    throw new Error(
      `assertCryptoBearingFailsByDefault: ${String(id)} returned valid: true without { acceptDeferred: true } — safe-by-default contract violated.`,
    );
  }
  // Match against the literal token at the start of the error string. The
  // CRYPTO_DEFERRED error contract is "the error string starts with the token
  // 'CRYPTO_DEFERRED:'" — substring matching against `includes()` would yield
  // false positives if a future structural error mentions the token in its
  // message body (e.g., "expected CRYPTO_DEFERRED was not present").
  const hasDeferredCode = result.errors.some((e) => e.startsWith('CRYPTO_DEFERRED:'));
  if (!hasDeferredCode) {
    const id = (schema as Record<string, unknown>).$id ?? '<anonymous>';
    throw new Error(
      `assertCryptoBearingFailsByDefault: ${String(id)} failed for the wrong reason — expected error to start with 'CRYPTO_DEFERRED:', got: ${result.errors.join('; ')}`,
    );
  }
}
