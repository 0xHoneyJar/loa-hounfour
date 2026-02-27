import { type Static } from '@sinclair/typebox';
/**
 * Matching rules for conformance vector output comparison.
 * Defines how expected and actual outputs are compared.
 */
export declare const MatchingRulesSchema: import("@sinclair/typebox").TObject<{
    /** Fields to select for comparison (JSONPath-like). */
    select_fields: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    /** Fields to exclude from comparison (volatile/non-deterministic). */
    volatile_fields: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    /** Numeric tolerance for floating-point comparisons. */
    numeric_tolerance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    /** Whether to canonicalize strings before comparison (trim, lowercase). */
    canonicalize_strings: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
    /** How to handle null vs absent fields: 'strict' treats them as different. */
    null_handling: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"equivalent">]>>;
}>;
export type MatchingRules = Static<typeof MatchingRulesSchema>;
/**
 * Cross-field validation expectation within a conformance vector.
 */
export declare const CrossFieldExpectationSchema: import("@sinclair/typebox").TObject<{
    rule_id: import("@sinclair/typebox").TString;
    expected_severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
    expected_message_pattern: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type CrossFieldExpectation = Static<typeof CrossFieldExpectationSchema>;
/**
 * ConformanceVector — A golden test vector for cross-language adapter conformance.
 *
 * Each vector defines an input, expected output, matching rules, and metadata.
 * Vectors are static JSON fixtures authored in `vectors/conformance/` and
 * validated at build time by the test harness (S2-T8).
 */
export declare const ConformanceVectorSchema: import("@sinclair/typebox").TObject<{
    vector_id: import("@sinclair/typebox").TString;
    category: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provider-normalization">, import("@sinclair/typebox").TLiteral<"pricing-calculation">, import("@sinclair/typebox").TLiteral<"thinking-trace">, import("@sinclair/typebox").TLiteral<"tool-call-roundtrip">, import("@sinclair/typebox").TLiteral<"ensemble-position">, import("@sinclair/typebox").TLiteral<"reservation-enforcement">, import("@sinclair/typebox").TLiteral<"delegation-chain">, import("@sinclair/typebox").TLiteral<"inter-agent-transaction">, import("@sinclair/typebox").TLiteral<"conservation-properties">, import("@sinclair/typebox").TLiteral<"jwt-boundary">, import("@sinclair/typebox").TLiteral<"agent-identity">, import("@sinclair/typebox").TLiteral<"capability-scoped-trust">, import("@sinclair/typebox").TLiteral<"liveness-properties">, import("@sinclair/typebox").TLiteral<"registry-bridge">, import("@sinclair/typebox").TLiteral<"delegation-tree">, import("@sinclair/typebox").TLiteral<"bridge-transfer-saga">, import("@sinclair/typebox").TLiteral<"delegation-outcome">, import("@sinclair/typebox").TLiteral<"monetary-policy">, import("@sinclair/typebox").TLiteral<"permission-boundary">, import("@sinclair/typebox").TLiteral<"governance-proposal">, import("@sinclair/typebox").TLiteral<"micro-usdc">, import("@sinclair/typebox").TLiteral<"personality-assignment">, import("@sinclair/typebox").TLiteral<"reputation-aggregate">, import("@sinclair/typebox").TLiteral<"reputation-credential">, import("@sinclair/typebox").TLiteral<"access-policy">, import("@sinclair/typebox").TLiteral<"event-subscription">, import("@sinclair/typebox").TLiteral<"reputation-portability">, import("@sinclair/typebox").TLiteral<"delegation-quality">, import("@sinclair/typebox").TLiteral<"collection-governance-config">, import("@sinclair/typebox").TLiteral<"constraint-lifecycle">, import("@sinclair/typebox").TLiteral<"reputation-routing">, import("@sinclair/typebox").TLiteral<"policy-version">, import("@sinclair/typebox").TLiteral<"proposal-execution">, import("@sinclair/typebox").TLiteral<"economic-boundary">, import("@sinclair/typebox").TLiteral<"reputation-economic-impact">, import("@sinclair/typebox").TLiteral<"model-economic-profile">, import("@sinclair/typebox").TLiteral<"community-engagement">, import("@sinclair/typebox").TLiteral<"economic-performance">, import("@sinclair/typebox").TLiteral<"routing-rebalance">, import("@sinclair/typebox").TLiteral<"execution-checkpoint">, import("@sinclair/typebox").TLiteral<"task-type">, import("@sinclair/typebox").TLiteral<"task-type-cohort">, import("@sinclair/typebox").TLiteral<"reputation-event">, import("@sinclair/typebox").TLiteral<"scoring-path-log">]>;
    description: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    input: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    expected_output: import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>;
    expected_valid: import("@sinclair/typebox").TBoolean;
    matching_rules: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        /** Fields to select for comparison (JSONPath-like). */
        select_fields: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        /** Fields to exclude from comparison (volatile/non-deterministic). */
        volatile_fields: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        /** Numeric tolerance for floating-point comparisons. */
        numeric_tolerance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        /** Whether to canonicalize strings before comparison (trim, lowercase). */
        canonicalize_strings: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TBoolean>;
        /** How to handle null vs absent fields: 'strict' treats them as different. */
        null_handling: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"strict">, import("@sinclair/typebox").TLiteral<"equivalent">]>>;
    }>>;
    cross_field_validations: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        rule_id: import("@sinclair/typebox").TString;
        expected_severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
        expected_message_pattern: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>>;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type ConformanceVector = Static<typeof ConformanceVectorSchema>;
//# sourceMappingURL=conformance-vector.d.ts.map