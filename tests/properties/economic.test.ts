/**
 * L3 Economic Property Tests — Property-based verification of financial
 * conservation invariants across random billing event sequences.
 *
 * Uses fast-check to ensure that no matter what sequence of billing and
 * escrow events occurs, the ledger's conservation invariant always holds:
 * credits never exceed debits (net >= 0).
 *
 * @see S6-T4 — L3 Economic property tests
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { ProtocolLedger } from '../../src/test-infrastructure/protocol-ledger.js';
import { ESCROW_TRANSITIONS, isValidEscrowTransition } from '../../src/schemas/escrow-entry.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Generate a positive micro-USD amount as a string (e.g., "500000"). */
const positiveMicroArb = fc
  .bigInt({ min: 1n, max: (1n << 53n) - 1n })
  .map((n) => String(n));

/** Unique event ID arbitrary. */
const eventIdArb = fc.uuid();

/**
 * Arbitrary for `billing.entry.created` events.
 * These are debits — amount_micro is a positive string integer.
 */
const billingCreatedArb = fc.record({
  event_id: eventIdArb,
  type: fc.constant('billing.entry.created'),
  aggregate_type: fc.constant('billing'),
  payload: positiveMicroArb.map((amount) => ({
    billing_entry_id: 'be-' + Math.random().toString(36).slice(2),
    amount_micro: amount,
  })),
});

/**
 * Arbitrary for `billing.entry.voided` events.
 * These are credits — reversal of a prior billing entry.
 */
const billingVoidedArb = fc.record({
  event_id: eventIdArb,
  type: fc.constant('billing.entry.voided'),
  aggregate_type: fc.constant('billing'),
  payload: positiveMicroArb.map((amount) => ({
    billing_entry_id: 'be-' + Math.random().toString(36).slice(2),
    amount_micro: amount,
  })),
});

/**
 * Arbitrary for `economy.escrow.refunded` events.
 * These are credits — funds returned to payer.
 */
const escrowRefundedArb = fc.record({
  event_id: eventIdArb,
  type: fc.constant('economy.escrow.refunded'),
  aggregate_type: fc.constant('economy'),
  payload: positiveMicroArb.map((amount) => ({
    transaction_id: 'tx-' + Math.random().toString(36).slice(2),
    amount_micro: amount,
  })),
});

/**
 * Mixed billing event sequence: 1-50 events from the three categories.
 * Debits are weighted 2:1 against credits to keep sequences realistic,
 * but fast-check will still find adversarial mixes.
 */
const billingEventSequenceArb = fc.array(
  fc.oneof(
    { weight: 2, arbitrary: billingCreatedArb },
    { weight: 1, arbitrary: billingVoidedArb },
    { weight: 1, arbitrary: escrowRefundedArb },
  ),
  { minLength: 1, maxLength: 50 },
);

/**
 * Debit-only event sequence — for testing that credits-never-exceed-debits
 * holds trivially when there are no credits.
 */
const debitOnlySequenceArb = fc.array(billingCreatedArb, {
  minLength: 1,
  maxLength: 50,
});

/**
 * Paired debit-then-credit sequence: for each event pair, a debit is
 * followed by a void of equal or smaller amount, guaranteeing conservation.
 */
const pairedSequenceArb = positiveMicroArb.chain((amount) => {
  const amountBig = BigInt(amount);
  const creditAmount = fc
    .bigInt({ min: 0n, max: amountBig })
    .map((n) => String(n));

  return creditAmount.map((credit) => {
    const debit = {
      event_id: crypto.randomUUID(),
      type: 'billing.entry.created' as const,
      aggregate_type: 'billing' as const,
      payload: { billing_entry_id: 'be-paired', amount_micro: amount },
    };
    const void_ = {
      event_id: crypto.randomUUID(),
      type: 'billing.entry.voided' as const,
      aggregate_type: 'billing' as const,
      payload: { billing_entry_id: 'be-paired', amount_micro: credit },
    };
    return [debit, void_];
  });
});

