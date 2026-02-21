import { type Static } from '@sinclair/typebox';
/**
 * Domain event envelope — wraps any domain payload with standard metadata.
 *
 * The `type` field follows a dotted naming convention: `{aggregate}.{noun}.{verb}`,
 * e.g. "agent.lifecycle.transitioned", "billing.entry.created".
 *
 * At runtime, `payload` is validated as `Type.Unknown()`. Typed wrappers below
 * provide compile-time-only payload narrowing.
 */
export declare const DomainEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    aggregate_id: import("@sinclair/typebox").TString;
    aggregate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">, import("@sinclair/typebox").TLiteral<"performance">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"reputation">, import("@sinclair/typebox").TLiteral<"economy">]>;
    type: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TInteger;
    occurred_at: import("@sinclair/typebox").TString;
    actor: import("@sinclair/typebox").TString;
    correlation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    causation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    payload: import("@sinclair/typebox").TUnknown;
    contract_version: import("@sinclair/typebox").TString;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
/** Generic DomainEvent type — payload typed as T at compile time. */
export type DomainEvent<T = unknown> = Omit<Static<typeof DomainEventSchema>, 'payload'> & {
    payload: T;
};
/** Agent aggregate events — payload must include agent_id. */
export type AgentEvent = DomainEvent<{
    agent_id: string;
    [k: string]: unknown;
}>;
/** Billing aggregate events — payload must include billing_entry_id. */
export type BillingEvent = DomainEvent<{
    billing_entry_id: string;
    [k: string]: unknown;
}>;
/** Conversation aggregate events — payload must include conversation_id. */
export type ConversationEvent = DomainEvent<{
    conversation_id: string;
    [k: string]: unknown;
}>;
/** Transfer aggregate events — payload must include transfer_id and owner addresses. */
export type TransferEvent = DomainEvent<{
    transfer_id: string;
    from_owner: string;
    to_owner: string;
    [k: string]: unknown;
}>;
/** Tool aggregate events — payload must include tool_call_id. */
export type ToolEvent = DomainEvent<{
    tool_call_id: string;
    [k: string]: unknown;
}>;
/** Message aggregate events — payload must include message_id. */
export type MessageEvent = DomainEvent<{
    message_id: string;
    [k: string]: unknown;
}>;
/** Performance aggregate events — payload must include performance_record_id. */
export type PerformanceEvent = DomainEvent<{
    performance_record_id: string;
    [k: string]: unknown;
}>;
/** Governance aggregate events — payload must include governance_action_id. */
export type GovernanceEvent = DomainEvent<{
    governance_action_id: string;
    [k: string]: unknown;
}>;
/** Reputation aggregate events — payload must include agent_id. */
export type ReputationEvent = DomainEvent<{
    agent_id: string;
    [k: string]: unknown;
}>;
/** Economy aggregate events — payload must include transaction_id. */
export type EconomyEvent = DomainEvent<{
    transaction_id: string;
    [k: string]: unknown;
}>;
/** Minimum payload contract for agent aggregate events. */
export declare const AgentEventPayloadSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for billing aggregate events. */
export declare const BillingEventPayloadSchema: import("@sinclair/typebox").TObject<{
    billing_entry_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for conversation aggregate events. */
export declare const ConversationEventPayloadSchema: import("@sinclair/typebox").TObject<{
    conversation_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for transfer aggregate events. */
export declare const TransferEventPayloadSchema: import("@sinclair/typebox").TObject<{
    transfer_id: import("@sinclair/typebox").TString;
    from_owner: import("@sinclair/typebox").TString;
    to_owner: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for tool aggregate events. */
export declare const ToolEventPayloadSchema: import("@sinclair/typebox").TObject<{
    tool_call_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for message aggregate events. */
export declare const MessageEventPayloadSchema: import("@sinclair/typebox").TObject<{
    message_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for performance aggregate events. */
export declare const PerformanceEventPayloadSchema: import("@sinclair/typebox").TObject<{
    performance_record_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for governance aggregate events. */
export declare const GovernanceEventPayloadSchema: import("@sinclair/typebox").TObject<{
    governance_action_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for reputation aggregate events. */
export declare const ReputationEventPayloadSchema: import("@sinclair/typebox").TObject<{
    agent_id: import("@sinclair/typebox").TString;
}>;
/** Minimum payload contract for economy aggregate events. */
export declare const EconomyEventPayloadSchema: import("@sinclair/typebox").TObject<{
    transaction_id: import("@sinclair/typebox").TString;
}>;
/**
 * Runtime type guard: narrows a DomainEvent to AgentEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export declare function isAgentEvent(event: DomainEvent): event is AgentEvent;
/**
 * Runtime type guard: narrows a DomainEvent to BillingEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export declare function isBillingEvent(event: DomainEvent): event is BillingEvent;
/**
 * Runtime type guard: narrows a DomainEvent to ConversationEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export declare function isConversationEvent(event: DomainEvent): event is ConversationEvent;
/**
 * Runtime type guard: narrows a DomainEvent to TransferEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export declare function isTransferEvent(event: DomainEvent): event is TransferEvent;
/**
 * Runtime type guard: narrows a DomainEvent to ToolEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export declare function isToolEvent(event: DomainEvent): event is ToolEvent;
/**
 * Runtime type guard: narrows a DomainEvent to MessageEvent.
 * Validates both aggregate_type and minimum payload contract.
 */
export declare function isMessageEvent(event: DomainEvent): event is MessageEvent;
export declare function isPerformanceEvent(event: DomainEvent): event is PerformanceEvent;
export declare function isGovernanceEvent(event: DomainEvent): event is GovernanceEvent;
export declare function isReputationEvent(event: DomainEvent): event is ReputationEvent;
export declare function isEconomyEvent(event: DomainEvent): event is EconomyEvent;
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
export declare const DomainEventBatchSchema: import("@sinclair/typebox").TObject<{
    batch_id: import("@sinclair/typebox").TString;
    correlation_id: import("@sinclair/typebox").TString;
    events: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        event_id: import("@sinclair/typebox").TString;
        aggregate_id: import("@sinclair/typebox").TString;
        aggregate_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">, import("@sinclair/typebox").TLiteral<"performance">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"reputation">, import("@sinclair/typebox").TLiteral<"economy">]>;
        type: import("@sinclair/typebox").TString;
        version: import("@sinclair/typebox").TInteger;
        occurred_at: import("@sinclair/typebox").TString;
        actor: import("@sinclair/typebox").TString;
        correlation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        causation_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        payload: import("@sinclair/typebox").TUnknown;
        contract_version: import("@sinclair/typebox").TString;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    }>>;
    source: import("@sinclair/typebox").TString;
    produced_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        transfer_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        aggregate_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        aggregate_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agent">, import("@sinclair/typebox").TLiteral<"conversation">, import("@sinclair/typebox").TLiteral<"billing">, import("@sinclair/typebox").TLiteral<"tool">, import("@sinclair/typebox").TLiteral<"transfer">, import("@sinclair/typebox").TLiteral<"message">, import("@sinclair/typebox").TLiteral<"performance">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"reputation">, import("@sinclair/typebox").TLiteral<"economy">]>>;
    }>>;
    saga: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        saga_id: import("@sinclair/typebox").TString;
        step: import("@sinclair/typebox").TInteger;
        total_steps: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        direction: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"forward">, import("@sinclair/typebox").TLiteral<"compensation">]>;
    }>>;
}>;
export type DomainEventBatch = Static<typeof DomainEventBatchSchema>;
//# sourceMappingURL=domain-event.d.ts.map