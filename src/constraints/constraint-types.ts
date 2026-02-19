/**
 * Constraint Type System — static type signatures for constraint expressions.
 *
 * Enables compile-time (CI-time) verification that constraint expressions
 * reference valid schema fields with correct types, catching errors before
 * runtime evaluation.
 *
 * @see SDD §2.3.1 — ConstraintType Vocabulary
 * @see SDD §2.3.2 — ConstraintTypeSignature Schema
 * @since v6.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Constraint type — the type universe for constraint expression operands.
 *
 * These types describe the runtime values that constraint expressions manipulate:
 * - boolean: logical values (constraint expression results)
 * - bigint: arbitrary-precision integers (MicroUSD amounts)
 * - bigint_coercible: strings that can be converted to BigInt
 * - string: text values (IDs, statuses, timestamps)
 * - number: floating-point numbers (weights, percentages)
 * - array: ordered collections
 * - object: key-value records
 * - unknown: unresolvable or dynamic types
 */
export const ConstraintTypeSchema = Type.Union(
  [
    Type.Literal('boolean'),
    Type.Literal('bigint'),
    Type.Literal('bigint_coercible'),
    Type.Literal('string'),
    Type.Literal('number'),
    Type.Literal('array'),
    Type.Literal('object'),
    Type.Literal('unknown'),
  ],
  {
    $id: 'ConstraintType',
    description: 'Type universe for constraint expression operands (v6.0.0).',
  },
);

export type ConstraintType = Static<typeof ConstraintTypeSchema>;

export const CONSTRAINT_TYPES = [
  'boolean', 'bigint', 'bigint_coercible', 'string', 'number', 'array', 'object', 'unknown',
] as const;

/**
 * Type signature for a single constraint expression.
 *
 * Captures the schema context and field types that the expression operates on,
 * enabling static verification without evaluating the expression.
 */
export const ConstraintTypeSignatureSchema = Type.Object(
  {
    input_schema: Type.String({
      minLength: 1,
      description: 'Schema $id that this constraint applies to.',
    }),
    output_type: ConstraintTypeSchema,
    field_types: Type.Record(Type.String(), ConstraintTypeSchema, {
      description: 'Map of field paths to their constraint types.',
    }),
  },
  {
    $id: 'ConstraintTypeSignature',
    additionalProperties: false,
    description: 'Static type signature for a constraint expression (v6.0.0).',
  },
);

export type ConstraintTypeSignature = Static<typeof ConstraintTypeSignatureSchema>;

// ---------------------------------------------------------------------------
// Constraint AST Node — Discriminated Union (F-020 resolution)
// ---------------------------------------------------------------------------

/**
 * Discriminated union representing all possible AST node shapes
 * produced by the constraint expression parser.
 *
 * This types the intermediate representation without changing
 * evaluation semantics — the parser still evaluates inline,
 * but the boundary return type is no longer `any`.
 *
 * @see SDD §2.1.3 — F-020 resolution
 * @since v7.0.0
 */
export type ConstraintASTNode =
  | { readonly kind: 'literal'; readonly value: string | number | boolean | null }
  | { readonly kind: 'identifier'; readonly name: string }
  | { readonly kind: 'member_access'; readonly object: string; readonly property: string }
  | { readonly kind: 'function_call'; readonly name: string; readonly args: readonly ConstraintASTNode[] }
  | { readonly kind: 'binary_op'; readonly op: string; readonly left: ConstraintASTNode; readonly right: ConstraintASTNode }
  | { readonly kind: 'unary_op'; readonly op: string; readonly operand: ConstraintASTNode }
  | { readonly kind: 'array_literal'; readonly elements: readonly ConstraintASTNode[] }
  | { readonly kind: 'every'; readonly array: string; readonly predicate: string };
