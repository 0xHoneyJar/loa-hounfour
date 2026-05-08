/**
 * NFR-4 canonical-size-cap helper.
 *
 * Computes the byte length of the RFC 8785 + NFC-normalized canonical
 * JSON form of a value, used to enforce the 4 KB cap on the
 * FR-B2 `PhaseCompletionEnvelopeSchema` (and any other schema declaring
 * `'x-canonical-size-cap-bytes'` in its TypeBox metadata).
 *
 * **Not exported from `src/index.ts`** — internal to the constraint
 * evaluator. Re-exporting `canonicalize` itself would widen the
 * class-vs-policy boundary surface (ADR-010); the
 * `canonicalByteLength()` helper is the bounded API consumers need
 * for size-cap evaluation, and the LOCAL `canonical_size_cap` builtin
 * is the constraint-DSL-callable wrapper.
 *
 * @see SDD §3.13 — NFR-4 refinement
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
import { safeCanonicalize } from './safe-canonicalize.js';

/**
 * Default canonical-size cap in bytes (4 KB).
 *
 * Schemas declaring a different cap via the
 * `'x-canonical-size-cap-bytes'` TypeBox metadata override this; the
 * constant is the v8.6.0 default for any schema not declaring its own.
 */
export const CANONICAL_SIZE_CAP_BYTES = 4096;

/**
 * Compute the UTF-8 byte length of `value`'s canonical-JSON form.
 *
 * Uses `safeCanonicalize` (RFC 8785 JCS + NFC + key-collision detection)
 * with a 100 KB ceiling — far above the 4 KB cap, so the helper's
 * semantics never depend on the underlying canonicalize-time cap.
 * Throws if `safeCanonicalize` itself rejects (NFC malformed,
 * key collision, non-JSON-representable type) — the caller treats
 * the throw as a structural-input error rather than a cap violation.
 */
export function canonicalByteLength(value: unknown): number {
  const canon = safeCanonicalize(value);
  return Buffer.byteLength(canon, 'utf8');
}

/**
 * Convenience predicate: returns `true` if the value's canonical-JSON
 * byte length exceeds `cap` (default 4096).
 *
 * Used by the LOCAL `canonical_size_cap` constraint-DSL builtin
 * (see `src/constraints/builtins/canonical-size-cap.ts`).
 */
export function exceedsCanonicalCap(
  value: unknown,
  cap = CANONICAL_SIZE_CAP_BYTES,
): boolean {
  return canonicalByteLength(value) > cap;
}
