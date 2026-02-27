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
import { Type } from '@sinclair/typebox';
// ---------------------------------------------------------------------------
// Event Filter
// ---------------------------------------------------------------------------
export const EventFilterSchema = Type.Object({
    personality_ids: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Filter to events for specific personality IDs.',
    })),
    collection_ids: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Filter to events within specific collections.',
    })),
    state_transitions: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Filter to specific state transitions (e.g., "cold→warming").',
    })),
    score_thresholds: Type.Optional(Type.Object({
        min: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
        max: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    }, {
        description: 'Filter to events where score crosses threshold boundaries.',
    })),
    event_types: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
        description: 'Filter to specific event types (e.g., "quality_recorded", "state_changed").',
    })),
}, {
    $id: 'EventFilter',
    additionalProperties: false,
    description: 'Filter criteria for event subscription. All filters are AND-combined.',
});
// ---------------------------------------------------------------------------
// Delivery Method
// ---------------------------------------------------------------------------
export const DeliveryMethodSchema = Type.Union([
    Type.Literal('webhook'),
    Type.Literal('sse'),
], {
    $id: 'DeliveryMethod',
    description: 'Delivery mechanism for subscribed events.',
});
// ---------------------------------------------------------------------------
// Event Cursor
// ---------------------------------------------------------------------------
export const EventCursorSchema = Type.Object({
    after_event_id: Type.Optional(Type.String({
        format: 'uuid',
        description: 'Resume from after this event ID (exclusive).',
    })),
    after_timestamp: Type.Optional(Type.String({
        format: 'date-time',
        description: 'Resume from after this timestamp (exclusive).',
    })),
    limit: Type.Optional(Type.Integer({
        minimum: 1,
        maximum: 1000,
        default: 100,
        description: 'Maximum events per delivery batch.',
    })),
}, {
    $id: 'EventCursor',
    additionalProperties: false,
    description: 'Cursor for event replay and pagination. Specify at most one of after_event_id or after_timestamp.',
});
// ---------------------------------------------------------------------------
// Event Subscription
// ---------------------------------------------------------------------------
export const EventSubscriptionSchema = Type.Object({
    subscription_id: Type.String({ format: 'uuid' }),
    subscriber_id: Type.String({ minLength: 1, description: 'Identity of the subscribing service.' }),
    pool_id: Type.String({ minLength: 1, description: 'Pool scope for the subscription.' }),
    filter: EventFilterSchema,
    delivery: Type.Object({
        method: DeliveryMethodSchema,
        endpoint: Type.Optional(Type.String({
            format: 'uri',
            description: 'Webhook URL or SSE endpoint. Required for webhook delivery.',
        })),
        retry_policy: Type.Optional(Type.Object({
            max_retries: Type.Integer({ minimum: 0, default: 3 }),
            backoff_seconds: Type.Integer({ minimum: 1, default: 5 }),
        })),
    }, { additionalProperties: false }),
    cursor: Type.Optional(EventCursorSchema),
    active: Type.Boolean({ description: 'Whether the subscription is currently active.' }),
    created_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'EventSubscription',
    additionalProperties: false,
    description: 'A subscription to reputation events with filter, delivery, and cursor configuration.',
});
//# sourceMappingURL=event-subscription.js.map