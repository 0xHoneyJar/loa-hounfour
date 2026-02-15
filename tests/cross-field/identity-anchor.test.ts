/**
 * Tests for the identity_anchor optional field on ReputationScoreSchema.
 *
 * Validates schema-level acceptance/rejection of the identity_anchor object,
 * which provides Sybil-resistance through external identity verification.
 *
 * Finding: BB-C8-I1-TST-004
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

describe('ReputationScore identity_anchor field', () => {
  it('accepts valid ReputationScore with identity_anchor', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      identity_anchor: {
        provider: 'worldcoin',
        verified_at: '2026-01-15T12:00:00Z',
      },
    };
    const result = validate(ReputationScoreSchema, doc, { crossField: false });
    expect(result.valid).toBe(true);
  });

  it('accepts valid ReputationScore without identity_anchor (optional)', () => {
    const result = validate(ReputationScoreSchema, VALID_REPUTATION_SCORE, { crossField: false });
    expect(result.valid).toBe(true);
    // Confirm the fixture has no identity_anchor
    expect(VALID_REPUTATION_SCORE).not.toHaveProperty('identity_anchor');
  });

  it('rejects identity_anchor with empty provider', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      identity_anchor: {
        provider: '',
        verified_at: '2026-01-15T12:00:00Z',
      },
    };
    const result = validate(ReputationScoreSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('provider'))).toBe(true);
    }
  });

  it('rejects identity_anchor with invalid date-time verified_at', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      identity_anchor: {
        provider: 'worldcoin',
        verified_at: 'not-a-datetime',
      },
    };
    const result = validate(ReputationScoreSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('verified_at'))).toBe(true);
    }
  });

  it('rejects identity_anchor with missing provider', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      identity_anchor: {
        verified_at: '2026-01-15T12:00:00Z',
      },
    };
    const result = validate(ReputationScoreSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
  });

  it('rejects identity_anchor with missing verified_at', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      identity_anchor: {
        provider: 'worldcoin',
      },
    };
    const result = validate(ReputationScoreSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
  });

  it('rejects identity_anchor with additional properties', () => {
    const doc = {
      ...VALID_REPUTATION_SCORE,
      identity_anchor: {
        provider: 'worldcoin',
        verified_at: '2026-01-15T12:00:00Z',
        extra_field: 'not_allowed',
      },
    };
    const result = validate(ReputationScoreSchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
  });
});
