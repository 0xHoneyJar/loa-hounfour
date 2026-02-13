/**
 * Generic state transition validator factory.
 * Used by agent lifecycle (v2.0.0) and tool lifecycle (v2.1.0).
 */
export interface TransitionValidator<T extends string> {
    /** Check whether a transition from `from` to `to` is valid. */
    isValid(from: T, to: T, context?: Record<string, unknown>): boolean;
    /** Get all valid target states from the given state. */
    getValidTargets(from: T): readonly T[];
}
/**
 * Guard predicate for a state transition. Returns true if the transition
 * is allowed given the provided context, false otherwise.
 *
 * @typeParam T - String literal union of state values
 * @param from - Current state
 * @param to - Target state
 * @param context - Optional context for the transition (e.g. `{ transfer_id: string }`)
 *
 * @see BB-POST-004 — Lifecycle guard condition predicates
 */
export type TransitionGuard<T extends string> = (from: T, to: T, context?: Record<string, unknown>) => boolean;
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
export declare function createTransitionValidator<T extends string>(transitions: Record<T, readonly T[]>, guards?: Record<string, TransitionGuard<T>>): TransitionValidator<T>;
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
export declare const DEFAULT_GUARDS: Record<string, TransitionGuard<string>>;
//# sourceMappingURL=lifecycle.d.ts.map