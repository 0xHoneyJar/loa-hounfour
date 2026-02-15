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
