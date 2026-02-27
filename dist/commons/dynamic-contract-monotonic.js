import { REPUTATION_STATE_ORDER } from '../vocabulary/reputation.js';
/**
 * Rate limit tier ordering (lower index = more restricted).
 */
const RATE_LIMIT_ORDER = {
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
export function verifyMonotonicExpansion(contract) {
    const violations = [];
    // Get ordered states that are present in the contract
    const orderedStates = Object.entries(REPUTATION_STATE_ORDER)
        .sort(([, a], [, b]) => a - b)
        .map(([state]) => state)
        .filter(state => state in contract.surfaces);
    // Check each adjacent pair
    for (let i = 0; i < orderedStates.length - 1; i++) {
        const lowerState = orderedStates[i];
        const higherState = orderedStates[i + 1];
        const lowerSurface = contract.surfaces[lowerState];
        const higherSurface = contract.surfaces[higherState];
        // Check capabilities superset
        const missingCapabilities = lowerSurface.capabilities.filter(cap => !higherSurface.capabilities.includes(cap));
        if (missingCapabilities.length > 0) {
            violations.push({
                lower_state: lowerState,
                higher_state: higherState,
                violation_type: 'missing_capabilities',
                details: `${higherState} is missing capabilities present in ${lowerState}: ${missingCapabilities.join(', ')}`,
            });
        }
        // Check schemas superset
        const missingSchemas = lowerSurface.schemas.filter(schema => !higherSurface.schemas.includes(schema));
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
//# sourceMappingURL=dynamic-contract-monotonic.js.map