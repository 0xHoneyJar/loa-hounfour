/**
 * Generic state transition validator factory.
 * Used by agent lifecycle (v2.0.0) and tool lifecycle (v2.1.0).
 *
 * v2.4.0: Structured guard results (BB-C4-ADV-001) and named guard functions (BB-C4-ADV-005).
 */
/**
 * Result of a guard predicate evaluation.
 *
 * Structured results replace bare booleans so that consumers can surface
 * meaningful error messages without inspecting transition internals.
 *
 * @see BB-C4-ADV-001 — Guard predicates return bare boolean — no error message
 */
export type GuardResult = {
    valid: true;
} | {
    valid: false;
    reason: string;
    guard: string;
};
/**
 * Narrow a `GuardResult` to its valid or invalid branch.
 * Convenience function for backward compatibility and type narrowing.
 */
export declare function isValidGuardResult(result: GuardResult): result is {
    valid: true;
};
export interface TransitionValidator<T extends string> {
    /**
     * Check whether a transition from `from` to `to` is valid.
     *
     * Returns a `GuardResult` with rejection reason and guard key when invalid.
     */
    isValid(from: T, to: T, context?: Record<string, unknown>): GuardResult;
    /** Get all valid target states from the given state. */
    getValidTargets(from: T): readonly T[];
}
/**
 * Guard predicate for a state transition. Returns a `GuardResult` indicating
 * whether the transition is allowed and, if not, why.
 *
 * @typeParam T - String literal union of state values
 * @param from - Current state
 * @param to - Target state
 * @param context - Optional context for the transition (e.g. `{ transfer_id: string }`)
 *
 * @see BB-POST-004 — Lifecycle guard condition predicates
 * @see BB-C4-ADV-001 — Structured guard results
 */
export type TransitionGuard<T extends string> = (from: T, to: T, context?: Record<string, unknown>) => GuardResult;
/**
 * Build a guard lookup key from a state transition pair.
 */
export declare function guardKey<T extends string>(from: T, to: T): string;
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
 * const result = validator.isValid('ACTIVE', 'TRANSFERRED', { transfer_id: 'tx-123' });
 * // { valid: true }
 *
 * const rejected = validator.isValid('ACTIVE', 'TRANSFERRED');
 * // { valid: false, reason: 'ACTIVE→TRANSFERRED requires context.transfer_id', guard: 'ACTIVE→TRANSFERRED' }
 * ```
 *
 * @see {@link AGENT_LIFECYCLE_TRANSITIONS} for the agent state machine definition
 * @see {@link DEFAULT_GUARDS} for built-in agent lifecycle guard predicates
 */
export declare function createTransitionValidator<T extends string>(transitions: Record<T, readonly T[]>, guards?: Record<string, TransitionGuard<T>>): TransitionValidator<T>;
/**
 * Guard: ACTIVE → TRANSFERRED requires an active `transfer_id` in context.
 *
 * Business rule: an agent cannot enter TRANSFERRED state without a transfer
 * operation in progress. The transfer_id links the lifecycle transition to
 * the TransferSpec and saga context.
 */
export declare function requiresTransferId(from: string, to: string, context?: Record<string, unknown>): GuardResult;
/**
 * Guard: ACTIVE → ARCHIVED requires no active transfer.
 *
 * Business rule: archiving an agent while a transfer is in progress would
 * strand the buyer. Archival is only permitted when no transfer_id is set.
 */
export declare function requiresNoActiveTransfer(from: string, to: string, context?: Record<string, unknown>): GuardResult;
/**
 * Guard: SUSPENDED → ACTIVE requires `reason_resolved` to be true.
 *
 * Business rule: a suspended agent can only return to active duty when the
 * suspension cause has been addressed. This prevents premature reactivation
 * and ensures accountability for the suspension event.
 */
export declare function requiresReasonResolved(from: string, to: string, context?: Record<string, unknown>): GuardResult;
/**
 * Guard: TRANSFERRED → PROVISIONING requires `transfer_completed` and `new_owner`.
 *
 * Business rule: after a transfer completes, the new owner must be
 * authenticated before the agent can be reprovisioned. Both conditions
 * prevent premature provisioning and ensure custody chain integrity.
 */
export declare function requiresTransferCompleted(from: string, to: string, context?: Record<string, unknown>): GuardResult;
/**
 * Default guard predicates for agent lifecycle transitions.
 *
 * These encode the expected preconditions documented in the
 * `AGENT_LIFECYCLE_TRANSITIONS` TSDoc. Guards are optional — when
 * `createTransitionValidator()` is called without guards, all
 * structurally valid transitions are permitted.
 *
 * v2.4.0: Guards now use named functions for testability and return
 * structured `GuardResult` with rejection reasons (BB-C4-ADV-001, BB-C4-ADV-005).
 *
 * @see BB-POST-004 — Lifecycle guard condition predicates
 * @see BB-C4-ADV-001 — Structured guard results
 * @see BB-C4-ADV-005 — Guard definitions conflate logic and binding
 */
export declare const DEFAULT_GUARDS: Record<string, TransitionGuard<string>>;
//# sourceMappingURL=lifecycle.d.ts.map