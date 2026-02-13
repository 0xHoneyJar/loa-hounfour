import { Type } from '@sinclair/typebox';
/**
 * 6-state agent lifecycle machine.
 *
 * DORMANT → PROVISIONING → ACTIVE → SUSPENDED → ACTIVE (cycle)
 *                                 → TRANSFERRED → PROVISIONING (new owner)
 *                                 → ARCHIVED (terminal)
 */
export const AGENT_LIFECYCLE_STATES = [
    'DORMANT',
    'PROVISIONING',
    'ACTIVE',
    'SUSPENDED',
    'TRANSFERRED',
    'ARCHIVED',
];
export const AgentLifecycleStateSchema = Type.Union([
    Type.Literal('DORMANT'),
    Type.Literal('PROVISIONING'),
    Type.Literal('ACTIVE'),
    Type.Literal('SUSPENDED'),
    Type.Literal('TRANSFERRED'),
    Type.Literal('ARCHIVED'),
], { $id: 'AgentLifecycleState', description: 'Agent lifecycle state' });
/**
 * Valid state transitions. ARCHIVED is terminal (no outgoing edges).
 */
export const AGENT_LIFECYCLE_TRANSITIONS = {
    DORMANT: ['PROVISIONING'],
    PROVISIONING: ['ACTIVE', 'DORMANT'],
    ACTIVE: ['SUSPENDED', 'TRANSFERRED', 'ARCHIVED'],
    SUSPENDED: ['ACTIVE', 'ARCHIVED'],
    TRANSFERRED: ['PROVISIONING', 'ARCHIVED'],
    ARCHIVED: [],
};
/**
 * Check whether a lifecycle transition is valid.
 */
export function isValidTransition(from, to) {
    return AGENT_LIFECYCLE_TRANSITIONS[from].includes(to);
}
//# sourceMappingURL=agent-lifecycle.js.map