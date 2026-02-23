/**
 * Tests for EconomicBoundaryEvaluation constraint expressions.
 *
 * @see FR-1 v7.9.0 — Decision Engine constraints
 * @since v7.9.0
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'EconomicBoundaryEvaluation.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

const grantedResult = {
  access_decision: { granted: true },
  trust_evaluation: {
    passed: true,
    actual_score: 0.82,
    required_score: 0.5,
    actual_state: 'established',
    required_state: 'warming',
  },
  capital_evaluation: {
    passed: true,
    actual_budget: '50000000',
    required_budget: '10000000',
  },
  criteria_used: {
    min_trust_score: 0.5,
    min_reputation_state: 'warming',
    min_available_budget: '10000000',
  },
  evaluated_at: '2026-02-23T10:00:01Z',
};

const deniedResult = {
  access_decision: {
    granted: false,
    denial_reason: 'trust score 0.3 < required 0.5',
  },
  trust_evaluation: {
    passed: false,
    actual_score: 0.3,
    required_score: 0.5,
    actual_state: 'established',
    required_state: 'warming',
  },
  capital_evaluation: {
    passed: true,
    actual_budget: '50000000',
    required_budget: '10000000',
  },
  criteria_used: {
    min_trust_score: 0.5,
    min_reputation_state: 'warming',
    min_available_budget: '10000000',
  },
  evaluated_at: '2026-02-23T10:00:01Z',
};

function getExpr(id: string): string {
  const c = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!c) throw new Error(`Constraint ${id} not found`);
  return c.expression;
}

describe('EconomicBoundaryEvaluation constraints', () => {
  it('constraint file has 5 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(5);
  });

  it('has origin: genesis', () => {
    expect(constraintFile.origin).toBe('genesis');
  });

  it('has contract_version 7.9.1', () => {
    expect(constraintFile.contract_version).toBe('7.9.1');
  });

  describe('eval-granted-iff-both-pass', () => {
    const expr = () => getExpr('eval-granted-iff-both-pass');

    it('passes for granted + both pass', () => {
      expect(evaluateConstraint(grantedResult, expr())).toBe(true);
    });

    it('passes for denied + trust fails', () => {
      expect(evaluateConstraint(deniedResult, expr())).toBe(true);
    });

    it('fails for granted but trust fails (inconsistent)', () => {
      const bad = {
        ...grantedResult,
        access_decision: { granted: true },
        trust_evaluation: { ...grantedResult.trust_evaluation, passed: false },
      };
      expect(evaluateConstraint(bad, expr())).toBe(false);
    });
  });

  describe('eval-denied-needs-reason', () => {
    const expr = () => getExpr('eval-denied-needs-reason');

    it('passes for granted (no reason needed)', () => {
      expect(evaluateConstraint(grantedResult, expr())).toBe(true);
    });

    it('passes for denied with reason', () => {
      expect(evaluateConstraint(deniedResult, expr())).toBe(true);
    });

    it('fails for denied without reason', () => {
      const bad = {
        ...deniedResult,
        access_decision: { granted: false },
      };
      expect(evaluateConstraint(bad, expr())).toBe(false);
    });
  });

  describe('eval-trust-score-bounded', () => {
    const expr = () => getExpr('eval-trust-score-bounded');

    it('passes for score in range', () => {
      expect(evaluateConstraint(grantedResult, expr())).toBe(true);
    });

    it('passes for boundary values 0 and 1', () => {
      expect(evaluateConstraint({
        ...grantedResult,
        trust_evaluation: { ...grantedResult.trust_evaluation, actual_score: 0 },
      }, expr())).toBe(true);

      expect(evaluateConstraint({
        ...grantedResult,
        trust_evaluation: { ...grantedResult.trust_evaluation, actual_score: 1 },
      }, expr())).toBe(true);
    });
  });

  describe('eval-criteria-score-bounded', () => {
    const expr = () => getExpr('eval-criteria-score-bounded');

    it('passes for required_score in range', () => {
      expect(evaluateConstraint(grantedResult, expr())).toBe(true);
    });

    it('passes for boundary values 0 and 1', () => {
      expect(evaluateConstraint({
        ...grantedResult,
        trust_evaluation: { ...grantedResult.trust_evaluation, required_score: 0 },
      }, expr())).toBe(true);

      expect(evaluateConstraint({
        ...grantedResult,
        trust_evaluation: { ...grantedResult.trust_evaluation, required_score: 1 },
      }, expr())).toBe(true);
    });
  });

  describe('eval-denied-needs-codes', () => {
    const expr = () => getExpr('eval-denied-needs-codes');

    it('passes for granted (no codes needed)', () => {
      expect(evaluateConstraint(grantedResult, expr())).toBe(true);
    });

    it('passes for denied with codes', () => {
      const withCodes = {
        ...deniedResult,
        denial_codes: ['TRUST_SCORE_BELOW_THRESHOLD'],
      };
      expect(evaluateConstraint(withCodes, expr())).toBe(true);
    });

    it('passes for denied with multiple codes', () => {
      const withCodes = {
        ...deniedResult,
        denial_codes: ['TRUST_SCORE_BELOW_THRESHOLD', 'CAPITAL_BELOW_THRESHOLD'],
      };
      expect(evaluateConstraint(withCodes, expr())).toBe(true);
    });

    it('fails for denied without codes', () => {
      // deniedResult has no denial_codes field
      expect(evaluateConstraint(deniedResult, expr())).toBe(false);
    });

    it('fails for denied with empty codes array', () => {
      const emptyCodes = {
        ...deniedResult,
        denial_codes: [],
      };
      expect(evaluateConstraint(emptyCodes, expr())).toBe(false);
    });
  });
});
