/**
 * Tests for BudgetScope preference signal extension (S2-T3).
 *
 * v5.4.0 — FR-4: preference_signal optional field.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators
import {
  BudgetScopeSchema,
  PreferenceSignalSchema,
} from '../../src/schemas/model/routing/budget-scope.js';

const baseBudget = {
  scope: 'sprint',
  scope_id: 'sprint-1',
  limit_micro: '10000000',
  spent_micro: '5000000',
  action_on_exceed: 'warn',
  contract_version: '5.4.0',
};

describe('BudgetScope preference signal extension (v5.4.0)', () => {
  it('BudgetScope validates without preference_signal (backward compat)', () => {
    expect(Value.Check(BudgetScopeSchema, baseBudget)).toBe(true);
  });

  it('BudgetScope validates with valid preference_signal', () => {
    const budget = {
      ...baseBudget,
      preference_signal: {
        bid_priority: 'standard',
        cost_sensitivity: 'medium',
      },
    };
    expect(Value.Check(BudgetScopeSchema, budget)).toBe(true);
  });

  it('BudgetScope validates with preference_signal including preferred_pools', () => {
    const budget = {
      ...baseBudget,
      preference_signal: {
        bid_priority: 'elevated',
        preferred_pools: ['pool-opus', 'pool-sonnet'],
        cost_sensitivity: 'low',
      },
    };
    expect(Value.Check(BudgetScopeSchema, budget)).toBe(true);
  });

  it('rejects empty preferred_pools array', () => {
    const budget = {
      ...baseBudget,
      preference_signal: {
        bid_priority: 'standard',
        preferred_pools: [],
        cost_sensitivity: 'medium',
      },
    };
    expect(Value.Check(BudgetScopeSchema, budget)).toBe(false);
  });

  it('rejects invalid bid_priority', () => {
    const budget = {
      ...baseBudget,
      preference_signal: {
        bid_priority: 'urgent',
        cost_sensitivity: 'medium',
      },
    };
    expect(Value.Check(BudgetScopeSchema, budget)).toBe(false);
  });

  it('rejects invalid cost_sensitivity', () => {
    const budget = {
      ...baseBudget,
      preference_signal: {
        bid_priority: 'standard',
        cost_sensitivity: 'extreme',
      },
    };
    expect(Value.Check(BudgetScopeSchema, budget)).toBe(false);
  });

  it('rejects preference_signal with extra properties', () => {
    const budget = {
      ...baseBudget,
      preference_signal: {
        bid_priority: 'standard',
        cost_sensitivity: 'medium',
        extra: true,
      },
    };
    expect(Value.Check(BudgetScopeSchema, budget)).toBe(false);
  });
});

describe('PreferenceSignalSchema', () => {
  it('validates minimal signal', () => {
    expect(Value.Check(PreferenceSignalSchema, {
      bid_priority: 'critical',
      cost_sensitivity: 'high',
    })).toBe(true);
  });

  it('validates signal with all fields', () => {
    expect(Value.Check(PreferenceSignalSchema, {
      bid_priority: 'elevated',
      preferred_pools: ['pool-a'],
      cost_sensitivity: 'low',
    })).toBe(true);
  });
});
