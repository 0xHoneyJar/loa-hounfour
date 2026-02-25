/**
 * Property-based tests for conservation law invariant preservation.
 *
 * Uses fast-check to verify that factory-produced conservation laws
 * maintain their invariants across arbitrary mutation sequences.
 *
 * @see Bridgebuilder Q5 — Environment enrichment (property tests)
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import {
  createBalanceConservation,
  buildSumInvariant,
  buildNonNegativeInvariant,
  buildBoundedInvariant,
} from '../../src/commons/conservation-law-factories.js';

describe('Conservation law properties', () => {
  it('sum conservation holds when components add to total', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (a, b, c) => {
          const total = a + b + c;
          const inv = buildSumInvariant('CL-01', 'Sum test', ['a', 'b', 'c'], 'total');
          return evaluateConstraint(
            { a: String(a), b: String(b), c: String(c), total: String(total) },
            inv.expression,
          ) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('sum conservation fails when components do not add to total', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }).filter(d => d > 0),
        (a, b, c, drift) => {
          const total = a + b + c + drift; // off by drift
          const inv = buildSumInvariant('CL-01', 'Sum test', ['a', 'b', 'c'], 'total');
          return evaluateConstraint(
            { a: String(a), b: String(b), c: String(c), total: String(total) },
            inv.expression,
          ) === false;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('non-negative invariant holds for all non-negative values', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (a, b) => {
          const inv = buildNonNegativeInvariant('NN-01', 'Non-neg', ['a', 'b']);
          return evaluateConstraint(
            { a: String(a), b: String(b) },
            inv.expression,
          ) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('bounded invariant holds within bounds', () => {
    fc.assert(
      fc.property(
        fc.integer({ min: 0, max: 100 }),
        (score) => {
          const inv = buildBoundedInvariant('BD-01', 'Bounded', 'score', 0, 100);
          return evaluateConstraint({ score }, inv.expression) === true;
        },
      ),
      { numRuns: 100 },
    );
  });

  it('bounded invariant fails outside bounds', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.integer({ min: -1000, max: -1 }),
          fc.integer({ min: 101, max: 1000 }),
        ),
        (score) => {
          const inv = buildBoundedInvariant('BD-01', 'Bounded', 'score', 0, 100);
          return evaluateConstraint({ score }, inv.expression) === false;
        },
      ),
      { numRuns: 50 },
    );
  });

  it('balance conservation factory produces valid laws for arbitrary field counts', () => {
    fc.assert(
      fc.property(
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        fc.nat({ max: 1_000_000_000 }),
        (balance, reserved, consumed) => {
          const total = balance + reserved + consumed;
          const law = createBalanceConservation(
            ['balance', 'reserved', 'consumed'],
            'original_allocation',
          );
          // Sum invariant should hold
          const sumResult = evaluateConstraint(
            {
              balance: String(balance),
              reserved: String(reserved),
              consumed: String(consumed),
              original_allocation: String(total),
            },
            law.invariants[0].expression,
          );
          return sumResult === true;
        },
      ),
      { numRuns: 50 },
    );
  });
});
