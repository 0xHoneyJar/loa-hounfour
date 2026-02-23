/**
 * Tests for EvaluationContext — deterministic constraint replay (v7.8.0, DR-F3).
 *
 * The core guarantee: when an EvaluationContext with evaluation_timestamp is
 * provided, now() returns the frozen timestamp instead of the real clock.
 * This enables audit trail reproducibility for time-dependent constraints.
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint, RESERVED_EVALUATOR_NAMES, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';
import type { EvaluationContext } from '../../src/constraints/evaluator.js';

// ---------------------------------------------------------------------------
// EvaluationContext — now() determinism
// ---------------------------------------------------------------------------

describe('EvaluationContext', () => {
  const frozenTimestamp = '2026-02-23T16:00:00.000Z';

  it('now() returns frozen timestamp when context provides evaluation_timestamp', () => {
    const ctx: EvaluationContext = { evaluation_timestamp: frozenTimestamp };
    const data = { expires_at: '2026-12-31T23:59:59Z' };
    // is_after(expires_at, now()) should be true: Dec 31 > Feb 23
    expect(evaluateConstraint(data, 'is_after(expires_at, now())', ctx)).toBe(true);
  });

  it('now() returns live clock when no context is provided', () => {
    const farFuture = '2099-12-31T23:59:59Z';
    const data = { expires_at: farFuture };
    // Without context, now() should return a real timestamp much earlier than 2099
    expect(evaluateConstraint(data, 'is_after(expires_at, now())')).toBe(true);
  });

  it('now() returns live clock when context has no evaluation_timestamp', () => {
    const ctx: EvaluationContext = {};
    const farFuture = '2099-12-31T23:59:59Z';
    const data = { expires_at: farFuture };
    expect(evaluateConstraint(data, 'is_after(expires_at, now())', ctx)).toBe(true);
  });

  it('now() ignores invalid ISO 8601 in evaluation_timestamp', () => {
    const ctx: EvaluationContext = { evaluation_timestamp: 'not-a-date' };
    const farFuture = '2099-12-31T23:59:59Z';
    const data = { expires_at: farFuture };
    // Invalid timestamp should fall through to live clock
    expect(evaluateConstraint(data, 'is_after(expires_at, now())', ctx)).toBe(true);
  });

  it('frozen timestamp propagates through .every() inner parser', () => {
    const ctx: EvaluationContext = { evaluation_timestamp: '2026-01-01T00:00:00Z' };
    const data = {
      events: [
        { occurred_at: '2026-06-01T00:00:00Z' },
        { occurred_at: '2026-12-01T00:00:00Z' },
      ],
    };
    // Every event occurred_at should be after the frozen now() (Jan 1)
    expect(evaluateConstraint(
      data,
      'events.every(e => is_after(e.occurred_at, now()))',
      ctx,
    )).toBe(true);
  });

  it('frozen timestamp causes correct failure in .every()', () => {
    const ctx: EvaluationContext = { evaluation_timestamp: '2027-01-01T00:00:00Z' };
    const data = {
      events: [
        { occurred_at: '2026-06-01T00:00:00Z' },
        { occurred_at: '2026-12-01T00:00:00Z' },
      ],
    };
    // Every event is BEFORE the frozen now() (Jan 2027), so is_after should be false
    expect(evaluateConstraint(
      data,
      'events.every(e => is_after(e.occurred_at, now()))',
      ctx,
    )).toBe(false);
  });

  it('same data + same context = same result (determinism guarantee)', () => {
    const ctx: EvaluationContext = { evaluation_timestamp: frozenTimestamp };
    const data = { deadline: '2026-03-01T00:00:00Z' };
    const expr = 'is_after(deadline, now())';
    const result1 = evaluateConstraint(data, expr, ctx);
    const result2 = evaluateConstraint(data, expr, ctx);
    const result3 = evaluateConstraint(data, expr, ctx);
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });
});

// ---------------------------------------------------------------------------
// RESERVED_EVALUATOR_NAMES — namespace collision protection (DR-F4)
// ---------------------------------------------------------------------------

describe('RESERVED_EVALUATOR_NAMES', () => {
  it('is a ReadonlySet', () => {
    expect(RESERVED_EVALUATOR_NAMES).toBeInstanceOf(Set);
  });

  it('contains all EVALUATOR_BUILTINS', () => {
    for (const builtin of EVALUATOR_BUILTINS) {
      expect(RESERVED_EVALUATOR_NAMES.has(builtin)).toBe(true);
    }
  });

  it('contains language keywords', () => {
    const keywords = ['true', 'false', 'null', 'undefined', 'every', 'length'];
    for (const kw of keywords) {
      expect(RESERVED_EVALUATOR_NAMES.has(kw)).toBe(true);
    }
  });

  it('size equals builtins + keywords', () => {
    const keywordCount = 6; // true, false, null, undefined, every, length
    expect(RESERVED_EVALUATOR_NAMES.size).toBe(EVALUATOR_BUILTINS.length + keywordCount);
  });

  it('does not contain arbitrary field names', () => {
    expect(RESERVED_EVALUATOR_NAMES.has('my_custom_field')).toBe(false);
    expect(RESERVED_EVALUATOR_NAMES.has('expires_at')).toBe(false);
    expect(RESERVED_EVALUATOR_NAMES.has('amount')).toBe(false);
  });
});
