/**
 * Tests for type_of and is_bigint_coercible evaluator builtins (S2-T3).
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';
import { EVALUATOR_BUILTIN_SPECS } from '../../src/constraints/evaluator-spec.js';

describe('type_of builtin', () => {
  it('returns "string" for string values', () => {
    expect(evaluateConstraint({ name: 'hello' }, "type_of(name) == 'string'")).toBe(true);
  });

  it('returns "number" for number values', () => {
    expect(evaluateConstraint({ count: 42 }, "type_of(count) == 'number'")).toBe(true);
  });

  it('returns "boolean" for boolean values', () => {
    expect(evaluateConstraint({ flag: true }, "type_of(flag) == 'boolean'")).toBe(true);
  });

  it('returns "array" for arrays (not "object")', () => {
    expect(evaluateConstraint({ items: [1, 2, 3] }, "type_of(items) == 'array'")).toBe(true);
  });

  it('returns "null" for null values (not "object")', () => {
    expect(evaluateConstraint({ val: null }, "type_of(val) == 'null'")).toBe(true);
  });

  it('returns "object" for plain objects', () => {
    expect(evaluateConstraint({ rec: { a: 1 } }, "type_of(rec) == 'object'")).toBe(true);
  });

  it('returns "undefined" for missing fields', () => {
    expect(evaluateConstraint({}, "type_of(missing) == 'undefined'")).toBe(true);
  });
});

describe('is_bigint_coercible builtin', () => {
  it('returns true for numeric strings', () => {
    expect(evaluateConstraint({ amount: '1000000' }, 'is_bigint_coercible(amount)')).toBe(true);
  });

  it('returns true for zero string', () => {
    expect(evaluateConstraint({ amount: '0' }, 'is_bigint_coercible(amount)')).toBe(true);
  });

  it('returns true for negative numeric strings', () => {
    expect(evaluateConstraint({ amount: '-500' }, 'is_bigint_coercible(amount)')).toBe(true);
  });

  it('returns false for non-numeric strings', () => {
    expect(evaluateConstraint({ name: 'hello' }, 'is_bigint_coercible(name)')).toBe(false);
  });

  it('returns false for decimal strings', () => {
    expect(evaluateConstraint({ price: '1.50' }, 'is_bigint_coercible(price)')).toBe(false);
  });

  it('returns true for integer numbers', () => {
    expect(evaluateConstraint({ count: 42 }, 'is_bigint_coercible(count)')).toBe(true);
  });

  it('returns false for float numbers', () => {
    expect(evaluateConstraint({ ratio: 0.5 }, 'is_bigint_coercible(ratio)')).toBe(false);
  });

  it('returns false for null', () => {
    expect(evaluateConstraint({ val: null }, 'is_bigint_coercible(val)')).toBe(false);
  });
});

describe('EVALUATOR_BUILTINS registry', () => {
  it('contains 26 builtins (23 + saga_amount_conserved + saga_steps_sequential + outcome_consensus_valid)', () => {
    expect(EVALUATOR_BUILTINS).toHaveLength(31);
  });

  it('includes type_of', () => {
    expect(EVALUATOR_BUILTINS).toContain('type_of');
  });

  it('includes is_bigint_coercible', () => {
    expect(EVALUATOR_BUILTINS).toContain('is_bigint_coercible');
  });
});

describe('EVALUATOR_BUILTIN_SPECS registry', () => {
  it('has specs for all 26 builtins', () => {
    expect(EVALUATOR_BUILTIN_SPECS.size).toBe(31);
  });

  it('has spec for type_of', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('type_of');
    expect(spec).toBeDefined();
    expect(spec!.return_type).toBe('string');
  });

  it('has spec for is_bigint_coercible', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('is_bigint_coercible');
    expect(spec).toBeDefined();
    expect(spec!.return_type).toBe('boolean');
  });

  it('spec examples execute correctly for type_of', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('type_of')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });

  it('spec examples execute correctly for is_bigint_coercible', () => {
    const spec = EVALUATOR_BUILTIN_SPECS.get('is_bigint_coercible')!;
    for (const example of spec.examples) {
      expect(
        evaluateConstraint(example.context, example.expression),
        `Failed: ${example.description}`,
      ).toBe(example.expected);
    }
  });
});
