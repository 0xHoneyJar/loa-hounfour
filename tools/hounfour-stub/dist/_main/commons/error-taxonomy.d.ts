/**
 * GovernanceError — 6-type discriminated union for governance errors.
 *
 * Each error type has a `type` discriminant field and a `retryable` boolean.
 * Errors are structured objects, not exceptions. Each includes an optional
 * `audit_entry_id` when the error was recorded as an audit event.
 *
 * @see SDD §4.6 — Governance Error Taxonomy (FR-1.8)
 * @since v8.0.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * A conservation invariant was violated.
 */
export declare const InvariantViolationSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"INVARIANT_VIOLATION">;
    invariant_id: import("@sinclair/typebox").TString;
    expression: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>;
export type InvariantViolation = Static<typeof InvariantViolationSchema>;
/**
 * A state machine transition is not allowed from the current state.
 */
export declare const InvalidTransitionSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"INVALID_TRANSITION">;
    from_state: import("@sinclair/typebox").TString;
    to_state: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>;
export type InvalidTransition = Static<typeof InvalidTransitionSchema>;
/**
 * A transition guard expression evaluated to false.
 */
export declare const GuardFailureSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"GUARD_FAILURE">;
    guard_expression: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TBoolean;
}>;
export type GuardFailure = Static<typeof GuardFailureSchema>;
/**
 * A constraint DSL expression failed to evaluate (parse error, type mismatch).
 */
export declare const EvaluationErrorSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"EVALUATION_ERROR">;
    expression: import("@sinclair/typebox").TString;
    eval_error: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>;
export type EvaluationError = Static<typeof EvaluationErrorSchema>;
/**
 * A hash chain discontinuity was detected in the audit trail.
 */
export declare const HashDiscontinuityErrorSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"HASH_DISCONTINUITY">;
    entry_index: import("@sinclair/typebox").TInteger;
    expected_hash: import("@sinclair/typebox").TString;
    actual_hash: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>;
export type HashDiscontinuityError = Static<typeof HashDiscontinuityErrorSchema>;
/**
 * Optimistic concurrency (CAS) version mismatch.
 */
export declare const PartialApplicationSchema: import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"PARTIAL_APPLICATION">;
    expected_version: import("@sinclair/typebox").TInteger;
    actual_version: import("@sinclair/typebox").TInteger;
    retryable: import("@sinclair/typebox").TLiteral<true>;
}>;
export type PartialApplication = Static<typeof PartialApplicationSchema>;
/**
 * Discriminated union of all governance errors.
 * Discriminant field: `type`.
 */
export declare const GovernanceErrorSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"INVARIANT_VIOLATION">;
    invariant_id: import("@sinclair/typebox").TString;
    expression: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>, import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"INVALID_TRANSITION">;
    from_state: import("@sinclair/typebox").TString;
    to_state: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>, import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"GUARD_FAILURE">;
    guard_expression: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TBoolean;
}>, import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"EVALUATION_ERROR">;
    expression: import("@sinclair/typebox").TString;
    eval_error: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>, import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"HASH_DISCONTINUITY">;
    entry_index: import("@sinclair/typebox").TInteger;
    expected_hash: import("@sinclair/typebox").TString;
    actual_hash: import("@sinclair/typebox").TString;
    retryable: import("@sinclair/typebox").TLiteral<false>;
}>, import("@sinclair/typebox").TObject<{
    error_code: import("@sinclair/typebox").TString;
    message: import("@sinclair/typebox").TString;
    affected_fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    audit_entry_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    type: import("@sinclair/typebox").TLiteral<"PARTIAL_APPLICATION">;
    expected_version: import("@sinclair/typebox").TInteger;
    actual_version: import("@sinclair/typebox").TInteger;
    retryable: import("@sinclair/typebox").TLiteral<true>;
}>]>;
export type GovernanceError = Static<typeof GovernanceErrorSchema>;
//# sourceMappingURL=error-taxonomy.d.ts.map