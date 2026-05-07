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
export declare function assertStructurallyValid<T extends TSchema>(schema: T, payload: unknown): void;
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
export declare function assertCryptoBearingFailsByDefault<T extends TSchema>(schema: T, payload: unknown): void;
//# sourceMappingURL=crypto-bearing-helpers.d.ts.map