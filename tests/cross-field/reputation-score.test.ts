/**
 * Cross-field validator tests for ReputationScore.
 *
 * Finding: BB-V4-DEEP-001 — Sybil resistance hardening.
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';

// ---------------------------------------------------------------------------
// Valid fixture
// ---------------------------------------------------------------------------

const VALID_REPUTATION_SCORE = {
  agent_id: 'a1',
  score: 0.85,
  components: {
    outcome_quality: 0.9,
    performance_consistency: 0.8,
    dispute_ratio: 0.85,
    community_standing: 0.75,
  },
  sample_size: 10,
  last_updated: '2026-01-01T00:00:00Z',
  decay_applied: false,
  contract_version: '4.4.0',
};

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('ReputationScore cross-field validator', () => {
  it('validates warning for low sample_size', () => {
    const doc = { ...VALID_REPUTATION_SCORE, sample_size: 3 };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('sample_size (3)'))).toBe(true);
    expect(result.warnings!.some((w) => w.includes('below minimum threshold'))).toBe(true);
  });

  it('validates warning for perfect score with low sample', () => {
    const doc = { ...VALID_REPUTATION_SCORE, score: 1.0, sample_size: 5 };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) => w.includes('perfect score with low sample is suspicious'))).toBe(true);
  });

  it('validates normal scores pass without warnings', () => {
    const result = validate(ReputationScoreSchema, VALID_REPUTATION_SCORE);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeUndefined();
  });

  it('does not warn for perfect score with sufficient sample', () => {
    const doc = { ...VALID_REPUTATION_SCORE, score: 1.0, sample_size: 10 };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
    // sample_size >= 10 so no "perfect score with low sample" warning
    // sample_size >= MIN_REPUTATION_SAMPLE_SIZE so no "below minimum threshold" warning
    expect(result.warnings).toBeUndefined();
  });

  it('accumulates multiple warnings', () => {
    // sample_size 3 triggers both low-sample warnings: below minimum + perfect score with low sample
    const doc = { ...VALID_REPUTATION_SCORE, score: 1.0, sample_size: 3 };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.length).toBe(2);
  });
});
