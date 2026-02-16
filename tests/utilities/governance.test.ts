/**
 * Tests for governance resolution utilities (S3-T2).
 *
 * Validates resolveReservationTier, resolveAdvisoryThreshold,
 * and backward compatibility of updated functions.
 */
import { describe, it, expect } from 'vitest';
import { resolveReservationTier, resolveAdvisoryThreshold } from '../../src/utilities/governance.js';
import { validateReservationTier, shouldAllowRequest, computeReservedMicro, ADVISORY_WARNING_THRESHOLD_PERCENT } from '../../src/utilities/reservation.js';
import { RESERVATION_TIER_MAP } from '../../src/vocabulary/reservation-tier.js';
import { DEFAULT_GOVERNANCE_CONFIG, type GovernanceConfig } from '../../src/schemas/governance-config.js';

describe('resolveReservationTier', () => {
  it('returns RESERVATION_TIER_MAP default without config', () => {
    expect(resolveReservationTier('self_declared')).toBe(300);
    expect(resolveReservationTier('community_verified')).toBe(500);
    expect(resolveReservationTier('protocol_certified')).toBe(1000);
  });

  it('returns config tier when config provided', () => {
    const config: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      reservation_tiers: { self_declared: 100, community_verified: 200, protocol_certified: 400 },
    };
    expect(resolveReservationTier('self_declared', config)).toBe(100);
    expect(resolveReservationTier('community_verified', config)).toBe(200);
    expect(resolveReservationTier('protocol_certified', config)).toBe(400);
  });

  it('returns DEFAULT_GOVERNANCE_CONFIG values when default config passed', () => {
    expect(resolveReservationTier('self_declared', DEFAULT_GOVERNANCE_CONFIG)).toBe(300);
  });
});

describe('resolveAdvisoryThreshold', () => {
  it('returns constant default without config', () => {
    expect(resolveAdvisoryThreshold()).toBe(ADVISORY_WARNING_THRESHOLD_PERCENT);
    expect(resolveAdvisoryThreshold()).toBe(20);
  });

  it('returns config threshold when config provided', () => {
    const config: GovernanceConfig = { ...DEFAULT_GOVERNANCE_CONFIG, advisory_warning_threshold_percent: 10 };
    expect(resolveAdvisoryThreshold(config)).toBe(10);
  });

  it('returns 0 when config sets threshold to 0', () => {
    const config: GovernanceConfig = { ...DEFAULT_GOVERNANCE_CONFIG, advisory_warning_threshold_percent: 0 };
    expect(resolveAdvisoryThreshold(config)).toBe(0);
  });
});

describe('validateReservationTier with GovernanceConfig', () => {
  it('backward compatible: 2-arg call still works', () => {
    const result = validateReservationTier('self_declared', 300);
    expect(result.valid).toBe(true);
    expect(result.minimum_bps).toBe(300);
  });

  it('uses config tier when provided', () => {
    const config: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      reservation_tiers: { self_declared: 100, community_verified: 200, protocol_certified: 400 },
    };
    // 150 bps is above custom minimum (100) but below default minimum (300)
    const result = validateReservationTier('self_declared', 150, config);
    expect(result.valid).toBe(true);
    expect(result.minimum_bps).toBe(100);
  });

  it('uses config tier for rejection', () => {
    const config: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      reservation_tiers: { self_declared: 600, community_verified: 800, protocol_certified: 1500 },
    };
    // 300 bps would pass default (300) but fail custom (600)
    const result = validateReservationTier('self_declared', 300, config);
    expect(result.valid).toBe(false);
    expect(result.minimum_bps).toBe(600);
  });
});

describe('shouldAllowRequest with GovernanceConfig', () => {
  it('backward compatible: 4-arg call still works', () => {
    const decision = shouldAllowRequest('1000', '400', '500', 'strict');
    expect(decision.allowed).toBe(true);
    expect(decision.floor_breached).toBe(false);
  });

  it('uses config advisory threshold', () => {
    // With default threshold 20%, warning zone is < reserved * 120 / 100
    // reserved=500, threshold zone < 600. Post-tx 550 is in zone.
    const decision = shouldAllowRequest('1000', '450', '500', 'advisory');
    expect(decision.allowed).toBe(true);
    expect(decision.warning).toBeDefined();

    // With config threshold 0%, no warning zone at all.
    // reserved=500, threshold zone < 500 * 100 / 100 = 500. Post-tx 550 >= 500 → no warning.
    const noWarningConfig: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      advisory_warning_threshold_percent: 0,
    };
    const noWarningDecision = shouldAllowRequest('1000', '450', '500', 'advisory', noWarningConfig);
    expect(noWarningDecision.allowed).toBe(true);
    expect(noWarningDecision.warning).toBeUndefined();
  });

  it('uses config advisory threshold for wider warning zone', () => {
    // With 50% threshold, warning zone is < reserved * 150 / 100
    // reserved=500 → zone < 750. Post-tx 700 is in zone.
    const wideConfig: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      advisory_warning_threshold_percent: 50,
    };
    const decision = shouldAllowRequest('1000', '300', '500', 'advisory', wideConfig);
    expect(decision.allowed).toBe(true);
    expect(decision.warning).toBeDefined();
    expect(decision.post_transaction_available).toBe('700');

    // Same scenario without config: default 20% threshold → zone < 600.
    // Post-tx 700 is NOT in zone.
    const defaultDecision = shouldAllowRequest('1000', '300', '500', 'advisory');
    expect(defaultDecision.allowed).toBe(true);
    expect(defaultDecision.warning).toBeUndefined();
  });

  it('strict mode ignores advisory threshold config', () => {
    const config: GovernanceConfig = {
      ...DEFAULT_GOVERNANCE_CONFIG,
      advisory_warning_threshold_percent: 50,
    };
    const decision = shouldAllowRequest('1000', '400', '500', 'strict', config);
    expect(decision.allowed).toBe(true);
    expect(decision.warning).toBeUndefined();
  });
});
