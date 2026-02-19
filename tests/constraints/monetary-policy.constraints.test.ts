/**
 * Round-trip tests for MonetaryPolicy constraint expressions (Sprint 3).
 *
 * Verifies every expression in MonetaryPolicy.constraints.json evaluates
 * correctly against valid and invalid context data.
 */
import { describe, it, expect } from 'vitest';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('MonetaryPolicy constraint expressions', () => {
  describe('monetary-policy-ceiling-positive', () => {
    it('passes when conservation_ceiling > 0', () => {
      expect(evaluateConstraint(
        { conservation_ceiling: '100000000000' },
        'bigint_gt(conservation_ceiling, 0)',
      )).toBe(true);
    });

    it('fails when conservation_ceiling is 0', () => {
      expect(evaluateConstraint(
        { conservation_ceiling: '0' },
        'bigint_gt(conservation_ceiling, 0)',
      )).toBe(false);
    });
  });

  describe('monetary-policy-collateral-minimum', () => {
    it('passes when collateral_ratio_bps >= 10000', () => {
      expect(evaluateConstraint(
        { collateral_ratio_bps: 15000 },
        'collateral_ratio_bps >= 10000',
      )).toBe(true);
    });

    it('passes when collateral_ratio_bps == 10000', () => {
      expect(evaluateConstraint(
        { collateral_ratio_bps: 10000 },
        'collateral_ratio_bps >= 10000',
      )).toBe(true);
    });

    it('fails when collateral_ratio_bps < 10000', () => {
      expect(evaluateConstraint(
        { collateral_ratio_bps: 5000 },
        'collateral_ratio_bps >= 10000',
      )).toBe(false);
    });
  });

  describe('monetary-policy-coupling-references-both', () => {
    it('passes when coupling_invariant is non-empty', () => {
      expect(evaluateConstraint(
        { coupling_invariant: 'bigint_gte(collateral, current_supply)' },
        "coupling_invariant != ''",
      )).toBe(true);
    });

    it('fails when coupling_invariant is empty', () => {
      expect(evaluateConstraint(
        { coupling_invariant: '' },
        "coupling_invariant != ''",
      )).toBe(false);
    });
  });

  describe('monetary-policy-has-trigger', () => {
    it('passes when review_trigger is present', () => {
      expect(evaluateConstraint(
        { review_trigger: { trigger_type: 'manual' } },
        'review_trigger != null',
      )).toBe(true);
    });

    it('fails when review_trigger is null', () => {
      expect(evaluateConstraint(
        { review_trigger: null },
        'review_trigger != null',
      )).toBe(false);
    });
  });
});
