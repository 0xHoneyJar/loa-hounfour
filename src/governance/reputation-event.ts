/**
 * ReputationEvent — discriminated union for task-dimensional reputation events.
 *
 * Four event variants share a common envelope (agent_id, collection_id,
 * event_id, timestamp, optional sequence) with type-specific payloads.
 *
 * Variant | type discriminator     | Payload shape
 * --------|------------------------|----------------------------
 * 1       | "quality_signal"       | score, dimensions, optional task_type
 * 2       | "task_completed"       | required task_type, success, duration_ms
 * 3       | "credential_update"    | credential_id, action
 * 4       | "model_performance"    | model_id, provider, pool_id, task_type, quality_observation
 *
 * Deduplication semantics (SDD §4.3.6):
 * - event_id is globally unique (UUID).
 * - Duplicate event_id with matching payload → idempotent (safe to replay).
 * - Duplicate event_id with mismatched payload → reject with conflict error.
 * - sequence is optional total ordering; consumers SHOULD process in order
 *   when present but MUST tolerate gaps.
 *
 * Forward compatibility (SDD §4.3.5):
 * - Wire-level: unknown type values MUST be rejected by schema validation.
 * - Runtime: consumers MAY implement permissive fallback (log + skip).
 *
 * @see SDD §4.3 — ReputationEvent
 * @since v7.10.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { TaskTypeSchema } from './task-type.js';
import { QualityObservationSchema } from './quality-observation.js';

// ---------------------------------------------------------------------------
// Shared Envelope Fields (not exported — spread into each variant)
// ---------------------------------------------------------------------------

const EventEnvelopeFields = {
  event_id: Type.String({ format: 'uuid', description: 'Globally unique event identifier for deduplication.' }),
  agent_id: Type.String({ maxLength: 255, minLength: 1, description: 'Agent that produced this event.' }),
  collection_id: Type.String({ maxLength: 255, minLength: 1, description: 'Collection context for the event.' }),
  timestamp: Type.String({ format: 'date-time', description: 'When the event occurred.' }),
  sequence: Type.Optional(Type.Integer({ minimum: 0, description: 'Optional total ordering sequence number.' })),
};

// ---------------------------------------------------------------------------
// Variant 1: QualitySignalEvent
// ---------------------------------------------------------------------------

/**
 * Quality signal event payload.
 *
 * When task_type is absent, the signal applies to aggregate-only scoring
 * (no task cohort update). When present, the signal contributes to both
 * the task cohort and the aggregate.
 */
const QualitySignalPayloadSchema = Type.Object({
  ...EventEnvelopeFields,
  type: Type.Literal('quality_signal'),
  score: Type.Number({ minimum: 0, maximum: 1, description: 'Quality score in [0, 1].' }),
  task_type: Type.Optional(TaskTypeSchema),
  dimensions: Type.Optional(Type.Record(
    Type.String({ pattern: '^[a-z][a-z0-9_]{0,31}$' }),
    Type.Number({ minimum: 0, maximum: 1 }),
    { maxProperties: 20, additionalProperties: false, description: 'Named quality dimensions (e.g., coherence, safety).' },
  )),
}, {
  additionalProperties: false,
});

export const QualitySignalEventSchema = QualitySignalPayloadSchema;
export type QualitySignalEvent = Static<typeof QualitySignalEventSchema>;

// ---------------------------------------------------------------------------
// Variant 2: TaskCompletedEvent
// ---------------------------------------------------------------------------

/**
 * Task completed event payload.
 *
 * Records that a task of a specific type was completed by an agent.
 * task_type is required (unlike quality_signal where it's optional).
 */
const TaskCompletedPayloadSchema = Type.Object({
  ...EventEnvelopeFields,
  type: Type.Literal('task_completed'),
  task_type: TaskTypeSchema,
  success: Type.Boolean({ description: 'Whether the task completed successfully.' }),
  duration_ms: Type.Optional(Type.Integer({
    minimum: 0,
    maximum: 3600000,
    description: 'Task duration in milliseconds (max 1 hour).',
  })),
}, {
  additionalProperties: false,
});

