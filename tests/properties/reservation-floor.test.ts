/**
 * L3 Property-Based Tests — Post-transaction floor invariants (v5.3.0).
 *
 * Uses fast-check to verify that for all valid inputs:
 * - strict mode NEVER allows post-transaction balance below floor
 * - advisory mode ALWAYS warns when post-tx < reserved (floor breach)
 * - advisory mode ALWAYS warns when post-tx is in warning zone
 * - BigInt arithmetic handles values up to 10^18 without overflow
 *
 * @see SDD §3.1 — Post-Transaction Floor Enforcement
 * @see SDD §3.2 — Advisory Graduated Warnings
 * @see SDD §4.3 — Property-Based Testing Strategy
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { shouldAllowRequest, ADVISORY_WARNING_THRESHOLD_PERCENT } from '../../src/utilities/reservation.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Positive BigInt as string (1 to 10^18). */
const positiveBigArb = fc.bigInt({ min: 1n, max: 10n ** 18n }).map(String);

/** Non-negative BigInt as string (0 to 10^18). */
const nonNegBigArb = fc.bigInt({ min: 0n, max: 10n ** 18n }).map(String);

// ---------------------------------------------------------------------------
// Property: Strict mode never allows post-tx below floor
// ---------------------------------------------------------------------------

describe('Post-transaction floor invariant', () => {
  it('strict mode: if allowed, then available - cost >= reserved', () => {
    fc.assert(
      fc.property(
        positiveBigArb, // available
        positiveBigArb, // cost
        nonNegBigArb,   // reserved
        (available, cost, reserved) => {
          const result = shouldAllowRequest(available, cost, reserved, 'strict');
          if (result.allowed) {
            const avail = BigInt(available);
            const c = BigInt(cost);
            const res = BigInt(reserved);
            expect(avail - c).toBeGreaterThanOrEqual(res);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('unsupported mode: if allowed, then available - cost >= reserved', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        nonNegBigArb,
        (available, cost, reserved) => {
          const result = shouldAllowRequest(available, cost, reserved, 'unsupported');
          if (result.allowed) {
            const avail = BigInt(available);
            const c = BigInt(cost);
            const res = BigInt(reserved);
            expect(avail - c).toBeGreaterThanOrEqual(res);
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property: Advisory mode always returns warning when post-tx < reserved
// ---------------------------------------------------------------------------

describe('Advisory floor breach warning invariant', () => {
  it('advisory always warns when sufficient budget but post-tx < reserved', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        positiveBigArb,
        (available, cost, reserved) => {
          fc.pre(BigInt(available) >= BigInt(cost));              // sufficient budget
          fc.pre(BigInt(available) - BigInt(cost) < BigInt(reserved)); // would breach floor
          const result = shouldAllowRequest(available, cost, reserved, 'advisory');
          expect(result.allowed).toBe(true);
          expect(result.warning).toBeDefined();
          expect(result.warning).toContain('would breach');
        },
      ),
      { numRuns: 500 },
    );
  });

  it('advisory always warns in near-floor zone', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        positiveBigArb,
        (available, cost, reserved) => {
          const avail = BigInt(available);
          const c = BigInt(cost);
          const res = BigInt(reserved);
          fc.pre(avail >= c);                   // sufficient budget
          const postTx = avail - c;
          fc.pre(postTx >= res);                // above floor
          const threshold = (res * BigInt(100 + ADVISORY_WARNING_THRESHOLD_PERCENT) + 99n) / 100n;
          fc.pre(postTx < threshold);           // in warning zone
          const result = shouldAllowRequest(available, cost, reserved, 'advisory');
          expect(result.allowed).toBe(true);
          expect(result.warning).toBeDefined();
          expect(result.warning).toContain('within');
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property: Advisory mode still allows above warning zone without warning
// ---------------------------------------------------------------------------

describe('Advisory no-warning invariant', () => {
  it('advisory no warning when post-tx >= threshold', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        positiveBigArb,
        (available, cost, reserved) => {
          const avail = BigInt(available);
          const c = BigInt(cost);
          const res = BigInt(reserved);
          fc.pre(avail >= c);
          const postTx = avail - c;
          const threshold = (res * BigInt(100 + ADVISORY_WARNING_THRESHOLD_PERCENT) + 99n) / 100n;
          fc.pre(postTx >= threshold);  // above warning zone
          const result = shouldAllowRequest(available, cost, reserved, 'advisory');
          expect(result.allowed).toBe(true);
          expect(result.warning).toBeUndefined();
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property: Advisory would_breach_floor is consistent with floor state
// ---------------------------------------------------------------------------

describe('Advisory would_breach_floor invariant', () => {
  it('advisory sets would_breach_floor only when post-tx < reserved', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        positiveBigArb,
        (available, cost, reserved) => {
          fc.pre(BigInt(available) >= BigInt(cost)); // sufficient budget
          const result = shouldAllowRequest(available, cost, reserved, 'advisory');
          const postTx = BigInt(available) - BigInt(cost);
          const res = BigInt(reserved);
          if (postTx < res) {
            // Would breach → must have would_breach_floor: true
            expect(result.would_breach_floor).toBe(true);
          } else {
            // No breach → must NOT have would_breach_floor
            expect(result.would_breach_floor).toBeUndefined();
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property: Strict mode never has a warning field
// ---------------------------------------------------------------------------

describe('Strict mode never warns', () => {
  it('strict mode never returns a warning', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        nonNegBigArb,
        (available, cost, reserved) => {
          const result = shouldAllowRequest(available, cost, reserved, 'strict');
          expect(result.warning).toBeUndefined();
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property: BigInt arithmetic no overflow
// ---------------------------------------------------------------------------

describe('BigInt arithmetic safety', () => {
  it('handles values up to 10^18 without throwing', () => {
    fc.assert(
      fc.property(
        fc.bigInt({ min: 1n, max: 10n ** 18n }).map(String),
        fc.bigInt({ min: 1n, max: 10n ** 18n }).map(String),
        fc.bigInt({ min: 0n, max: 10n ** 18n }).map(String),
        fc.constantFrom('strict' as const, 'advisory' as const, 'unsupported' as const),
        (available, cost, reserved, enforcement) => {
          // Should never throw
          const result = shouldAllowRequest(available, cost, reserved, enforcement);
          expect(typeof result.allowed).toBe('boolean');
          expect(typeof result.floor_breached).toBe('boolean');
        },
      ),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// Property: post_transaction_available is correct when present
// ---------------------------------------------------------------------------

describe('post_transaction_available correctness', () => {
  it('post_transaction_available equals available - cost when present', () => {
    fc.assert(
      fc.property(
        positiveBigArb,
        positiveBigArb,
        nonNegBigArb,
        fc.constantFrom('strict' as const, 'advisory' as const, 'unsupported' as const),
        (available, cost, reserved, enforcement) => {
          fc.pre(BigInt(available) >= BigInt(cost)); // Case 1 only
          const result = shouldAllowRequest(available, cost, reserved, enforcement);
          if (result.post_transaction_available !== undefined) {
            expect(result.post_transaction_available).toBe(
              (BigInt(available) - BigInt(cost)).toString(),
            );
          }
        },
      ),
      { numRuns: 500 },
    );
  });
});
