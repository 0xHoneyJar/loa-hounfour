/**
 * Tests for conformance matching engine.
 *
 * Implements SDD §5.3 — field selection, deep equality, volatile fields,
 * numeric tolerance, canonicalization, null-vs-absent handling.
 *
 * Error contracts (IMP-004): Returns { matched: false, reason } for
 * unsupported JSON types. Never throws.
 */
import { describe, it, expect } from 'vitest';
import {
  matchConformanceOutput,
  type MatchResult,
} from '../../src/utilities/conformance-matcher.js';
import type { MatchingRules } from '../../src/schemas/model/conformance-vector.js';

// ---------------------------------------------------------------------------
// Basic matching
// ---------------------------------------------------------------------------

describe('matchConformanceOutput', () => {
  describe('basic matching', () => {
    it('matches identical objects', () => {
      const data = { a: 1, b: 'hello', c: true };
      const result = matchConformanceOutput(data, data);
      expect(result.matched).toBe(true);
    });

    it('matches equivalent objects', () => {
      const expected = { a: 1, b: 'hello' };
      const actual = { a: 1, b: 'hello' };
      expect(matchConformanceOutput(expected, actual).matched).toBe(true);
    });

    it('detects mismatched values', () => {
      const expected = { a: 1, b: 'hello' };
      const actual = { a: 1, b: 'world' };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
      expect(result.mismatches).toHaveLength(1);
      expect(result.mismatches![0].path).toBe('b');
    });

    it('detects missing fields in actual', () => {
      const expected = { a: 1, b: 'hello' };
      const actual = { a: 1 };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
    });

    it('detects extra fields in actual', () => {
      const expected = { a: 1 };
      const actual = { a: 1, b: 'extra' };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
    });

    it('matches empty objects', () => {
      expect(matchConformanceOutput({}, {}).matched).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Field selection
  // ---------------------------------------------------------------------------

  describe('field selection (select_fields)', () => {
    it('compares only selected fields', () => {
      const expected = { a: 1, b: 'hello', c: true };
      const actual = { a: 1, b: 'world', c: false };
      const rules: MatchingRules = { select_fields: ['a'] };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('fails if selected field mismatches', () => {
      const expected = { a: 1, b: 'hello' };
      const actual = { a: 2, b: 'hello' };
      const rules: MatchingRules = { select_fields: ['a'] };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(false);
    });

    it('ignores unselected fields', () => {
      const expected = { a: 1 };
      const actual = { a: 1, b: 'extra', c: 999 };
      const rules: MatchingRules = { select_fields: ['a'] };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Volatile fields
  // ---------------------------------------------------------------------------

  describe('volatile fields', () => {
    it('excludes volatile fields from comparison', () => {
      const expected = { a: 1, timestamp: '2024-01-01', request_id: 'abc' };
      const actual = { a: 1, timestamp: '2024-06-15', request_id: 'xyz' };
      const rules: MatchingRules = { volatile_fields: ['timestamp', 'request_id'] };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('still compares non-volatile fields', () => {
      const expected = { a: 1, b: 2, timestamp: 'old' };
      const actual = { a: 1, b: 999, timestamp: 'new' };
      const rules: MatchingRules = { volatile_fields: ['timestamp'] };
      const result = matchConformanceOutput(expected, actual, rules);
      expect(result.matched).toBe(false);
      expect(result.mismatches![0].path).toBe('b');
    });

    it('works with select_fields and volatile_fields together', () => {
      const expected = { a: 1, b: 2, c: 3 };
      const actual = { a: 1, b: 999, c: 3 };
      const rules: MatchingRules = { select_fields: ['a', 'b', 'c'], volatile_fields: ['b'] };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Numeric tolerance
  // ---------------------------------------------------------------------------

  describe('numeric tolerance', () => {
    it('matches numbers within tolerance', () => {
      const expected = { price: 1.0 };
      const actual = { price: 1.0001 };
      const rules: MatchingRules = { numeric_tolerance: 0.001 };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('fails for numbers exceeding tolerance', () => {
      const expected = { price: 1.0 };
      const actual = { price: 1.01 };
      const rules: MatchingRules = { numeric_tolerance: 0.001 };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(false);
    });

    it('exact tolerance boundary matches', () => {
      const expected = { v: 10 };
      const actual = { v: 10.5 };
      const rules: MatchingRules = { numeric_tolerance: 0.5 };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('without tolerance, requires exact match', () => {
      const expected = { v: 1.0 };
      const actual = { v: 1.0000000001 };
      expect(matchConformanceOutput(expected, actual).matched).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // String canonicalization
  // ---------------------------------------------------------------------------

  describe('string canonicalization', () => {
    it('matches case-insensitively when enabled', () => {
      const expected = { model: 'GPT-4' };
      const actual = { model: 'gpt-4' };
      const rules: MatchingRules = { canonicalize_strings: true };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('trims whitespace when canonicalized', () => {
      const expected = { content: 'hello world' };
      const actual = { content: '  hello world  ' };
      const rules: MatchingRules = { canonicalize_strings: true };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('case-sensitive without canonicalization', () => {
      const expected = { model: 'GPT-4' };
      const actual = { model: 'gpt-4' };
      expect(matchConformanceOutput(expected, actual).matched).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // null-vs-absent handling
  // ---------------------------------------------------------------------------

  describe('null-vs-absent handling', () => {
    it('treats null and undefined as equivalent by default', () => {
      const expected = { a: 1, b: null };
      const actual = { a: 1 }; // b is absent
      expect(matchConformanceOutput(expected, actual).matched).toBe(true);
    });

    it('treats absent and null as equivalent by default (reverse)', () => {
      const expected = { a: 1 };
      const actual = { a: 1, b: null }; // b is null
      expect(matchConformanceOutput(expected, actual).matched).toBe(true);
    });

    it('strict mode: null !== absent', () => {
      const expected = { a: 1, b: null };
      const actual = { a: 1 };
      const rules: MatchingRules = { null_handling: 'strict' };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(false);
    });

    it('strict mode: absent !== null', () => {
      const expected = { a: 1 };
      const actual = { a: 1, b: null };
      const rules: MatchingRules = { null_handling: 'strict' };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(false);
    });

    it('equivalent mode: null == absent', () => {
      const expected = { a: 1, b: null };
      const actual = { a: 1 };
      const rules: MatchingRules = { null_handling: 'equivalent' };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Deep equality — nested objects and arrays
  // ---------------------------------------------------------------------------

  describe('deep equality', () => {
    it('matches nested objects', () => {
      const expected = { outer: { inner: { value: 42 } } };
      const actual = { outer: { inner: { value: 42 } } };
      expect(matchConformanceOutput(expected, actual).matched).toBe(true);
    });

    it('detects nested object mismatch', () => {
      const expected = { outer: { inner: { value: 42 } } };
      const actual = { outer: { inner: { value: 99 } } };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
      expect(result.mismatches![0].path).toBe('outer');
    });

    it('matches arrays', () => {
      const expected = { items: [1, 2, 3] };
      const actual = { items: [1, 2, 3] };
      expect(matchConformanceOutput(expected, actual).matched).toBe(true);
    });

    it('detects array length mismatch', () => {
      const expected = { items: [1, 2, 3] };
      const actual = { items: [1, 2] };
      expect(matchConformanceOutput(expected, actual).matched).toBe(false);
    });

    it('detects array element mismatch', () => {
      const expected = { items: [1, 2, 3] };
      const actual = { items: [1, 99, 3] };
      expect(matchConformanceOutput(expected, actual).matched).toBe(false);
    });

    it('matches arrays of objects', () => {
      const expected = { tools: [{ name: 'a', args: {} }, { name: 'b', args: { x: 1 } }] };
      const actual = { tools: [{ name: 'a', args: {} }, { name: 'b', args: { x: 1 } }] };
      expect(matchConformanceOutput(expected, actual).matched).toBe(true);
    });

    it('applies numeric tolerance in nested values', () => {
      const expected = { data: { price: 1.0 } };
      const actual = { data: { price: 1.0005 } };
      const rules: MatchingRules = { numeric_tolerance: 0.001 };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });

    it('applies string canonicalization in nested values', () => {
      const expected = { data: { model: 'GPT-4' } };
      const actual = { data: { model: 'gpt-4' } };
      const rules: MatchingRules = { canonicalize_strings: true };
      expect(matchConformanceOutput(expected, actual, rules).matched).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Error contracts (IMP-004) — never throws
  // ---------------------------------------------------------------------------

  describe('error contracts', () => {
    it('returns false for NaN values', () => {
      const expected = { v: NaN };
      const actual = { v: NaN };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
    });

    it('returns false for Infinity values', () => {
      const expected = { v: Infinity };
      const actual = { v: Infinity };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
    });

    it('returns false for -Infinity values', () => {
      const expected = { v: -Infinity };
      const actual = { v: -Infinity };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
    });

    it('returns MatchResult with reason for type mismatches', () => {
      const expected = { v: 'string' };
      const actual = { v: 42 };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
      expect(result.reason).toBeDefined();
      expect(result.mismatches).toBeDefined();
    });

    it('reports multiple mismatches', () => {
      const expected = { a: 1, b: 'x', c: true };
      const actual = { a: 2, b: 'y', c: false };
      const result = matchConformanceOutput(expected, actual);
      expect(result.matched).toBe(false);
      expect(result.mismatches).toHaveLength(3);
      expect(result.reason).toContain('3 field(s)');
    });

    it('never throws on bizarre input', () => {
      // Test with various edge cases — should always return a MatchResult
      const cases: Array<[Record<string, unknown>, Record<string, unknown>]> = [
        [{ a: undefined }, { a: null }],
        [{ a: [] }, { a: {} }],
        [{ a: '' }, { a: 0 }],
        [{ a: false }, { a: '' }],
      ];
      for (const [exp, act] of cases) {
        const result = matchConformanceOutput(exp, act);
        expect(result).toBeDefined();
        expect(typeof result.matched).toBe('boolean');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Mismatch reporting
  // ---------------------------------------------------------------------------

  describe('mismatch reporting', () => {
    it('provides path, expected, and actual for each mismatch', () => {
      const expected = { a: 1, b: 'hello' };
      const actual = { a: 2, b: 'world' };
      const result = matchConformanceOutput(expected, actual);
      expect(result.mismatches).toBeDefined();
      expect(result.mismatches).toHaveLength(2);
      for (const m of result.mismatches!) {
        expect(m).toHaveProperty('path');
        expect(m).toHaveProperty('expected');
        expect(m).toHaveProperty('actual');
      }
    });

    it('reason includes field names', () => {
      const expected = { model_id: 'a', content: 'b' };
      const actual = { model_id: 'x', content: 'y' };
      const result = matchConformanceOutput(expected, actual);
      expect(result.reason).toContain('model_id');
      expect(result.reason).toContain('content');
    });
  });
});
