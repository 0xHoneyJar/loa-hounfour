/**
 * Reputation event payload schemas (v7.1.0, FR-4).
 *
 * Event payloads are carried inside the DomainEvent envelope.
 * These schemas define the payload shape for reputation-specific events.
 *
 * @see SDD §2.6 — Reputation Events
 */
import { type Static } from '@sinclair/typebox';
/** Payload emitted when the reputation state machine transitions. */
export declare const ReputationStateChangedPayloadSchema: import("@sinclair/typebox").TObject<{
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    from_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    to_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    trigger: import("@sinclair/typebox").TString;
    blended_score: import("@sinclair/typebox").TNumber;
}>;
export type ReputationStateChangedPayload = Static<typeof ReputationStateChangedPayloadSchema>;
/** Payload emitted when a quality observation is ingested. */
export declare const QualityEventRecordedPayloadSchema: import("@sinclair/typebox").TObject<{
    personality_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    quality_event_id: import("@sinclair/typebox").TString;
    composite_score: import("@sinclair/typebox").TNumber;
    new_sample_count: import("@sinclair/typebox").TInteger;
    new_blended_score: import("@sinclair/typebox").TNumber;
}>;
export type QualityEventRecordedPayload = Static<typeof QualityEventRecordedPayloadSchema>;
/**
 * Payload emitted when a collection's trimmed mean is recalculated.
 *
 * In the Web4 social monies framing, this event functions as a monetary
 * policy signal — the collection's quality score determines the
 * trustworthiness of its monetary instrument. A collection where most
 * members are `authoritative` with high blended scores produces a high
 * `new_score`, indicating trustworthy social money.
 */
export declare const CollectionScoreUpdatedPayloadSchema: import("@sinclair/typebox").TObject<{
    collection_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    new_score: import("@sinclair/typebox").TNumber;
    member_count: import("@sinclair/typebox").TInteger;
    trimmed_count: import("@sinclair/typebox").TInteger;
}>;
export type CollectionScoreUpdatedPayload = Static<typeof CollectionScoreUpdatedPayloadSchema>;
//# sourceMappingURL=reputation-events.d.ts.map