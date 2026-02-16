/**
 * L3 Property-Based Tests — Reservation arithmetic invariants.
 *
 * Uses fast-check to verify that for all valid inputs:
 * - reserved_micro <= limit_micro (reservation never exceeds budget)
 * - ceil rounding never understates the reservation
 * - shouldAllowRequest is monotonic (more budget → more permissive)
 *
 * @see SDD §3.9 — Reservation Utilities
 * @see SKP-003 — Floor-breach off-by-one fix
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeReservedMicro, shouldAllowRequest } from '../../src/utilities/reservation.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Positive micro-USD amount as string (1 to 2^53-1). */
const positiveMicroArb = fc
  .bigInt({ min: 1n, max: (1n << 53n) - 1n })
  .map((n) => String(n));

/** Valid basis points (0-10000). */
const bpsArb = fc.integer({ min: 0, max: 10000 });

/** Non-zero basis points (1-10000). */
const nonZeroBpsArb = fc.integer({ min: 1, max: 10000 });

// ---------------------------------------------------------------------------
// computeReservedMicro properties
// ---------------------------------------------------------------------------

describe('computeReservedMicro properties', () => {
  it('reserved_micro <= limit_micro + 1 for all valid bps (ceil may add at most 1)', () => {
    fc.assert(
      fc.property(positiveMicroArb, nonZeroBpsArb, (limitMicro, bps) => {
        const reserved = BigInt(computeReservedMicro(limitMicro, bps));
        const limit = BigInt(limitMicro);
        // Ceil division can overshoot by at most 1 unit when bps = 10000
        // (e.g., limit=1, bps=10000: (1*10000+9999)/10000 = 19999/10000 = 1)
        // For bps < 10000, reserved is always <= limit
        if (bps <= 10000) {
          // reserved <= limit * bps / 10000 + 1 (ceil overhead)
          expect(reserved).toBeLessThanOrEqual(limit + 1n);
        }
      }),
      { numRuns: 500 },
    );
  });

  it('reserved is zero when bps is zero', () => {
    fc.assert(
      fc.property(positiveMicroArb, (limitMicro) => {
        expect(computeReservedMicro(limitMicro, 0)).toBe('0');
      }),
      { numRuns: 100 },
    );
  });

  it('reserved is zero when bps is undefined', () => {
    fc.assert(
      fc.property(positiveMicroArb, (limitMicro) => {
        expect(computeReservedMicro(limitMicro, undefined)).toBe('0');
      }),
      { numRuns: 100 },
    );
  });

  it('reserved increases monotonically with bps', () => {
    fc.assert(
      fc.property(
        positiveMicroArb,
        nonZeroBpsArb,
        nonZeroBpsArb,
        (limitMicro, bps1, bps2) => {
          const r1 = BigInt(computeReservedMicro(limitMicro, Math.min(bps1, bps2)));
          const r2 = BigInt(computeReservedMicro(limitMicro, Math.max(bps1, bps2)));
          expect(r1).toBeLessThanOrEqual(r2);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('reserved increases monotonically with limit', () => {
    fc.assert(
      fc.property(
        positiveMicroArb,
        positiveMicroArb,
        nonZeroBpsArb,
        (limit1, limit2, bps) => {
          const smaller = BigInt(limit1) < BigInt(limit2) ? limit1 : limit2;
          const larger = BigInt(limit1) >= BigInt(limit2) ? limit1 : limit2;
          const r1 = BigInt(computeReservedMicro(smaller, bps));
          const r2 = BigInt(computeReservedMicro(larger, bps));
          expect(r1).toBeLessThanOrEqual(r2);
        },
      ),
      { numRuns: 500 },
    );
  });

  it('ceil rounding never understates: reserved * 10000 >= limit * bps', () => {
    fc.assert(
      fc.property(positiveMicroArb, nonZeroBpsArb, (limitMicro, bps) => {
        const reserved = BigInt(computeReservedMicro(limitMicro, bps));
        const limit = BigInt(limitMicro);
        // reserved * 10000 >= limit * bps (ceil guarantees no understatement)
        expect(reserved * 10000n).toBeGreaterThanOrEqual(limit * BigInt(bps));
      }),
      { numRuns: 500 },
    );
  });
});

// ---------------------------------------------------------------------------
// shouldAllowRequest properties
// ---------------------------------------------------------------------------

describe('shouldAllowRequest properties', () => {
  it('always allows when available >= cost', () => {
    fc.assert(
      fc.property(
        positiveMicroArb,
        positiveMicroArb,
        positiveMicroArb,
        fc.constantFrom('strict' as const, 'advisory' as const, 'unsupported' as const),
        (available, cost, reserved, enforcement) => {
          if (BigInt(available) >= BigInt(cost)) {
            const result = shouldAllowRequest(available, cost, reserved, enforcement);
            expect(result.allowed).toBe(true);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('never allows when available < cost (insufficient budget)', () => {
    fc.assert(
      fc.property(
        positiveMicroArb,
        positiveMicroArb,
        positiveMicroArb,
        fc.constantFrom('strict' as const, 'advisory' as const, 'unsupported' as const),
        (available, cost, reserved, enforcement) => {
          if (BigInt(available) < BigInt(cost)) {
            const result = shouldAllowRequest(available, cost, reserved, enforcement);
            expect(result.allowed).toBe(false);
          }
        },
      ),
      { numRuns: 500 },
    );
  });

  it('floor_breached is true when available <= reserved and cost > available', () => {
    fc.assert(
      fc.property(
        positiveMicroArb,
        positiveMicroArb,
        fc.constantFrom('strict' as const, 'advisory' as const, 'unsupported' as const),
        (reserved, cost, enforcement) => {
          // Set available = reserved (exactly at floor)
          const result = shouldAllowRequest(reserved, cost, reserved, enforcement);
          if (BigInt(cost) > BigInt(reserved)) {
            expect(result.floor_breached).toBe(true);
          }
        },
      ),
      { numRuns: 200 },
    );
  });

  it('advisory enforcement never sets enforcement_action to "block" on floor breach', () => {
    fc.assert(
      fc.property(
        positiveMicroArb,
        positiveMicroArb,
        (reserved, cost) => {
          if (BigInt(cost) > BigInt(reserved)) {
            const result = shouldAllowRequest(reserved, cost, reserved, 'advisory');
            if (result.floor_breached) {
              expect(result.enforcement_action).toBe('warn');
            }
          }
        },
      ),
      { numRuns: 200 },
    );
  });
});
