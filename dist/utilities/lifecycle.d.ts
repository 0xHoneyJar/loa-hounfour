/**
 * Generic state transition validator factory.
 * Used by agent lifecycle (v2.0.0) and tool lifecycle (v2.1.0).
 */
export interface TransitionValidator<T extends string> {
    /** Check whether a transition from `from` to `to` is valid. */
    isValid(from: T, to: T): boolean;
    /** Get all valid target states from the given state. */
    getValidTargets(from: T): readonly T[];
}
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
export declare function createTransitionValidator<T extends string>(transitions: Record<T, readonly T[]>): TransitionValidator<T>;
//# sourceMappingURL=lifecycle.d.ts.map