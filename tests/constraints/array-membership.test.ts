/**
 * PR-C3 (FR-C3) — LOCAL builtins `array_contains` and
 * `array_values_distinct`: standalone evaluators and DSL surface.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  evaluateArrayContains,
  evaluateArrayValuesDistinct,
} from '../../src/constraints/builtins/array-membership.js';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';

describe('array_contains', () => {
  it('finds primitives by strict equality', () => {
    expect(evaluateArrayContains(['a', 'b'], 'b')).toBe(true);
    expect(evaluateArrayContains([1, 2], 2)).toBe(true);
    expect(evaluateArrayContains([null], null)).toBe(true);
    expect(evaluateArrayContains([true], true)).toBe(true);
  });
  it('is exact: no case folding, no type coercion', () => {
    expect(evaluateArrayContains(['A'], 'a')).toBe(false);
    expect(evaluateArrayContains(['1'], 1)).toBe(false);
  });
  it('returns false for non-arrays, empty arrays, and non-primitive values or elements', () => {
    expect(evaluateArrayContains('ab', 'a')).toBe(false);
    expect(evaluateArrayContains(undefined, 'a')).toBe(false);
    expect(evaluateArrayContains([], 'a')).toBe(false);
    const o = { k: 1 };
    expect(evaluateArrayContains([o], o)).toBe(false);
    expect(evaluateArrayContains([['a']], 'a')).toBe(false);
  });
  it('DSL surface agrees with the standalone evaluator', () => {
    expect(evaluateConstraint({ xs: ['a', 'b'], v: 'a' }, 'array_contains(xs, v)')).toBe(true);
    expect(evaluateConstraint({ xs: ['a', 'b'], v: 'c' }, 'array_contains(xs, v)')).toBe(false);
    expect(evaluateConstraint({ xs: ['a'] }, "array_contains(xs, 'a')")).toBe(true);
  });
  it('property: agrees with Array.prototype.includes on string arrays', () => {
    fc.assert(
      fc.property(fc.array(fc.string({ maxLength: 3 })), fc.string({ maxLength: 3 }), (xs, v) => {
        expect(evaluateArrayContains(xs, v)).toBe(xs.includes(v));
        expect(evaluateConstraint({ xs, v }, 'array_contains(xs, v)')).toBe(xs.includes(v));
      }),
    );
  });
});

describe('array_values_distinct', () => {
  it('accepts distinct primitives and the empty array', () => {
    expect(evaluateArrayValuesDistinct([])).toBe(true);
    expect(evaluateArrayValuesDistinct(['a', 'b', 'c'])).toBe(true);
    expect(evaluateArrayValuesDistinct(['1', 1, true, null])).toBe(true);
  });
  it('rejects duplicates', () => {
    expect(evaluateArrayValuesDistinct(['a', 'b', 'a'])).toBe(false);
    expect(evaluateArrayValuesDistinct([null, null])).toBe(false);
  });
  it('fails closed on non-arrays and non-primitive elements', () => {
    expect(evaluateArrayValuesDistinct('abc')).toBe(false);
    expect(evaluateArrayValuesDistinct(null)).toBe(false);
    expect(evaluateArrayValuesDistinct([{}, {}])).toBe(false);
    expect(evaluateArrayValuesDistinct([['a']])).toBe(false);
  });
  it('property: agrees with set-size comparison on string arrays (DSL and standalone)', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('a', 'b', 'c', 'd'), { maxLength: 6 }), (xs) => {
        const want = new Set(xs).size === xs.length;
        expect(evaluateArrayValuesDistinct(xs)).toBe(want);
        expect(evaluateConstraint({ xs }, 'array_values_distinct(xs)')).toBe(want);
      }),
    );
  });
  it('property: permutation invariant', () => {
    fc.assert(
      fc.property(fc.array(fc.constantFrom('a', 'b', 'c'), { maxLength: 5 }), (xs) => {
        expect(evaluateArrayValuesDistinct([...xs].reverse())).toBe(evaluateArrayValuesDistinct(xs));
      }),
    );
  });
});

describe('registry', () => {
  it('both builtins are registered', () => {
    expect(EVALUATOR_BUILTINS).toContain('array_contains');
    expect(EVALUATOR_BUILTINS).toContain('array_values_distinct');
  });
});
