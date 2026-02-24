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
 * @since v7.10.1 — Bridgebuilder Finding 2 (ADR-002)
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
   * Evaluation strategy for this constraint.
   * - `'expression'` (default): evaluate the `expression` field using the constraint DSL.
   * - `'native'`: the `expression` field is ignored; `native_enforcement` provides the spec.
   *
   * Omitted = `'expression'` for backward compatibility.
   * @since v7.11.0 — Bridgebuilder Meditation IV
   */
  evaluation_geometry?: 'expression' | 'native';
  /**
   * Structured metadata for constraints that cannot be expressed in the DSL.
   * When present, `evaluation_geometry` SHOULD be `"native"` and this field
   * provides the machine-readable enforcement specification.
   *
   * @since v7.10.1 — Bridgebuilder Finding 2 (ADR-002)
   */
  native_enforcement?: NativeEnforcement;
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
// Note: evaluation_geometry (v7.11.0) is a constraint-level field independent of
// expression grammar version. A constraint with evaluation_geometry: "native" can
// appear in any expression_version file — the field controls evaluation strategy,
// not grammar compatibility.
export const EXPRESSION_VERSIONS_SUPPORTED: readonly string[] = ['1.0', '2.0'];

export function expressionVersionSupported(version: string): boolean {
  const [major] = version.split('.').map(Number);
  // Current evaluator is v2.0 — supports 1.x and 2.x
  return major >= 1 && major <= 2;
}
