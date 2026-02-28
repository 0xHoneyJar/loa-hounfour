/**
 * Tests for conditional constraints.
 *
 * @see SDD §6.6 — Conditional Constraints
 * @see PRD FR-6 — Conditional Constraints
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateConstraint,
  resolveConditionalExpression,
} from '../../src/constraints/evaluator.js';
import type { ConstraintCondition } from '../../src/constraints/types.js';

describe('resolveConditionalExpression', () => {
  it('returns original expression when no condition', () => {
    const expr = resolveConditionalExpression({ expression: 'a > 0' });
    expect(expr).toBe('a > 0');
  });

  it('returns original expression when flag is absent', () => {
    const expr = resolveConditionalExpression(
      { expression: 'a > 0', condition: { when: 'strict_mode', override_text: 'a > 10' } },
      { feature_flags: {} },
    );
    expect(expr).toBe('a > 0');
  });

  it('returns original expression when flag is false', () => {
    const expr = resolveConditionalExpression(
      { expression: 'a > 0', condition: { when: 'strict_mode', override_text: 'a > 10' } },
      { feature_flags: { strict_mode: false } },
    );
    expect(expr).toBe('a > 0');
  });

  it('returns override expression when flag is true and override_text provided', () => {
    const expr = resolveConditionalExpression(
      { expression: 'a > 0', condition: { when: 'strict_mode', override_text: 'a > 10' } },
      { feature_flags: { strict_mode: true } },
    );
    expect(expr).toBe('a > 10');
  });

  it('returns original expression when flag is true but no override_text', () => {
    const expr = resolveConditionalExpression(
      { expression: 'a > 0', condition: { when: 'strict_mode' } },
      { feature_flags: { strict_mode: true } },
    );
    expect(expr).toBe('a > 0');
  });

  it('returns original expression when no context provided', () => {
    const expr = resolveConditionalExpression(
      { expression: 'a > 0', condition: { when: 'strict_mode', override_text: 'a > 10' } },
    );
    expect(expr).toBe('a > 0');
  });
});

describe('conditional evaluation integration', () => {
  it('evaluates original expression when flag absent', () => {
    const data = { budget_remaining: '1000' };
    const constraint = {
      expression: "budget_remaining != null",
      condition: { when: 'strict_budget' as const, override_text: "budget_remaining > '500'" },
    };
    const expr = resolveConditionalExpression(constraint);
    const result = evaluateConstraint(data, expr);
    expect(result).toBe(true);
  });

  it('evaluates override expression when flag active', () => {
    const data = { budget_remaining: '100' };
    const constraint = {
      expression: "budget_remaining != null",
      condition: { when: 'strict_budget' as const, override_text: "budget_remaining > '500'" },
    };
    const expr = resolveConditionalExpression(constraint, { feature_flags: { strict_budget: true } });
    // budget_remaining '100' is compared as string — depends on evaluator semantics
    // The point is that the override expression is used
    const result = evaluateConstraint(data, expr);
    // String comparison: '100' > '500' is false
    expect(result).toBe(false);
  });
});
