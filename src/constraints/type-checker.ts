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
export function typeCheckConstraintFile(
  constraintFile: TypedConstraintFile,
  schemaRegistry: Map<string, SchemaRegistryEntry>,
): TypeCheckResult {
  const errors: TypeCheckError[] = [];
  const warnings: TypeCheckWarning[] = [];

  // Check schema_id exists in registry
  const schemaEntry = schemaRegistry.get(constraintFile.schema_id);
  if (!schemaEntry) {
    errors.push({
      constraint_id: constraintFile.schema_id,
      expression_fragment: constraintFile.schema_id,
      expected_type: 'registered schema',
      actual_type: 'unknown',
      message: `Schema '${constraintFile.schema_id}' not found in registry`,
    });
    // Can still check individual constraints
  }

  for (const constraint of constraintFile.constraints) {
    if (!constraint.type_signature) {
      warnings.push({
        constraint_id: constraint.id,
        message: `Constraint '${constraint.id}' has no type_signature — cannot type-check`,
      });
      continue;
    }

    const sig = constraint.type_signature;

    // Check input_schema matches file's schema_id
    if (sig.input_schema && sig.input_schema !== constraintFile.schema_id) {
      errors.push({
        constraint_id: constraint.id,
        expression_fragment: sig.input_schema,
        expected_type: constraintFile.schema_id,
        actual_type: sig.input_schema,
        message: `type_signature.input_schema '${sig.input_schema}' does not match file schema_id '${constraintFile.schema_id}'`,
      });
    }

    // Check output_type is boolean (all constraints return boolean)
    if (sig.output_type && sig.output_type !== 'boolean') {
      errors.push({
        constraint_id: constraint.id,
        expression_fragment: `output_type: ${sig.output_type}`,
        expected_type: 'boolean',
        actual_type: sig.output_type,
        message: `Constraint output_type must be 'boolean', got '${sig.output_type}'`,
      });
    }

    // Check field_types are valid ConstraintType values
    if (sig.field_types) {
      const validTypes = new Set([
        'boolean', 'bigint', 'bigint_coercible', 'string', 'number', 'array', 'object', 'unknown',
      ]);
      for (const [fieldPath, fieldType] of Object.entries(sig.field_types)) {
        // Allow compound types like "string[]", "ConservationProperty[]", "Record<string, integer>"
        const baseType = fieldType.replace(/\[\]$/, '').replace(/^Record<.*>$/, 'object');
        if (!validTypes.has(baseType) && !baseType.match(/^[A-Z]/)) {
          // Custom types (starting with uppercase) are allowed — they reference schema types
          // Only flag types that don't match any known pattern
          warnings.push({
            constraint_id: constraint.id,
            message: `Field '${fieldPath}' has type '${fieldType}' — not a primitive ConstraintType (may be a schema reference)`,
          });
        }

        // Validate field path resolves against schema if available
        if (schemaEntry) {
          const rootField = fieldPath.split('.')[0];
          if (!schemaEntry.fields.has(rootField) && schemaEntry.fields.size > 0) {
            warnings.push({
              constraint_id: constraint.id,
              message: `Field path '${fieldPath}' root '${rootField}' not found in schema '${constraintFile.schema_id}' fields`,
            });
          }
        }
      }
    }
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
