/**
 * Tests for v5.3.0 reservation utilities: post-transaction floor check (HIGH-V52-001),
 * advisory graduated warnings (FR-2), and enforcement semantics.
 *
 * SDD §3.1 — Post-Transaction Floor Enforcement
 * SDD §3.2 — Advisory Graduated Warnings
 */
import { describe, it, expect } from 'vitest';
import {
  shouldAllowRequest,
  ADVISORY_WARNING_THRESHOLD_PERCENT,
  type ReservationDecision,
} from '../../src/utilities/reservation.js';

// ---------------------------------------------------------------------------
// S1-T1: Post-Transaction Floor Check (HIGH-V52-001 fix)
// ---------------------------------------------------------------------------

describe('Post-transaction floor check (HIGH-V52-001)', () => {
  describe('strict enforcement', () => {
    it('blocks when post-tx would breach floor', () => {
      // available=1000, cost=900, reserved=500
      // Post-tx = 100 < 500 → BLOCK
      const result = shouldAllowRequest('1000', '900', '500', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
      expect(result.enforcement_action).toBe('block');
      expect(result.post_transaction_available).toBe('100');
    });

    it('allows when post-tx stays above floor', () => {
      // available=1000, cost=400, reserved=500
      // Post-tx = 600 > 500 → ALLOW
      const result = shouldAllowRequest('1000', '400', '500', 'strict');
      expect(result.allowed).toBe(true);
      expect(result.floor_breached).toBe(false);
      expect(result.post_transaction_available).toBe('600');
    });

    it('allows when post-tx exactly equals floor', () => {
      // available=1000, cost=500, reserved=500
      // Post-tx = 500 >= 500 → ALLOW (at boundary, not breached)
      const result = shouldAllowRequest('1000', '500', '500', 'strict');
      expect(result.allowed).toBe(true);
      expect(result.floor_breached).toBe(false);
      expect(result.post_transaction_available).toBe('500');
    });

    it('blocks when post-tx is one below floor', () => {
      // available=1000, cost=501, reserved=500
      // Post-tx = 499 < 500 → BLOCK
      const result = shouldAllowRequest('1000', '501', '500', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
      expect(result.post_transaction_available).toBe('499');
    });

    it('provides post_transaction_available in reason', () => {
      const result = shouldAllowRequest('1000', '900', '500', 'strict');
      expect(result.reason).toContain('100');
      expect(result.reason).toContain('500');
    });
  });

  describe('advisory enforcement', () => {
    it('allows through floor breach with warning', () => {
      // available=1000, cost=900, reserved=500
      // Post-tx = 100 < 500 → ALLOW (advisory) with warning
      const result = shouldAllowRequest('1000', '900', '500', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.floor_breached).toBe(false); // Not yet breached
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('would breach');
      expect(result.post_transaction_available).toBe('100');
    });

    it('advisory floor breach has no enforcement_action', () => {
      const result = shouldAllowRequest('1000', '900', '500', 'advisory');
      expect(result.enforcement_action).toBeUndefined();
    });

    it('allows through floor breach even when post-tx is zero', () => {
      const result = shouldAllowRequest('1000', '1000', '500', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.post_transaction_available).toBe('0');
    });
  });

  describe('unsupported enforcement', () => {
    it('blocks on post-tx floor breach', () => {
      const result = shouldAllowRequest('1000', '900', '500', 'unsupported');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
      expect(result.enforcement_action).toBe('block');
    });
  });

  describe('no regression for non-floor-breach cases', () => {
    it('still allows sufficient budget above floor', () => {
      const result = shouldAllowRequest('1000', '200', '300', 'strict');
      expect(result.allowed).toBe(true);
      expect(result.post_transaction_available).toBe('800');
    });

    it('still blocks when budget is insufficient', () => {
      const result = shouldAllowRequest('400', '500', '300', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(false);
    });

    it('still blocks at floor (Case 2)', () => {
      const result = shouldAllowRequest('300', '500', '300', 'strict');
      expect(result.allowed).toBe(false);
      expect(result.floor_breached).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// S1-T2: Advisory Graduated Warnings (FR-2)
// ---------------------------------------------------------------------------

describe('Advisory graduated warnings (FR-2)', () => {
  it('exports ADVISORY_WARNING_THRESHOLD_PERCENT', () => {
    expect(ADVISORY_WARNING_THRESHOLD_PERCENT).toBe(20);
  });

  describe('near-floor warning zone', () => {
    it('warns when post-tx is within 20% of floor', () => {
      // reserved=500, threshold=20%
      // Warning zone: post-tx < 500 * 120 / 100 = 600
      // available=1000, cost=450 → post-tx = 550 < 600 → WARN
      const result = shouldAllowRequest('1000', '450', '500', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeDefined();
      expect(result.warning).toContain('within 20%');
      expect(result.floor_breached).toBe(false);
    });

    it('no warning when post-tx is above warning zone', () => {
      // reserved=500, threshold=20%
      // Warning zone: post-tx < 600
      // available=1000, cost=300 → post-tx = 700 > 600 → NO WARN
      const result = shouldAllowRequest('1000', '300', '500', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('warns at warning zone boundary', () => {
      // post-tx = 599 < 600 → WARN
      const result = shouldAllowRequest('1000', '401', '500', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeDefined();
    });

    it('no warning when post-tx equals warning threshold', () => {
      // post-tx = 600 is NOT < 600 → NO WARN
      const result = shouldAllowRequest('1000', '400', '500', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });

    it('no warning for zero reservation', () => {
      const result = shouldAllowRequest('1000', '500', '0', 'advisory');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('strict mode does NOT warn near floor', () => {
    it('no warning on strict even when in advisory warning zone', () => {
      // reserved=500, post-tx=550 → in warning zone
      // But strict mode: no near-floor warning
      const result = shouldAllowRequest('1000', '450', '500', 'strict');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('unsupported mode does NOT warn near floor', () => {
    it('no warning on unsupported even when in warning zone', () => {
      const result = shouldAllowRequest('1000', '450', '500', 'unsupported');
      expect(result.allowed).toBe(true);
      expect(result.warning).toBeUndefined();
    });
  });

  describe('floor breach vs near-floor distinction', () => {
    it('floor breach warning (post-tx < reserved) differs from near-floor warning', () => {
      // Floor breach: post-tx < reserved
      const breach = shouldAllowRequest('1000', '900', '500', 'advisory');
      expect(breach.warning).toContain('would breach');

      // Near floor: reserved <= post-tx < threshold
      const near = shouldAllowRequest('1000', '450', '500', 'advisory');
      expect(near.warning).toContain('within 20%');
    });
  });
});

// ---------------------------------------------------------------------------
// Enforcement semantics table (SDD §3.2.3)
// ---------------------------------------------------------------------------

describe('Enforcement semantics table (SDD §3.2.3)', () => {
  // Scenario: sufficient budget, post-tx above floor + above warning zone
  describe('sufficient, above floor, above warning', () => {
    it('strict: allow', () => {
      const r = shouldAllowRequest('1000', '100', '200', 'strict');
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeUndefined();
    });
    it('advisory: allow', () => {
      const r = shouldAllowRequest('1000', '100', '200', 'advisory');
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeUndefined();
    });
    it('unsupported: allow', () => {
      const r = shouldAllowRequest('1000', '100', '200', 'unsupported');
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeUndefined();
    });
  });

  // Scenario: sufficient budget, post-tx above floor + in warning zone
  describe('sufficient, above floor, in warning zone', () => {
    it('strict: allow (no warning)', () => {
      const r = shouldAllowRequest('1000', '780', '200', 'strict');
      // Post-tx = 220. Warning zone: < 200*120/100 = 240. 220 < 240 → in zone
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeUndefined();
    });
    it('advisory: allow + warning', () => {
      const r = shouldAllowRequest('1000', '780', '200', 'advisory');
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeDefined();
    });
    it('unsupported: allow (no warning)', () => {
      const r = shouldAllowRequest('1000', '780', '200', 'unsupported');
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeUndefined();
    });
  });

  // Scenario: sufficient budget, post-tx would breach floor
  describe('sufficient, post-tx would breach floor', () => {
    it('strict: BLOCK', () => {
      const r = shouldAllowRequest('1000', '900', '200', 'strict');
      expect(r.allowed).toBe(false);
      expect(r.floor_breached).toBe(true);
    });
    it('advisory: ALLOW + warning', () => {
      const r = shouldAllowRequest('1000', '900', '200', 'advisory');
      expect(r.allowed).toBe(true);
      expect(r.warning).toBeDefined();
    });
    it('unsupported: BLOCK', () => {
      const r = shouldAllowRequest('1000', '900', '200', 'unsupported');
      expect(r.allowed).toBe(false);
      expect(r.floor_breached).toBe(true);
    });
  });

  // Scenario: already at/below floor
  describe('already at/below floor', () => {
    it('strict: block', () => {
      const r = shouldAllowRequest('200', '500', '200', 'strict');
      expect(r.allowed).toBe(false);
      expect(r.floor_breached).toBe(true);
    });
    it('advisory: block (warn)', () => {
      const r = shouldAllowRequest('200', '500', '200', 'advisory');
      expect(r.allowed).toBe(false);
      expect(r.floor_breached).toBe(true);
      expect(r.enforcement_action).toBe('warn');
    });
    it('unsupported: block', () => {
      const r = shouldAllowRequest('200', '500', '200', 'unsupported');
      expect(r.allowed).toBe(false);
      expect(r.floor_breached).toBe(true);
    });
  });
});

// ---------------------------------------------------------------------------
// Post-transaction available field
// ---------------------------------------------------------------------------

describe('post_transaction_available field', () => {
  it('present on allowed requests', () => {
    const result = shouldAllowRequest('1000', '400', '500', 'strict');
    expect(result.post_transaction_available).toBe('600');
  });

  it('present on advisory floor breach', () => {
    const result = shouldAllowRequest('1000', '900', '500', 'advisory');
    expect(result.post_transaction_available).toBe('100');
  });

  it('present on strict floor breach', () => {
    const result = shouldAllowRequest('1000', '900', '500', 'strict');
    expect(result.post_transaction_available).toBe('100');
  });

  it('absent on Case 2 (at/below floor)', () => {
    const result = shouldAllowRequest('300', '500', '300', 'strict');
    expect(result.post_transaction_available).toBeUndefined();
  });
});
