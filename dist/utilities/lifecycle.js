/**
 * Generic state transition validator factory.
 * Used by agent lifecycle (v2.0.0) and tool lifecycle (v2.1.0).
 */
/**
 * Create a transition validator from a state transition map.
 *
 * Generic factory for building state machine validators. Used by the agent
 * lifecycle (v2.0.0) and designed for reuse with tool lifecycle, conversation
 * status, and any future state machines.
 *
 * @typeParam T - String literal union representing the state enum (e.g. `AgentLifecycleState`)
 * @param transitions - Map of state → valid target states
 * @returns Validator with `isValid` and `getValidTargets` methods
 *
 * @example Agent lifecycle validator
 * ```ts
 * import { createTransitionValidator } from './lifecycle.js';
 * import { AGENT_LIFECYCLE_TRANSITIONS, type AgentLifecycleState } from '../schemas/agent-lifecycle.js';
 *
 * const validator = createTransitionValidator<AgentLifecycleState>(AGENT_LIFECYCLE_TRANSITIONS);
 * validator.isValid('DORMANT', 'PROVISIONING'); // true
 * validator.isValid('DORMANT', 'ACTIVE');        // false — must provision first
 * validator.getValidTargets('ACTIVE');            // ['SUSPENDED', 'TRANSFERRED', 'ARCHIVED']
 * ```
 *
 * @example Custom state machine
 * ```ts
 * type ToolState = 'REGISTERED' | 'ENABLED' | 'DISABLED' | 'DEPRECATED';
 * const TOOL_TRANSITIONS: Record<ToolState, readonly ToolState[]> = {
 *   REGISTERED: ['ENABLED'],
 *   ENABLED: ['DISABLED', 'DEPRECATED'],
 *   DISABLED: ['ENABLED', 'DEPRECATED'],
 *   DEPRECATED: [],
 * };
 * const toolValidator = createTransitionValidator<ToolState>(TOOL_TRANSITIONS);
 * ```
 *
 * @see {@link AGENT_LIFECYCLE_TRANSITIONS} for the agent state machine definition
 * @see {@link isValidTransition} for direct agent lifecycle validation
 */
/**
 * Create a transition validator from a state transition map.
 *
 * Generic factory for building state machine validators. Used by the agent
 * lifecycle (v2.0.0) and designed for reuse with tool lifecycle, conversation
 * status, and any future state machines.
 *
 * @typeParam T - String literal union representing the state enum (e.g. `AgentLifecycleState`)
 * @param transitions - Map of state → valid target states
 * @param guards - Optional map of guard predicates for specific transitions. When provided,
 *   transitions are checked against both the transition map AND the guard predicate.
 *   Guard keys use the format `"FROM→TO"` (e.g. `"ACTIVE→TRANSFERRED"`).
 * @returns Validator with `isValid` and `getValidTargets` methods
 *
 * @example Agent lifecycle validator with guards
 * ```ts
 * import { createTransitionValidator, DEFAULT_GUARDS } from './lifecycle.js';
 * import { AGENT_LIFECYCLE_TRANSITIONS, type AgentLifecycleState } from '../schemas/agent-lifecycle.js';
 *
 * const validator = createTransitionValidator<AgentLifecycleState>(
 *   AGENT_LIFECYCLE_TRANSITIONS,
 *   DEFAULT_GUARDS,
 * );
 * validator.isValid('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-123' }); // true
 * validator.isValid('ACTIVE', 'TRANSFERRED');                             // false — no transfer_id
 * ```
 *
 * @see {@link AGENT_LIFECYCLE_TRANSITIONS} for the agent state machine definition
 * @see {@link DEFAULT_GUARDS} for built-in agent lifecycle guard predicates
 */
export function createTransitionValidator(transitions, guards) {
    return {
        isValid(from, to, context) {
            const targets = transitions[from];
            if (targets === undefined || !targets.includes(to)) {
                return false;
            }
            if (guards) {
                const key = `${from}\u2192${to}`;
                const guard = guards[key];
                if (guard && !guard(from, to, context)) {
                    return false;
                }
            }
            return true;
        },
        getValidTargets(from) {
            return transitions[from] ?? [];
        },
    };
}
/**
 * Default guard predicates for agent lifecycle transitions.
 *
 * These encode the expected preconditions documented in the
 * `AGENT_LIFECYCLE_TRANSITIONS` TSDoc. Guards are optional — when
 * `createTransitionValidator()` is called without guards, all
 * structurally valid transitions are permitted.
 *
 * @see BB-POST-004 — Lifecycle guard condition predicates
 */
export const DEFAULT_GUARDS = {
    /** ACTIVE → TRANSFERRED requires an active transfer_id. */
    'ACTIVE\u2192TRANSFERRED': (_from, _to, context) => {
        return context !== undefined && typeof context.transfer_id === 'string' && context.transfer_id.length > 0;
    },
    /** ACTIVE → ARCHIVED requires no active transfer. */
    'ACTIVE\u2192ARCHIVED': (_from, _to, context) => {
        return context === undefined || !context.transfer_id;
    },
    /** SUSPENDED → ACTIVE requires suspension reason resolved. */
    'SUSPENDED\u2192ACTIVE': (_from, _to, context) => {
        return context !== undefined && context.reason_resolved === true;
    },
    /** TRANSFERRED → PROVISIONING requires transfer completed and new owner authenticated. */
    'TRANSFERRED\u2192PROVISIONING': (_from, _to, context) => {
        return context !== undefined
            && context.transfer_completed === true
            && typeof context.new_owner === 'string'
            && context.new_owner.length > 0;
    },
};
//# sourceMappingURL=lifecycle.js.map