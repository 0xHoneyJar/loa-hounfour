/**
 * Static Type Checker for constraint expressions.
 *
 * Validates constraint type signatures against the schema registry,
 * ensuring that expressions reference valid schemas and field paths
 * with correct types — catching errors at CI time.
 *
 * @see SDD §2.3.3 — Static Type Checker
 * @since v6.0.0
 */
import type { ConstraintType } from './constraint-types.js';
/**
 * Error found during type checking.
 */
export interface TypeCheckError {
    constraint_id: string;
    expression_fragment: string;
    expected_type: string;
    actual_type: string;
    message: string;
}
/**
 * Warning found during type checking (non-fatal).
 */
export interface TypeCheckWarning {
    constraint_id: string;
    message: string;
}
/**
 * Result of type-checking a constraint file.
 */
export interface TypeCheckResult {
    valid: boolean;
    errors: TypeCheckError[];
    warnings: TypeCheckWarning[];
}
/**
 * Schema registry entry for type checking.
 * Maps schema $id to the set of known field paths.
 */
export interface SchemaRegistryEntry {
    schema_id: string;
    fields: Map<string, ConstraintType>;
}
/**
 * Constraint with optional type_signature for checking.
 */
interface TypedConstraint {
    id: string;
    expression: string;
    fields?: string[];
    type_signature?: {
        input_schema?: string;
        output_type?: ConstraintType;
        field_types?: Record<string, string>;
    };
}
/**
 * Constraint file shape for type checking.
 */
interface TypedConstraintFile {
    schema_id: string;
    constraints: TypedConstraint[];
}
/**
 * Type-check a constraint file against a schema registry.
 *
 * Validates:
 * 1. The constraint file's schema_id exists in the registry
 * 2. Each constraint's type_signature.input_schema matches the file's schema_id
 * 3. Each constraint's type_signature.output_type is 'boolean' (constraint result)
 * 4. Each field path in type_signature.field_types is a recognized type
 *
 * @param constraintFile - The constraint file to check
 * @param schemaRegistry - Map of schema_id → SchemaRegistryEntry
 * @returns TypeCheckResult with errors and warnings
 */
export declare function typeCheckConstraintFile(constraintFile: TypedConstraintFile, schemaRegistry: Map<string, SchemaRegistryEntry>): TypeCheckResult;
export {};
//# sourceMappingURL=type-checker.d.ts.map