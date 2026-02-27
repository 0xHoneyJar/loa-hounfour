/**
 * DynamicContract monotonic expansion verification.
 *
 * Verifies that a DynamicContract's protocol surfaces expand monotonically
 * across the reputation state ordering (cold → warming → established → authoritative).
 * Capabilities at state N must be a superset of capabilities at state N-1.
 *
 * @see Bridgebuilder Finding F10 — Monotonic expansion declared but not enforced
 * @since v8.1.0
 */
import type { DynamicContract } from './dynamic-contract.js';
/**
 * A single monotonic expansion violation.
 */
export interface MonotonicViolation {
    /** The lower reputation state. */
    lower_state: string;
    /** The higher reputation state. */
    higher_state: string;
    /** Type of violation. */
    violation_type: 'missing_capabilities' | 'missing_schemas' | 'rate_limit_regression';
    /** Details of what's missing or regressed. */
    details: string;
}
/**
 * Result of monotonic expansion verification.
 */
export interface MonotonicExpansionResult {
    /** Whether the contract satisfies monotonic expansion. */
    valid: boolean;
    /** List of violations found (empty when valid). */
    violations: MonotonicViolation[];
}
/**
 * Verify that a DynamicContract's surfaces expand monotonically.
 *
 * For each pair of adjacent reputation states (by REPUTATION_STATE_ORDER),
 * verifies:
 * 1. Capabilities at the higher state are a superset of the lower state
 * 2. Schemas at the higher state are a superset of the lower state
 * 3. Rate limit tier at the higher state is >= the lower state
 *
 * States that are not present in the contract's surfaces map are skipped
 * (a contract need not define all reputation states).
 *
 * @param contract - The DynamicContract to verify
 * @returns Verification result with violations
 */
export declare function verifyMonotonicExpansion(contract: DynamicContract): MonotonicExpansionResult;
//# sourceMappingURL=dynamic-contract-monotonic.d.ts.map