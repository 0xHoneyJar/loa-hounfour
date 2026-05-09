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
import { type Static } from '@sinclair/typebox';
export declare const QualitySignalEventSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"quality_signal">;
    score: import("@sinclair/typebox").TNumber;
    task_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>>;
    dimensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TNumber>>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type QualitySignalEvent = Static<typeof QualitySignalEventSchema>;
export declare const TaskCompletedEventSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"task_completed">;
    task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
    success: import("@sinclair/typebox").TBoolean;
    duration_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type TaskCompletedEvent = Static<typeof TaskCompletedEventSchema>;
export declare const CredentialUpdateEventSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"credential_update">;
    credential_id: import("@sinclair/typebox").TString;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issued">, import("@sinclair/typebox").TLiteral<"revoked">, import("@sinclair/typebox").TLiteral<"renewed">, import("@sinclair/typebox").TLiteral<"suspended">]>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type CredentialUpdateEvent = Static<typeof CredentialUpdateEventSchema>;
export declare const ModelPerformanceEventSchema: import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"model_performance">;
    model_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
    quality_observation: import("@sinclair/typebox").TObject<{
        score: import("@sinclair/typebox").TNumber;
        dimensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TNumber>>;
        latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        evaluated_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    request_context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        delegation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type ModelPerformanceEvent = Static<typeof ModelPerformanceEventSchema>;
/**
 * ReputationEvent — discriminated union of all event variants.
 *
 * Discriminates on the `type` field. Generated JSON Schema uses `anyOf`
 * with `const`-discriminated variants (TypeBox Type.Union always emits anyOf).
 */
export declare const ReputationEventSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"quality_signal">;
    score: import("@sinclair/typebox").TNumber;
    task_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>>;
    dimensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TNumber>>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"task_completed">;
    task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
    success: import("@sinclair/typebox").TBoolean;
    duration_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"credential_update">;
    credential_id: import("@sinclair/typebox").TString;
    action: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"issued">, import("@sinclair/typebox").TLiteral<"revoked">, import("@sinclair/typebox").TLiteral<"renewed">, import("@sinclair/typebox").TLiteral<"suspended">]>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>, import("@sinclair/typebox").TObject<{
    type: import("@sinclair/typebox").TLiteral<"model_performance">;
    model_id: import("@sinclair/typebox").TString;
    provider: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
    quality_observation: import("@sinclair/typebox").TObject<{
        score: import("@sinclair/typebox").TNumber;
        dimensions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TNumber>>;
        latency_ms: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        evaluated_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>;
    request_context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        request_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        delegation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    event_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    timestamp: import("@sinclair/typebox").TString;
    sequence: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>]>;
export type ReputationEvent = Static<typeof ReputationEventSchema>;
//# sourceMappingURL=reputation-event.d.ts.map