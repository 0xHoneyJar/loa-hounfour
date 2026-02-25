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
import type { DynamicContract, ProtocolSurface } from './dynamic-contract.js';
import { REPUTATION_STATE_ORDER, type ReputationStateName } from '../vocabulary/reputation.js';

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
 * Rate limit tier ordering (lower index = more restricted).
 */
const RATE_LIMIT_ORDER: Record<string, number> = {
  restricted: 0,
  standard: 1,
  extended: 2,
  unlimited: 3,
};

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
export function verifyMonotonicExpansion(
  contract: DynamicContract,
): MonotonicExpansionResult {
  const violations: MonotonicViolation[] = [];

  // Get ordered states that are present in the contract
  const orderedStates = Object.entries(REPUTATION_STATE_ORDER)
    .sort(([, a], [, b]) => a - b)
    .map(([state]) => state as ReputationStateName)
    .filter(state => state in contract.surfaces);

  // Check each adjacent pair
  for (let i = 0; i < orderedStates.length - 1; i++) {
    const lowerState = orderedStates[i];
    const higherState = orderedStates[i + 1];
    const lowerSurface = contract.surfaces[lowerState] as ProtocolSurface;
    const higherSurface = contract.surfaces[higherState] as ProtocolSurface;

    // Check capabilities superset
    const missingCapabilities = lowerSurface.capabilities.filter(
      cap => !higherSurface.capabilities.includes(cap),
    );
    if (missingCapabilities.length > 0) {
      violations.push({
        lower_state: lowerState,
        higher_state: higherState,
        violation_type: 'missing_capabilities',
        details: `${higherState} is missing capabilities present in ${lowerState}: ${missingCapabilities.join(', ')}`,
      });
    }

    // Check schemas superset
    const missingSchemas = lowerSurface.schemas.filter(
      schema => !higherSurface.schemas.includes(schema),
    );
    if (missingSchemas.length > 0) {
      violations.push({
        lower_state: lowerState,
        higher_state: higherState,
        violation_type: 'missing_schemas',
        details: `${higherState} is missing schemas present in ${lowerState}: ${missingSchemas.join(', ')}`,
      });
    }

    // Check rate limit tier ordering
    const lowerTierOrder = RATE_LIMIT_ORDER[lowerSurface.rate_limit_tier] ?? 0;
    const higherTierOrder = RATE_LIMIT_ORDER[higherSurface.rate_limit_tier] ?? 0;
    if (higherTierOrder < lowerTierOrder) {
      violations.push({
        lower_state: lowerState,
        higher_state: higherState,
        violation_type: 'rate_limit_regression',
        details: `${higherState} has lower rate limit tier (${higherSurface.rate_limit_tier}) than ${lowerState} (${lowerSurface.rate_limit_tier})`,
      });
    }
  }

  return {
    valid: violations.length === 0,
    violations,
  };
}
