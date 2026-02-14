/**
 * Tests for isReliableReputation utility.
 *
 * Finding: BB-V4-DEEP-001 — Sybil resistance hardening.
 */
import { describe, it, expect } from 'vitest';
import { isReliableReputation } from '../../src/utilities/reputation.js';
import { type ReputationScore } from '../../src/schemas/reputation-score.js';
import { MIN_REPUTATION_SAMPLE_SIZE, REPUTATION_DECAY } from '../../src/vocabulary/reputation.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Build a valid ReputationScore with sensible defaults, overridable. */
function makeScore(overrides: Partial<ReputationScore> = {}): ReputationScore {
  return {
    agent_id: 'a1',
    score: 0.85,
    components: {
      outcome_quality: 0.9,
      performance_consistency: 0.8,
      dispute_ratio: 0.85,
      community_standing: 0.75,
    },
    sample_size: 10,
    last_updated: new Date().toISOString(),
    decay_applied: false,
    contract_version: '4.4.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('isReliableReputation', () => {
  it('returns reliable for score with sufficient sample_size and recent last_updated', () => {
    const result = isReliableReputation(makeScore());
    expect(result.reliable).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('returns unreliable when sample_size < MIN_REPUTATION_SAMPLE_SIZE', () => {
    const result = isReliableReputation(makeScore({ sample_size: MIN_REPUTATION_SAMPLE_SIZE - 1 }));
    expect(result.reliable).toBe(false);
    expect(result.reasons.some((r) => r.includes('sample_size'))).toBe(true);
    expect(result.reasons.some((r) => r.includes('below minimum threshold'))).toBe(true);
  });

  it('returns unreliable when last_updated is stale (>60 days)', () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - (REPUTATION_DECAY.half_life_days * 2 + 1));
    const result = isReliableReputation(makeScore({
      last_updated: staleDate.toISOString(),
      decay_applied: true, // avoid triggering the decay-not-applied check
    }));
    expect(result.reliable).toBe(false);
    expect(result.reasons.some((r) => r.includes('stale'))).toBe(true);
  });

  it('returns unreliable when decay not applied but score is old', () => {
    const oldDate = new Date();
    oldDate.setDate(oldDate.getDate() - (REPUTATION_DECAY.half_life_days + 1));
    const result = isReliableReputation(makeScore({
      last_updated: oldDate.toISOString(),
      decay_applied: false,
    }));
    expect(result.reliable).toBe(false);
    expect(result.reasons.some((r) => r.includes('score not decayed despite exceeding half-life'))).toBe(true);
  });

  it('returns reasons array with specific messages', () => {
    const staleDate = new Date();
    staleDate.setDate(staleDate.getDate() - (REPUTATION_DECAY.half_life_days * 2 + 1));
    const result = isReliableReputation(makeScore({
      sample_size: 2,
      last_updated: staleDate.toISOString(),
      decay_applied: false,
    }));
    expect(result.reliable).toBe(false);
    // Should have all three reasons: low sample, stale, and not decayed
    expect(result.reasons.length).toBe(3);
    expect(result.reasons[0]).toContain('sample_size (2) below minimum threshold');
    expect(result.reasons[1]).toContain('stale');
    expect(result.reasons[2]).toContain('score not decayed');
  });

  it('accepts injectable `now` parameter for deterministic testing (BB-C8-I1-SEC-006)', () => {
    // Fixed timestamp: 2026-01-15T00:00:00Z
    const fixedNow = new Date('2026-01-15T00:00:00Z').getTime();
    const score = makeScore({
      last_updated: '2026-01-14T00:00:00Z', // 1 day old — well within half-life
      sample_size: 10,
      decay_applied: false,
    });
    const result = isReliableReputation(score, fixedNow);
    expect(result.reliable).toBe(true);
    expect(result.reasons).toEqual([]);
  });

  it('detects staleness with injectable `now` parameter', () => {
    const fixedNow = new Date('2026-06-01T00:00:00Z').getTime();
    const score = makeScore({
      last_updated: '2026-01-01T00:00:00Z', // ~150 days old — well beyond 2x half-life
      sample_size: 10,
      decay_applied: true,
    });
    const result = isReliableReputation(score, fixedNow);
    expect(result.reliable).toBe(false);
    expect(result.reasons.some((r) => r.includes('stale'))).toBe(true);
  });
});
