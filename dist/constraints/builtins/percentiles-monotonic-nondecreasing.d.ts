/**
 * `percentiles_monotonic_nondecreasing` LOCAL constraint builtin
 * (FR-B7, v8.6.0).
 *
 * Pure-shape check: returns `valid: true` when the four percentile
 * fields on a `LatencyHistogramEnvelope.measurements` object satisfy
 * `p50_ms ≤ p95_ms ≤ p99_ms ≤ max_ms`; `valid: false` with a
 * `PERCENTILES_MONOTONIC_VIOLATION` diagnostic otherwise.
 *
 * **LOCAL** because the property is evaluable from the envelope
 * content alone — no consumer-supplied state is needed (mirrors
 * `canonical_size_cap` and `signer_key_id_matches_derivation`
 * patterns).
 *
 * The diagnostic identifies the FIRST violating pair (e.g.,
 * `p95_ms < p50_ms`) so operators see the specific transition rather
 * than a generic "monotonicity violated" message. Floating-point
 * comparison is direct (no epsilon tolerance) — the schema declares
 * these fields as `Type.Number({ minimum: 0 })`, and the monotonicity
 * invariant is exact-equal-or-greater.
 *
 * @see SDD §3.9 — FR-B7 spec
 * @see SDD §4.6 — LOCAL helper builtins
 * @since v8.6.0 — FR-B7 (PR-A3.5)
 */
export type PercentilesMonotonicErrorCode = 'PERCENTILES_MONOTONIC_VIOLATION' | 'PERCENTILES_MONOTONIC_INVALID_INPUT';
export interface PercentilesMonotonicDiagnostic {
    code: PercentilesMonotonicErrorCode;
    message: string;
    /** The first violating pair (e.g., 'p95_ms < p50_ms'). */
    violation_pair?: string;
    /** The two values involved in the first violation. */
    values?: {
        lower: number;
        upper: number;
        lower_field: string;
        upper_field: string;
    };
}
export interface EvaluatePercentilesMonotonicResult {
    valid: boolean;
    diagnostic?: PercentilesMonotonicDiagnostic;
}
/**
 * Standalone evaluator. The constraint-DSL wrapper at
 * `src/constraints/evaluator.ts` `parsePercentilesMonotonicNondecreasing()`
 * returns a boolean; direct callers wanting the structured diagnostic
 * should use this entry point.
 *
 * Argument shape (DSL surface):
 *   `percentiles_monotonic_nondecreasing(measurements)`
 *
 * @param measurements - The `measurements` object from a
 *                       `LatencyHistogramEnvelope`. Must contain four
 *                       finite non-negative numeric fields:
 *                       `p50_ms`, `p95_ms`, `p99_ms`, `max_ms`.
 */
export declare function evaluatePercentilesMonotonicNondecreasing(measurements: unknown): EvaluatePercentilesMonotonicResult;
//# sourceMappingURL=percentiles-monotonic-nondecreasing.d.ts.map