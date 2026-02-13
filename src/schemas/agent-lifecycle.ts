import { Type, type Static } from '@sinclair/typebox';

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
] as const;

export type AgentLifecycleState = (typeof AGENT_LIFECYCLE_STATES)[number];

export const AgentLifecycleStateSchema = Type.Union(
  [
    Type.Literal('DORMANT'),
    Type.Literal('PROVISIONING'),
    Type.Literal('ACTIVE'),
    Type.Literal('SUSPENDED'),
    Type.Literal('TRANSFERRED'),
    Type.Literal('ARCHIVED'),
  ],
  { $id: 'AgentLifecycleState', description: 'Agent lifecycle state' },
);

/**
 * Valid state transitions. ARCHIVED is terminal (no outgoing edges).
 */
export const AGENT_LIFECYCLE_TRANSITIONS: Record<
  AgentLifecycleState,
  readonly AgentLifecycleState[]
> = {
  DORMANT: ['PROVISIONING'],
  PROVISIONING: ['ACTIVE', 'DORMANT'],
  ACTIVE: ['SUSPENDED', 'TRANSFERRED', 'ARCHIVED'],
  SUSPENDED: ['ACTIVE', 'ARCHIVED'],
  TRANSFERRED: ['PROVISIONING', 'ARCHIVED'],
  ARCHIVED: [],
} as const;

/**
 * Check whether a lifecycle transition is valid.
 */
export function isValidTransition(
  from: AgentLifecycleState,
  to: AgentLifecycleState,
): boolean {
  return (AGENT_LIFECYCLE_TRANSITIONS[from] as readonly string[]).includes(to);
}
