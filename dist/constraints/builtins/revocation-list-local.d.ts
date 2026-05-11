/**
 * LOCAL helper functions for `RevocationListSchema` (FR-G4, v8.7.0).
 *
 * **LOCAL** = inline implementation called from a single schema's
 * cross-field validator path. NOT registered as a DSL evaluator
 * builtin in `EVALUATOR_BUILTINS`. NOT re-exported from any package
 * barrel. Consumers cannot reference these by name from constraint
 * expressions; the DSL surface remains v8.6.0.
 *
 * **Why LOCAL not DSL** (per SDD §4.6 + run-1 SKP-004 mitigation):
 * the cycle-005 cycle pattern reserves `evaluator: 'library'` for
 * generic primitives that cover ≥2 schemas. `fieldNotInArrayField`
 * (RL-5) and `fieldInArrayField` (RL-12) currently have one use
 * site each in cycle-007. Promotion gates on a second use site +
 * consumer-corpus signal of contract stability.
 *
 * **Test discipline**: each LOCAL helper has dedicated coverage in
 * `tests/constraints/revocation-list.constraints.test.ts` with
 * positive + adversarial cases (≥10 cases per helper).
 *
 * **Cross-schema reuse**: `arrayFieldDistinct` (cluster-run-series-
 * local, PR-A4.1) is reused for RL-1 + RL-12 — fourth and fifth use
 * sites, closing the SDD §4.6 promotion threshold for that primitive.
 * `iso8601GeField` (subscription-pool-state-local, PR-A4.3) is reused
 * for RL-7 + RL-9 + RL-10 — second, third, fourth use sites; the
 * fixed-fractional-precision precondition added in PR-A4.3 iter-1
 * applies uniformly. Both helpers' DSL promotion is the planned
 * cycle-007 follow-up; cycle-007 ships LOCAL.
 *
 * @internal Not part of the public DSL surface.
 * @see SDD §4.6 — LOCAL Helper Functions.
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
/**
 * `fieldNotInArrayField` — predicate: a scalar field value MUST NOT
 * equal any per-element field value within a named array.
 *
 * Used by RL-5: `signer_key_id` MUST NOT appear in
 * `revoked_keys[*].key_id`. Prevents the trivial "key revokes itself"
 * self-revocation bypass — a compromised key cannot conceal its own
 * compromise by listing itself in the same envelope.
 *
 * **Defensive contract**: malformed inputs (non-string scalar,
 * non-array, non-object array elements, missing per-element field,
 * non-string per-element field value) return `{ valid: true }` —
 * the caller's structural tier handles non-array shape rejection.
 * Direct callers bypassing Value.Check thus receive a meaningful
 * predicate signal even when the structural shape is wrong; the
 * structural-precondition error is the caller's signal that
 * something is wrong with the input shape.
 *
 * **Why valid:true on missing/malformed inputs**: the contract
 * mirrors `arrayFieldDistinct` defensive contract — under standard
 * `validate(...)`, the structural tier rejects non-array `array` or
 * non-string `scalarValue` first. Returning a tagged precondition
 * violation would conflate structural-shape errors with predicate-
 * semantic errors; the wrapper layers separately.
 *
 * @param scalarValue — the scalar field's value to check against the
 *   array. Non-string returns valid:true.
 * @param array — the array to scan. Non-array returns valid:true.
 * @param fieldName — the per-element field name within array entries.
 * @returns `{ valid, matchedIndex? }`; `matchedIndex` is set only
 *   when valid is false, naming the first index where the per-
 *   element field equals scalarValue.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export declare function fieldNotInArrayField(scalarValue: unknown, array: unknown, fieldName: string): {
    valid: boolean;
    matchedIndex?: number;
};
/**
 * `fieldInArrayField` — predicate: a scalar field value MUST equal at
 * least one per-element field value within a named array. Inverse of
 * `fieldNotInArrayField`.
 *
 * Used by RL-12: when `quorum_signatures` is non-null, `signer_key_id`
 * MUST appear in `quorum_signatures[*].signer_key_id`. Prevents the
 * "quorum without the primary signer" inconsistency — the single-
 * signer signature MUST be one of the quorum signatures.
 *
 * **Defensive contract**: mirrors `fieldNotInArrayField` — non-string
 * scalar OR non-array returns `{ valid: false }` because the predicate
 * cannot be satisfied without a well-shaped haystack. This asymmetry
 * is deliberate: a "MUST be in" predicate without a non-empty,
 * well-shaped array CANNOT hold, so the structural-precondition
 * failure surfaces as the predicate failure. Callers should only
 * invoke this helper after confirming the array exists and is
 * well-shaped per the wrapper's structural-precondition checks.
 *
 * **Empty array returns valid:false**: by definition no element can
 * match. The RL-12 wrapper guards `quorum_signatures` not-null AND
 * non-empty before invocation.
 *
 * @param scalarValue — the scalar field's value to check membership
 *   against the array. Non-string returns valid:false.
 * @param array — the array to scan. Non-array OR empty returns
 *   valid:false.
 * @param fieldName — the per-element field name within array entries.
 * @returns `{ valid }`; `valid` is true iff at least one well-shaped
 *   array element has the per-element field equal to scalarValue.
 *
 * @since v8.7.0 — FR-G4 (PR-A4.4).
 */
export declare function fieldInArrayField(scalarValue: unknown, array: unknown, fieldName: string): {
    valid: boolean;
};
//# sourceMappingURL=revocation-list-local.d.ts.map