import { Type, type Static, type TSchema } from '@sinclair/typebox';
import { TypeCompiler } from '@sinclair/typebox/compiler';
import { SagaContextSchema } from './saga-context.js';
export type { SagaContext } from './saga-context.js';
export { SagaContextSchema } from './saga-context.js';

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
    description: 'Consumer-extensible metadata. Namespace conventions: '
      + 'loa.* reserved for protocol-level metadata, '
      + 'trace.* for OpenTelemetry-compatible observability, '
      + 'x-* for consumer-defined extensions. '
      + 'Not validated by protocol contract.',
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

// ---------------------------------------------------------------------------
// Minimal payload schemas for runtime type guards.
// `additionalProperties: true` preserves extensibility — these check the
// minimum contract, not the full payload shape.
// ---------------------------------------------------------------------------

/** Minimum payload contract for agent aggregate events. */
export const AgentEventPayloadSchema = Type.Object({
  agent_id: Type.String({ minLength: 1 }),
}, { $id: 'AgentEventPayload', additionalProperties: true });

/** Minimum payload contract for billing aggregate events. */
export const BillingEventPayloadSchema = Type.Object({
  billing_entry_id: Type.String({ minLength: 1 }),
}, { $id: 'BillingEventPayload', additionalProperties: true });

/** Minimum payload contract for conversation aggregate events. */
export const ConversationEventPayloadSchema = Type.Object({
  conversation_id: Type.String({ minLength: 1 }),
}, { $id: 'ConversationEventPayload', additionalProperties: true });

/** Minimum payload contract for transfer aggregate events. */
export const TransferEventPayloadSchema = Type.Object({
  transfer_id: Type.String({ minLength: 1 }),
  from_owner: Type.String({ minLength: 1 }),
  to_owner: Type.String({ minLength: 1 }),
}, { $id: 'TransferEventPayload', additionalProperties: true });

// Lazily compiled payload validators
const payloadValidators = new Map<string, ReturnType<typeof TypeCompiler.Compile>>();

function checkPayload(schema: TSchema, payload: unknown): boolean {
  const id = schema.$id;
  if (!id) throw new Error('checkPayload requires schema with $id');
  let compiled = payloadValidators.get(id);
  if (!compiled) {
    compiled = TypeCompiler.Compile(schema);
    payloadValidators.set(id, compiled);
  }
  return compiled.Check(payload);
}

/**
 * Runtime type guard: narrows a DomainEvent to AgentEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export function isAgentEvent(event: DomainEvent): event is AgentEvent {
  return event.aggregate_type === 'agent'
    && checkPayload(AgentEventPayloadSchema, event.payload);
}

/**
 * Runtime type guard: narrows a DomainEvent to BillingEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export function isBillingEvent(event: DomainEvent): event is BillingEvent {
  return event.aggregate_type === 'billing'
    && checkPayload(BillingEventPayloadSchema, event.payload);
}

/**
 * Runtime type guard: narrows a DomainEvent to ConversationEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export function isConversationEvent(event: DomainEvent): event is ConversationEvent {
  return event.aggregate_type === 'conversation'
    && checkPayload(ConversationEventPayloadSchema, event.payload);
}

/**
 * Runtime type guard: narrows a DomainEvent to TransferEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export function isTransferEvent(event: DomainEvent): event is TransferEvent {
  return event.aggregate_type === 'transfer'
    && checkPayload(TransferEventPayloadSchema, event.payload);
}

// SagaContextSchema re-exported from ./saga-context.ts (BB-V3-F004)

/**
 * Batch envelope for atomic multi-event delivery.
 *
 * When a transfer completes, it emits multiple events (lifecycle transition,
 * conversation sealing, billing adjustment). A batch with a shared correlation_id
 * enables atomic processing — the transactional outbox pattern.
 *
 * v2.2.0 adds `context` for envelope-level routing (BB-V3-010) and `saga`
 * for distributed saga forward/compensation tracking (BB-V3-012).
 */
export const DomainEventBatchSchema = Type.Object({
  batch_id: Type.String({ minLength: 1, description: 'Unique batch identifier' }),
  correlation_id: Type.String({ minLength: 1, description: 'Shared correlation across all events in batch' }),
  events: Type.Array(DomainEventSchema, { minItems: 1, description: 'Ordered list of domain events' }),
  source: Type.String({ minLength: 1, description: 'System that produced the batch' }),
  produced_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  context: Type.Optional(Type.Object({
    transfer_id: Type.Optional(Type.String({ description: 'Associated transfer ID' })),
    aggregate_id: Type.Optional(Type.String({ description: 'Primary aggregate this batch concerns' })),
    aggregate_type: Type.Optional(AggregateTypeSchema),
  }, {
    additionalProperties: true,
    description: 'Envelope-level routing context (avoids payload inspection)',
  })),
  saga: Type.Optional(SagaContextSchema),
}, {
  $id: 'DomainEventBatch',
  additionalProperties: false,
});

export type DomainEventBatch = Static<typeof DomainEventBatchSchema>;
