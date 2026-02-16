/**
 * Tests for reservation utilities: computeReservedMicro, validateReservationTier,
 * shouldAllowRequest.
 *
 * SDD §3.9 — Reservation arithmetic with SKP-003 floor-breach fix.
 * IMP-002 — All BigInt parsing via parseMicroUSD, never raw BigInt().
 */
import { describe, it, expect } from 'vitest';
import {
  computeReservedMicro,
  validateReservationTier,
  shouldAllowRequest,
  type ReservationDecision,
} from '../../src/utilities/reservation.js';
import { RESERVATION_TIER_MAP } from '../../src/vocabulary/reservation-tier.js';

// ---------------------------------------------------------------------------
// computeReservedMicro
// ---------------------------------------------------------------------------

describe('computeReservedMicro', () => {
  it('returns "0" when bps is 0', () => {
    expect(computeReservedMicro('1000000', 0)).toBe('0');
  });

  it('returns "0" when bps is undefined', () => {
    expect(computeReservedMicro('1000000', undefined)).toBe('0');
  });

  it('returns "0" when limit is "0"', () => {
    expect(computeReservedMicro('0', 300)).toBe('0');
  });

  it('computes 3% of 1,000,000 (self_declared tier)', () => {
    // 1000000 * 300 = 300,000,000 (exact multiple of 10000)
    // (300,000,000 + 9,999) / 10,000 = 30,000 (BigInt truncation of 30000.9999)
    expect(computeReservedMicro('1000000', 300)).toBe('30000');
  });

  it('computes 5% of 1,000,000 (community_verified tier)', () => {
    // 1000000 * 500 = 500,000,000 (exact)
    expect(computeReservedMicro('1000000', 500)).toBe('50000');
  });

  it('computes 10% of 1,000,000 (protocol_certified tier)', () => {
    // 1000000 * 1000 = 1,000,000,000 (exact)
    expect(computeReservedMicro('1000000', 1000)).toBe('100000');
  });

  it('computes 100% (10000 bps) — returns full amount', () => {
    // 1000000 * 10000 = 10,000,000,000 (exact)
    expect(computeReservedMicro('1000000', 10000)).toBe('1000000');
  });

  it('computes exact division without ceil inflation', () => {
    // (100000 * 1000 + 9999) / 10000 = 100009999 / 10000 = 10001
    // Actually: 100000 * 1000 = 100000000; + 9999 = 100009999; / 10000 = 10001 (ceil)
    // Exact: 100000 * 1000 / 10000 = 10000. Ceil adds 1 because 100000000 % 10000 = 0...
    // Wait: 100000 * 1000 = 100,000,000. 100,000,000 / 10,000 = 10,000 exactly.
    // With ceil: (100,000,000 + 9,999) / 10,000 = 100,009,999 / 10,000 = 10,001 (BigInt truncation)
    // Hmm, this is NOT exact. For exact division, need amount where limit*bps is multiple of 10000.
    // 10000 * 300 = 3,000,000. (3,000,000 + 9,999) / 10,000 = 300 (floor) + 0.9999 = 300.
    // BigInt: 3009999n / 10000n = 300n. So exact division returns the exact value.
    expect(computeReservedMicro('10000', 300)).toBe('300');
  });

  it('ceil-rounds up on non-exact division', () => {
    // limit=1, bps=1: (1 * 1 + 9999) / 10000 = 10000 / 10000 = 1
    expect(computeReservedMicro('1', 1)).toBe('1');
  });

  it('handles large amounts without overflow', () => {
    // 1 trillion micro-USD ($1M) at 300 bps
    const result = computeReservedMicro('1000000000000', 300);
    // 1000000000000 * 300 = 300,000,000,000,000 (exact)
    // (300,000,000,000,000 + 9,999) / 10,000 = 30,000,000,000
    expect(result).toBe('30000000000');
  });

  it('throws RangeError for bps > 10000', () => {
    expect(() => computeReservedMicro('1000', 10001)).toThrow(RangeError);
  });

  it('throws RangeError for negative bps', () => {
    expect(() => computeReservedMicro('1000', -1)).toThrow(RangeError);
  });

  it('throws RangeError for fractional bps', () => {
    expect(() => computeReservedMicro('1000', 3.5)).toThrow(RangeError);
  });

  it('throws TypeError for invalid micro-USD string', () => {
    expect(() => computeReservedMicro('not-a-number', 300)).toThrow(TypeError);
  });

  it('returns "0" for negative limit (no reservation on negative balance)', () => {
    expect(computeReservedMicro('-100', 300)).toBe('0');
  });
});

// ---------------------------------------------------------------------------
// validateReservationTier
// ---------------------------------------------------------------------------

