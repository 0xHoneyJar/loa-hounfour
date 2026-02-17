/**
 * Bridge Transfer Saga — coordination protocol for cross-registry value transfer.
 *
 * Implements the saga pattern for multi-step bridge transfers with
 * compensation semantics, timeout handling, and participant tracking.
 *
 * @see SDD §2.2 — BridgeTransferSaga Schema
 * @since v7.0.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ExchangeRateSpecSchema } from './registry-composition.js';
import { CapabilityScopedTrustSchema } from '../schemas/agent-identity.js';

// ---------------------------------------------------------------------------
// Saga Status
// ---------------------------------------------------------------------------

export const SagaStatusSchema = Type.Union(
  [
    Type.Literal('initiated'),
    Type.Literal('reserving'),
    Type.Literal('transferring'),
    Type.Literal('settling'),
    Type.Literal('settled'),
    Type.Literal('compensating'),
    Type.Literal('reversed'),
    Type.Literal('failed'),
  ],
  {
    $id: 'SagaStatus',
    description: 'Status of a bridge transfer saga lifecycle.',
  },
);
export type SagaStatus = Static<typeof SagaStatusSchema>;

/**
 * Saga state machine transitions.
 * Terminal states (settled, reversed, failed) have no outbound transitions.
 */
export const SAGA_TRANSITIONS: Record<SagaStatus, readonly SagaStatus[]> = {
  initiated: ['reserving', 'failed'],
  reserving: ['transferring', 'compensating', 'failed'],
  transferring: ['settling', 'compensating', 'failed'],
  settling: ['settled', 'compensating', 'failed'],
  settled: [],
  compensating: ['reversed', 'failed'],
  reversed: [],
  failed: [],
} as const;

// ---------------------------------------------------------------------------
// Step Types & Status
// ---------------------------------------------------------------------------

export const StepTypeSchema = Type.Union(
  [
    Type.Literal('reserve'),
    Type.Literal('validate'),
    Type.Literal('transfer'),
    Type.Literal('confirm'),
    Type.Literal('settle'),
  ],
  {
    $id: 'StepType',
    description: 'Type of step within a bridge transfer saga.',
  },
);
export type StepType = Static<typeof StepTypeSchema>;

export const StepStatusSchema = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('in_progress'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('compensated'),
  ],
  {
    $id: 'StepStatus',
    description: 'Status of an individual saga step.',
  },
);
export type StepStatus = Static<typeof StepStatusSchema>;

// ---------------------------------------------------------------------------
// Bridge Transfer Step
// ---------------------------------------------------------------------------

export const BridgeTransferStepSchema = Type.Object(
  {
    step_id: Type.String({
      minLength: 1,
      description: 'Unique identifier for this saga step.',
    }),
    step_type: StepTypeSchema,
    participant: Type.String({
      minLength: 1,
      description: 'Agent or service responsible for executing this step.',
    }),
    status: StepStatusSchema,
    amount_micro: Type.String({
      pattern: '^[0-9]+$',
      description: 'Amount in micro-units (string-encoded BigInt).',
    }),
    exchange_rate: Type.Optional(ExchangeRateSpecSchema),
    started_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
      description: 'When step execution began, or null if not yet started.',
    }),
    completed_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
      description: 'When step completed, or null if not yet completed.',
    }),
    error: Type.Optional(Type.String({
      description: 'Error message if step failed.',
    })),
  },
  {
    $id: 'BridgeTransferStep',
    additionalProperties: false,
    description: 'A single step in a bridge transfer saga.',
  },
);
export type BridgeTransferStep = Static<typeof BridgeTransferStepSchema>;

// ---------------------------------------------------------------------------
// Participant Role & Saga Participant
// ---------------------------------------------------------------------------

export const ParticipantRoleSchema = Type.Union(
  [
    Type.Literal('initiator'),
    Type.Literal('counterparty'),
    Type.Literal('observer'),
    Type.Literal('arbiter'),
  ],
  {
    $id: 'ParticipantRole',
    description: 'Role of a participant in a bridge transfer saga.',
  },
);
export type ParticipantRole = Static<typeof ParticipantRoleSchema>;

