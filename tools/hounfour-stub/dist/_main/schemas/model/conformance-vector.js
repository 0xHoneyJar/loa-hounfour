import { Type } from '@sinclair/typebox';
import { ConformanceCategorySchema } from '../../vocabulary/conformance-category.js';
/**
 * Matching rules for conformance vector output comparison.
 * Defines how expected and actual outputs are compared.
 */
export const MatchingRulesSchema = Type.Object({
    /** Fields to select for comparison (JSONPath-like). */
    select_fields: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    /** Fields to exclude from comparison (volatile/non-deterministic). */
    volatile_fields: Type.Optional(Type.Array(Type.String({ minLength: 1 }))),
    /** Numeric tolerance for floating-point comparisons. */
    numeric_tolerance: Type.Optional(Type.Number({ minimum: 0 })),
    /** Whether to canonicalize strings before comparison (trim, lowercase). */
    canonicalize_strings: Type.Optional(Type.Boolean()),
    /** How to handle null vs absent fields: 'strict' treats them as different. */
    null_handling: Type.Optional(Type.Union([Type.Literal('strict'), Type.Literal('equivalent')])),
}, { additionalProperties: false });
/**
 * Cross-field validation expectation within a conformance vector.
 */
export const CrossFieldExpectationSchema = Type.Object({
    rule_id: Type.String({ minLength: 1 }),
    expected_severity: Type.Union([
        Type.Literal('error'),
        Type.Literal('warning'),
    ]),
    expected_message_pattern: Type.Optional(Type.String()),
}, { additionalProperties: false });
/**
 * ConformanceVector — A golden test vector for cross-language adapter conformance.
 *
 * Each vector defines an input, expected output, matching rules, and metadata.
 * Vectors are static JSON fixtures authored in `vectors/conformance/` and
 * validated at build time by the test harness (S2-T8).
 */
export const ConformanceVectorSchema = Type.Object({
    vector_id: Type.String({
        pattern: '^conformance-[a-z][a-z0-9-]+-\\d{3,4}$',
        description: 'Unique vector identifier, e.g. conformance-normalization-001 or conformance-reservation-enforcement-0001',
    }),
    category: ConformanceCategorySchema,
    description: Type.String({ minLength: 1 }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
    input: Type.Record(Type.String(), Type.Unknown(), {
        description: 'Provider-specific input (request payload)',
    }),
    expected_output: Type.Record(Type.String(), Type.Unknown(), {
        description: 'Expected normalized output',
    }),
    expected_valid: Type.Boolean({
        description: 'Whether the input is expected to pass schema validation',
    }),
    matching_rules: Type.Optional(MatchingRulesSchema),
    cross_field_validations: Type.Optional(Type.Array(CrossFieldExpectationSchema)),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
}, {
    $id: 'ConformanceVector',
    description: 'Cross-language conformance test vector for adapter verification.',
    additionalProperties: false,
});
//# sourceMappingURL=conformance-vector.js.map