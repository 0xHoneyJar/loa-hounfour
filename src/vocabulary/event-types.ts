/**
 * Canonical event type vocabulary registry.
 *
 * Without a registry, multi-model systems produce naming divergence:
 * one model emits `agent.lifecycle.transitioned`, another emits
 * `agent.state.changed` — both valid, both describing the same event.
 *
 * This registry is the IANA HTTP Status Code equivalent for domain events.
 * Consumers SHOULD use registered types. Unknown types are not rejected
 * by the schema (the pattern validates format, not vocabulary), but
 * `isKnownEventType()` enables runtime detection of unregistered types.
 *
 * @see BB-V3-011 — Event type vocabulary registry
 */

/** Canonical domain event types. */
export const EVENT_TYPES = {
  // Agent aggregate
  'agent.lifecycle.transitioned': 'Agent lifecycle state changed',
  'agent.descriptor.updated': 'Agent descriptor modified',
  'agent.descriptor.created': 'Agent descriptor first created',

  // Billing aggregate
  'billing.entry.created': 'New billing entry recorded',
  'billing.entry.voided': 'Billing entry voided',
  'billing.credit.issued': 'Credit note issued against billing entry',

  // Conversation aggregate
  'conversation.thread.created': 'New conversation thread created',
  'conversation.thread.sealed': 'Conversation sealed during transfer',
  'conversation.status.changed': 'Conversation status updated',
  'conversation.message.added': 'Message added to conversation',

  // Transfer aggregate
  'transfer.saga.initiated': 'Transfer saga initiated',
  'transfer.saga.completed': 'Transfer completed successfully',
  'transfer.saga.failed': 'Transfer failed',
  'transfer.saga.rolled_back': 'Transfer rolled back after failure',

  // Tool aggregate
  'tool.call.started': 'Tool call execution started',
  'tool.call.completed': 'Tool call execution completed',
  'tool.call.failed': 'Tool call execution failed',

  // Message aggregate
  'message.content.created': 'Message content created',
  'message.content.moderated': 'Message content moderated',
} as const;

/** Registered event type string. */
export type EventType = keyof typeof EVENT_TYPES;

/** All registered event type values. */
export const EVENT_TYPE_VALUES = Object.keys(EVENT_TYPES) as EventType[];

/**
 * Check whether an event type string is a registered canonical type.
 *
 * Unknown types are NOT invalid — the DomainEvent.type pattern validates
 * format ({aggregate}.{noun}.{verb}), not vocabulary. This guard enables
 * runtime logging/alerting for unregistered types.
 */
export function isKnownEventType(type: string): type is EventType {
  return type in EVENT_TYPES;
}
