/**
 * Tests for conservation law factory functions.
 *
 * @see Bridgebuilder Finding F7 — Canonical factories for conservation patterns
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import { ConservationLawSchema } from '../../src/commons/conservation-law.js';
import { InvariantSchema } from '../../src/commons/invariant.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import {
  buildSumInvariant,
  buildNonNegativeInvariant,
  buildBoundedInvariant,
  createBalanceConservation,
  createNonNegativeConservation,
  createBoundedConservation,
  createMonotonicConservation,
  resetFactoryCounter,
} from '../../src/commons/conservation-law-factories.js';
import { beforeEach } from 'vitest';

beforeEach(() => {
  resetFactoryCounter();
});

// ─── Invariant builders ──────────────────────────────────────────────────────

describe('buildSumInvariant', () => {
  it('produces a valid Invariant schema instance', () => {
    const inv = buildSumInvariant('CL-01', 'Lot conservation', ['balance', 'reserved', 'consumed'], 'original_allocation');
    expect(Value.Check(InvariantSchema, inv)).toBe(true);
  });

  it('expression evaluates to true when sum equals total', () => {
    const inv = buildSumInvariant('CL-01', 'Lot conservation', ['balance', 'reserved', 'consumed'], 'original_allocation');
    const result = evaluateConstraint(
      { balance: '700000', reserved: '100000', consumed: '200000', original_allocation: '1000000' },
      inv.expression,
    );
    expect(result).toBe(true);
  });

  it('expression evaluates to false when sum does not equal total', () => {
    const inv = buildSumInvariant('CL-01', 'Lot conservation', ['balance', 'reserved', 'consumed'], 'original_allocation');
    const result = evaluateConstraint(
      { balance: '700000', reserved: '100000', consumed: '100000', original_allocation: '1000000' },
      inv.expression,
    );
    expect(result).toBe(false);
  });

  it('works with exactly 2 fields', () => {
    const inv = buildSumInvariant('CL-01', 'Two-field sum', ['a', 'b'], 'total');
    const result = evaluateConstraint({ a: '300', b: '700', total: '1000' }, inv.expression);
    expect(result).toBe(true);
  });
});

describe('buildNonNegativeInvariant', () => {
  it('produces a valid Invariant schema instance', () => {
    const inv = buildNonNegativeInvariant('CL-02', 'Non-negative', ['balance', 'reserved']);
    expect(Value.Check(InvariantSchema, inv)).toBe(true);
  });

  it('expression evaluates to true for non-negative values', () => {
    const inv = buildNonNegativeInvariant('CL-02', 'Non-negative', ['balance', 'reserved']);
    const result = evaluateConstraint({ balance: '100', reserved: '0' }, inv.expression);
    expect(result).toBe(true);
  });

  it('works with a single field', () => {
    const inv = buildNonNegativeInvariant('CL-02', 'Non-negative', ['balance']);
    expect(inv.expression).toBe('bigint_gte(balance, 0)');
  });
});

describe('buildBoundedInvariant', () => {
  it('produces a valid Invariant schema instance', () => {
    const inv = buildBoundedInvariant('FR-01', 'Freshness bounds', 'freshness_score', 0, 100);
    expect(Value.Check(InvariantSchema, inv)).toBe(true);
  });

  it('expression evaluates to true within bounds', () => {
    const inv = buildBoundedInvariant('FR-01', 'Freshness bounds', 'score', 0, 100);
    expect(evaluateConstraint({ score: 50 }, inv.expression)).toBe(true);
  });

  it('expression evaluates to true at floor boundary', () => {
    const inv = buildBoundedInvariant('FR-01', 'Freshness bounds', 'score', 0, 100);
    expect(evaluateConstraint({ score: 0 }, inv.expression)).toBe(true);
  });

  it('expression evaluates to true at ceiling boundary', () => {
    const inv = buildBoundedInvariant('FR-01', 'Freshness bounds', 'score', 0, 100);
    expect(evaluateConstraint({ score: 100 }, inv.expression)).toBe(true);
  });

  it('expression evaluates to false below floor', () => {
    const inv = buildBoundedInvariant('FR-01', 'Freshness bounds', 'score', 0, 100);
    expect(evaluateConstraint({ score: -1 }, inv.expression)).toBe(false);
  });

  it('expression evaluates to false above ceiling', () => {
    const inv = buildBoundedInvariant('FR-01', 'Freshness bounds', 'score', 0, 100);
    expect(evaluateConstraint({ score: 101 }, inv.expression)).toBe(false);
  });
});

// ─── Conservation law factories ──────────────────────────────────────────────

describe('createBalanceConservation', () => {
  it('produces a valid ConservationLaw schema instance', () => {
    const law = createBalanceConservation(['balance', 'reserved', 'consumed'], 'original_allocation');
    expect(Value.Check(ConservationLawSchema, law)).toBe(true);
  });

  it('has 2 invariants (sum + non-negative)', () => {
    const law = createBalanceConservation(['balance', 'reserved', 'consumed'], 'original_allocation');
    expect(law.invariants).toHaveLength(2);
    expect(law.invariants[0].invariant_id).toMatch(/^CL-\d+$/);
    expect(law.invariants[1].invariant_id).toMatch(/^CL-\d+$/);
    // IDs must be unique
    expect(law.invariants[0].invariant_id).not.toBe(law.invariants[1].invariant_id);
  });

  it('defaults to strict enforcement', () => {
    const law = createBalanceConservation(['balance', 'reserved', 'consumed'], 'original_allocation');
    expect(law.enforcement).toBe('strict');
  });

  it('accepts advisory enforcement', () => {
    const law = createBalanceConservation(['balance', 'reserved', 'consumed'], 'original_allocation', 'advisory');
    expect(law.enforcement).toBe('advisory');
  });

  it('maps to freeside lot_invariant pattern', () => {
    const law = createBalanceConservation(['balance', 'reserved', 'consumed'], 'original_allocation');
    const sumInv = law.invariants[0];
    // Verify the expression matches the loa-freeside I-1 pattern
    expect(sumInv.expression).toContain('bigint_sum');
    expect(sumInv.expression).toContain('bigint_eq');
    expect(sumInv.expression).toContain('balance');
    expect(sumInv.expression).toContain('original_allocation');
  });
});

describe('createNonNegativeConservation', () => {
  it('produces a valid ConservationLaw schema instance', () => {
    const law = createNonNegativeConservation(['balance', 'consumed']);
    expect(Value.Check(ConservationLawSchema, law)).toBe(true);
  });

  it('has 1 invariant', () => {
    const law = createNonNegativeConservation(['balance']);
    expect(law.invariants).toHaveLength(1);
  });
});

describe('createBoundedConservation', () => {
  it('produces a valid ConservationLaw schema instance', () => {
    const law = createBoundedConservation('freshness_score', 0, 100);
    expect(Value.Check(ConservationLawSchema, law)).toBe(true);
  });

  it('has scope per-entry', () => {
    const law = createBoundedConservation('freshness_score', 0, 100);
    expect(law.scope).toBe('per-entry');
  });
});

describe('createMonotonicConservation', () => {
  it('produces a valid ConservationLaw schema instance (increasing)', () => {
    const law = createMonotonicConservation('version', 'increasing');
    expect(Value.Check(ConservationLawSchema, law)).toBe(true);
  });

  it('produces a valid ConservationLaw schema instance (decreasing)', () => {
    const law = createMonotonicConservation('ttl', 'decreasing');
    expect(Value.Check(ConservationLawSchema, law)).toBe(true);
  });

  it('increasing uses >= operator', () => {
    const law = createMonotonicConservation('version', 'increasing');
    expect(law.invariants[0].expression).toContain('>=');
  });

  it('decreasing uses <= operator', () => {
    const law = createMonotonicConservation('ttl', 'decreasing');
    expect(law.invariants[0].expression).toContain('<=');
  });
});
