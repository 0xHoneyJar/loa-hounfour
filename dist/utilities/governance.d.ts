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
import { type ReservationTier } from '../vocabulary/reservation-tier.js';
import type { GovernanceConfig } from '../schemas/governance-config.js';
import type { ConformanceLevel } from '../schemas/model/conformance-level.js';
/**
 * Resolve the minimum reservation tier for a conformance level.
 *
 * Uses GovernanceConfig when provided, falls back to RESERVATION_TIER_MAP.
 */
export declare function resolveReservationTier(conformanceLevel: ConformanceLevel, config?: GovernanceConfig): ReservationTier;
/**
 * Resolve the advisory warning threshold percentage.
 *
 * Uses GovernanceConfig when provided, falls back to ADVISORY_WARNING_THRESHOLD_PERCENT.
 */
export declare function resolveAdvisoryThreshold(config?: GovernanceConfig): number;
//# sourceMappingURL=governance.d.ts.map