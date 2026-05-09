/**
 * `canonical_size_cap` LOCAL constraint builtin (NFR-4, v8.6.0).
 *
 * Pure-shape check: returns `valid: true` when the input value's
 * RFC 8785 + NFC-normalized canonical-JSON byte length is ≤ the cap;
 * `valid: false` with a `CANONICAL_SIZE_CAP_EXCEEDED` diagnostic
 * otherwise.
 *
 * **LOCAL** because the cap is a property of the value alone — no
 * consumer-supplied state is needed (unlike FR-C1/C2/C3 which require
 * sliding-window history, sequence state, or audit ledger). The
 * builtin is registered in `EVALUATOR_BUILTINS` alongside the FR-C
 * builtins and surfaces the same diagnostic-vs-DSL split (DSL wrapper
 * returns boolean; standalone evaluator returns structured diagnostic).
 *
 * @see SDD §3.13 — NFR-4 4 KB cap refinement
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B2 / NFR-4 (PR-A3.4)
 */
import { canonicalByteLength, CANONICAL_SIZE_CAP_BYTES, } from '../../utilities/canonical-size-cap.js';
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parseCanonicalSizeCap()` returns a
 * boolean; direct callers wanting the structured diagnostic should
 * use this entry point.
 *
 * Argument shape (DSL surface):
 *   `canonical_size_cap(value, byte_cap)`
 *
 * @param value - The value whose canonical-JSON form is bounded.
 * @param byteCap - Cap in bytes (default 4096 per NFR-4). When the
 *                  schema declares `'x-canonical-size-cap-bytes'` in
 *                  its TypeBox metadata, that value is the
 *                  authoritative cap; the constraint file passes it
 *                  through to this builtin.
 */
export function evaluateCanonicalSizeCap(value, byteCap = CANONICAL_SIZE_CAP_BYTES) {
    if (typeof byteCap !== 'number' ||
        !Number.isFinite(byteCap) ||
        byteCap <= 0 ||
        !Number.isInteger(byteCap)) {
        // Iter-2 LOW F7 mitigation: reject byteCap ≤ 0 as INVALID_INPUT
        // rather than letting cap=0 silently produce CANONICAL_SIZE_CAP_EXCEEDED
        // (every non-empty value canonicalizes to ≥2 bytes, so cap=0 is a
        // degenerate case that always fires EXCEEDED — masking the
        // programmer-error class). Cap=0 is meaningless for a size cap;
        // surface it explicitly.
        return {
            valid: false,
            diagnostic: {
                code: 'CANONICAL_SIZE_CAP_INVALID_INPUT',
                message: `canonical_size_cap: byte_cap must be a positive integer; ` +
                    `received ${typeof byteCap === 'number' ? byteCap : typeof byteCap}. ` +
                    `Cap=0 is a degenerate case (every non-empty value exceeds it) ` +
                    `and is rejected as a programmer-error signal.`,
            },
        };
    }
    let actualBytes;
    try {
        actualBytes = canonicalByteLength(value);
    }
    catch (err) {
        return {
            valid: false,
            diagnostic: {
                code: 'CANONICAL_SIZE_CAP_INVALID_INPUT',
                message: `canonical_size_cap: safeCanonicalize rejected the input — ` +
                    `${err instanceof Error ? err.message : String(err)}.`,
                cap_bytes: byteCap,
            },
        };
    }
    if (actualBytes > byteCap) {
        return {
            valid: false,
            diagnostic: {
                code: 'CANONICAL_SIZE_CAP_EXCEEDED',
                message: `canonical_size_cap: canonical-JSON byte length ${actualBytes} ` +
                    `exceeds cap ${byteCap}. Reduce the payload size or split ` +
                    `across multiple envelopes.`,
                actual_bytes: actualBytes,
                cap_bytes: byteCap,
            },
        };
    }
    return { valid: true };
}
//# sourceMappingURL=canonical-size-cap.js.map