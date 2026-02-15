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
 * A single cross-field constraint with an evaluable expression.
 */
export interface Constraint {
  /** Unique identifier for this constraint (e.g. 'escrow-no-self-escrow'). */
  id: string;
  /** Expression in the constraint mini-language. */
  expression: string;
  /** Severity: 'error' fails validation, 'warning' is advisory. */
  severity: 'error' | 'warning';
  /** Human-readable message when constraint is violated. */
  message: string;
  /** Fields referenced by this constraint (for documentation / tooling). */
  fields: string[];
}

/**
 * Top-level constraint file structure.
 */
export interface ConstraintFile {
  /** JSON Schema URI for the constraint file format itself. */
  $schema: string;
  /** Schema $id this constraint file applies to. */
  schema_id: string;
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
export const EXPRESSION_VERSIONS_SUPPORTED: readonly string[] = ['1.0', '2.0'];

export function expressionVersionSupported(version: string): boolean {
  const [major] = version.split('.').map(Number);
  // Current evaluator is v2.0 — supports 1.x and 2.x
  return major >= 1 && major <= 2;
}
