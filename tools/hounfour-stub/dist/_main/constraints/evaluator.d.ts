/**
 * Minimal constraint expression evaluator for round-trip testing.
 *
 * Supports a small expression language sufficient to evaluate
 * the constraint files in `constraints/`. This is NOT a general-purpose
 * expression engine — it handles exactly the operators used in cross-field
 * constraint expressions.
 *
 * Operators:
 * - `==`, `!=`, `<`, `>`, `<=`, `>=` (comparisons)
 * - `&&`, `||`, `!` (boolean)
 * - `== null`, `!= null` (null/undefined checks)
 * - `=> ` (implication: A => B is equivalent to !A || B)
 * - `'literal'` (string literals)
 * - `field.nested` (dot-access)
 * - `bigint_sum(array, field)` or `bigint_sum([expr1, expr2])` (sum)
 * - `bigint_gte(a, b)` (BigInt greater-than-or-equal)
 * - `bigint_gt(a, b)` (BigInt greater-than)
 * - `array.length` (length access)
 * - `array.every(expr)` (universal quantification)
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */
export declare const MAX_EXPRESSION_DEPTH = 32;
/**
 * Optional context for constraint evaluation.
 *
 * Enables deterministic replay by providing a frozen evaluation timestamp
 * that `now()` will use instead of the real clock. Without this, constraints
 * containing `now()` cannot be replayed faithfully — evaluating the same
 * expression tomorrow produces a different result.
 *
 * @see DR-F3 — now() replay non-determinism
 * @since v7.8.0
 */
export interface EvaluationContext {
    /** ISO 8601 timestamp to use for now(). Enables deterministic replay. */
    evaluation_timestamp?: string;
    /**
     * Feature flags for conditional constraint evaluation.
     * When a constraint has a `condition.when` field, the flag is looked up here.
     * @since v8.3.0 — FR-6 Conditional Constraints
     */
    feature_flags?: Record<string, boolean>;
    /**
     * Per-signer nonce-window state for the FR-C1
     * `nonce_unique_per_signer_window` builtin. When supplied, the builtin
     * cross-checks the validating record's nonce against the signer's
     * historical set; when unset, the builtin defers to consumer-side
     * evaluation via the `NONCE_CONTEXT_DEFERRED` diagnostic.
     * @since v8.6.0 — FR-C1 (PR-A3.3)
     */
    nonce_window?: import('./builtins/nonce-unique-per-signer-window.js').NonceWindowState;
    /**
     * Per-cluster sequence-monotonicity state for the FR-C2
     * `sequence_monotonic_per_cluster` builtin. CT-08 cluster-id mismatch
     * fires BEFORE any state-map lookup so cross-cluster lookups cannot
     * succeed silently.
     * @since v8.6.0 — FR-C2 (PR-A3.3)
     */
    sequence_state?: import('./builtins/sequence-monotonic-per-cluster.js').SequenceClusterState;
    /**
     * Audit-ledger expected-prior-hash state for the FR-C3
     * `chain_validator_prev_hash` builtin. NA-1 cross-checks the chain's
     * on-payload `previous_hash` against the consumer's persistent ledger
     * expectation per chain index.
     * @since v8.6.0 — FR-C3 (PR-A3.3)
     */
    chain_ledger?: import('./builtins/chain-validator-prev-hash.js').ChainLedgerState;
    /**
     * Plan-signoff ledger snapshot for the FR-C4
     * `plan_content_hash_unchanged_since_signoff` builtin. The library
     * checks `plan_content_hash` membership and surfaces TTL inputs
     * via the manifest; consumer policy decides what "expired" means
     * (ADR-010). When unset, the obligation defers to consumer-side
     * evaluation via `LEDGER_CONTEXT_DEFERRED`.
     * @since v8.6.0 — FR-C4 (PR-A3.6)
     */
    plan_signoff_ledger?: import('./builtins/plan-content-hash-unchanged-since-signoff.js').PlanSignoffLedgerSnapshot;
}
/**
 * Canonical list of registered evaluator builtin functions.
 *
 * This is derived from the Parser constructor's function registry.
 * Useful for introspection, documentation, and conformance testing.
 */
export declare const EVALUATOR_BUILTINS: readonly ["bigint_sum", "bigint_gte", "bigint_gt", "bigint_eq", "bigint_sub", "bigint_add", "eq", "all_links_subset_authority", "delegation_budget_conserved", "links_temporally_ordered", "links_form_chain", "no_emergent_in_individual", "all_emergent_have_evidence", "object_keys_subset", "changed", "previous", "delta", "len", "type_of", "is_bigint_coercible", "unique_values", "tree_budget_conserved", "tree_authority_narrowing", "saga_amount_conserved", "saga_steps_sequential", "outcome_consensus_valid", "monetary_policy_solvent", "permission_boundary_active", "proposal_quorum_met", "saga_timeout_valid", "proposal_weights_normalized", "is_after", "is_before", "is_between", "is_stale", "is_within", "constraint_lifecycle_valid", "proposal_execution_valid", "now", "model_routing_eligible", "basket_weights_normalized", "execution_checkpoint_valid", "audit_trail_chain_valid", "is_valid_dag", "nonce_unique_per_signer_window", "sequence_monotonic_per_cluster", "chain_validator_prev_hash", "canonical_size_cap", "signer_key_id_matches_derivation", "percentiles_monotonic_nondecreasing", "utf8_byte_length_max", "plan_content_hash_unchanged_since_signoff"];
export type EvaluatorBuiltin = typeof EVALUATOR_BUILTINS[number];
/**
 * Reserved names in the evaluator namespace.
 *
 * Includes all builtin function names plus language keywords that cannot be
 * used as constraint field names without risking collision. Consumer schemas
 * should validate that their field names do not appear in this set.
 *
 * @see DR-F4 — Namespace collision surface
 * @since v7.8.0
 */
export declare const RESERVED_EVALUATOR_NAMES: ReadonlySet<string>;
/**
 * Evaluate a constraint expression against a data object.
 *
 * Returns `true` when the constraint is satisfied (no violation),
 * `false` when violated.
 *
 * @param data - The document to evaluate against
 * @param expression - Constraint expression string
 * @param context - Optional evaluation context for deterministic replay (DR-F3)
 * @returns Whether the constraint passes
 */
export declare function evaluateConstraint(data: Record<string, unknown>, expression: string, context?: EvaluationContext): boolean;
/**
 * Resolve the effective expression for a constraint, applying conditional logic.
 *
 * When a constraint has a `condition.when` field:
 * - If the feature flag is active in context.feature_flags AND override_text is provided,
 *   returns the override expression.
 * - Otherwise returns the original expression.
 *
 * Nested conditions (condition on a constraint whose expression was itself an override)
 * are rejected at runtime.
 *
 * @param constraint - Constraint object with optional condition
 * @param context - Evaluation context with optional feature_flags
 * @returns Effective expression string to evaluate
 * @since v8.3.0 — FR-6 Conditional Constraints
 */
export declare function resolveConditionalExpression(constraint: {
    expression: string;
    condition?: {
        when: string;
        override_text?: string;
    };
}, context?: EvaluationContext): string;
//# sourceMappingURL=evaluator.d.ts.map