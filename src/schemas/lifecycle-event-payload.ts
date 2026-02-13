import { Type, type Static } from '@sinclair/typebox';
import { AgentLifecycleStateSchema } from './agent-lifecycle.js';
import type { DomainEvent } from './domain-event.js';

/**
 * Typed payload for lifecycle transition events.
 *
 * Captures the transition details including a mandatory reason field.
 * Kubernetes tracks reason and message on pod condition changes, making
 * production debugging enormously easier. "Why did this agent go SUSPENDED?"
 * should be answerable from the event stream.
 */
export const LifecycleTransitionPayloadSchema = Type.Object({
  agent_id: Type.String({ minLength: 1, description: 'Agent this transition belongs to' }),
  previous_state: AgentLifecycleStateSchema,
  new_state: AgentLifecycleStateSchema,
  reason: Type.String({
    minLength: 1,
    description: 'Human/agent-readable reason for transition',
  }),
  triggered_by: Type.Optional(Type.String({
    description: 'Actor or event that triggered the transition',
  })),
  transfer_id: Type.Optional(Type.String({
    description: 'Associated transfer ID (for TRANSFERRED state)',
  })),
}, {
  $id: 'LifecycleTransitionPayload',
  additionalProperties: false,
});

export type LifecycleTransitionPayload = Static<typeof LifecycleTransitionPayloadSchema>;

/** Convenience type: a DomainEvent whose payload is a LifecycleTransitionPayload. */
export type LifecycleTransitionEvent = DomainEvent<LifecycleTransitionPayload>;
