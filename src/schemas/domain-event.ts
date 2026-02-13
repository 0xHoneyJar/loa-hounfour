import { Type, type Static } from '@sinclair/typebox';

/** Aggregate types for domain event routing. */
const AggregateTypeSchema = Type.Union([
  Type.Literal('agent'),
  Type.Literal('conversation'),
  Type.Literal('billing'),
  Type.Literal('tool'),
  Type.Literal('transfer'),
  Type.Literal('message'),
]);

/**
 * Domain event envelope — wraps any domain payload with standard metadata.
 *
 * The `type` field follows a dotted naming convention: `{aggregate}.{noun}.{verb}`,
 * e.g. "agent.lifecycle.transitioned", "billing.entry.created".
 *
 * At runtime, `payload` is validated as `Type.Unknown()`. Typed wrappers below
 * provide compile-time-only payload narrowing.
 */
export const DomainEventSchema = Type.Object({
  event_id: Type.String({ minLength: 1, description: 'Globally unique event ID' }),
  aggregate_id: Type.String({ minLength: 1, description: 'ID of the aggregate this event belongs to' }),
  aggregate_type: AggregateTypeSchema,
  // Event type: three-segment dotted convention {aggregate}.{noun}.{verb}
  // Examples: agent.lifecycle.transitioned, billing.entry.created, conversation.thread.sealed
  // Three segments chosen for routing: segment 1 selects the event bus partition,
  // segment 2 selects the handler group, segment 3 selects the specific handler.
  // This maps to Kafka topic.consumer-group.handler in the loa-finn event system.
  type: Type.String({
    pattern: '^[a-z]+\\.[a-z_]+\\.[a-z_]+$',
    description: 'Dotted event type: {aggregate}.{noun}.{verb}',
  }),
  version: Type.Integer({ minimum: 1, description: 'Event schema version' }),
  occurred_at: Type.String({ format: 'date-time' }),
  actor: Type.String({ minLength: 1, description: 'Who/what caused this event' }),
  correlation_id: Type.Optional(Type.String({ description: 'Request correlation chain' })),
  causation_id: Type.Optional(Type.String({ description: 'Direct cause event ID' })),
  payload: Type.Unknown(),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
    description: 'Consumer-extensible metadata (not validated by protocol contract)',
  })),
}, {
  $id: 'DomainEvent',
  additionalProperties: false,
});

/** Generic DomainEvent type — payload typed as T at compile time. */
export type DomainEvent<T = unknown> = Omit<
  Static<typeof DomainEventSchema>, 'payload'
> & { payload: T };

/** Agent aggregate events — payload must include agent_id. */
export type AgentEvent = DomainEvent<{ agent_id: string; [k: string]: unknown }>;

/** Billing aggregate events — payload must include billing_entry_id. */
export type BillingEvent = DomainEvent<{ billing_entry_id: string; [k: string]: unknown }>;

/** Conversation aggregate events — payload must include conversation_id. */
export type ConversationEvent = DomainEvent<{ conversation_id: string; [k: string]: unknown }>;

/** Transfer aggregate events — payload must include transfer_id and owner addresses. */
export type TransferEvent = DomainEvent<{
  transfer_id: string;
  from_owner: string;
  to_owner: string;
  [k: string]: unknown;
}>;

/**
 * Batch envelope for atomic multi-event delivery.
 *
 * When a transfer completes, it emits multiple events (lifecycle transition,
 * conversation sealing, billing adjustment). A batch with a shared correlation_id
 * enables atomic processing — the transactional outbox pattern.
 */
export const DomainEventBatchSchema = Type.Object({
  batch_id: Type.String({ minLength: 1, description: 'Unique batch identifier' }),
  correlation_id: Type.String({ minLength: 1, description: 'Shared correlation across all events in batch' }),
  events: Type.Array(DomainEventSchema, { minItems: 1, description: 'Ordered list of domain events' }),
  source: Type.String({ minLength: 1, description: 'System that produced the batch' }),
  produced_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'DomainEventBatch',
  additionalProperties: false,
});

export type DomainEventBatch = Static<typeof DomainEventBatchSchema>;
