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
export function evaluatePercentilesMonotonicNondecreasing(measurements) {
    if (measurements === null ||
        typeof measurements !== 'object' ||
        Array.isArray(measurements)) {
        return {
            valid: false,
            diagnostic: {
                code: 'PERCENTILES_MONOTONIC_INVALID_INPUT',
                message: 'percentiles_monotonic_nondecreasing: measurements argument must ' +
                    'be a non-array object containing p50_ms, p95_ms, p99_ms, and max_ms.',
            },
        };
    }
    const m = measurements;
    const fields = ['p50_ms', 'p95_ms', 'p99_ms', 'max_ms'];
    for (const f of fields) {
        if (typeof m[f] !== 'number' || !Number.isFinite(m[f])) {
            return {
                valid: false,
                diagnostic: {
                    code: 'PERCENTILES_MONOTONIC_INVALID_INPUT',
                    message: `percentiles_monotonic_nondecreasing: ${f} must be a finite ` +
                        `number; received ${typeof m[f]}.`,
                },
            };
        }
        // PR-A3.5 iter-1 F-003: latencies are by definition non-negative.
        // The schema declares minimum: 0, but constraint-evaluation may run
        // independently of schema validation (consumer-side replay), so the
        // builtin enforces the floor itself rather than relying on a
        // structural pre-pass that may not run.
        if (m[f] < 0) {
            return {
                valid: false,
                diagnostic: {
                    code: 'PERCENTILES_MONOTONIC_INVALID_INPUT',
                    message: `percentiles_monotonic_nondecreasing: ${f} must be ≥ 0; ` +
                        `received ${m[f]}. Latency percentiles cannot be negative.`,
                },
            };
        }
    }
    const p50 = m.p50_ms;
    const p95 = m.p95_ms;
    const p99 = m.p99_ms;
    const max = m.max_ms;
    // Check the three monotonicity transitions in order; report the
    // FIRST violation so operators see the specific failing pair.
    const checks = [
        ['p50_ms', 'p95_ms', p50, p95],
        ['p95_ms', 'p99_ms', p95, p99],
        ['p99_ms', 'max_ms', p99, max],
    ];
    for (const [lowerField, upperField, lower, upper] of checks) {
        if (lower > upper) {
            return {
                valid: false,
                diagnostic: {
                    code: 'PERCENTILES_MONOTONIC_VIOLATION',
                    message: `percentiles_monotonic_nondecreasing: ${lowerField} (${lower}ms) ` +
                        `> ${upperField} (${upper}ms). Latency percentiles MUST be ` +
                        `non-decreasing: p50_ms ≤ p95_ms ≤ p99_ms ≤ max_ms.`,
                    violation_pair: `${upperField} < ${lowerField}`,
                    values: { lower, upper, lower_field: lowerField, upper_field: upperField },
                },
            };
        }
    }
    return { valid: true };
}
//# sourceMappingURL=percentiles-monotonic-nondecreasing.js.map