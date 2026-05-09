/**
 * Tier-to-Reputation State Mapping — bridges billing tiers to reputation states.
 *
 * Maps JWT billing tier names to canonical reputation state names.
 * Unknown tiers return 'cold' (fail-safe).
 *
 * @see PRD FR-2 — Economic Boundary Refinement
 * @see SDD §6.2 — Tier-Reputation Mapping
 * @since v8.3.0
 */
/** Tier-to-reputation state mapping. */
const TIER_MAP = {
    free: 'cold',
    basic: 'warming',
    pro: 'established',
    enterprise: 'authoritative',
};
/**
 * Map a billing tier to a reputation state.
 *
 * @param tier - Billing tier name (e.g., 'free', 'basic', 'pro', 'enterprise')
 * @returns Reputation state name. Unknown tiers return 'cold' (fail-safe).
 */
export function mapTierToReputationState(tier) {
    return TIER_MAP[tier] ?? 'cold';
}
//# sourceMappingURL=tier-reputation-map.js.map