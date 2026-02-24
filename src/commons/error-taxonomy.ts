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
import { Type, type Static } from '@sinclair/typebox';

const GovernanceErrorBase = {
  error_code: Type.String({ minLength: 1 }),
  message: Type.String({ minLength: 1, maxLength: 2000 }),
  affected_fields: Type.Array(Type.String({ minLength: 1 })),
  audit_entry_id: Type.Optional(Type.String({ format: 'uuid' })),
  timestamp: Type.String({ format: 'date-time' }),
};

/**
 * A conservation invariant was violated.
 */
export const InvariantViolationSchema = Type.Object(
  {
    type: Type.Literal('INVARIANT_VIOLATION'),
    invariant_id: Type.String({ pattern: '^[A-Z]+-\\d{1,4}$' }),
    expression: Type.String({ minLength: 1 }),
    retryable: Type.Literal(false),
    ...GovernanceErrorBase,
  },
  { $id: 'InvariantViolation', additionalProperties: false },
);

export type InvariantViolation = Static<typeof InvariantViolationSchema>;

/**
 * A state machine transition is not allowed from the current state.
 */
export const InvalidTransitionSchema = Type.Object(
  {
    type: Type.Literal('INVALID_TRANSITION'),
    from_state: Type.String({ minLength: 1 }),
    to_state: Type.String({ minLength: 1 }),
    retryable: Type.Literal(false),
    ...GovernanceErrorBase,
  },
  { $id: 'InvalidTransition', additionalProperties: false },
);

export type InvalidTransition = Static<typeof InvalidTransitionSchema>;

/**
 * A transition guard expression evaluated to false.
 */
export const GuardFailureSchema = Type.Object(
  {
    type: Type.Literal('GUARD_FAILURE'),
    guard_expression: Type.String({ minLength: 1 }),
    retryable: Type.Boolean(),
    ...GovernanceErrorBase,
  },
  { $id: 'GuardFailure', additionalProperties: false },
);

export type GuardFailure = Static<typeof GuardFailureSchema>;

/**
 * A constraint DSL expression failed to evaluate (parse error, type mismatch).
 */
export const EvaluationErrorSchema = Type.Object(
  {
    type: Type.Literal('EVALUATION_ERROR'),
    expression: Type.String({ minLength: 1 }),
    eval_error: Type.String({ minLength: 1 }),
    retryable: Type.Literal(false),
    ...GovernanceErrorBase,
  },
  { $id: 'EvaluationError', additionalProperties: false },
);

export type EvaluationError = Static<typeof EvaluationErrorSchema>;

/**
 * A hash chain discontinuity was detected in the audit trail.
 */
export const HashDiscontinuityErrorSchema = Type.Object(
  {
    type: Type.Literal('HASH_DISCONTINUITY'),
    entry_index: Type.Integer({ minimum: 0 }),
    expected_hash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
    actual_hash: Type.String({ pattern: '^sha256:[a-f0-9]{64}$' }),
    retryable: Type.Literal(false),
    ...GovernanceErrorBase,
  },
  { $id: 'HashDiscontinuityError', additionalProperties: false },
);

export type HashDiscontinuityError = Static<typeof HashDiscontinuityErrorSchema>;

/**
 * Optimistic concurrency (CAS) version mismatch.
 */
export const PartialApplicationSchema = Type.Object(
  {
    type: Type.Literal('PARTIAL_APPLICATION'),
    expected_version: Type.Integer({ minimum: 0 }),
    actual_version: Type.Integer({ minimum: 0 }),
    retryable: Type.Literal(true),
    ...GovernanceErrorBase,
  },
  { $id: 'PartialApplication', additionalProperties: false },
);

export type PartialApplication = Static<typeof PartialApplicationSchema>;

/**
 * Discriminated union of all governance errors.
 * Discriminant field: `type`.
 */
export const GovernanceErrorSchema = Type.Union(
  [
    InvariantViolationSchema,
    InvalidTransitionSchema,
    GuardFailureSchema,
    EvaluationErrorSchema,
    HashDiscontinuityErrorSchema,
    PartialApplicationSchema,
  ],
  { $id: 'GovernanceError' },
);

export type GovernanceError = Static<typeof GovernanceErrorSchema>;
