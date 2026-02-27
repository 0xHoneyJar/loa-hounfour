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
}
/**
 * Canonical list of registered evaluator builtin functions.
 *
 * This is derived from the Parser constructor's function registry.
 * Useful for introspection, documentation, and conformance testing.
 */
export declare const EVALUATOR_BUILTINS: readonly ["bigint_sum", "bigint_gte", "bigint_gt", "bigint_eq", "bigint_sub", "bigint_add", "eq", "all_links_subset_authority", "delegation_budget_conserved", "links_temporally_ordered", "links_form_chain", "no_emergent_in_individual", "all_emergent_have_evidence", "object_keys_subset", "changed", "previous", "delta", "len", "type_of", "is_bigint_coercible", "unique_values", "tree_budget_conserved", "tree_authority_narrowing", "saga_amount_conserved", "saga_steps_sequential", "outcome_consensus_valid", "monetary_policy_solvent", "permission_boundary_active", "proposal_quorum_met", "saga_timeout_valid", "proposal_weights_normalized", "is_after", "is_before", "is_between", "is_stale", "is_within", "constraint_lifecycle_valid", "proposal_execution_valid", "now", "model_routing_eligible", "basket_weights_normalized", "execution_checkpoint_valid", "audit_trail_chain_valid"];
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
//# sourceMappingURL=evaluator.d.ts.map