export const SagaParticipantSchema = Type.Object(
  {
    agent_id: Type.String({
      minLength: 1,
      description: 'Unique agent identifier for this participant.',
    }),
    role: ParticipantRoleSchema,
    registry_id: Type.String({
      format: 'uuid',
      description: 'Registry this participant belongs to.',
    }),
    trust_scopes: CapabilityScopedTrustSchema,
  },
  {
    $id: 'SagaParticipant',
    additionalProperties: false,
    description: 'A participant in a bridge transfer saga with their trust profile.',
  },
);
export type SagaParticipant = Static<typeof SagaParticipantSchema>;

// ---------------------------------------------------------------------------
// Saga Error
// ---------------------------------------------------------------------------

export const SagaErrorSchema = Type.Object(
  {
    error_code: Type.String({
      minLength: 1,
      description: 'Machine-readable error code.',
    }),
    message: Type.String({
      minLength: 1,
      description: 'Human-readable error message.',
    }),
    failed_step_id: Type.Optional(Type.String({
      description: 'ID of the step that caused the failure.',
    })),
    recoverable: Type.Boolean({
      description: 'Whether the saga can be retried or compensated.',
    }),
  },
  {
    $id: 'SagaError',
    additionalProperties: false,
    description: 'Error details for a failed or compensating saga.',
  },
);
export type SagaError = Static<typeof SagaErrorSchema>;

// ---------------------------------------------------------------------------
// Bridge Transfer Saga
// ---------------------------------------------------------------------------

export const BridgeTransferSagaSchema = Type.Object(
  {
    saga_id: Type.String({ format: 'uuid' }),
    bridge_id: Type.String({ format: 'uuid' }),
    source_registry: Type.String({ format: 'uuid' }),
    target_registry: Type.String({ format: 'uuid' }),
    saga_type: Type.Union(
      [Type.Literal('atomic'), Type.Literal('choreography')],
      { description: 'Whether the saga uses atomic or choreography coordination.' },
    ),
    status: SagaStatusSchema,
    steps: Type.Array(BridgeTransferStepSchema, {
      minItems: 1,
      description: 'Ordered list of saga steps (at least one required).',
    }),
    compensation_steps: Type.Array(BridgeTransferStepSchema, {
      description: 'Compensation steps to reverse completed work on failure.',
    }),
    timeout: Type.Object(
      {
        total_seconds: Type.Integer({
          minimum: 1,
          description: 'Maximum total duration for the saga in seconds.',
        }),
        per_step_seconds: Type.Integer({
          minimum: 1,
          description: 'Maximum duration for any individual step in seconds.',
        }),
      },
      {
        additionalProperties: false,
        description: 'Timeout configuration for the saga. Schema-level validation ensures well-formed values; runtime enforcement by implementations is REQUIRED.',
        'x-runtime-enforcement-required': true,
        'x-enforcement-note': 'Timeout enforcement requires runtime behavior (timers, cancellation). The protocol defines the contract; implementations MUST provide the mechanism. See RFC 7230 §6.5 for the HTTP precedent.',
      } as Record<string, unknown>,
    ),
    participants: Type.Array(SagaParticipantSchema, {
      minItems: 1,
      description: 'Participants involved in this saga (at least one required).',
    }),
    initiated_at: Type.String({ format: 'date-time' }),
    settled_at: Type.Union([Type.String({ format: 'date-time' }), Type.Null()], {
      description: 'When the saga was settled, or null if not yet settled.',
    }),
    error: Type.Optional(SagaErrorSchema),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'BridgeTransferSaga',
    additionalProperties: false,
    description: 'A saga orchestrating cross-registry bridge transfer with compensation semantics.',
  },
);
export type BridgeTransferSaga = Static<typeof BridgeTransferSagaSchema>;
