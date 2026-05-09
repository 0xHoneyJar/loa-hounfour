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
import { type Static } from '@sinclair/typebox';
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
export declare const ConstraintTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"boolean">, import("@sinclair/typebox").TLiteral<"bigint">, import("@sinclair/typebox").TLiteral<"bigint_coercible">, import("@sinclair/typebox").TLiteral<"string">, import("@sinclair/typebox").TLiteral<"number">, import("@sinclair/typebox").TLiteral<"array">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"unknown">]>;
export type ConstraintType = Static<typeof ConstraintTypeSchema>;
export declare const CONSTRAINT_TYPES: readonly ["boolean", "bigint", "bigint_coercible", "string", "number", "array", "object", "unknown"];
/**
 * Type signature for a single constraint expression.
 *
 * Captures the schema context and field types that the expression operates on,
 * enabling static verification without evaluating the expression.
 */
export declare const ConstraintTypeSignatureSchema: import("@sinclair/typebox").TObject<{
    input_schema: import("@sinclair/typebox").TString;
    output_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"boolean">, import("@sinclair/typebox").TLiteral<"bigint">, import("@sinclair/typebox").TLiteral<"bigint_coercible">, import("@sinclair/typebox").TLiteral<"string">, import("@sinclair/typebox").TLiteral<"number">, import("@sinclair/typebox").TLiteral<"array">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"unknown">]>;
    field_types: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"boolean">, import("@sinclair/typebox").TLiteral<"bigint">, import("@sinclair/typebox").TLiteral<"bigint_coercible">, import("@sinclair/typebox").TLiteral<"string">, import("@sinclair/typebox").TLiteral<"number">, import("@sinclair/typebox").TLiteral<"array">, import("@sinclair/typebox").TLiteral<"object">, import("@sinclair/typebox").TLiteral<"unknown">]>>;
}>;
export type ConstraintTypeSignature = Static<typeof ConstraintTypeSignatureSchema>;
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
export type ConstraintASTNode = {
    readonly kind: 'literal';
    readonly value: string | number | boolean | null;
} | {
    readonly kind: 'identifier';
    readonly name: string;
} | {
    readonly kind: 'member_access';
    readonly object: string;
    readonly property: string;
} | {
    readonly kind: 'function_call';
    readonly name: string;
    readonly args: readonly ConstraintASTNode[];
} | {
    readonly kind: 'binary_op';
    readonly op: string;
    readonly left: ConstraintASTNode;
    readonly right: ConstraintASTNode;
} | {
    readonly kind: 'unary_op';
    readonly op: string;
    readonly operand: ConstraintASTNode;
} | {
    readonly kind: 'array_literal';
    readonly elements: readonly ConstraintASTNode[];
} | {
    readonly kind: 'every';
    readonly array: string;
    readonly predicate: string;
};
//# sourceMappingURL=constraint-types.d.ts.map