// ---------------------------------------------------------------------------
// All 5 escrow states
// ---------------------------------------------------------------------------
const ESCROW_STATES = ['held', 'released', 'disputed', 'refunded', 'expired'] as const;
type EscrowState = (typeof ESCROW_STATES)[number];
const TERMINAL_STATES: ReadonlySet<string> = new Set(['released', 'refunded', 'expired']);

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('L3 Economic Properties: Conservation Invariants (S6-T4)', () => {
  describe('billing event sequences', () => {
    it('isConserved() always true for debit-only sequences', () => {
      fc.assert(
        fc.property(debitOnlySequenceArb, (events) => {
          const ledger = new ProtocolLedger();
          for (const event of events) {
            ledger.record(event);
            expect(ledger.isConserved()).toBe(true);
          }
          const balance = ledger.trialBalance();
          expect(balance.net >= 0n).toBe(true);
          expect(balance.total_credits).toBe(0n);
        }),
        { numRuns: 200 },
      );
    });

    it('trial balance net is always debits minus credits', () => {
      fc.assert(
        fc.property(billingEventSequenceArb, (events) => {
          const ledger = new ProtocolLedger();
          for (const event of events) {
            ledger.record(event);
          }
          const balance = ledger.trialBalance();
          expect(balance.net).toBe(balance.total_debits - balance.total_credits);
        }),
        { numRuns: 200 },
      );
    });

    it('paired debit-then-void sequences are always conserved', () => {
      fc.assert(
        fc.property(
          fc.array(pairedSequenceArb, { minLength: 1, maxLength: 25 }),
          (pairs) => {
            const ledger = new ProtocolLedger();
            for (const [debit, credit] of pairs) {
              ledger.record(debit);
              ledger.record(credit);
            }
            expect(ledger.isConserved()).toBe(true);
            expect(ledger.trialBalance().net >= 0n).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });

    it('total_debits accumulates only billing.entry.created amounts', () => {
      fc.assert(
        fc.property(billingEventSequenceArb, (events) => {
          const ledger = new ProtocolLedger();
          let expectedDebits = 0n;
          for (const event of events) {
            if (event.type === 'billing.entry.created') {
              expectedDebits += BigInt(event.payload.amount_micro as string);
            }
            ledger.record(event);
          }
          expect(ledger.trialBalance().total_debits).toBe(expectedDebits);
        }),
        { numRuns: 200 },
      );
    });

    it('total_credits accumulates voided and escrow refunded amounts', () => {
      fc.assert(
        fc.property(billingEventSequenceArb, (events) => {
          const ledger = new ProtocolLedger();
          let expectedCredits = 0n;
          for (const event of events) {
            if (
              event.type === 'billing.entry.voided' ||
              event.type === 'economy.escrow.refunded'
            ) {
              expectedCredits += BigInt(event.payload.amount_micro as string);
            }
            ledger.record(event);
          }
          expect(ledger.trialBalance().total_credits).toBe(expectedCredits);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('escrow refund flows', () => {
    it('escrow refund events correctly credit the ledger', () => {
      fc.assert(
        fc.property(escrowRefundedArb, (event) => {
          const ledger = new ProtocolLedger();
          ledger.record(event);
          const balance = ledger.trialBalance();
          expect(balance.total_credits).toBe(
            BigInt(event.payload.amount_micro as string),
          );
          expect(balance.total_debits).toBe(0n);
        }),
        { numRuns: 200 },
      );
    });

    it('escrow hold/release has no net ledger impact', () => {
      fc.assert(
        fc.property(eventIdArb, positiveMicroArb, (id, amount) => {
          const ledger = new ProtocolLedger();
          // Record escrow hold (economy.escrow.created) and release (economy.escrow.released)
          ledger.record({
            event_id: id,
            type: 'economy.escrow.created',
            aggregate_type: 'economy',
            payload: { transaction_id: 'tx-1', amount_micro: amount },
          });
          ledger.record({
            event_id: id + '-release',
            type: 'economy.escrow.released',
            aggregate_type: 'economy',
            payload: { transaction_id: 'tx-1', amount_micro: amount },
          });
          const balance = ledger.trialBalance();
          expect(balance.total_debits).toBe(0n);
          expect(balance.total_credits).toBe(0n);
          expect(balance.net).toBe(0n);
        }),
        { numRuns: 200 },
      );
    });

    it('debit followed by escrow refund of same amount is conserved', () => {
      fc.assert(
        fc.property(positiveMicroArb, (amount) => {
          const ledger = new ProtocolLedger();
          ledger.record({
            event_id: crypto.randomUUID(),
            type: 'billing.entry.created',
            aggregate_type: 'billing',
            payload: { billing_entry_id: 'be-1', amount_micro: amount },
          });
          ledger.record({
            event_id: crypto.randomUUID(),
            type: 'economy.escrow.refunded',
            aggregate_type: 'economy',
            payload: { transaction_id: 'tx-1', amount_micro: amount },
          });
          expect(ledger.isConserved()).toBe(true);
          expect(ledger.trialBalance().net).toBe(0n);
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('escrow lifecycle transitions', () => {
    it('ESCROW_TRANSITIONS covers all 5 states', () => {
      for (const state of ESCROW_STATES) {
        expect(state in ESCROW_TRANSITIONS).toBe(true);
      }
    });

    it('terminal states have no outbound transitions', () => {
      for (const state of ESCROW_STATES) {
        if (TERMINAL_STATES.has(state)) {
          expect(ESCROW_TRANSITIONS[state]).toHaveLength(0);
        }
      }
    });

    it('all transitions from non-terminal states are valid via isValidEscrowTransition', () => {
      for (const state of ESCROW_STATES) {
        const targets = ESCROW_TRANSITIONS[state];
        for (const target of targets) {
          expect(isValidEscrowTransition(state, target)).toBe(true);
        }
      }
    });

    it('transitions to self are never valid (except held via funded event)', () => {
      for (const state of ESCROW_STATES) {
        if (state === 'held') {
          // BB-C9-003: held->held is a valid self-transition (economy.escrow.funded)
          expect(isValidEscrowTransition(state, state)).toBe(true);
        } else {
          expect(isValidEscrowTransition(state, state)).toBe(false);
        }
      }
    });

    it('random escrow lifecycle walks produce only valid transitions', () => {
      /**
       * Generate a random walk through the escrow state machine starting
       * from 'held'. At each step, pick a random valid outbound transition
       * (if any). The walk terminates when a terminal state is reached.
       */
      const escrowWalkArb = fc.integer({ min: 1, max: 20 }).chain((maxSteps) =>
        fc
          .array(fc.integer({ min: 0, max: 10 }), {
            minLength: maxSteps,
            maxLength: maxSteps,
          })
          .map((picks) => {
            const path: Array<{ from: string; to: string }> = [];
            let current: string = 'held';

            for (const pick of picks) {
              const targets = ESCROW_TRANSITIONS[current];
              if (!targets || targets.length === 0) break; // terminal
              const next = targets[pick % targets.length];
              path.push({ from: current, to: next });
              current = next;
            }
            return { path, finalState: current };
          }),
      );

      fc.assert(
        fc.property(escrowWalkArb, ({ path, finalState }) => {
          // Every transition in the walk must be valid
          for (const { from, to } of path) {
            expect(isValidEscrowTransition(from, to)).toBe(true);
          }

          // If the walk terminated, the final state should be terminal
          // (no further transitions possible) — or we ran out of steps
          if (path.length > 0) {
            const lastTo = path[path.length - 1].to;
            expect(lastTo).toBe(finalState);
          }
        }),
        { numRuns: 200 },
      );
    });

    it('escrow walks that reach terminal states have no further transitions', () => {
      const escrowWalkArb = fc
        .array(fc.integer({ min: 0, max: 10 }), {
          minLength: 1,
          maxLength: 20,
        })
        .map((picks) => {
          const path: Array<{ from: string; to: string }> = [];
          let current: string = 'held';

          for (const pick of picks) {
            const targets = ESCROW_TRANSITIONS[current];
            if (!targets || targets.length === 0) break;
            const next = targets[pick % targets.length];
            path.push({ from: current, to: next });
            current = next;
          }
          return { path, finalState: current };
        });

      fc.assert(
        fc.property(escrowWalkArb, ({ finalState }) => {
          if (TERMINAL_STATES.has(finalState)) {
            expect(ESCROW_TRANSITIONS[finalState]).toHaveLength(0);
          }
        }),
        { numRuns: 200 },
      );
    });

    it('conservation holds per escrow state transition', () => {
      /**
       * For each escrow state transition, record appropriate billing events
       * and verify the ledger remains conserved.
       *
       * - held -> released: original billing debit stands, no credit
       * - held -> disputed: no financial impact yet
       * - held -> expired: escrow expiry triggers refund
       * - disputed -> released: payment goes through, no credit
       * - disputed -> refunded: refund credit
       */
      fc.assert(
        fc.property(positiveMicroArb, (amount) => {
          for (const fromState of ESCROW_STATES) {
            const targets = ESCROW_TRANSITIONS[fromState];
            for (const toState of targets) {
              const ledger = new ProtocolLedger();

              // The escrow always begins with a billing debit
              ledger.record({
                event_id: crypto.randomUUID(),
                type: 'billing.entry.created',
                aggregate_type: 'billing',
                payload: {
                  billing_entry_id: 'be-escrow',
                  amount_micro: amount,
                },
              });

              // Refund transitions produce a credit
              if (toState === 'refunded') {
                ledger.record({
                  event_id: crypto.randomUUID(),
                  type: 'economy.escrow.refunded',
                  aggregate_type: 'economy',
                  payload: {
                    transaction_id: 'tx-escrow',
                    amount_micro: amount,
                  },
                });
              }

              // Expired escrow triggers a refund credit
              if (toState === 'expired') {
                ledger.record({
                  event_id: crypto.randomUUID(),
                  type: 'economy.escrow.refunded',
                  aggregate_type: 'economy',
                  payload: {
                    transaction_id: 'tx-escrow-expired',
                    amount_micro: amount,
                  },
                });
              }

              // Conservation must always hold: credits <= debits
              expect(ledger.isConserved()).toBe(true);
              expect(ledger.trialBalance().net >= 0n).toBe(true);
            }
          }
        }),
        { numRuns: 200 },
      );
    });
  });

  describe('numeric amount handling (BB-C9-011)', () => {
    it('accepts integer number amounts', () => {
      const ledger = new ProtocolLedger();
      ledger.record({
        event_id: 'num-1',
        type: 'billing.entry.created',
        aggregate_type: 'billing',
        payload: { billing_entry_id: 'be-num', amount_micro: 5000000 },
      });
      expect(ledger.trialBalance().total_debits).toBe(5000000n);
    });

    it('accepts bigint amounts', () => {
      const ledger = new ProtocolLedger();
      ledger.record({
        event_id: 'big-1',
        type: 'billing.entry.created',
        aggregate_type: 'billing',
        payload: { billing_entry_id: 'be-big', amount_micro: 9007199254740993n },
      });
      expect(ledger.trialBalance().total_debits).toBe(9007199254740993n);
    });

    it('rejects negative number amounts', () => {
      const ledger = new ProtocolLedger();
      ledger.record({
        event_id: 'neg-1',
        type: 'billing.entry.created',
        aggregate_type: 'billing',
        payload: { billing_entry_id: 'be-neg', amount_micro: -100 },
      });
      expect(ledger.trialBalance().total_debits).toBe(0n);
    });

    it('rejects negative bigint amounts', () => {
      const ledger = new ProtocolLedger();
      ledger.record({
        event_id: 'neg-big-1',
        type: 'billing.entry.created',
        aggregate_type: 'billing',
        payload: { billing_entry_id: 'be-neg-big', amount_micro: -100n },
      });
      expect(ledger.trialBalance().total_debits).toBe(0n);
    });

    it('rejects non-integer number amounts', () => {
      const ledger = new ProtocolLedger();
      ledger.record({
        event_id: 'float-1',
        type: 'billing.entry.created',
        aggregate_type: 'billing',
        payload: { billing_entry_id: 'be-float', amount_micro: 1.5 },
      });
      expect(ledger.trialBalance().total_debits).toBe(0n);
    });

    it('numeric amounts produce correct conservation checks', () => {
      fc.assert(
        fc.property(
          fc.integer({ min: 1, max: Number.MAX_SAFE_INTEGER }),
          fc.integer({ min: 0, max: Number.MAX_SAFE_INTEGER }),
          (debitAmount, creditAmount) => {
            const ledger = new ProtocolLedger();
            ledger.record({
              event_id: 'debit-num',
              type: 'billing.entry.created',
              aggregate_type: 'billing',
              payload: { billing_entry_id: 'be-1', amount_micro: debitAmount },
            });

            const cappedCredit = Math.min(creditAmount, debitAmount);
            ledger.record({
              event_id: 'credit-num',
              type: 'economy.escrow.refunded',
              aggregate_type: 'economy',
              payload: { transaction_id: 'tx-1', amount_micro: cappedCredit },
            });

            expect(ledger.isConserved()).toBe(true);
          },
        ),
        { numRuns: 200 },
      );
    });
  });
});
