/**
 * Tests for ReputationAggregate schema, state machine, and Bayesian computation (S2-T1 through S2-T4).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time)
import {
  ReputationStateSchema,
  ReputationTransitionSchema,
  ReputationAggregateSchema,
  REPUTATION_TRANSITIONS,
  isValidReputationTransition,
  computePersonalWeight,
  computeBlendedScore,
  type ReputationAggregate,
  type ReputationState,
} from '../../src/governance/reputation-aggregate.js';
import {
  QualityEventSchema,
  type QualityEvent,
} from '../../src/schemas/quality-event.js';

const VALID_AGGREGATE: ReputationAggregate = {
  personality_id: 'bear-001',
  collection_id: 'honeycomb',
  pool_id: 'pool-alpha',
  state: 'cold',
  personal_score: null,
  collection_score: 0.5,
  blended_score: 0.5,
  sample_count: 0,
  pseudo_count: 3,
  contributor_count: 0,
  min_sample_count: 5,
  created_at: '2026-02-21T00:00:00Z',
  last_updated: '2026-02-21T00:00:00Z',
  transition_history: [],
  contract_version: '7.1.0',
};

const VALID_QUALITY_EVENT: QualityEvent = {
  event_id: 'qe-001',
  personality_id: 'bear-001',
  collection_id: 'honeycomb',
  pool_id: 'pool-alpha',
  satisfaction: 0.8,
  coherence: 0.9,
  safety: 1.0,
  composite_score: 0.88,
  evaluator_id: 'evaluator-1',
  occurred_at: '2026-02-21T01:00:00Z',
  contract_version: '7.1.0',
};

// ---------------------------------------------------------------------------
// ReputationStateSchema
// ---------------------------------------------------------------------------

describe('ReputationStateSchema', () => {
  it.each(['cold', 'warming', 'established', 'authoritative'] as const)(
    'accepts "%s"',
    (state) => {
      expect(Value.Check(ReputationStateSchema, state)).toBe(true);
    },
  );

  it('rejects unknown state', () => {
    expect(Value.Check(ReputationStateSchema, 'pending')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ReputationAggregateSchema
// ---------------------------------------------------------------------------

describe('ReputationAggregateSchema', () => {
  it('validates a correct cold aggregate', () => {
    expect(Value.Check(ReputationAggregateSchema, VALID_AGGREGATE)).toBe(true);
  });

  it('has $id = ReputationAggregate', () => {
    expect(ReputationAggregateSchema.$id).toBe('ReputationAggregate');
  });

  it('rejects additional properties', () => {
    const withExtra = { ...VALID_AGGREGATE, extra: true };
    expect(Value.Check(ReputationAggregateSchema, withExtra)).toBe(false);
  });

  it('accepts personal_score as null (cold state)', () => {
    expect(Value.Check(ReputationAggregateSchema, VALID_AGGREGATE)).toBe(true);
  });

  it('accepts personal_score as number', () => {
    const warming = { ...VALID_AGGREGATE, state: 'warming', personal_score: 0.75, sample_count: 3 };
    expect(Value.Check(ReputationAggregateSchema, warming)).toBe(true);
  });

  it('rejects personal_score out of range', () => {
    const invalid = { ...VALID_AGGREGATE, state: 'warming', personal_score: 1.5 };
    expect(Value.Check(ReputationAggregateSchema, invalid)).toBe(false);
  });

  it('rejects negative sample_count', () => {
    const invalid = { ...VALID_AGGREGATE, sample_count: -1 };
    expect(Value.Check(ReputationAggregateSchema, invalid)).toBe(false);
  });

  it('validates transition_history entries', () => {
    const withHistory = {
      ...VALID_AGGREGATE,
      state: 'warming' as const,
      personal_score: 0.7,
      sample_count: 1,
      transition_history: [{
        from: 'cold' as const,
        to: 'warming' as const,
        at: '2026-02-21T01:00:00Z',
        trigger: 'First QualityEvent recorded',
      }],
    };
    expect(Value.Check(ReputationAggregateSchema, withHistory)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// State Machine Transitions
// ---------------------------------------------------------------------------

describe('State Machine', () => {
  describe('REPUTATION_TRANSITIONS', () => {
    it('has 4 named transitions', () => {
      expect(Object.keys(REPUTATION_TRANSITIONS)).toHaveLength(4);
    });

    it('includes warm, establish, authorize, reset', () => {
      expect(REPUTATION_TRANSITIONS.warm).toBeDefined();
      expect(REPUTATION_TRANSITIONS.establish).toBeDefined();
      expect(REPUTATION_TRANSITIONS.authorize).toBeDefined();
      expect(REPUTATION_TRANSITIONS.reset).toBeDefined();
    });
  });

  describe('isValidReputationTransition', () => {
    it('cold → warming: allowed', () => {
      expect(isValidReputationTransition('cold', 'warming')).toBe(true);
    });

    it('warming → established: allowed', () => {
      expect(isValidReputationTransition('warming', 'established')).toBe(true);
    });

    it('established → authoritative: allowed', () => {
      expect(isValidReputationTransition('established', 'authoritative')).toBe(true);
    });

    it('* → cold (reset): allowed from any state', () => {
      expect(isValidReputationTransition('cold', 'cold')).toBe(true);
      expect(isValidReputationTransition('warming', 'cold')).toBe(true);
      expect(isValidReputationTransition('established', 'cold')).toBe(true);
      expect(isValidReputationTransition('authoritative', 'cold')).toBe(true);
    });

    it('warming → authoritative: rejected (must go through established)', () => {
      expect(isValidReputationTransition('warming', 'authoritative')).toBe(false);
    });

    it('cold → established: rejected (must go through warming)', () => {
      expect(isValidReputationTransition('cold', 'established')).toBe(false);
    });

    it('cold → authoritative: rejected', () => {
      expect(isValidReputationTransition('cold', 'authoritative')).toBe(false);
    });
  });
});

// ---------------------------------------------------------------------------
// Bayesian Computation
// ---------------------------------------------------------------------------

describe('Bayesian Computation', () => {
  describe('computePersonalWeight', () => {
    it('computePersonalWeight(10, 3) ≈ 0.769', () => {
      expect(computePersonalWeight(10, 3)).toBeCloseTo(10 / 13, 3);
    });

    it('computePersonalWeight(27, 3) = 0.9', () => {
      expect(computePersonalWeight(27, 3)).toBeCloseTo(0.9, 3);
    });

    it('computePersonalWeight(0, 3) = 0 (cold)', () => {
      expect(computePersonalWeight(0, 3)).toBe(0);
    });

    it('increases toward 1 as sample_count grows', () => {
      const w5 = computePersonalWeight(5, 3);
      const w10 = computePersonalWeight(10, 3);
      const w100 = computePersonalWeight(100, 3);
      expect(w5).toBeLessThan(w10);
      expect(w10).toBeLessThan(w100);
      expect(w100).toBeLessThan(1);
    });
  });

  describe('computeBlendedScore', () => {
    it('returns collectionScore when personalScore is null (cold)', () => {
      expect(computeBlendedScore(null, 0.5, 0, 3)).toBe(0.5);
    });

    it('computes (3*0.5 + 10*0.8)/13 ≈ 0.731', () => {
      expect(computeBlendedScore(0.8, 0.5, 10, 3)).toBeCloseTo(
        (3 * 0.5 + 10 * 0.8) / 13,
        3,
      );
    });

    it('equals personalScore when sample_count >> pseudo_count', () => {
      const blended = computeBlendedScore(0.8, 0.5, 1000, 3);
      expect(blended).toBeCloseTo(0.8, 2);
    });

    it('equals collectionScore when sample_count = 0', () => {
      expect(computeBlendedScore(0.8, 0.5, 0, 3)).toBeCloseTo(0.5, 3);
    });
  });
});

// ---------------------------------------------------------------------------
// QualityEventSchema
// ---------------------------------------------------------------------------

describe('QualityEventSchema', () => {
  it('validates a correct quality event', () => {
    expect(Value.Check(QualityEventSchema, VALID_QUALITY_EVENT)).toBe(true);
  });

  it('has $id = QualityEvent', () => {
    expect(QualityEventSchema.$id).toBe('QualityEvent');
  });

  it('rejects additional properties', () => {
    const withExtra = { ...VALID_QUALITY_EVENT, extra: true };
    expect(Value.Check(QualityEventSchema, withExtra)).toBe(false);
  });

  it('rejects satisfaction out of bounds', () => {
    expect(Value.Check(QualityEventSchema, { ...VALID_QUALITY_EVENT, satisfaction: 1.5 })).toBe(false);
    expect(Value.Check(QualityEventSchema, { ...VALID_QUALITY_EVENT, satisfaction: -0.1 })).toBe(false);
  });

  it('rejects coherence out of bounds', () => {
    expect(Value.Check(QualityEventSchema, { ...VALID_QUALITY_EVENT, coherence: 1.1 })).toBe(false);
  });

  it('rejects safety out of bounds', () => {
    expect(Value.Check(QualityEventSchema, { ...VALID_QUALITY_EVENT, safety: -0.01 })).toBe(false);
  });

  it('rejects composite_score out of bounds', () => {
    expect(Value.Check(QualityEventSchema, { ...VALID_QUALITY_EVENT, composite_score: 2 })).toBe(false);
  });

  it('accepts boundary values (0 and 1)', () => {
    const boundary = { ...VALID_QUALITY_EVENT, satisfaction: 0, coherence: 1, safety: 0, composite_score: 1 };
    expect(Value.Check(QualityEventSchema, boundary)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Vocabulary Constants
// ---------------------------------------------------------------------------

describe('Reputation Vocabulary', () => {
  it('BAYESIAN_BLEND has correct defaults', async () => {
    const { BAYESIAN_BLEND } = await import('../../src/vocabulary/reputation.js');
    expect(BAYESIAN_BLEND.pseudo_count_k).toBe(3);
    expect(BAYESIAN_BLEND.min_sample_count).toBe(5);
    expect(BAYESIAN_BLEND.authoritative_threshold).toBe(0.9);
  });

  it('ANTI_MANIPULATION has correct defaults', async () => {
    const { ANTI_MANIPULATION } = await import('../../src/vocabulary/reputation.js');
    expect(ANTI_MANIPULATION.trimmed_mean_percentile).toBe(10);
    expect(ANTI_MANIPULATION.max_contributors).toBe(100);
    expect(ANTI_MANIPULATION.min_unique_evaluators).toBe(3);
  });

  it('REPUTATION_STATES is a readonly 4-tuple', async () => {
    const { REPUTATION_STATES } = await import('../../src/vocabulary/reputation.js');
    expect(REPUTATION_STATES).toHaveLength(4);
    expect(REPUTATION_STATES).toEqual(['cold', 'warming', 'established', 'authoritative']);
  });
});
