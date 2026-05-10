/**
 * LOCAL helper functions for `ClusterRunSeriesSchema` (FR-G1, v8.7.0).
 *
 * **LOCAL** = inline implementation called from a single schema's
 * cross-field validator path. NOT registered as a DSL evaluator
 * builtin in `EVALUATOR_BUILTINS`. NOT re-exported from any package
 * barrel. Consumers cannot reference these by name from constraint
 * expressions; the DSL surface remains v8.6.0.
 *
 * **Why LOCAL not DSL** (per SDD §4.6 + run-1 SKP-004 mitigation):
 * the cycle-005 cycle pattern reserves `evaluator: 'library'` for
 * generic primitives that cover ≥2 schemas (cf. `chain_validator_prev_hash`,
 * `signer_key_id_matches_derivation`). Promoting a helper to the DSL
 * adds public-API surface (Hyrum's-Law footprint) and bumps the
 * widening discipline of cycle-007. Inline-only keeps the surface
 * tight; promotion gates on consumer-corpus signal warranting the
 * generic primitive.
 *
 * **Promotion gate** (when these become DSL builtins): a second
 * schema-level use site lands AND consumer corpus signals that the
 * primitive's contract is stable (no per-schema parameter
 * proliferation). At that point: (a) move the helper into a generic
 * `<helper-name>.ts` file in this directory; (b) export from the
 * builtins barrel; (c) register in `EVALUATOR_BUILTINS`; (d) update
 * the constraint-file entries to `evaluator: 'library'`. Until then,
 * each LOCAL helper is per-schema with its own unit-test suite.
 *
 * **Test discipline**: each LOCAL helper has dedicated coverage in
 * `tests/constraints/builtins/cluster-run-series-local.test.ts` with
 * positive + adversarial cases (≥10 cases per helper).
 *
 * @internal Not part of the public DSL surface.
 * @see SDD §4.6 — LOCAL Helper Functions.
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
/**
 * `arrayFieldDistinct` — per-element distinctness check on a named
 * child field within an array of objects.
 *
 * Used by CRS-4 (`repos[*].repo_slug` distinct within a series). Will
 * be reused by ISSA-2, SPS-2, RL-1, RL-12 in PR-A4.2..A4.5.
 *
 * **Defensive contract**: malformed elements (non-object, missing
 * field, non-string field value) are skipped — they trip the
 * structural tier first under standard `validate(...)`. Direct callers
 * bypassing Value.Check receive `valid: true, duplicates: []` for an
 * all-malformed payload because there are no observed duplicate
 * field-values to surface; the structural-precondition error is the
 * caller's signal that something is wrong with the input shape.
 *
 * @param array — input array; non-array input returns valid:true with
 *   empty duplicates (the caller's structural tier handles non-array
 *   shape rejection).
 * @param fieldName — the per-element field to check for distinctness.
 * @returns `{ valid, duplicates }` where each duplicate entry pairs a
 *   value with the indices at which it appeared.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export function arrayFieldDistinct(array, fieldName) {
    if (!Array.isArray(array)) {
        return { valid: true, duplicates: [] };
    }
    const indexByValue = new Map();
    for (let i = 0; i < array.length; i += 1) {
        const entry = array[i];
        if (entry === null || typeof entry !== 'object' || Array.isArray(entry)) {
            continue;
        }
        const value = entry[fieldName];
        if (typeof value !== 'string') {
            continue;
        }
        const existing = indexByValue.get(value);
        if (existing) {
            existing.push(i);
        }
        else {
            indexByValue.set(value, [i]);
        }
    }
    const duplicates = [];
    for (const [value, indices] of indexByValue) {
        if (indices.length > 1) {
            duplicates.push({ value, indices });
        }
    }
    return { valid: duplicates.length === 0, duplicates };
}
/**
 * `failureModeIffFailedStatus` — per-element predicate enforcing
 * `failure_mode != null ↔ epic_status === 'failed'`.
 *
 * Used by CRS-2. Per-element: when `epic_status` is `'failed'`,
 * `failure_mode` MUST be a non-null string; for any other status,
 * `failure_mode` MUST be null.
 *
 * **Defensive contract**: an out-of-vocab `epic_status` (rejected by
 * Value.Check at the structural tier) is treated as "not the failed
 * literal", so `failure_mode` MUST be null for the predicate to hold.
 * Direct callers bypassing Value.Check thus receive a meaningful
 * cross-field signal even when the structural shape is wrong.
 *
 * @param epicStatus — the per-entry `epic_status` field value.
 * @param failureMode — the per-entry `failure_mode` field value.
 * @returns `{ valid, reason }`; `reason` is set only when valid is
 *   false, naming which side of the iff failed.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export function failureModeIffFailedStatus(epicStatus, failureMode) {
    const isFailed = epicStatus === 'failed';
    const hasFailureMode = failureMode !== null && failureMode !== undefined;
    if (isFailed && !hasFailureMode) {
        return {
            valid: false,
            reason: 'epic_status is "failed" but failure_mode is null — failed entries MUST carry a failure_mode classifier (CRS-2).',
        };
    }
    if (!isFailed && hasFailureMode) {
        return {
            valid: false,
            reason: `epic_status is "${String(epicStatus)}" (not "failed") but failure_mode is non-null — failure_mode MUST be null when epic_status ≠ "failed" (CRS-2).`,
        };
    }
    return { valid: true };
}
//# sourceMappingURL=cluster-run-series-local.js.map