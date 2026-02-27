/**
 * Auto-incrementing counter for factory-generated invariant IDs.
 * Prevents ID collisions when multiple factories are called for the same resource.
 * (Bridgebuilder F11 — hardcoded singleton IDs)
 */
let _factoryCounter = 0;
function nextFactoryId() {
    return String(++_factoryCounter).padStart(2, '0');
}
/** Reset the factory counter (for testing). */
export function resetFactoryCounter() {
    _factoryCounter = 0;
}
// ─── Invariant Builders ──────────────────────────────────────────────────────
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
export function buildSumInvariant(id, name, sumFields, totalField) {
    const fieldList = sumFields.join(', ');
    return {
        invariant_id: id,
        name,
        expression: `bigint_eq(bigint_sum([${fieldList}]), ${totalField})`,
        severity: 'error',
    };
}
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
export function buildNonNegativeInvariant(id, name, fields) {
    const clauses = fields.map(f => `bigint_gte(${f}, 0)`);
    return {
        invariant_id: id,
        name,
        expression: clauses.join(' && '),
        severity: 'error',
    };
}
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
export function buildBoundedInvariant(id, name, field, floor, ceiling) {
    return {
        invariant_id: id,
        name,
        expression: `${field} >= ${floor} && ${field} <= ${ceiling}`,
        severity: 'error',
    };
}
// ─── Conservation Law Factories ──────────────────────────────────────────────
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
export function createBalanceConservation(sumFields, totalField, enforcement = 'strict') {
    return {
        invariants: [
            buildSumInvariant(`CL-${nextFactoryId()}`, 'Sum conservation', sumFields, totalField),
            buildNonNegativeInvariant(`CL-${nextFactoryId()}`, 'Non-negative fields', [...sumFields, totalField]),
        ],
        enforcement,
        scope: 'per-entry',
    };
}
/**
 * Create a non-negative conservation law for micro-USD fields.
 *
 * @param fields - Fields that must be non-negative
 * @param enforcement - Whether violations halt or warn (default: 'strict')
 */
export function createNonNegativeConservation(fields, enforcement = 'strict') {
    return {
        invariants: [
            buildNonNegativeInvariant(`NN-${nextFactoryId()}`, 'Non-negative constraint', fields),
        ],
        enforcement,
        scope: 'per-entry',
    };
}
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
export function createBoundedConservation(field, floor, ceiling, enforcement = 'strict') {
    return {
        invariants: [
            buildBoundedInvariant(`BD-${nextFactoryId()}`, `Bounded: ${floor} <= ${field} <= ${ceiling}`, field, floor, ceiling),
        ],
        enforcement,
        scope: 'per-entry',
    };
}
/**
 * Create a monotonic conservation law: field value can only increase (or only decrease).
 *
 * Maps to reputation lifecycle monotonic progression constraint.
 *
 * @param field - Field that must change monotonically
 * @param direction - 'increasing' (field can only grow) or 'decreasing' (field can only shrink)
 * @param enforcement - Whether violations halt or warn (default: 'strict')
 */
export function createMonotonicConservation(field, direction, enforcement = 'strict') {
    const op = direction === 'increasing' ? '>=' : '<=';
    return {
        invariants: [
            {
                invariant_id: `MN-${nextFactoryId()}`,
                name: `Monotonic ${direction}: ${field}`,
                expression: `${field}_new ${op} ${field}_old`,
                severity: 'error',
            },
        ],
        enforcement,
        scope: 'per-entry',
    };
}
//# sourceMappingURL=conservation-law-factories.js.map