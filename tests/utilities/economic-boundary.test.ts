/**
 * Tests for evaluateEconomicBoundary(), evaluateFromBoundary(), and parseMicroUsd().
 *
 * @see FR-1 v7.9.0 — evaluateEconomicBoundary()
 * @see FR-3a v7.9.0 — parseMicroUsd()
 * @see F1-F5, Q1, Q4 v7.9.1 — Deep review improvements
 * @since v7.9.0
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  parseMicroUsd,
  evaluateEconomicBoundary,
  evaluateFromBoundary,
} from '../../src/utilities/economic-boundary.js';
import {
  DenialCodeSchema,
  EvaluationGapSchema,
  EconomicBoundaryEvaluationEventSchema,
  EconomicBoundaryEvaluationResultSchema,
} from '../../src/economy/economic-boundary.js';
import type {
  TrustLayerSnapshot,
  CapitalLayerSnapshot,
  QualificationCriteria,
  EconomicBoundary,
} from '../../src/economy/economic-boundary.js';
import { isKnownReputationState } from '../../src/vocabulary/reputation.js';
// Side-effect import: registers date-time, uuid, uri format validators for Value.Check
import '../../src/validators/index.js';

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

  // v7.9.1 — F3: boundary_id passthrough
  it('includes boundary_id when provided', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(result.boundary_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('omits boundary_id when not provided', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.boundary_id).toBeUndefined();
  });

  // v7.9.1 — F4: denial_codes
  it('includes denial_codes on denied results', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.3 }),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.denial_codes).toBeDefined();
    expect(result.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
  });

  it('includes multiple denial_codes when multiple criteria fail', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.1, reputation_state: 'cold' }),
      makeCapitalSnapshot({ budget_remaining: '1000' }),
      makeCriteria({ min_reputation_state: 'established' }),
      EVALUATED_AT,
    );
    expect(result.denial_codes).toContain('TRUST_SCORE_BELOW_THRESHOLD');
    expect(result.denial_codes).toContain('TRUST_STATE_BELOW_THRESHOLD');
    expect(result.denial_codes).toContain('CAPITAL_BELOW_THRESHOLD');
    expect(result.denial_codes!.length).toBe(3);
  });

  it('omits denial_codes on granted results', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.denial_codes).toBeUndefined();
  });

  it('uses UNKNOWN_REPUTATION_STATE code for unknown states', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'legendary' as any }),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.denial_codes).toEqual(['UNKNOWN_REPUTATION_STATE']);
  });

  it('uses INVALID_BUDGET_FORMAT code for invalid budgets', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot({ budget_remaining: 'abc' }),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.denial_codes).toEqual(['INVALID_BUDGET_FORMAT']);
  });

  // v7.9.1 — Q4: evaluation_gap
  it('includes evaluation_gap with score gap on denied results', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.3 }),
      makeCapitalSnapshot(),
      makeCriteria({ min_trust_score: 0.7 }),
      EVALUATED_AT,
    );
    expect(result.evaluation_gap).toBeDefined();
    expect(result.evaluation_gap!.trust_score_gap).toBeCloseTo(0.4, 10);
  });

  it('includes evaluation_gap with state gap', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'warming' }),
      makeCapitalSnapshot(),
      makeCriteria({ min_reputation_state: 'authoritative' }),
      EVALUATED_AT,
    );
    expect(result.evaluation_gap).toBeDefined();
    expect(result.evaluation_gap!.reputation_state_gap).toBe(2); // warming(1) to authoritative(3)
  });

  it('includes evaluation_gap with budget gap', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot({ budget_remaining: '3000000' }),
      makeCriteria({ min_available_budget: '10000000' }),
      EVALUATED_AT,
    );
    expect(result.evaluation_gap).toBeDefined();
    expect(result.evaluation_gap!.budget_gap).toBe('7000000');
  });

  it('omits evaluation_gap on granted results', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    expect(result.evaluation_gap).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// isKnownReputationState — v7.9.1 F1
// ---------------------------------------------------------------------------

describe('isKnownReputationState', () => {
  it('returns true for all 4 valid states', () => {
    expect(isKnownReputationState('cold')).toBe(true);
    expect(isKnownReputationState('warming')).toBe(true);
    expect(isKnownReputationState('established')).toBe(true);
    expect(isKnownReputationState('authoritative')).toBe(true);
  });

  it('returns false for unknown strings', () => {
    expect(isKnownReputationState('legendary')).toBe(false);
    expect(isKnownReputationState('')).toBe(false);
    expect(isKnownReputationState('COLD')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// evaluateFromBoundary — v7.9.1 F2
// ---------------------------------------------------------------------------

describe('evaluateFromBoundary', () => {
  function makeBoundary(overrides: Partial<EconomicBoundary> = {}): EconomicBoundary {
    return {
      boundary_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      personality_id: 'agent-alice',
      collection_id: 'community-dao',
      trust_layer: makeTrustSnapshot(),
      capital_layer: makeCapitalSnapshot(),
      access_decision: { granted: true },
      evaluated_at: EVALUATED_AT,
      contract_version: '7.9.1',
      qualification_criteria: makeCriteria(),
      ...overrides,
    };
  }

  it('evaluates using boundary criteria when present', () => {
    const result = evaluateFromBoundary(makeBoundary(), EVALUATED_AT);
    expect(result.access_decision.granted).toBe(true);
    expect(result.boundary_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('returns denied when qualification_criteria is absent', () => {
    const boundary = makeBoundary();
    delete (boundary as any).qualification_criteria;
    const result = evaluateFromBoundary(boundary, EVALUATED_AT);
    expect(result.access_decision.granted).toBe(false);
    expect(result.access_decision.denial_reason).toBe('no qualification criteria on boundary');
    expect(result.denial_codes).toEqual(['MISSING_QUALIFICATION_CRITERIA']);
  });

  it('passes boundary_id through to result', () => {
    const result = evaluateFromBoundary(makeBoundary(), EVALUATED_AT);
    expect(result.boundary_id).toBe('a1b2c3d4-e5f6-7890-abcd-ef1234567890');
  });

  it('is total (never throws)', () => {
    // Even with missing criteria, returns denied
    const boundary = makeBoundary();
    delete (boundary as any).qualification_criteria;
    expect(() => evaluateFromBoundary(boundary, EVALUATED_AT)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// New schema validation — v7.9.1
// ---------------------------------------------------------------------------

describe('v7.9.1 schemas', () => {
  it('DenialCodeSchema has $id', () => {
    expect(DenialCodeSchema.$id).toBe('DenialCode');
  });

  it('DenialCodeSchema accepts valid codes', () => {
    expect(Value.Check(DenialCodeSchema, 'TRUST_SCORE_BELOW_THRESHOLD')).toBe(true);
    expect(Value.Check(DenialCodeSchema, 'CAPITAL_BELOW_THRESHOLD')).toBe(true);
    expect(Value.Check(DenialCodeSchema, 'UNKNOWN_REPUTATION_STATE')).toBe(true);
    expect(Value.Check(DenialCodeSchema, 'INVALID_BUDGET_FORMAT')).toBe(true);
    expect(Value.Check(DenialCodeSchema, 'MISSING_QUALIFICATION_CRITERIA')).toBe(true);
  });

  it('DenialCodeSchema rejects invalid codes', () => {
    expect(Value.Check(DenialCodeSchema, 'NOT_A_CODE')).toBe(false);
  });

  it('EvaluationGapSchema has $id', () => {
    expect(EvaluationGapSchema.$id).toBe('EvaluationGap');
  });

  it('EvaluationGapSchema accepts valid gap', () => {
    expect(Value.Check(EvaluationGapSchema, {
      trust_score_gap: 0.4,
      reputation_state_gap: 2,
      budget_gap: '5000000',
    })).toBe(true);
  });

  it('EvaluationGapSchema accepts partial gap', () => {
    expect(Value.Check(EvaluationGapSchema, { trust_score_gap: 0.2 })).toBe(true);
    expect(Value.Check(EvaluationGapSchema, {})).toBe(true);
  });

  it('EconomicBoundaryEvaluationEventSchema has $id', () => {
    expect(EconomicBoundaryEvaluationEventSchema.$id).toBe('EconomicBoundaryEvaluationEvent');
  });

  it('EconomicBoundaryEvaluationEventSchema accepts valid event', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot(),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
    );
    const event = {
      event_type: 'economic_boundary_evaluation',
      boundary_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      personality_id: 'agent-alice',
      collection_id: 'community-dao',
      evaluation_result: result,
      occurred_at: EVALUATED_AT,
      contract_version: '7.9.1',
    };
    expect(Value.Check(EconomicBoundaryEvaluationEventSchema, event)).toBe(true);
  });

  it('EconomicBoundaryEvaluationResultSchema accepts results with new optional fields', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.3 }),
      makeCapitalSnapshot({ budget_remaining: '5000000' }),
      makeCriteria({ min_trust_score: 0.7 }),
      EVALUATED_AT,
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(Value.Check(EconomicBoundaryEvaluationResultSchema, result)).toBe(true);
    expect(result.boundary_id).toBeDefined();
    expect(result.denial_codes).toBeDefined();
    expect(result.evaluation_gap).toBeDefined();
  });
});

// ---------------------------------------------------------------------------
// Partial evaluation symmetry — v7.9.1 Part 9.2 F2
// ---------------------------------------------------------------------------

describe('makeDenied symmetry fix (Part 9.2)', () => {
  it('unknown reputation state: capital still evaluated accurately', () => {
    // Trust input is invalid (unknown state), but capital is valid (50M >= 10M)
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'legendary' as any }),
      makeCapitalSnapshot({ budget_remaining: '50000000' }),
      makeCriteria({ min_available_budget: '10000000' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false); // invalid input
    expect(result.capital_evaluation.passed).toBe(true); // capital passes: 50M >= 10M
    expect(result.denial_codes).toEqual(['UNKNOWN_REPUTATION_STATE']);
  });

  it('unknown reputation state + insufficient capital: both false', () => {
    // Trust input is invalid AND capital would fail
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'legendary' as any }),
      makeCapitalSnapshot({ budget_remaining: '1000' }),
      makeCriteria({ min_available_budget: '10000000' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false);
    expect(result.capital_evaluation.passed).toBe(false); // capital actually fails: 1K < 10M
    expect(result.denial_codes).toEqual(['UNKNOWN_REPUTATION_STATE']);
  });

  it('invalid budget format: trust still evaluated accurately', () => {
    // Capital input is invalid (leading zeros), but trust is valid (0.82 >= 0.5, established >= warming)
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.82, reputation_state: 'established' }),
      makeCapitalSnapshot({ budget_remaining: '007' }),
      makeCriteria({ min_trust_score: 0.5, min_reputation_state: 'warming' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(true); // trust passes: 0.82 >= 0.5, established >= warming
    expect(result.capital_evaluation.passed).toBe(false); // invalid input
    expect(result.denial_codes).toEqual(['INVALID_BUDGET_FORMAT']);
  });

  it('invalid budget format + insufficient trust: both false', () => {
    // Capital input is invalid AND trust would fail
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.1, reputation_state: 'cold' }),
      makeCapitalSnapshot({ budget_remaining: '007' }),
      makeCriteria({ min_trust_score: 0.5, min_reputation_state: 'established' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false); // trust actually fails: 0.1 < 0.5, cold < established
    expect(result.capital_evaluation.passed).toBe(false); // invalid input
    expect(result.denial_codes).toEqual(['INVALID_BUDGET_FORMAT']);
  });

  it('unknown required reputation state: capital still evaluated', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'established' }),
      makeCapitalSnapshot({ budget_remaining: '50000000' }),
      makeCriteria({ min_reputation_state: 'mythical' as any, min_available_budget: '10000000' }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false); // criteria invalid
    expect(result.capital_evaluation.passed).toBe(true); // capital passes: 50M >= 10M
    expect(result.denial_codes).toEqual(['UNKNOWN_REPUTATION_STATE']);
  });

  it('invalid required budget format: trust still evaluated', () => {
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ blended_score: 0.9, reputation_state: 'authoritative' }),
      makeCapitalSnapshot({ budget_remaining: '50000000' }),
      makeCriteria({ min_available_budget: '00invalid' as any }),
      EVALUATED_AT,
    );
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(true); // trust passes
    expect(result.capital_evaluation.passed).toBe(false); // criteria invalid
    expect(result.denial_codes).toEqual(['INVALID_BUDGET_FORMAT']);
  });

  it('missing qualification criteria: both false (no criteria to evaluate against)', () => {
    const boundary: EconomicBoundary = {
      boundary_id: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
      personality_id: 'agent-alice',
      collection_id: 'community-dao',
      trust_layer: makeTrustSnapshot(),
      capital_layer: makeCapitalSnapshot(),
      access_decision: { granted: true },
      evaluated_at: EVALUATED_AT,
      contract_version: '7.9.1',
    };
    const result = evaluateFromBoundary(boundary, EVALUATED_AT);
    expect(result.access_decision.granted).toBe(false);
    expect(result.trust_evaluation.passed).toBe(false); // no criteria
    expect(result.capital_evaluation.passed).toBe(false); // no criteria
    expect(result.denial_codes).toEqual(['MISSING_QUALIFICATION_CRITERIA']);
  });

  it('validation failures produce schema-valid results', () => {
    // Unknown state + valid capital
    const result = evaluateEconomicBoundary(
      makeTrustSnapshot({ reputation_state: 'legendary' as any }),
      makeCapitalSnapshot(),
      makeCriteria(),
      EVALUATED_AT,
      'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
    );
    expect(Value.Check(EconomicBoundaryEvaluationResultSchema, result)).toBe(true);
  });
});
