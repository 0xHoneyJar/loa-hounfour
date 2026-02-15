/**
 * Property-based testing for protocol invariants.
 *
 * Uses fast-check to verify safety properties hold regardless of
 * input sequence, inspired by Amazon's TLA+ formal methods approach.
 *
 * @see S4-T2 — Bridgebuilder Part 5 §6
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  addMicro,
  subtractMicro,
  subtractMicroSigned,
  multiplyBps,
  negateMicro,
  isNegativeMicro,
  ZERO_MICRO,
} from '../../src/vocabulary/currency.js';
import { allocateRecipients } from '../../src/utilities/billing.js';
import {
  TRANSFER_CHOREOGRAPHY,
  TRANSFER_INVARIANTS,
} from '../../src/vocabulary/transfer-choreography.js';

// Arbitrary for valid MicroUSD strings (non-negative)
const microUsdArb = fc.bigInt({ min: 0n, max: (1n << 64n) - 1n }).map(n => String(n));
// Arbitrary for signed MicroUSD
const signedMicroArb = fc.bigInt({ min: -(1n << 63n), max: (1n << 63n) - 1n }).map(n => String(n));
// Arbitrary for basis points (0–10000)
const bpsArb = fc.integer({ min: 0, max: 10000 });

describe('Property Testing: Currency Arithmetic (v4.0.0, S4-T2)', () => {
  describe('addMicro', () => {
    it('is commutative: addMicro(a, b) === addMicro(b, a)', () => {
      fc.assert(
        fc.property(microUsdArb, microUsdArb, (a, b) => {
          expect(addMicro(a, b)).toBe(addMicro(b, a));
        }),
        { numRuns: 1000 },
      );
    });

    it('has identity: addMicro(a, "0") === a', () => {
      fc.assert(
        fc.property(microUsdArb, (a) => {
          expect(addMicro(a, ZERO_MICRO)).toBe(a);
        }),
        { numRuns: 1000 },
      );
    });

    it('is associative: addMicro(addMicro(a, b), c) === addMicro(a, addMicro(b, c))', () => {
      fc.assert(
        fc.property(microUsdArb, microUsdArb, microUsdArb, (a, b, c) => {
          expect(addMicro(addMicro(a, b), c)).toBe(addMicro(a, addMicro(b, c)));
        }),
        { numRuns: 1000 },
      );
    });
  });

  describe('subtractMicro', () => {
    it('throws on underflow: subtractMicro(a, b) throws when b > a', () => {
      fc.assert(
        fc.property(
          microUsdArb, microUsdArb,
          (a, b) => {
            if (BigInt(b) > BigInt(a)) {
              expect(() => subtractMicro(a, b)).toThrow();
              return;
            }
            // When a >= b, result should be non-negative
            const result = subtractMicro(a, b);
            expect(BigInt(result) >= 0n).toBe(true);
          },
        ),
        { numRuns: 1000 },
      );
    });

    it('self-subtraction is zero: subtractMicro(a, a) === "0"', () => {
      fc.assert(
        fc.property(microUsdArb, (a) => {
          expect(subtractMicro(a, a)).toBe('0');
        }),
        { numRuns: 1000 },
      );
    });
  });

  describe('subtractMicroSigned', () => {
    it('negate inverts: subtractMicroSigned(a, b) === negateMicro(subtractMicroSigned(b, a))', () => {
      fc.assert(
        fc.property(signedMicroArb, signedMicroArb, (a, b) => {
          expect(subtractMicroSigned(a, b)).toBe(negateMicro(subtractMicroSigned(b, a)));
        }),
        { numRuns: 1000 },
      );
    });

    it('double negate is identity: negateMicro(negateMicro(a)) === a', () => {
      fc.assert(
        fc.property(signedMicroArb, (a) => {
          expect(negateMicro(negateMicro(a))).toBe(a);
        }),
        { numRuns: 1000 },
      );
    });

    it('isNegativeMicro consistent with sign', () => {
      fc.assert(
        fc.property(signedMicroArb, (a) => {
          const val = BigInt(a);
          expect(isNegativeMicro(a)).toBe(val < 0n);
        }),
        { numRuns: 1000 },
      );
    });
  });

  describe('multiplyBps', () => {
    it('scaling by 10000 bps is identity: multiplyBps(a, 10000) === a', () => {
      fc.assert(
        fc.property(microUsdArb, (a) => {
          expect(multiplyBps(a, 10000)).toBe(a);
        }),
        { numRuns: 1000 },
      );
    });

    it('scaling by 0 bps is zero: multiplyBps(a, 0) === "0"', () => {
      fc.assert(
        fc.property(microUsdArb, (a) => {
          expect(multiplyBps(a, 0)).toBe('0');
        }),
        { numRuns: 1000 },
      );
    });

    it('result <= input when bps <= 10000', () => {
      fc.assert(
        fc.property(microUsdArb, bpsArb, (a, bps) => {
          const result = BigInt(multiplyBps(a, bps));
          expect(result <= BigInt(a)).toBe(true);
        }),
        { numRuns: 1000 },
      );
    });

    it('approximate distributivity: multiplyBps(a+b, bps) ≈ multiplyBps(a, bps) + multiplyBps(b, bps)', () => {
      fc.assert(
        fc.property(microUsdArb, microUsdArb, bpsArb, (a, b, bps) => {
          const combined = multiplyBps(addMicro(a, b), bps);
          const separate = addMicro(multiplyBps(a, bps), multiplyBps(b, bps));
          // Integer division may produce rounding difference of at most 1 micro-unit
          const diff = BigInt(combined) - BigInt(separate);
          expect(diff >= -1n && diff <= 1n).toBe(true);
        }),
        { numRuns: 1000 },
      );
    });
  });
});

describe('Property Testing: Billing Allocation (v4.0.0, S4-T2)', () => {
  // Generate valid recipient configs: 1–5 recipients whose shares sum to 10000
  const recipientsArb = fc.integer({ min: 1, max: 5 }).chain(n => {
    // Generate n numbers that sum to 10000
    return fc.array(fc.integer({ min: 1, max: 10000 }), { minLength: n, maxLength: n })
      .map(shares => {
        const total = shares.reduce((a, b) => a + b, 0);
        // Normalize to sum to 10000
        const normalized = shares.map((s, i) => {
          if (i === shares.length - 1) {
            return 10000 - normalized_so_far(shares, i, total);
          }
          return Math.max(1, Math.round((s / total) * 10000));
        });
        return normalized.map((share, i) => ({
          address: `0x${i.toString(16).padStart(4, '0')}`,
          role: 'provider' as const,
          share_bps: share,
        }));
      });
  });

  it('allocated amounts sum to total', () => {
    fc.assert(
      fc.property(microUsdArb, (total) => {
        // Simple 2-recipient case with fixed shares
        const recipients = [
          { address: '0x0001', role: 'provider' as const, share_bps: 7000 },
          { address: '0x0002', role: 'platform' as const, share_bps: 3000 },
        ];
        const allocated = allocateRecipients(recipients, total);
        const sum = allocated.reduce((acc, r) => acc + BigInt(r.amount_micro), 0n);
        expect(sum).toBe(BigInt(total));
      }),
      { numRuns: 1000 },
    );
  });

  it('no recipient gets negative allocation', () => {
    fc.assert(
      fc.property(microUsdArb, (total) => {
        const recipients = [
          { address: '0x0001', role: 'provider' as const, share_bps: 6000 },
          { address: '0x0002', role: 'platform' as const, share_bps: 4000 },
        ];
        const allocated = allocateRecipients(recipients, total);
        for (const r of allocated) {
          expect(BigInt(r.amount_micro) >= 0n).toBe(true);
        }
      }),
      { numRuns: 1000 },
    );
  });

  it('zero total gives zero allocations', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 1, max: 5 }),
        (n) => {
          const shareEach = Math.floor(10000 / n);
          const recipients = Array.from({ length: n }, (_, i) => ({
            address: `0x${i.toString(16).padStart(4, '0')}`,
            role: 'provider' as const,
            share_bps: i === n - 1 ? 10000 - shareEach * (n - 1) : shareEach,
          }));
          const allocated = allocateRecipients(recipients, '0');
          for (const r of allocated) {
            expect(r.amount_micro).toBe('0');
          }
        },
      ),
      { numRuns: 100 },
    );
  });
});

describe('Property Testing: Transfer Choreography (v4.0.0, S4-T2)', () => {
  const scenarios = Object.keys(TRANSFER_CHOREOGRAPHY) as Array<keyof typeof TRANSFER_CHOREOGRAPHY>;

  it('every scenario has at least one forward step', () => {
    for (const scenario of scenarios) {
      expect(TRANSFER_CHOREOGRAPHY[scenario].forward.length).toBeGreaterThan(0);
    }
  });

  it('every scenario has compensation steps', () => {
    for (const scenario of scenarios) {
      expect(TRANSFER_CHOREOGRAPHY[scenario].compensation.length).toBeGreaterThan(0);
    }
  });

  it('forward steps are all strings (event type names)', () => {
    for (const scenario of scenarios) {
      const steps = TRANSFER_CHOREOGRAPHY[scenario].forward;
      for (const step of steps) {
        expect(typeof step).toBe('string');
        // Event names follow dotted convention: aggregate.noun.verb
        expect(step.split('.').length).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it('invariant descriptions are unique per scenario', () => {
    for (const scenario of scenarios) {
      const invariants = TRANSFER_INVARIANTS[scenario] ?? [];
      const descriptions = invariants.map(i => i.description);
      expect(new Set(descriptions).size).toBe(descriptions.length);
    }
  });

  it('random step subsets are always from the choreography', () => {
    fc.assert(
      fc.property(
        fc.constantFrom(...scenarios),
        fc.shuffledSubarray(
          Array.from({ length: 25 }, (_, i) => i),
          { minLength: 1, maxLength: 10 },
        ),
        (scenario, indices) => {
          const steps = TRANSFER_CHOREOGRAPHY[scenario].forward;
          // Every selected index within bounds should yield a valid event string
          const validSteps = indices
            .filter(i => i < steps.length)
            .map(i => steps[i]);

          for (const step of validSteps) {
            expect(typeof step).toBe('string');
          }

          // At minimum, the choreography is defined
          expect(steps.length).toBeGreaterThan(0);
        },
      ),
      { numRuns: 1000 },
    );
  });
});

// Helper for normalized shares
function normalized_so_far(shares: number[], upTo: number, total: number): number {
  let sum = 0;
  for (let i = 0; i < upTo; i++) {
    sum += Math.max(1, Math.round((shares[i] / total) * 10000));
  }
  return sum;
}
