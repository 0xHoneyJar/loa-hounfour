/**
 * Canonical factory functions for common conservation law patterns.
 *
 * Provides type-safe construction of well-known conservation law invariants
 * rather than relying on hand-written runtime strings. Each factory maps to
 * a real-world pattern from the loa ecosystem.
 *
 * @see Bridgebuilder Finding F7 — Static checking for conservation expressions
 * @since v8.1.0
 */
import type { ConservationLaw } from './conservation-law.js';
import type { Invariant } from './invariant.js';
/** Reset the factory counter (for testing). */
export declare function resetFactoryCounter(): void;
/**
 * Create a sum-conservation invariant: field1 + field2 + ... == total_field.
 *
 * Maps to loa-freeside's lot_invariant (I-1): balance + reserved + consumed == original_allocation.
 *
 * @param id - Invariant ID (e.g., 'CL-01')
 * @param name - Human-readable name
 * @param sumFields - Fields whose sum must equal the total (minimum 2)
 * @param totalField - Field that holds the expected total
 * @returns A well-formed Invariant using the constraint DSL bigint_sum/bigint_eq builtins
 *
 * @example
 * ```typescript
 * const invariant = buildSumInvariant(
 *   'CL-01', 'Lot conservation',
 *   ['balance', 'reserved', 'consumed'],
 *   'original_allocation',
 * );
 * // expression: "bigint_eq(bigint_sum([balance, reserved, consumed]), original_allocation)"
 * ```
 */
export declare function buildSumInvariant(id: string, name: string, sumFields: [string, string, ...string[]], totalField: string): Invariant;
/**
 * Create a non-negative invariant for one or more fields.
 *
 * Maps to loa-freeside's I-2 through I-4: balance >= 0, reserved >= 0, consumed >= 0.
 *
 * @param id - Invariant ID
 * @param name - Human-readable name
 * @param fields - Fields that must be non-negative (micro-USD string-encoded BigInts)
 * @returns A well-formed Invariant using bigint_gte
 *
 * @example
 * ```typescript
 * const invariant = buildNonNegativeInvariant(
 *   'CL-02', 'Non-negative balances',
 *   ['balance', 'reserved', 'consumed'],
 * );
 * // expression: "bigint_gte(balance, 0) && bigint_gte(reserved, 0) && bigint_gte(consumed, 0)"
 * ```
 */
export declare function buildNonNegativeInvariant(id: string, name: string, fields: [string, ...string[]]): Invariant;
/**
 * Create a bounded invariant: floor <= field <= ceiling.
 *
 * Maps to loa-dixie's freshness bounds: 0 <= freshness_score <= 100.
 *
 * @param id - Invariant ID
 * @param name - Human-readable name
 * @param field - Field to bound
 * @param floor - Minimum value (inclusive)
 * @param ceiling - Maximum value (inclusive)
 * @returns A well-formed Invariant
 *
 * @example
 * ```typescript
 * const invariant = buildBoundedInvariant(
 *   'FR-01', 'Freshness bounds', 'freshness_score', 0, 100,
 * );
 * // expression: "freshness_score >= 0 && freshness_score <= 100"
 * ```
 */
export declare function buildBoundedInvariant(id: string, name: string, field: string, floor: number, ceiling: number): Invariant;
/**
 * Create a balance conservation law: sum of component fields must equal total.
 *
 * This is the canonical pattern from loa-freeside's lot_invariant system.
 * Produces both the sum conservation invariant and non-negative invariants.
 *
 * @param sumFields - Fields whose sum must equal the total
 * @param totalField - Field that holds the expected total
 * @param enforcement - Whether violations halt or warn (default: 'strict')
 *
 * @example
 * ```typescript
 * const law = createBalanceConservation(
 *   ['balance', 'reserved', 'consumed'],
 *   'original_allocation',
 * );
 * // Produces 2 invariants:
 * //   CL-01: balance + reserved + consumed == original_allocation
 * //   CL-02: all fields >= 0
 * ```
 */
export declare function createBalanceConservation(sumFields: [string, string, ...string[]], totalField: string, enforcement?: 'strict' | 'advisory'): ConservationLaw;
/**
 * Create a non-negative conservation law for micro-USD fields.
 *
 * @param fields - Fields that must be non-negative
 * @param enforcement - Whether violations halt or warn (default: 'strict')
 */
export declare function createNonNegativeConservation(fields: [string, ...string[]], enforcement?: 'strict' | 'advisory'): ConservationLaw;
/**
 * Create a bounded conservation law for a numeric field.
 *
 * Maps to loa-dixie's freshness decay bounds pattern.
 *
 * @param field - Field to bound
 * @param floor - Minimum value (inclusive)
 * @param ceiling - Maximum value (inclusive)
 * @param enforcement - Whether violations halt or warn (default: 'strict')
 */
export declare function createBoundedConservation(field: string, floor: number, ceiling: number, enforcement?: 'strict' | 'advisory'): ConservationLaw;
/**
 * Create a monotonic conservation law: field value can only increase (or only decrease).
 *
 * Maps to reputation lifecycle monotonic progression constraint.
 *
 * @param field - Field that must change monotonically
 * @param direction - 'increasing' (field can only grow) or 'decreasing' (field can only shrink)
 * @param enforcement - Whether violations halt or warn (default: 'strict')
 */
export declare function createMonotonicConservation(field: string, direction: 'increasing' | 'decreasing', enforcement?: 'strict' | 'advisory'): ConservationLaw;
//# sourceMappingURL=conservation-law-factories.d.ts.map