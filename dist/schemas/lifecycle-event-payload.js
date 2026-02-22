import { Type } from '@sinclair/typebox';
import { AgentLifecycleStateSchema } from './agent-lifecycle.js';
import { LIFECYCLE_REASON_CODE_VALUES } from '../vocabulary/lifecycle-reasons.js';
/**
 * Typed payload for lifecycle transition events.
 *
 * Captures the transition details including a mandatory reason field.
 * Kubernetes tracks reason and message on pod condition changes, making
 * production debugging enormously easier. "Why did this agent go SUSPENDED?"
 * should be answerable from the event stream.
 *
 * v2.2.0 adds `reason_code` — machine-readable Kubernetes-style reason codes
 * for filtering and monitoring. `reason` remains required for human context.
 */
export const LifecycleTransitionPayloadSchema = Type.Object({
    agent_id: Type.String({ minLength: 1, description: 'Agent this transition belongs to' }),
    previous_state: AgentLifecycleStateSchema,
    new_state: AgentLifecycleStateSchema,
    reason: Type.String({
        minLength: 1,
        description: 'Human-readable reason for transition',
    }),
    reason_code: Type.Optional(Type.Union(LIFECYCLE_REASON_CODE_VALUES.map(k => Type.Literal(k)), { description: 'Machine-readable reason code for filtering and monitoring' })),
    triggered_by: Type.Optional(Type.String({
        description: 'Actor or event that triggered the transition',
    })),
    transfer_id: Type.Optional(Type.String({
        description: 'Associated transfer ID (for TRANSFERRED state)',
    })),
}, {
    $id: 'LifecycleTransitionPayload',
    description: 'Payload for agent lifecycle state transitions',
    additionalProperties: false,
});
//# sourceMappingURL=lifecycle-event-payload.js.map