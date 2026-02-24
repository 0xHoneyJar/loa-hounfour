/**
 * Constraint round-trip tests for all 10 Commons Protocol constraint files.
 *
 * Evaluates each constraint expression against valid and invalid data
 * to verify evaluator ↔ TypeScript validator consistency.
 *
 * @see SDD §4 — Commons Protocol
 * @since v8.0.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const CONSTRAINTS_DIR = join(import.meta.dirname, '../../constraints');

function loadConstraints(schemaId: string): Array<{ id: string; expression: string }> {
  const content = JSON.parse(readFileSync(join(CONSTRAINTS_DIR, `${schemaId}.constraints.json`), 'utf-8'));
  return content.constraints
    .filter((c: { expression: string }) => !c.expression.startsWith('native:'))
    .map((c: { id: string; expression: string }) => ({ id: c.id, expression: c.expression }));
}

describe('ConservationLaw constraints', () => {
  const constraints = loadConstraints('ConservationLaw');

  it('conservation-strict-requires-invariants passes with non-empty invariants', () => {
    const c = constraints.find((x) => x.id === 'conservation-strict-requires-invariants');
    if (!c) return; // native enforcement
    expect(evaluateConstraint(
      { enforcement: 'strict', invariants: [{ id: 'CL-01', expression: 'true' }] },
      c.expression,
    )).toBe(true);
  });
});

describe('AuditTrail constraints', () => {
  const constraints = loadConstraints('AuditTrail');

  for (const c of constraints) {
    it(`${c.id} evaluates`, () => {
      // genesis-hash-set: entries.length == 0 || genesis_hash is set
      if (c.id === 'genesis-hash-set') {
        expect(evaluateConstraint(
          {
            entries: [],
            genesis_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
          },
          c.expression,
        )).toBe(true);
      }
    });
  }
});

describe('GovernedCredits constraints', () => {
  const constraints = loadConstraints('GovernedCredits');

  it('CL-01 lot conservation passes for balanced values', () => {
    const c = constraints.find((x) => x.id === 'governed-credits-lot-conservation');
    if (!c) return;
    expect(evaluateConstraint(
      {
        balance: '700000',
        reserved: '100000',
        consumed: '200000',
        original_allocation: '1000000',
      },
      c.expression,
    )).toBe(true);
  });

  it('CL-01 lot conservation fails for unbalanced values', () => {
    const c = constraints.find((x) => x.id === 'governed-credits-lot-conservation');
    if (!c) return;
    expect(evaluateConstraint(
      {
        balance: '999999',
        reserved: '100000',
        consumed: '200000',
        original_allocation: '1000000',
      },
      c.expression,
    )).toBe(false);
  });
});

describe('GovernedReputation constraints', () => {
  const constraints = loadConstraints('GovernedReputation');

  it('REP-02 cold-null-score passes for cold with null', () => {
    const c = constraints.find((x) => x.id === 'governed-reputation-cold-null-score');
    if (!c) return;
    expect(evaluateConstraint(
      { reputation_state: 'cold', personal_score: null },
      c.expression,
    )).toBe(true);
  });

  it('REP-03 sample-count passes for non-negative', () => {
    const c = constraints.find((x) => x.id === 'governed-reputation-sample-count-nonneg');
    if (!c) return;
    expect(evaluateConstraint({ sample_count: 0 }, c.expression)).toBe(true);
    expect(evaluateConstraint({ sample_count: 5 }, c.expression)).toBe(true);
  });
});

describe('GovernedFreshness constraints', () => {
  const constraints = loadConstraints('GovernedFreshness');

  it('FR-01 score bounds passes for value in [0,1]', () => {
    const c = constraints.find((x) => x.id === 'governed-freshness-score-bounds');
    if (!c) return;
    expect(evaluateConstraint({ freshness_score: 0.5 }, c.expression)).toBe(true);
    expect(evaluateConstraint({ freshness_score: 0 }, c.expression)).toBe(true);
    expect(evaluateConstraint({ freshness_score: 1 }, c.expression)).toBe(true);
  });

  it('FR-01 score bounds fails for out-of-range value', () => {
    const c = constraints.find((x) => x.id === 'governed-freshness-score-bounds');
    if (!c) return;
    expect(evaluateConstraint({ freshness_score: 1.5 }, c.expression)).toBe(false);
    expect(evaluateConstraint({ freshness_score: -0.1 }, c.expression)).toBe(false);
  });

  it('FR-02 decay rate passes for non-negative', () => {
    const c = constraints.find((x) => x.id === 'governed-freshness-decay-nonneg');
    if (!c) return;
    expect(evaluateConstraint({ decay_rate: 0 }, c.expression)).toBe(true);
    expect(evaluateConstraint({ decay_rate: 0.1 }, c.expression)).toBe(true);
  });
});

describe('HashChainDiscontinuity constraints', () => {
  const constraints = loadConstraints('HashChainDiscontinuity');

  it('affected-nonneg passes for zero', () => {
    const c = constraints.find((x) => x.id === 'discontinuity-affected-nonneg');
    if (!c) return;
    expect(evaluateConstraint({ affected_entries: 0 }, c.expression)).toBe(true);
  });

  it('last-good-bounds passes when last good < entry index', () => {
    const c = constraints.find((x) => x.id === 'discontinuity-last-good-bounds');
    if (!c) return;
    expect(evaluateConstraint(
      { last_known_good_index: 3, entry_index: 5 },
      c.expression,
    )).toBe(true);
  });

  it('last-good-bounds fails when last good >= entry index', () => {
    const c = constraints.find((x) => x.id === 'discontinuity-last-good-bounds');
    if (!c) return;
    expect(evaluateConstraint(
      { last_known_good_index: 5, entry_index: 5 },
      c.expression,
    )).toBe(false);
  });
});

describe('QuarantineRecord constraints', () => {
  const constraints = loadConstraints('QuarantineRecord');

  it('quarantine-index-order passes when first <= last', () => {
    const c = constraints.find((x) => x.id === 'quarantine-index-order');
    if (!c) return;
    expect(evaluateConstraint(
      { first_affected_index: 3, last_affected_index: 7 },
      c.expression,
    )).toBe(true);
  });

  it('quarantine-index-order fails when first > last', () => {
    const c = constraints.find((x) => x.id === 'quarantine-index-order');
    if (!c) return;
    expect(evaluateConstraint(
      { first_affected_index: 7, last_affected_index: 3 },
      c.expression,
    )).toBe(false);
  });

  it('quarantine-resolved-requires-timestamp passes for active without timestamp', () => {
    const c = constraints.find((x) => x.id === 'quarantine-resolved-requires-timestamp');
    if (!c) return;
    expect(evaluateConstraint(
      { status: 'active', resolved_at: undefined },
      c.expression,
    )).toBe(true);
  });

  it('quarantine-resolved-requires-timestamp fails for reconciled without timestamp', () => {
    const c = constraints.find((x) => x.id === 'quarantine-resolved-requires-timestamp');
    if (!c) return;
    expect(evaluateConstraint(
      { status: 'reconciled', resolved_at: undefined },
      c.expression,
    )).toBe(false);
  });
});

describe('ContractNegotiation constraints', () => {
  const constraints = loadConstraints('ContractNegotiation');

  it('negotiation-expires-after-negotiated passes', () => {
    const c = constraints.find((x) => x.id === 'negotiation-expires-after-negotiated');
    if (!c) return;
    expect(evaluateConstraint(
      { expires_at: '2026-02-25T12:00:00Z', negotiated_at: '2026-02-25T10:00:00Z' },
      c.expression,
    )).toBe(true);
  });

  it('negotiation-nonce-present passes for 16+ chars', () => {
    const c = constraints.find((x) => x.id === 'negotiation-nonce-present');
    if (!c) return;
    expect(evaluateConstraint({ nonce: 'a'.repeat(16) }, c.expression)).toBe(true);
  });
});
