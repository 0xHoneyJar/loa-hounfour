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
 *
 * Guard conditions follow the Kubernetes pod lifecycle parallel:
 * each transition has expected preconditions that consumers SHOULD
 * enforce at the service layer (not at the schema level).
 *
 * @remarks
 * - **DORMANT → PROVISIONING**: Requires valid owner identity and NFT binding.
 *   Parallel: K8s Pod `Pending` — scheduler has accepted but containers not yet running.
 *
 * - **PROVISIONING → ACTIVE**: Requires all provisioning checks passed
 *   (model access verified, billing configured, capabilities registered).
 *   Parallel: K8s Pod `Running` — all containers started successfully.
 *
 * - **PROVISIONING → DORMANT**: Provisioning failed or was cancelled by owner.
 *   Parallel: K8s Pod returning to `Pending` after init container failure.
 *
 * - **ACTIVE → SUSPENDED**: Requires suspension reason (billing_delinquent,
 *   policy_violation, owner_requested, maintenance). Must record reason_code.
 *   Parallel: K8s Pod `NotReady` — liveness probe failing.
 *
 * - **ACTIVE → TRANSFERRED**: Requires active `transfer_id` referencing a
 *   valid TransferSpec. Must NOT have another transfer in progress.
 *   Parallel: K8s Pod being drained from a node during migration.
 *
 * - **ACTIVE → ARCHIVED**: Requires `owner_requested` or `admin_action` reason.
 *   Must NOT have an active transfer in progress.
 *   Parallel: K8s Pod `Succeeded/Failed` — terminal, no restart.
 *
 * - **SUSPENDED → ACTIVE**: Requires suspension reason resolved (billing current,
 *   violation cleared, owner request withdrawn, maintenance completed).
 *   Parallel: K8s Pod readiness probe passing again.
 *
 * - **SUSPENDED → ARCHIVED**: Owner or admin chose to archive while suspended.
 *   Parallel: K8s Pod force-deleted during suspension.
 *
 * - **TRANSFERRED → PROVISIONING**: Transfer completed, new owner authenticated.
 *   New provisioning cycle begins under new ownership context.
 *   Parallel: K8s Pod rescheduled to a new node after migration.
 *
 * - **TRANSFERRED → ARCHIVED**: Transfer failed or was abandoned. Agent archived
 *   rather than returned to previous state.
 *   Parallel: K8s Pod evicted and not rescheduled.
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
 *
 * @deprecated Planned rename to `isValidAgentLifecycleTransition` in next major version
 * for consistency with `isValidStateMachineTransition` and `isValidEscrowTransition`.
 * @see BB-C9-008
 */
export function isValidTransition(
  from: AgentLifecycleState,
  to: AgentLifecycleState,
): boolean {
  return (AGENT_LIFECYCLE_TRANSITIONS[from] as readonly string[]).includes(to);
}
