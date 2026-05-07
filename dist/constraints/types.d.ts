/**
 * Cross-language constraint file format.
 *
 * Constraint files encode the same cross-field invariants as TypeScript validators
 * in a language-agnostic JSON format. Non-TypeScript consumers can parse these
 * files and enforce the same rules.
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */
/**
 * Structured metadata for constraints that require runtime enforcement
 * beyond what the expression DSL can express.
 *
 * When a constraint's `expression` is `"true"` (sentinel), the
 * `native_enforcement` field documents exactly what runtime consumers
 * must enforce and provides a machine-readable strategy.
 *
 * @since v7.10.1 — code review Finding 2 (ADR-002)
 */
export interface NativeEnforcement {
    /** Named strategy pattern (e.g. 'composite_key_uniqueness'). */
    strategy: string;
    /** Fields involved in the native check. */
    fields: string[];
    /** Array field the check applies to (when strategy operates over a collection). */
    scope?: string;
    /** Function name of the TypeScript reference implementation. */
    reference_impl: string;
}
/**
 * Conditional constraint activation — evaluate constraint only when feature flag is active.
 *
 * When `when` feature flag is present and true in EvaluationContext.feature_flags:
 * - If override_text is provided, evaluate override_text instead of original expression
 *
 * When flag is absent or false, the original expression is evaluated unchanged.
 *
 * @see PRD FR-6 — Conditional Constraints
 * @see SDD §6.6 — Conditional Constraints
 * @since v8.3.0
 */
export interface ConstraintCondition {
    /** Feature flag name to check in EvaluationContext.feature_flags. */
    when: string;
    /** Override expression to evaluate when flag is active. */
    override_text?: string;
}
/**
 * A single cross-field constraint with an evaluable expression.
 */
export interface Constraint {
    /** Unique identifier for this constraint (e.g. 'escrow-no-self-escrow'). */
    id: string;
    /** Expression in the constraint mini-language. */
    expression: string;
    /** Severity: 'error' fails validation, 'warning' is advisory, 'info' is guidance. */
    severity: 'error' | 'warning' | 'info';
    /** Human-readable message when constraint is violated. */
    message: string;
    /** Fields referenced by this constraint (for documentation / tooling). */
    fields: string[];
    /**
     * Conditional activation — evaluate constraint differently based on feature flags.
     * Nested conditions are rejected at runtime.
     * @since v8.3.0 — FR-6 Conditional Constraints
     */
    condition?: ConstraintCondition;
    /**
     * Evaluation strategy for this constraint.
     * - `'expression'` (default): evaluate the `expression` field using the constraint DSL.
     * - `'native'`: the `expression` field is ignored; `native_enforcement` provides the spec.
     *
     * Omitted = `'expression'` for backward compatibility.
     * @since v7.11.0 — code review Meditation IV
     */
    evaluation_geometry?: 'expression' | 'native';
    /**
     * Structured metadata for constraints that cannot be expressed in the DSL.
     * When present, `evaluation_geometry` SHOULD be `"native"` and this field
     * provides the machine-readable enforcement specification.
     *
     * @since v7.10.1 — code review Finding 2 (ADR-002)
     */
    native_enforcement?: NativeEnforcement;
    /**
     * Two-tier evaluator strategy.
     *
     * - `'library'` (default): the rule is library-evaluated by the constraint
     *   engine. Standard constraint expression behaviour applies.
     * - `'runtime-deferred'`: the rule documents a consumer-side obligation that
     *   the library cannot evaluate (cryptographic verification, cross-record
     *   state, temporal append-only invariants, etc.). The library evaluator
     *   SKIPS such rules during validation but surfaces them in the
     *   `UnverifiedObligationsManifest` returned by `validate(...)`.
     *
     * Omitted = `'library'` for backward compatibility — pre-v8.4.0 constraint
     * files have no `evaluator` key and continue to be library-evaluated.
     *
     * @see SDD section 3.6.0 — Two-tier evaluator pattern
     * @since v8.4.0 — FR-C1 (deliberation + OrgOverseer constraint files
     * use `runtime-deferred` for ORD-1, ORD-2)
     */
    evaluator?: 'library' | 'runtime-deferred';
    /**
     * Human-readable explanation of the consumer obligation. REQUIRED when
     * `evaluator === 'runtime-deferred'`; surfaced verbatim in the
     * `UnverifiedObligationsManifest` so consumers see the obligation text at
     * validation time.
     *
     * Authors of `runtime-deferred` rules MUST describe what the consumer's
     * runtime is expected to enforce, where the verification profile is
     * documented, and why the rule cannot be library-evaluated. Pure narrative
     * is acceptable; the field carries documentation, not a parseable
     * expression.
     *
     * @since v8.4.0 — FR-C1
     */
    evaluation_note?: string;
}
/**
 * Constitutional provenance of a constraint file.
 * - `genesis`: present since the protocol's founding (bootstrapped)
 * - `enacted`: added through a formal governance proposal
 * - `migrated`: imported from another protocol or system
 *
 * Files without an explicit `origin` default to `'genesis'` interpretation.
 *
 * @governance protocol-fixed
 * @since v7.9.0 — FR-6 ConstraintOrigin
 */
export type ConstraintOrigin = 'genesis' | 'enacted' | 'migrated';
/**
 * Top-level constraint file structure.
 */
export interface ConstraintFile {
    /** JSON Schema URI for the constraint file format itself. */
    $schema: string;
    /** Schema $id this constraint file applies to. */
    schema_id: string;
    /** Constitutional provenance of this constraint file. Defaults to 'genesis'. */
    origin?: ConstraintOrigin;
    /** Protocol contract version these constraints were authored against. */
    contract_version: string;
    /** Grammar version for constraint expressions (e.g. '1.0'). */
    expression_version: string;
    /** Array of cross-field constraints. */
    constraints: Constraint[];
}
/**
 * Check whether a constraint file's expression_version is supported by the
 * current evaluator. v1.x expressions are backward-compatible with v2.0+.
 * v2.x expressions require a v2.0+ evaluator.
 *
 * @param version - Expression version string (e.g. '1.0', '2.0')
 * @returns true if the current evaluator supports this version
 */
/**
 * All expression grammar versions supported by the current evaluator.
 * Used by protocol-discovery to advertise compatibility during version negotiation.
 */
export declare const EXPRESSION_VERSIONS_SUPPORTED: readonly string[];
export declare function expressionVersionSupported(version: string): boolean;
//# sourceMappingURL=types.d.ts.map