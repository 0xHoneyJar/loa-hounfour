/**
 * Tests for temporal governance builtins: is_stale and is_within.
 *
 * @see v7.5.0 — Deep Bridgebuilder Review GAP finding
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('is_stale builtin', () => {
  it('returns true when elapsed exceeds max_age', () => {
    // 24 hours elapsed, max_age = 1 hour
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_stale(ts, 3600, ref)')).toBe(true);
  });

  it('returns false when within max_age', () => {
    // 30 minutes elapsed, max_age = 1 hour
    const data = {
      ts: '2026-01-01T23:30:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_stale(ts, 3600, ref)')).toBe(false);
  });

  it('returns false at exactly max_age (strict >)', () => {
    // Exactly 1 hour elapsed, max_age = 1 hour → not stale
    const data = {
      ts: '2026-01-01T23:00:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_stale(ts, 3600, ref)')).toBe(false);
  });

  it('returns false for invalid timestamp', () => {
    const data = {
      ts: 'not-a-date',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_stale(ts, 3600, ref)')).toBe(false);
  });

  it('returns false for invalid reference timestamp', () => {
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: 'bad',
    };
    expect(evaluateConstraint(data, 'is_stale(ts, 3600, ref)')).toBe(false);
  });

  it('returns false for negative max_age', () => {
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: '2026-01-02T00:00:00Z',
      neg: -1,
    };
    expect(evaluateConstraint(data, 'is_stale(ts, neg, ref)')).toBe(false);
  });

  it('is the complement of is_within', () => {
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    const stale = evaluateConstraint(data, 'is_stale(ts, 3600, ref)');
    const within = evaluateConstraint(data, 'is_within(ts, 3600, ref)');
    expect(stale).not.toBe(within);
  });

  it('handles zero max_age — only zero elapsed is not stale', () => {
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: '2026-01-01T00:00:00Z',
    };
    // 0 elapsed, max_age = 0 → 0 > 0 is false → not stale
    expect(evaluateConstraint(data, 'is_stale(ts, 0, ref)')).toBe(false);
  });
});

describe('is_within builtin', () => {
  it('returns true when within max_age', () => {
    const data = {
      ts: '2026-01-01T23:30:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_within(ts, 3600, ref)')).toBe(true);
  });

  it('returns false when elapsed exceeds max_age', () => {
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_within(ts, 3600, ref)')).toBe(false);
  });

  it('returns true at exactly max_age (inclusive <=)', () => {
    const data = {
      ts: '2026-01-01T23:00:00Z',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_within(ts, 3600, ref)')).toBe(true);
  });

  it('returns false for invalid timestamp', () => {
    const data = {
      ts: 'invalid',
      ref: '2026-01-02T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_within(ts, 3600, ref)')).toBe(false);
  });

  it('returns false for negative max_age', () => {
    const data = {
      ts: '2026-01-01T00:00:00Z',
      ref: '2026-01-02T00:00:00Z',
      neg: -100,
    };
    expect(evaluateConstraint(data, 'is_within(ts, neg, ref)')).toBe(false);
  });
});

describe('temporal governance integration', () => {
  it('reputation staleness: 45 days elapsed with 30-day half-life max_age', () => {
    // A reputation aggregate was last updated 45 days ago.
    // With a 30-day half-life, the max acceptable age is 2,592,000 seconds (30 days).
    const data = {
      last_updated: '2026-01-01T00:00:00Z',
      reference_time: '2026-02-15T00:00:00Z', // ~45 days later
    };
    // 30 days = 2_592_000 seconds
    expect(evaluateConstraint(data, 'is_stale(last_updated, 2592000, reference_time)')).toBe(true);
    expect(evaluateConstraint(data, 'is_within(last_updated, 2592000, reference_time)')).toBe(false);
  });

  it('reputation freshness: 10 days elapsed with 30-day max_age', () => {
    const data = {
      last_updated: '2026-02-10T00:00:00Z',
      reference_time: '2026-02-20T00:00:00Z',
    };
    expect(evaluateConstraint(data, 'is_stale(last_updated, 2592000, reference_time)')).toBe(false);
    expect(evaluateConstraint(data, 'is_within(last_updated, 2592000, reference_time)')).toBe(true);
  });

  it('can be used in implication constraints', () => {
    // Pattern: "if reputation is stale, score should be discounted"
    const data = {
      last_updated: '2026-01-01T00:00:00Z',
      reference_time: '2026-02-15T00:00:00Z',
      discounted: true,
    };
    expect(evaluateConstraint(data, 'is_stale(last_updated, 2592000, reference_time) => discounted == true')).toBe(true);
  });
});
