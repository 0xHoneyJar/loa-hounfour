/**
 * Reputation event payload schemas (v7.1.0, FR-4).
 *
 * Event payloads are carried inside the DomainEvent envelope.
 * These schemas define the payload shape for reputation-specific events.
 *
 * @see SDD §2.6 — Reputation Events
 */
import { Type } from '@sinclair/typebox';
import { ReputationStateSchema } from './reputation-aggregate.js';
// ---------------------------------------------------------------------------
// ReputationStateChangedPayload
// ---------------------------------------------------------------------------
/** Payload emitted when the reputation state machine transitions. */
export const ReputationStateChangedPayloadSchema = Type.Object({
    personality_id: Type.String({ minLength: 1 }),
    collection_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    from_state: ReputationStateSchema,
    to_state: ReputationStateSchema,
    trigger: Type.String({ minLength: 1 }),
    blended_score: Type.Number({ minimum: 0, maximum: 1 }),
}, {
    $id: 'ReputationStateChangedPayload',
    additionalProperties: false,
});
// ---------------------------------------------------------------------------
// QualityEventRecordedPayload
// ---------------------------------------------------------------------------
/** Payload emitted when a quality observation is ingested. */
export const QualityEventRecordedPayloadSchema = Type.Object({
    personality_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    quality_event_id: Type.String({ minLength: 1 }),
    composite_score: Type.Number({ minimum: 0, maximum: 1 }),
    new_sample_count: Type.Integer({ minimum: 1 }),
    new_blended_score: Type.Number({ minimum: 0, maximum: 1 }),
}, {
    $id: 'QualityEventRecordedPayload',
    additionalProperties: false,
});
// ---------------------------------------------------------------------------
// CollectionScoreUpdatedPayload
// ---------------------------------------------------------------------------
/**
 * Payload emitted when a collection's trimmed mean is recalculated.
 *
 * In the Web4 social monies framing, this event functions as a monetary
 * policy signal — the collection's quality score determines the
 * trustworthiness of its monetary instrument. A collection where most
 * members are `authoritative` with high blended scores produces a high
 * `new_score`, indicating trustworthy social money.
 */
export const CollectionScoreUpdatedPayloadSchema = Type.Object({
    collection_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    new_score: Type.Number({
        minimum: 0, maximum: 1,
        description: 'Updated trimmed mean score for the collection. '
            + 'Serves as a proxy for the collection\'s monetary credibility.',
    }),
    member_count: Type.Integer({ minimum: 0 }),
    trimmed_count: Type.Integer({ minimum: 0 }),
}, {
    $id: 'CollectionScoreUpdatedPayload',
    additionalProperties: false,
});
//# sourceMappingURL=reputation-events.js.map