export const TaskCompletedEventSchema = TaskCompletedPayloadSchema;
export type TaskCompletedEvent = Static<typeof TaskCompletedEventSchema>;

// ---------------------------------------------------------------------------
// Variant 3: CredentialUpdateEvent
// ---------------------------------------------------------------------------

/**
 * Credential update event payload.
 *
 * Records a change to an agent's reputation credential.
 */
const CredentialUpdatePayloadSchema = Type.Object({
  ...EventEnvelopeFields,
  type: Type.Literal('credential_update'),
  credential_id: Type.String({ format: 'uuid', description: 'Credential being updated.' }),
  action: Type.Union([
    Type.Literal('issued'),
    Type.Literal('revoked'),
    Type.Literal('renewed'),
    Type.Literal('suspended'),
  ], { description: 'What happened to the credential.' }),
}, {
  additionalProperties: false,
});

export const CredentialUpdateEventSchema = CredentialUpdatePayloadSchema;
export type CredentialUpdateEvent = Static<typeof CredentialUpdateEventSchema>;

// ---------------------------------------------------------------------------
// Variant 4: ModelPerformanceEvent
// ---------------------------------------------------------------------------

/**
 * Request context — optional traceability metadata.
 *
 * Links the performance observation to its originating inference request
 * and delegation chain. Not a standalone schema (no $id) — too small
 * and event-specific for independent reuse.
 */
const RequestContextSchema = Type.Object(
  {
    request_id: Type.Optional(Type.String({
      format: 'uuid',
      description: 'Originating inference request ID.',
    })),
    delegation_id: Type.Optional(Type.String({
      format: 'uuid',
      description: 'Delegation chain context, if any.',
    })),
  },
  { additionalProperties: false },
);

/**
 * Model performance event payload.
 *
 * Carries full model attribution (model_id, provider, pool_id) alongside
 * a structured quality observation. Closes the autopoietic feedback loop:
 * Dixie emits this event → cross-model scoring updates → routing signal
 * adjusts → Finn routes next request → Dixie evaluates again.
 *
 * Unlike quality_signal, task_type is REQUIRED — every model performance
 * observation inherently has a task context.
 *
 * @see Issue #38 — model_performance variant
 * @since v8.2.0
 */
const ModelPerformancePayloadSchema = Type.Object({
  ...EventEnvelopeFields,
  type: Type.Literal('model_performance'),
  model_id: Type.String({
    minLength: 1,
    maxLength: 255,
    description: 'Model alias (e.g., "gpt-4o", "claude-opus"). '
      + 'Matches COHORT_BASE_FIELDS.model_id for pipeline compatibility.',
  }),
  provider: Type.String({
    minLength: 1,
    maxLength: 255,
    description: 'Provider identifier (e.g., "openai", "anthropic").',
  }),
  pool_id: Type.String({
    minLength: 1,
    maxLength: 255,
    description: 'Pool context for the evaluation.',
  }),
  task_type: TaskTypeSchema,
  quality_observation: QualityObservationSchema,
  request_context: Type.Optional(RequestContextSchema),
}, {
  additionalProperties: false,
});

export const ModelPerformanceEventSchema = ModelPerformancePayloadSchema;
export type ModelPerformanceEvent = Static<typeof ModelPerformanceEventSchema>;

// ---------------------------------------------------------------------------
// Discriminated Union
// ---------------------------------------------------------------------------

/**
 * ReputationEvent — discriminated union of all event variants.
 *
 * Discriminates on the `type` field. Generated JSON Schema uses `anyOf`
 * with `const`-discriminated variants (TypeBox Type.Union always emits anyOf).
 */
export const ReputationEventSchema = Type.Union(
  [
    QualitySignalEventSchema,
    TaskCompletedEventSchema,
    CredentialUpdateEventSchema,
    ModelPerformanceEventSchema,
  ],
  {
    $id: 'ReputationEvent',
    description: 'Discriminated union of reputation event variants. Discriminator: type.',
  },
);

export type ReputationEvent = Static<typeof ReputationEventSchema>;
