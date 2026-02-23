/**
 * Tests for timestamp comparison evaluator builtins (v7.4.0 — Bridgebuilder Vision).
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// ---------------------------------------------------------------------------
// is_after
// ---------------------------------------------------------------------------

describe('is_after builtin', () => {
  it('returns true when first date is after second', () => {
    expect(evaluateConstraint(
      { a: '2026-06-01T00:00:00Z', b: '2026-02-01T00:00:00Z' },
      'is_after(a, b)',
    )).toBe(true);
  });

  it('returns false when first date is before second', () => {
    expect(evaluateConstraint(
      { a: '2026-02-01T00:00:00Z', b: '2026-06-01T00:00:00Z' },
      'is_after(a, b)',
    )).toBe(false);
  });

  it('returns false when dates are equal', () => {
    expect(evaluateConstraint(
      { a: '2026-06-01T00:00:00Z', b: '2026-06-01T00:00:00Z' },
      'is_after(a, b)',
    )).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(evaluateConstraint(
      { a: 'not-a-date', b: '2026-06-01T00:00:00Z' },
      'is_after(a, b)',
    )).toBe(false);
  });

  it('returns false for non-ISO-8601 date formats (cross-language safety)', () => {
    // These formats parse in JS but would fail in Go/Python/Rust
    expect(evaluateConstraint(
      { a: 'June 1, 2026', b: '2026-02-01T00:00:00Z' },
      'is_after(a, b)',
    )).toBe(false);

    expect(evaluateConstraint(
      { a: '2026/06/01', b: '2026-02-01T00:00:00Z' },
      'is_after(a, b)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// is_before
// ---------------------------------------------------------------------------

describe('is_before builtin', () => {
  it('returns true when first date is before second', () => {
    expect(evaluateConstraint(
      { a: '2026-02-01T00:00:00Z', b: '2026-06-01T00:00:00Z' },
      'is_before(a, b)',
    )).toBe(true);
  });

  it('returns false when first date is after second', () => {
    expect(evaluateConstraint(
      { a: '2026-06-01T00:00:00Z', b: '2026-02-01T00:00:00Z' },
      'is_before(a, b)',
    )).toBe(false);
  });

  it('returns false when dates are equal', () => {
    expect(evaluateConstraint(
      { a: '2026-06-01T00:00:00Z', b: '2026-06-01T00:00:00Z' },
      'is_before(a, b)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// is_between
// ---------------------------------------------------------------------------

describe('is_between builtin', () => {
  it('returns true when value is between lower and upper', () => {
    expect(evaluateConstraint(
      { d: '2026-03-15T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(true);
  });

  it('returns true at lower boundary (inclusive)', () => {
    expect(evaluateConstraint(
      { d: '2026-01-01T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(true);
  });

  it('returns true at upper boundary (inclusive)', () => {
    expect(evaluateConstraint(
      { d: '2026-12-31T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(true);
  });

  it('returns false when value is before lower bound', () => {
    expect(evaluateConstraint(
      { d: '2025-12-31T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(false);
  });

  it('returns false when value is after upper bound', () => {
    expect(evaluateConstraint(
      { d: '2027-01-01T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(false);
  });

  it('returns false for invalid dates', () => {
    expect(evaluateConstraint(
      { d: 'invalid', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(false);
  });

  it('returns false for non-ISO-8601 date formats (cross-language safety)', () => {
    expect(evaluateConstraint(
      { d: 'March 15, 2026', lo: '2026-01-01T00:00:00Z', hi: '2026-12-31T00:00:00Z' },
      'is_between(d, lo, hi)',
    )).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Integration: credential expiry constraint
// ---------------------------------------------------------------------------

describe('credential expiry constraint (is_after integration)', () => {
  const expression = "expires_at == undefined || is_after(expires_at, issued_at)";

  it('passes when expires_at is after issued_at', () => {
    expect(evaluateConstraint(
      { issued_at: '2026-01-01T00:00:00Z', expires_at: '2026-06-01T00:00:00Z' },
      expression,
    )).toBe(true);
  });

  it('fails when expires_at is before issued_at', () => {
    expect(evaluateConstraint(
      { issued_at: '2026-06-01T00:00:00Z', expires_at: '2026-02-01T00:00:00Z' },
      expression,
    )).toBe(false);
  });

  it('passes when expires_at is undefined', () => {
    expect(evaluateConstraint(
      { issued_at: '2026-01-01T00:00:00Z' },
      expression,
    )).toBe(true);
  });
});
