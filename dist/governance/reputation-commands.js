/**
 * Reputation command schemas (v7.1.0, FR-4).
 *
 * Commands are write-intent messages that drive state changes in the
 * ReputationAggregate. Each command carries a contract_version for
 * wire-format negotiation.
 *
 * @see SDD §2.5 — Reputation Commands
 */
import { Type } from '@sinclair/typebox';
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
// ---------------------------------------------------------------------------
// QueryReputationCommand
// ---------------------------------------------------------------------------
/**
 * Command to query reputation aggregates for a personality in a pool.
 *
 * When `collection_id` is provided, queries a single aggregate (DDD identity
 * lookup by full composite key). When omitted, queries all aggregates for the
 * personality+pool pair across collections (set query).
 */
export const QueryReputationCommandSchema = Type.Object({
    command_id: Type.String({ minLength: 1 }),
    personality_id: Type.String({ minLength: 1 }),
    collection_id: Type.Optional(Type.String({
        minLength: 1,
        description: 'Collection ID for single-aggregate lookup. '
            + 'When omitted, returns all aggregates for personality+pool across collections.',
    })),
    pool_id: Type.String({ minLength: 1 }),
    model_id: Type.Optional(Type.String({
        minLength: 1,
        description: 'Model alias filter. When present, queries reputation for a specific model '
            + 'context (returns model cohort data). When absent, returns the cross-model aggregate.',
    })),
    include_history: Type.Optional(Type.Boolean({ default: false })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'QueryReputationCommand',
    additionalProperties: false,
});
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
//# sourceMappingURL=reputation-commands.js.map