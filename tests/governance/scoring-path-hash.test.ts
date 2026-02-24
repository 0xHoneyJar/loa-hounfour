/**
 * Tests for ScoringPathLog hash chain utilities (v7.11.0).
 *
 * @see Bridgebuilder Meditation III — Ostrom Principle 4
 */
import { describe, it, expect } from 'vitest';
import {
  computeScoringPathHash,
  SCORING_PATH_GENESIS_HASH,
  type ScoringPathHashInput,
} from '../../src/governance/scoring-path-hash.js';

describe('computeScoringPathHash', () => {
  it('returns sha256: prefixed hash', () => {
    const entry: ScoringPathHashInput = {
      path: 'task_cohort',
      model_id: 'native',
      task_type: 'code_review',
    };
    const hash = computeScoringPathHash(entry);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is deterministic (same input → same hash)', () => {
    const entry: ScoringPathHashInput = {
      path: 'aggregate',
      model_id: 'gpt-4o',
      reason: 'No task cohort data',
    };
    const hash1 = computeScoringPathHash(entry);
    const hash2 = computeScoringPathHash(entry);
    expect(hash1).toBe(hash2);
  });

  it('is order-independent (canonical JSON)', () => {
    // RFC 8785 canonicalization ensures key order does not affect hash
    const entry1: ScoringPathHashInput = {
      path: 'task_cohort',
      model_id: 'native',
      task_type: 'code_review',
    };
    const entry2: ScoringPathHashInput = {
      task_type: 'code_review',
      model_id: 'native',
      path: 'task_cohort',
    };
    expect(computeScoringPathHash(entry1)).toBe(computeScoringPathHash(entry2));
  });

  it('different inputs produce different hashes', () => {
    const entry1: ScoringPathHashInput = { path: 'task_cohort', model_id: 'native' };
    const entry2: ScoringPathHashInput = { path: 'aggregate', model_id: 'native' };
    expect(computeScoringPathHash(entry1)).not.toBe(computeScoringPathHash(entry2));
  });

  it('handles minimal input (path only)', () => {
    const hash = computeScoringPathHash({ path: 'tier_default' });
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  // Bridgebuilder HIGH-1: extra fields must be stripped at runtime
  it('strips extra fields (structural subtyping safety)', () => {
    const cleanEntry: ScoringPathHashInput = {
      path: 'task_cohort',
      model_id: 'native',
      task_type: 'code_review',
      scored_at: '2026-02-24T15:00:00Z',
    };
    // Simulate a full ScoringPathLog object being passed (with chain metadata)
    const dirtyEntry = {
      ...cleanEntry,
      entry_hash: 'sha256:should-be-stripped',
      previous_hash: 'sha256:should-be-stripped',
      extra_field: 'should-be-stripped',
    };
    // Both should produce identical hashes — extra fields are stripped
    expect(computeScoringPathHash(dirtyEntry as ScoringPathHashInput))
      .toBe(computeScoringPathHash(cleanEntry));
  });
});

describe('SCORING_PATH_GENESIS_HASH', () => {
  it('is sha256 of empty string', () => {
    expect(SCORING_PATH_GENESIS_HASH).toBe(
      'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches sha256: prefixed format', () => {
    expect(SCORING_PATH_GENESIS_HASH).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});
