/**
 * Tests for feedback dampening — EMA with cold-start Bayesian prior.
 *
 * @see SDD §5.3 — Feedback Dampening
 * @see PRD FR-3 — Feedback Dampening Constants
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import {
  computeDampenedScore,
  FeedbackDampeningConfigSchema,
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
  DEFAULT_PSEUDO_COUNT,
  type FeedbackDampeningConfig,
} from '../../src/commons/feedback-dampening.js';
import { Value } from '@sinclair/typebox/value';

describe('FeedbackDampeningConfigSchema', () => {
  it('has correct $id', () => {
    expect(FeedbackDampeningConfigSchema.$id).toBe('FeedbackDampeningConfig');
  });

  it('rejects additional properties', () => {
    const result = Value.Check(FeedbackDampeningConfigSchema, {
      alpha_min: 0.1,
      alpha_max: 0.5,
      ramp_samples: 50,
      pseudo_count: 10,
      extra_field: true,
    });
    expect(result).toBe(false);
  });

  it('validates a correct config', () => {
    const config = {
      alpha_min: 0.1,
      alpha_max: 0.5,
      ramp_samples: 50,
      pseudo_count: 10,
    };
    expect(Value.Check(FeedbackDampeningConfigSchema, config)).toBe(true);
  });

  it('rejects alpha_min > 1', () => {
    expect(Value.Check(FeedbackDampeningConfigSchema, {
      alpha_min: 1.5, alpha_max: 0.5, ramp_samples: 50, pseudo_count: 10,
    })).toBe(false);
  });

  it('rejects negative alpha_min', () => {
    expect(Value.Check(FeedbackDampeningConfigSchema, {
      alpha_min: -0.1, alpha_max: 0.5, ramp_samples: 50, pseudo_count: 10,
    })).toBe(false);
  });
});

describe('exported constants', () => {
  it('FEEDBACK_DAMPENING_ALPHA_MIN = 0.1', () => {
    expect(FEEDBACK_DAMPENING_ALPHA_MIN).toBe(0.1);
  });
  it('FEEDBACK_DAMPENING_ALPHA_MAX = 0.5', () => {
    expect(FEEDBACK_DAMPENING_ALPHA_MAX).toBe(0.5);
  });
  it('DAMPENING_RAMP_SAMPLES = 50', () => {
    expect(DAMPENING_RAMP_SAMPLES).toBe(50);
  });
  it('DEFAULT_PSEUDO_COUNT = 10', () => {
    expect(DEFAULT_PSEUDO_COUNT).toBe(10);
  });
});

describe('computeDampenedScore', () => {
  describe('cold start (null oldScore)', () => {
    it('pulls toward 0.5 with high pseudo-count', () => {
      // weight = 10 / (10 + 1) ≈ 0.909, result ≈ 0.909 * 0.5 + 0.091 * 0.8 ≈ 0.527
      const result = computeDampenedScore(null, 0.8, 1);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(0.8);
    });

    it('converges to newScore with many samples', () => {
      // weight = 10 / (10 + 1000) = 0.0099, result ≈ 0.005 + 0.990 * 0.8 ≈ 0.797
      const result = computeDampenedScore(null, 0.8, 1000);
      expect(result).toBeCloseTo(0.8, 1);
    });

    it('returns 0.5 when newScore is 0.5', () => {
      const result = computeDampenedScore(null, 0.5, 1);
      expect(result).toBeCloseTo(0.5, 5);
    });

    it('handles zero pseudo-count (no prior)', () => {
      const config: FeedbackDampeningConfig = {
        alpha_min: 0.1, alpha_max: 0.5, ramp_samples: 50, pseudo_count: 0,
      };
      // weight = 0 / (0 + 1) = 0, result = newScore
      const result = computeDampenedScore(null, 0.9, 1, config);
      expect(result).toBeCloseTo(0.9, 5);
    });
  });

  describe('steady state (EMA update)', () => {
    it('moves toward newScore', () => {
      const result = computeDampenedScore(0.5, 1.0, 1);
      expect(result).toBeGreaterThan(0.5);
      expect(result).toBeLessThan(1.0);
    });

    it('uses higher alpha at low sample count', () => {
      const lowSample = computeDampenedScore(0.5, 1.0, 1);
      const highSample = computeDampenedScore(0.5, 1.0, 100);
      // Low sample count → higher alpha → moves more toward newScore
      expect(lowSample).toBeGreaterThan(highSample);
    });

    it('alpha reaches alpha_min after ramp_samples', () => {
      // At sampleCount >= rampSamples, alpha = alpha_min = 0.1
      // result = 0.5 + 0.1 * (1.0 - 0.5) = 0.55
      const result = computeDampenedScore(0.5, 1.0, 50);
      expect(result).toBeCloseTo(0.55, 5);
    });

    it('alpha stays at alpha_min beyond ramp_samples', () => {
      const atRamp = computeDampenedScore(0.5, 1.0, 50);
      const beyondRamp = computeDampenedScore(0.5, 1.0, 200);
      expect(atRamp).toBeCloseTo(beyondRamp, 5);
    });

    it('no change when newScore equals oldScore', () => {
      const result = computeDampenedScore(0.7, 0.7, 25);
      expect(result).toBeCloseTo(0.7, 10);
    });
  });

  describe('custom config', () => {
    it('respects custom alpha range', () => {
      const config: FeedbackDampeningConfig = {
        alpha_min: 0.01, alpha_max: 0.99, ramp_samples: 100, pseudo_count: 5,
      };
      const result = computeDampenedScore(0.5, 1.0, 1, config);
      // alpha = 0.01 + (0.99 - 0.01) * (1 - 1/100) = 0.01 + 0.98 * 0.99 ≈ 0.9802
      expect(result).toBeGreaterThan(0.9);
    });
  });

  describe('input validation', () => {
    it('throws when alpha_min > alpha_max', () => {
      const config: FeedbackDampeningConfig = {
        alpha_min: 0.9, alpha_max: 0.1, ramp_samples: 10, pseudo_count: 3,
      };
      expect(() => computeDampenedScore(0.5, 0.8, 5, config))
        .toThrow('alpha_min (0.9) must not exceed alpha_max (0.1)');
    });
  });

  describe('bounded feedback invariant (property test)', () => {
    it('|result - old| <= alpha_max * |new - old|', () => {
      fc.assert(
        fc.property(
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.double({ min: 0, max: 1, noNaN: true }),
          fc.integer({ min: 1, max: 10000 }),
          (oldScore, newScore, sampleCount) => {
            const result = computeDampenedScore(oldScore, newScore, sampleCount);
            const delta = Math.abs(result - oldScore);
            const maxDelta = FEEDBACK_DAMPENING_ALPHA_MAX * Math.abs(newScore - oldScore);
            return delta <= maxDelta + 1e-10; // floating point tolerance
          },
        ),
        { numRuns: 1000 },
      );
    });
  });
});
