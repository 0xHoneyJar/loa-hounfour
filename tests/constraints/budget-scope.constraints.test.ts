/**
 * Tests for BudgetScope preference constraints (S2-T4).
 *
 * v5.4.0 — budget-preference-no-empty-pools, budget-preference-cost-alignment.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'BudgetScope.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

const baseBudget = {
  scope: 'sprint',
  scope_id: 'sprint-1',
  limit_micro: '10000000',
  spent_micro: '5000000',
  action_on_exceed: 'warn',
  contract_version: '5.4.0',
};

describe('BudgetScope preference constraints (v5.4.0)', () => {
  it('constraint file has 3 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(3);
  });

  it('constraint file has contract_version 5.4.0', () => {
    expect(constraintFile.contract_version).toBe('5.4.0');
  });

  describe('budget-preference-no-empty-pools', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'budget-preference-no-empty-pools').expression;

    it('passes when no preference_signal', () => {
      expect(evaluateConstraint(baseBudget, getExpr())).toBe(true);
    });

    it('passes when preferred_pools is absent', () => {
      const data = {
        ...baseBudget,
        preference_signal: { bid_priority: 'standard', cost_sensitivity: 'medium' },
      };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });

    it('passes when preferred_pools has items', () => {
      const data = {
        ...baseBudget,
        preference_signal: {
          bid_priority: 'standard',
          preferred_pools: ['pool-a'],
          cost_sensitivity: 'medium',
        },
      };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });
  });

  describe('budget-preference-cost-alignment', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'budget-preference-cost-alignment').expression;

    it('passes when no preference_signal', () => {
      expect(evaluateConstraint(baseBudget, getExpr())).toBe(true);
    });

    it('passes for standard + high cost_sensitivity', () => {
      const data = {
        ...baseBudget,
        preference_signal: { bid_priority: 'standard', cost_sensitivity: 'high' },
      };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });

    it('passes for critical + low cost_sensitivity', () => {
      const data = {
        ...baseBudget,
        preference_signal: { bid_priority: 'critical', cost_sensitivity: 'low' },
      };
      expect(evaluateConstraint(data, getExpr())).toBe(true);
    });

    it('warns for critical + high cost_sensitivity', () => {
      const data = {
        ...baseBudget,
        preference_signal: { bid_priority: 'critical', cost_sensitivity: 'high' },
      };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });
  });

  describe('existing budget-scope-overspend', () => {
    const getExpr = () =>
      constraintFile.constraints.find((c: { id: string }) => c.id === 'budget-scope-overspend').expression;

    it('passes when spent < limit', () => {
      expect(evaluateConstraint(baseBudget, getExpr())).toBe(true);
    });

    it('warns when spent > limit', () => {
      const data = { ...baseBudget, spent_micro: '20000000' };
      expect(evaluateConstraint(data, getExpr())).toBe(false);
    });
  });
});
