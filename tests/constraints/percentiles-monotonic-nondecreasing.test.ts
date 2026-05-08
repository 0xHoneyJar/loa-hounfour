/**
 * PR-A3.5 (FR-B7) — Tests for `percentiles_monotonic_nondecreasing`
 * LOCAL builtin.
 *
 * @see src/constraints/builtins/percentiles-monotonic-nondecreasing.ts
 */
import { describe, it, expect } from 'vitest';
import {
  evaluatePercentilesMonotonicNondecreasing,
} from '../../src/constraints/builtins/percentiles-monotonic-nondecreasing.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('evaluatePercentilesMonotonicNondecreasing (standalone)', () => {
  describe('Happy path', () => {
    it('strict ascending percentiles pass', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 10,
        p95_ms: 50,
        p99_ms: 100,
        max_ms: 200,
      });
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });

    it('all-equal percentiles pass (≤ allows equality)', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 5,
        p95_ms: 5,
        p99_ms: 5,
        max_ms: 5,
      });
      expect(result.valid).toBe(true);
    });

    it('zero-latency pass', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        max_ms: 0,
      });
      expect(result.valid).toBe(true);
    });

    it('fractional percentiles pass', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 1.5,
        p95_ms: 2.5,
        p99_ms: 3.5,
        max_ms: 4.5,
      });
      expect(result.valid).toBe(true);
    });
  });

  describe('PERCENTILES_MONOTONIC_VIOLATION (reports first violating pair)', () => {
    it('p50 > p95 → fires at p95_ms < p50_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 100,
        p95_ms: 50,
        p99_ms: 100,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_VIOLATION');
      expect(result.diagnostic?.violation_pair).toBe('p95_ms < p50_ms');
      expect(result.diagnostic?.values?.lower_field).toBe('p50_ms');
      expect(result.diagnostic?.values?.upper_field).toBe('p95_ms');
    });

    it('p95 > p99 → fires at p99_ms < p95_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 10,
        p95_ms: 100,
        p99_ms: 50,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_VIOLATION');
      expect(result.diagnostic?.violation_pair).toBe('p99_ms < p95_ms');
    });

    it('p99 > max → fires at max_ms < p99_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 10,
        p95_ms: 50,
        p99_ms: 200,
        max_ms: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_VIOLATION');
      expect(result.diagnostic?.violation_pair).toBe('max_ms < p99_ms');
    });

    it('multiple violations report only the FIRST', () => {
      // p50 > p95 AND p99 > max — first violation (p50 > p95) wins.
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 100,
        p95_ms: 50,
        p99_ms: 200,
        max_ms: 100,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.violation_pair).toBe('p95_ms < p50_ms');
    });
  });

  describe('PERCENTILES_MONOTONIC_INVALID_INPUT', () => {
    it('rejects null', () => {
      const result = evaluatePercentilesMonotonicNondecreasing(null);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    it('rejects array', () => {
      const result = evaluatePercentilesMonotonicNondecreasing([10, 50, 100, 200]);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    it('rejects missing p50_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p95_ms: 50,
        p99_ms: 100,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    it('rejects NaN p95_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 10,
        p95_ms: NaN,
        p99_ms: 100,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    it('rejects Infinity', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 10,
        p95_ms: 50,
        p99_ms: Infinity,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    it('rejects non-number string field', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: '10',
        p95_ms: 50,
        p99_ms: 100,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    // PR-A3.5 iter-1 F-003: latencies are non-negative by definition.
    it('rejects negative p50_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: -1,
        p95_ms: 50,
        p99_ms: 100,
        max_ms: 200,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
      expect(result.diagnostic?.message).toContain('≥ 0');
    });

    it('rejects negative max_ms', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: 0,
        p95_ms: 0,
        p99_ms: 0,
        max_ms: -0.001,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });

    it('rejects all-negative percentiles', () => {
      const result = evaluatePercentilesMonotonicNondecreasing({
        p50_ms: -5,
        p95_ms: -4,
        p99_ms: -3,
        max_ms: -2,
      });
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('PERCENTILES_MONOTONIC_INVALID_INPUT');
    });
  });
});

describe('percentiles_monotonic_nondecreasing (constraint-DSL wrapper)', () => {
  it('returns true for ascending percentiles', () => {
    const data = { measurements: { p50_ms: 10, p95_ms: 50, p99_ms: 100, max_ms: 200 } };
    expect(evaluateConstraint(data, 'percentiles_monotonic_nondecreasing(measurements)')).toBe(true);
  });

  it('returns false for violating percentiles', () => {
    const data = { measurements: { p50_ms: 100, p95_ms: 50, p99_ms: 100, max_ms: 200 } };
    expect(evaluateConstraint(data, 'percentiles_monotonic_nondecreasing(measurements)')).toBe(false);
  });
});
