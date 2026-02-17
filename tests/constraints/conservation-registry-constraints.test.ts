/**
 * Tests for ConservationPropertyRegistry coverage constraint.
 *
 * Validates coverage sum consistency against total_count.
 * @see bridge-20260217-v55 iteration 1, finding medium-2
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const constraintPath = resolve('constraints/ConservationPropertyRegistry.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function getConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

const validRegistry = {
  total_count: 3,
  properties: [
    { invariant_id: 'I-1', universe: 'single_lot', ltl_formula: 'G(x >= 0)' },
    { invariant_id: 'I-2', universe: 'single_lot', ltl_formula: 'G(a + b == c)' },
    { invariant_id: 'I-3', universe: 'account', ltl_formula: 'G(budget >= 0)' },
  ],
  coverage: {
    single_lot: 2,
    account: 1,
    platform: 0,
    bilateral: 0,
  },
  contract_version: '5.5.0',
};

describe('conservation-registry-coverage-sums-to-total', () => {
  const constraint = getConstraint('conservation-registry-coverage-sums-to-total');

  it('passes when coverage sums to total_count', () => {
    expect(evaluateConstraint(validRegistry as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });

  it('fails when coverage sum exceeds total_count', () => {
    const bad = {
      ...validRegistry,
      coverage: { single_lot: 3, account: 1, platform: 0, bilateral: 0 },
    };
    expect(evaluateConstraint(bad as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('fails when coverage sum is less than total_count', () => {
    const bad = {
      ...validRegistry,
      coverage: { single_lot: 1, account: 0, platform: 0, bilateral: 0 },
    };
    expect(evaluateConstraint(bad as unknown as Record<string, unknown>, constraint.expression)).toBe(false);
  });

  it('passes when all zeros and total_count is 0', () => {
    const empty = {
      total_count: 0,
      properties: [],
      coverage: { single_lot: 0, account: 0, platform: 0, bilateral: 0 },
      contract_version: '5.5.0',
    };
    expect(evaluateConstraint(empty as unknown as Record<string, unknown>, constraint.expression)).toBe(true);
  });
});
