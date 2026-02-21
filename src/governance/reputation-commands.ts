/**
 * Reputation command schemas (v7.1.0, FR-4).
 *
 * Commands are write-intent messages that drive state changes in the
 * ReputationAggregate. Each command carries a contract_version for
 * wire-format negotiation.
 *
 * @see SDD §2.5 — Reputation Commands
 */
import { Type, type Static } from '@sinclair/typebox';
import { QualityEventSchema } from '../schemas/quality-event.js';

// ---------------------------------------------------------------------------
// RecordQualityEventCommand
// ---------------------------------------------------------------------------

/** Command to ingest a quality observation into the reputation system. */
export const RecordQualityEventCommandSchema = Type.Object({
  command_id: Type.String({ minLength: 1 }),
  quality_event: QualityEventSchema,
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'RecordQualityEventCommand',
  additionalProperties: false,
});

export type RecordQualityEventCommand = Static<typeof RecordQualityEventCommandSchema>;

// ---------------------------------------------------------------------------
// QueryReputationCommand
// ---------------------------------------------------------------------------

/** Command to query the current reputation aggregate for a personality in a pool. */
export const QueryReputationCommandSchema = Type.Object({
  command_id: Type.String({ minLength: 1 }),
  personality_id: Type.String({ minLength: 1 }),
  pool_id: Type.String({ minLength: 1 }),
  include_history: Type.Optional(Type.Boolean({ default: false })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'QueryReputationCommand',
  additionalProperties: false,
});

export type QueryReputationCommand = Static<typeof QueryReputationCommandSchema>;

// ---------------------------------------------------------------------------
// ResetReputationCommand
// ---------------------------------------------------------------------------

/** Command to reset a reputation aggregate back to cold state. */
export const ResetReputationCommandSchema = Type.Object({
  command_id: Type.String({ minLength: 1 }),
  personality_id: Type.String({ minLength: 1 }),
  collection_id: Type.String({ minLength: 1 }),
  pool_id: Type.String({ minLength: 1 }),
  reason: Type.String({ minLength: 1 }),
  actor: Type.String({ minLength: 1 }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ResetReputationCommand',
  additionalProperties: false,
});

export type ResetReputationCommand = Static<typeof ResetReputationCommandSchema>;
