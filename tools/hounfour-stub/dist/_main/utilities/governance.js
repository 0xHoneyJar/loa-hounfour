/**
 * Governance resolution utilities for configurable protocol parameters.
 *
 * Each resolver follows the pattern: use GovernanceConfig when provided,
 * fall back to hardcoded defaults otherwise. This keeps existing code
 * backward-compatible while enabling governance overrides.
 *
 * @see GovernanceConfig — configurable parameters schema (v5.3.0)
 * @see SDD §3.6.2 — Governance utility functions
 */
import { RESERVATION_TIER_MAP } from '../vocabulary/reservation-tier.js';
import { ADVISORY_WARNING_THRESHOLD_PERCENT } from './reservation.js';
/**
 * Resolve the minimum reservation tier for a conformance level.
 *
 * Uses GovernanceConfig when provided, falls back to RESERVATION_TIER_MAP.
 */
export function resolveReservationTier(conformanceLevel, config) {
    if (config) {
        return config.reservation_tiers[conformanceLevel];
    }
    return RESERVATION_TIER_MAP[conformanceLevel];
}
/**
 * Resolve the advisory warning threshold percentage.
 *
 * Uses GovernanceConfig when provided, falls back to ADVISORY_WARNING_THRESHOLD_PERCENT.
 */
export function resolveAdvisoryThreshold(config) {
    if (config) {
        return config.advisory_warning_threshold_percent;
    }
    return ADVISORY_WARNING_THRESHOLD_PERCENT;
}
//# sourceMappingURL=governance.js.map