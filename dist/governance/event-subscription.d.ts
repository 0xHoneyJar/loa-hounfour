/**
 * Event Subscription Protocol — real-time reputation feed subscriptions.
 *
 * Enables consumers to subscribe to reputation events (state changes,
 * score updates, quality events) for specific personalities, collections,
 * or score thresholds. Supports webhook and SSE delivery with cursor-based
 * pagination for replay.
 *
 * @see DR-S1 — Deep Bridgebuilder Review SPECULATION finding
 * @since v7.5.0
 */
import { type Static } from '@sinclair/typebox';
export declare const EventFilterSchema: import("@sinclair/typebox").TObject<{
    personality_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    collection_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    state_transitions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    score_thresholds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        min: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        max: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
    }>>;
    event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
}>;
export type EventFilter = Static<typeof EventFilterSchema>;
export declare const DeliveryMethodSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"webhook">, import("@sinclair/typebox").TLiteral<"sse">]>;
export type DeliveryMethod = Static<typeof DeliveryMethodSchema>;
export declare const EventCursorSchema: import("@sinclair/typebox").TObject<{
    after_event_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    after_timestamp: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type EventCursor = Static<typeof EventCursorSchema>;
export declare const EventSubscriptionSchema: import("@sinclair/typebox").TObject<{
    subscription_id: import("@sinclair/typebox").TString;
    subscriber_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    filter: import("@sinclair/typebox").TObject<{
        personality_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        collection_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        state_transitions: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
        score_thresholds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            min: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
            max: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TNumber>;
        }>>;
        event_types: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    }>;
    delivery: import("@sinclair/typebox").TObject<{
        method: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"webhook">, import("@sinclair/typebox").TLiteral<"sse">]>;
        endpoint: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        retry_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            max_retries: import("@sinclair/typebox").TInteger;
            backoff_seconds: import("@sinclair/typebox").TInteger;
        }>>;
    }>;
    cursor: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        after_event_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        after_timestamp: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        limit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>>;
    active: import("@sinclair/typebox").TBoolean;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type EventSubscription = Static<typeof EventSubscriptionSchema>;
//# sourceMappingURL=event-subscription.d.ts.map