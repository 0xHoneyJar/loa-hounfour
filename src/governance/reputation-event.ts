/**
 * ReputationEvent — discriminated union for task-dimensional reputation events.
 *
 * Three event variants share a common envelope (agent_id, collection_id,
 * event_id, timestamp, optional sequence) with type-specific payloads.
 *
 * Variant | type discriminator     | Payload shape
 * --------|------------------------|----------------------------
 * 1       | "quality_signal"       | score, dimensions, optional task_type
 * 2       | "task_completed"       | required task_type, success, duration_ms
 * 3       | "credential_update"    | credential_id, action
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
    { maxProperties: 20, description: 'Named quality dimensions (e.g., coherence, safety).' },
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
// Discriminated Union
// ---------------------------------------------------------------------------

/**
 * ReputationEvent — discriminated union of all event variants.
 *
 * Discriminates on the `type` field. Generated JSON Schema uses `oneOf`
 * with `const` discriminator.
 */
export const ReputationEventSchema = Type.Union(
  [
    QualitySignalEventSchema,
    TaskCompletedEventSchema,
    CredentialUpdateEventSchema,
  ],
  {
    $id: 'ReputationEvent',
    description: 'Discriminated union of reputation event variants. Discriminator: type.',
  },
);

export type ReputationEvent = Static<typeof ReputationEventSchema>;
