/**
 * Tests for evaluateEconomicBoundary() and parseMicroUsd() — the decision engine.
 *
 * @see FR-1 v7.9.0 — evaluateEconomicBoundary()
 * @see FR-3a v7.9.0 — parseMicroUsd()
 * @since v7.9.0
 */
import { describe, it, expect } from 'vitest';
import {
  parseMicroUsd,
  evaluateEconomicBoundary,
} from '../../src/utilities/economic-boundary.js';
import type {
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  QualificationCriteria,
} from '../../src/economy/economic-boundary.js';

// ---------------------------------------------------------------------------
// Factory helpers
// ---------------------------------------------------------------------------

function makeTrustSnapshot(overrides: Partial<TrustLayerSnapshot> = {}): TrustLayerSnapshot {
  return {
    reputation_state: 'established',
    blended_score: 0.82,
    snapshot_at: '2026-02-23T10:00:00Z',
    ...overrides,
  };
}

function makeCapitalSnapshot(overrides: Partial<CapitalLayerSnapshot> = {}): CapitalLayerSnapshot {
  return {
    budget_remaining: '50000000',
    billing_tier: 'standard',
    budget_period_end: '2026-03-01T00:00:00Z',
    ...overrides,
  };
}

function makeCriteria(overrides: Partial<QualificationCriteria> = {}): QualificationCriteria {
  return {
    min_trust_score: 0.5,
    min_reputation_state: 'warming',
    min_available_budget: '10000000',
    ...overrides,
  };
}

const EVALUATED_AT = '2026-02-23T10:00:01Z';

// ---------------------------------------------------------------------------
// parseMicroUsd
// ---------------------------------------------------------------------------

describe('parseMicroUsd', () => {
  it('parses "0" as valid', () => {
    const result = parseMicroUsd('0');
    expect(result).toEqual({ valid: true, amount: 0n });
  });

  it('parses positive integers', () => {
    const result = parseMicroUsd('50000000');
    expect(result).toEqual({ valid: true, amount: 50000000n });
  });

  it('rejects empty string', () => {
    const result = parseMicroUsd('');
    expect(result.valid).toBe(false);
  });

  it('rejects leading zeros ("007")', () => {
    const result = parseMicroUsd('007');
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('leading zeros');
    }
  });

  it('rejects negative values', () => {
    const result = parseMicroUsd('-1');
    expect(result.valid).toBe(false);
  });

  it('rejects hex values', () => {
    const result = parseMicroUsd('0xFF');
    expect(result.valid).toBe(false);
  });

  it('rejects floating point', () => {
    const result = parseMicroUsd('123.45');
    expect(result.valid).toBe(false);
  });

  it('rejects whitespace', () => {
    const result = parseMicroUsd(' 123 ');
    expect(result.valid).toBe(false);
  });

  it('handles values > Number.MAX_SAFE_INTEGER', () => {
    const result = parseMicroUsd('9007199254740993'); // 2^53 + 1
    expect(result).toEqual({ valid: true, amount: 9007199254740993n });
  });

  it('handles very large values (30 digits)', () => {
    const thirtyDigits = '123456789012345678901234567890';
    const result = parseMicroUsd(thirtyDigits);
    expect(result.valid).toBe(true);
  });

  it('rejects values exceeding 30 digits', () => {
    const thirtyOneDigits = '1234567890123456789012345678901';
    const result = parseMicroUsd(thirtyOneDigits);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.reason).toContain('30 digit limit');
    }
  });
});

// ---------------------------------------------------------------------------
// evaluateEconomicBoundary
// ---------------------------------------------------------------------------

describe('evaluateEconomicBoundary', () => {
  it('grants when both trust and capital pass', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(true);
    expect(result.trust_evaluation.passed).toBe(true);
    expect(result.capital_evaluation.passed).toBe(true);
    expect(result.access_decision.denial_reason).toBeUndefined();
  });

  it('denies when trust score fails', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.3 }),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false);
    expect(result.capital_evaluation.passed).toBe(true);
    expect(result.access_decision.denial_reason).toContain('trust score');
  });

  it('denies when trust state fails', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'cold' }),
      makeCapitalSnapshot(),
      makeCriteria({ min_reputation_state: 'established' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false);
    expect(result.access_decision.denial_reason).toContain("reputation state 'cold'");
  });

  it('denies when capital fails', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot({ budget_remaining: '5000000' }),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(true);
    expect(result.capital_evaluation.passed).toBe(false);
    expect(result.access_decision.denial_reason).toContain('budget');
  });

  it('denies when both fail', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.1, reputation_state: 'cold' }),
      makeCapitalSnapshot({ budget_remaining: '1000' }),
      makeCriteria({ min_reputation_state: 'established' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false);
    expect(result.capital_evaluation.passed).toBe(false);
  });

  it('grants at exact threshold', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.5, reputation_state: 'warming' }),
      makeCapitalSnapshot({ budget_remaining: '10000000' }),
      makeCriteria({ min_trust_score: 0.5, min_reputation_state: 'warming', min_available_budget: '10000000' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(true);
  });

  it('includes denial_reason when denied', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.3 }),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.access_decision.denial_reason).toBeDefined();
    expect(result.access_decision.denial_reason!.length).toBeGreaterThan(0);
  });

  it('matches provenance from snapshots', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.trust_evaluation.actual_score).toBe(0.82);
    expect(result.trust_evaluation.required_score).toBe(0.5);
    expect(result.capital_evaluation.actual_budget).toBe('50000000');
    expect(result.capital_evaluation.required_budget).toBe('10000000');
    expect(result.criteria_used).toEqual(makeCriteria());
    expect(result.evaluated_at).toBe(EVALUATED_AT);
  });

  it('is deterministic (same inputs → same output)', () => {
    const trust = makeTrustSnapshot();
    const capital = makeCapitalSnapshot();
    const criteria = makeCriteria();
    const r1 = evaluateEconomicBoundary(trust, capital, criteria, EVALUATED_AT);
    const r2 = evaluateEconomicBoundary(trust, capital, criteria, EVALUATED_AT);
    expect(r1).toEqual(r2);
  });

  it('returns denied for unknown reputation state (fail-closed)', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'legendary' as any }),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.access_decision.denial_reason).toContain('unknown reputation state');
  });

  it('returns denied for invalid budget format (fail-closed)', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot({ budget_remaining: '007' }),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.access_decision.denial_reason).toContain('invalid budget format');
  });

  it('handles BigInt comparison for large budgets', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'authoritative', blended_score: 0.95 }),
      makeCapitalSnapshot({ budget_remaining: '99999999999999999999' }),
      makeCriteria({ min_available_budget: '9007199254740993' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(true);
    expect(result.capital_evaluation.passed).toBe(true);
  });
});