describe('validateReservationTier', () => {
  it('validates self_declared at minimum (300 bps)', () => {
    const result = validateReservationTier('self_declared', 300);
    expect(result.valid).toBe(true);
    expect(result.minimum_bps).toBe(300);
    expect(result.actual_bps).toBe(300);
  });

  it('validates self_declared above minimum', () => {
    const result = validateReservationTier('self_declared', 500);
    expect(result.valid).toBe(true);
  });

  it('rejects self_declared below minimum', () => {
    const result = validateReservationTier('self_declared', 200);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('below minimum');
    expect(result.reason).toContain('300');
  });

  it('validates community_verified at minimum (500 bps)', () => {
    const result = validateReservationTier('community_verified', 500);
    expect(result.valid).toBe(true);
    expect(result.minimum_bps).toBe(500);
  });

  it('rejects community_verified below minimum', () => {
    const result = validateReservationTier('community_verified', 400);
    expect(result.valid).toBe(false);
  });

  it('validates protocol_certified at minimum (1000 bps)', () => {
    const result = validateReservationTier('protocol_certified', 1000);
    expect(result.valid).toBe(true);
    expect(result.minimum_bps).toBe(1000);
  });

  it('rejects protocol_certified below minimum', () => {
    const result = validateReservationTier('protocol_certified', 999);
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('1000');
  });

  it('tier map values match validation minimums', () => {
    for (const [level, bps] of Object.entries(RESERVATION_TIER_MAP)) {
      const result = validateReservationTier(level as keyof typeof RESERVATION_TIER_MAP, bps);
      expect(result.valid).toBe(true);
      expect(result.minimum_bps).toBe(bps);
    }
  });
});

// ---------------------------------------------------------------------------
// shouldAllowRequest — SKP-003 floor-breach fix
// ---------------------------------------------------------------------------

describe('shouldAllowRequest', () => {
  describe('sufficient budget (always allow)', () => {
    it('allows when available >= cost', () => {
      const result = shouldAllowRequest('1000', '500', '300', 'strict');
      expect(result.allowed).toBe(true);
      expect(result.floor_breached).toBe(false);
    });

    it('blocks when available equals cost but post-tx breaches floor (HIGH-V52-001)', () => {
      // v5.3.0 fix: available=500, cost=500, reserved=300
      // Post-transaction = 0 < 300 = reserved → BLOCK (strict)
      const result = shouldAllowRequest('500', '500', '300', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
      expect(result.post_transaction_available).toBe('0');
    });

    it('allows when available equals cost and no reservation', () => {
      const result = shouldAllowRequest('500', '500', '0', 'strict');
      expect(result.allowed).toBe(true);
      expect(result.floor_breached).toBe(false);
      expect(result.post_transaction_available).toBe('0');
    });
  });

  describe('floor breach — SKP-003 fix', () => {
    it('detects floor breach when available equals reserved (SKP-003)', () => {
      // This is the SKP-003 fix: available == reserved IS a floor breach
      const result = shouldAllowRequest('300', '500', '300', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
    });

    it('detects floor breach when available below reserved', () => {
      const result = shouldAllowRequest('100', '500', '300', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
    });

    it('strict enforcement blocks on floor breach', () => {
      const result = shouldAllowRequest('300', '500', '300', 'strict');
      expect(result.enforcement_action).toBe('block');
    });

    it('advisory enforcement warns on floor breach', () => {
      const result = shouldAllowRequest('300', '500', '300', 'advisory');
      expect(result.enforcement_action).toBe('warn');
    });

    it('unsupported enforcement blocks on floor breach', () => {
      const result = shouldAllowRequest('300', '500', '300', 'unsupported');
      expect(result.enforcement_action).toBe('block');
    });
  });

  describe('above floor but insufficient budget', () => {
    it('detects normal shortfall when above floor', () => {
      // available=400 > reserved=300, but cost=500 > available
      const result = shouldAllowRequest('400', '500', '300', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(false);
    });

    it('no enforcement_action on shortfall above floor (low-v53-004)', () => {
      // Case 3: above floor but insufficient — floor is not breached,
      // so enforcement_action should not be present
      const strict = shouldAllowRequest('400', '500', '300', 'strict');
      expect(strict.enforcement_action).toBeUndefined();

      const advisory = shouldAllowRequest('400', '500', '300', 'advisory');
      expect(advisory.enforcement_action).toBeUndefined();
    });
  });

  describe('zero reservation', () => {
    it('zero reservation means no floor to breach', () => {
      const result = shouldAllowRequest('100', '500', '0', 'strict');
      // available=100 <= reserved=0 is a floor breach by the <= comparison
      // But with reserved=0, available=100 > 0, so it's above floor
      // Actually: 100 <= 0 is false, so it goes to case 3 (above floor, insufficient)
      expect(result.floor_breached).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('handles zero cost (always allows)', () => {
      const result = shouldAllowRequest('100', '0', '50', 'strict');
      expect(result.allowed).toBe(true);
    });

    it('handles zero available with zero reserved', () => {
      // available=0 <= reserved=0 is true → floor breach
      const result = shouldAllowRequest('0', '100', '0', 'strict');
      expect(result.floor_breached).toBe(true);
    });

    it('throws TypeError for invalid micro-USD', () => {
      expect(() => shouldAllowRequest('abc', '100', '50', 'strict')).toThrow(TypeError);
    });
  });
});
