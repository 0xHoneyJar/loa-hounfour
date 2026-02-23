/**
 * Tests for model routing utilities — SDR basket calculation for multi-model economics.
 *
 * @see DR-S10 — Cross-model routing utilities
 * @see Part 1 §III: SDR parallel — multi-model as multi-currency
 * @since v7.7.0 (Sprint 4)
 */
import { describe, it, expect } from 'vitest';
import {
  computeModelRoutingScores,
  selectModel,
  computeCompositeBasketWeights,
  isModelEligible,
  type ModelRoutingScore,
} from '../../src/utilities/model-routing.js';
import type { ReputationAggregate } from '../../src/governance/reputation-aggregate.js';
import type { ModelEconomicProfile } from '../../src/economy/model-economic-profile.js';
import type { ReputationRoutingSignal } from '../../src/governance/reputation-routing.js';
import type { ModelCohort } from '../../src/governance/reputation-aggregate.js';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeAggregate(overrides: Partial<ReputationAggregate> = {}): ReputationAggregate {
  return {
    aggregate_id: '550e8400-e29b-41d4-a716-446655440000',
    personality_id: 'test-personality',
    collection_id: 'test-collection',
    state: 'established',
    blended_score: 0.8,
    personal_score: 0.85,
    personal_weight: 0.6,
    sample_count: 50,
    decayed_sample_count: 40,
    model_cohorts: [],
    last_quality_event_at: '2026-02-01T00:00:00Z',
    updated_at: '2026-02-01T00:00:00Z',
    contract_version: '7.7.0',
    ...overrides,
  };
}

function makeProfile(overrides: Partial<ModelEconomicProfile> = {}): ModelEconomicProfile {
  return {
    profile_id: '550e8400-e29b-41d4-a716-446655440001',
    model_id: 'claude-opus-4',
    provider_id: 'anthropic',
    cost_per_token: { input: '3000', output: '15000' },
    quality_yield: 0.92,
    routing_weight: 0.5,
    effective_at: '2026-01-01T00:00:00Z',
    contract_version: '7.7.0',
    ...overrides,
  };
}

function makeSignal(overrides: Partial<ReputationRoutingSignal> = {}): ReputationRoutingSignal {
  return {
    signal_id: '550e8400-e29b-41d4-a716-446655440002',
    personality_id: 'test-personality',
    signal_type: 'model_preference',
    qualifying_state: 'established',
    qualifying_score: 0.7,
    routing_weight: 0.5,
    effective_at: '2026-01-01T00:00:00Z',
    contract_version: '7.7.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// computeModelRoutingScores
// ---------------------------------------------------------------------------

describe('computeModelRoutingScores', () => {
  it('returns routing scores sorted by routing_score descending', () => {
    const aggregate = makeAggregate({
      model_cohorts: [
        { model_id: 'claude-opus-4', personal_score: 0.9, sample_count: 30, weight: 0.5 },
        { model_id: 'gpt-5', personal_score: 0.7, sample_count: 20, weight: 0.3 },
      ],
    });

    const profiles = [
      makeProfile({ model_id: 'gpt-5', routing_weight: 0.3, cost_per_token: { input: '2000', output: '10000' } }),
      makeProfile({ model_id: 'claude-opus-4', routing_weight: 0.7, cost_per_token: { input: '3000', output: '15000' } }),
    ];

    const scores = computeModelRoutingScores(aggregate, profiles);

    expect(scores).toHaveLength(2);
    // Opus: 0.9 * 0.7 = 0.63
    // GPT: 0.7 * 0.3 = 0.21
    expect(scores[0].model_id).toBe('claude-opus-4');
    expect(scores[0].routing_score).toBeCloseTo(0.63, 5);
    expect(scores[1].model_id).toBe('gpt-5');
    expect(scores[1].routing_score).toBeCloseTo(0.21, 5);
  });

  it('falls back to blended_score when no cohort match', () => {
    const aggregate = makeAggregate({ blended_score: 0.75, model_cohorts: [] });
    const profiles = [makeProfile({ model_id: 'unknown-model', routing_weight: 0.4 })];

    const scores = computeModelRoutingScores(aggregate, profiles);

    expect(scores[0].routing_score).toBeCloseTo(0.75 * 0.4, 5);
  });

  it('computes cost efficiency as quality / output cost', () => {
    const aggregate = makeAggregate({
      model_cohorts: [
        { model_id: 'cheap-model', personal_score: 0.8, sample_count: 10, weight: 0.3 },
      ],
    });

    const profiles = [
      makeProfile({ model_id: 'cheap-model', cost_per_token: { input: '100', output: '500' } }),
    ];

    const scores = computeModelRoutingScores(aggregate, profiles);

    // cost_efficiency = 0.8 / 500 = 0.0016
    expect(scores[0].cost_efficiency).toBeCloseTo(0.8 / 500, 8);
  });

  it('handles zero output cost (avoids division by zero)', () => {
    const aggregate = makeAggregate({ blended_score: 0.9 });
    const profiles = [
      makeProfile({ model_id: 'free-model', cost_per_token: { input: '0', output: '0' } }),
    ];

    const scores = computeModelRoutingScores(aggregate, profiles);

    // cost_efficiency = effectiveQuality when output cost is 0
    expect(scores[0].cost_efficiency).toBeCloseTo(0.9, 5);
  });

  it('returns empty array for empty profiles', () => {
    const aggregate = makeAggregate();
    const scores = computeModelRoutingScores(aggregate, []);
    expect(scores).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectModel
// ---------------------------------------------------------------------------

describe('selectModel', () => {
  it('returns highest-scoring model above threshold', () => {
    const scores: ModelRoutingScore[] = [
      { model_id: 'best', routing_score: 0.9, cost_efficiency: 0.001 },
      { model_id: 'mid', routing_score: 0.5, cost_efficiency: 0.002 },
      { model_id: 'low', routing_score: 0.2, cost_efficiency: 0.003 },
    ];

    expect(selectModel(scores, 0.4)).toBe('best');
  });

  it('returns null when no model meets threshold', () => {
    const scores: ModelRoutingScore[] = [
      { model_id: 'low', routing_score: 0.1, cost_efficiency: 0.001 },
    ];

    expect(selectModel(scores, 0.5)).toBeNull();
  });

  it('returns first model with default threshold of 0', () => {
    const scores: ModelRoutingScore[] = [
      { model_id: 'only', routing_score: 0.01, cost_efficiency: 0.001 },
    ];

    expect(selectModel(scores)).toBe('only');
  });

  it('returns null for empty scores array', () => {
    expect(selectModel([], 0)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// computeCompositeBasketWeights
// ---------------------------------------------------------------------------

describe('computeCompositeBasketWeights', () => {
  it('normalizes routing weights to sum to 1.0', () => {
    const profiles = [
      makeProfile({ model_id: 'a', routing_weight: 0.3 }),
      makeProfile({ model_id: 'b', routing_weight: 0.7 }),
    ];

    const weights = computeCompositeBasketWeights(profiles);

    expect(weights).toHaveLength(2);
    const total = weights.reduce((sum, w) => sum + w.weight, 0);
    expect(total).toBeCloseTo(1.0, 10);
    expect(weights.find(w => w.model_id === 'a')!.weight).toBeCloseTo(0.3, 5);
    expect(weights.find(w => w.model_id === 'b')!.weight).toBeCloseTo(0.7, 5);
  });

  it('distributes equally when all weights are zero', () => {
    const profiles = [
      makeProfile({ model_id: 'a', routing_weight: 0 }),
      makeProfile({ model_id: 'b', routing_weight: 0 }),
      makeProfile({ model_id: 'c', routing_weight: 0 }),
    ];

    const weights = computeCompositeBasketWeights(profiles);

    for (const w of weights) {
      expect(w.weight).toBeCloseTo(1 / 3, 10);
    }
  });

  it('single model gets weight 1.0', () => {
    const profiles = [makeProfile({ model_id: 'sole', routing_weight: 0.5 })];

    const weights = computeCompositeBasketWeights(profiles);

    expect(weights[0].weight).toBe(1.0);
  });

  it('preserves proportions for unequal weights', () => {
    const profiles = [
      makeProfile({ model_id: 'x', routing_weight: 1 }),
      makeProfile({ model_id: 'y', routing_weight: 3 }),
    ];

    const weights = computeCompositeBasketWeights(profiles);

    expect(weights.find(w => w.model_id === 'x')!.weight).toBeCloseTo(0.25, 5);
    expect(weights.find(w => w.model_id === 'y')!.weight).toBeCloseTo(0.75, 5);
  });
});

// ---------------------------------------------------------------------------
// isModelEligible
// ---------------------------------------------------------------------------

describe('isModelEligible', () => {
  it('returns true when cohort meets score threshold', () => {
    const cohort: ModelCohort = {
      model_id: 'claude-opus-4',
      personal_score: 0.85,
      sample_count: 30,
      weight: 0.5,
    };

    const signal = makeSignal({ qualifying_score: 0.7 });

    expect(isModelEligible(cohort, signal)).toBe(true);
  });

  it('returns false when cohort score below threshold', () => {
    const cohort: ModelCohort = {
      model_id: 'claude-opus-4',
      personal_score: 0.5,
      sample_count: 10,
      weight: 0.3,
    };

    const signal = makeSignal({ qualifying_score: 0.7 });

    expect(isModelEligible(cohort, signal)).toBe(false);
  });

  it('returns false when cohort is undefined', () => {
    const signal = makeSignal();
    expect(isModelEligible(undefined, signal)).toBe(false);
  });

  it('returns false when personal_score is null', () => {
    const cohort: ModelCohort = {
      model_id: 'claude-opus-4',
      personal_score: null as unknown as number,
      sample_count: 0,
      weight: 0,
    };

    const signal = makeSignal({ qualifying_score: 0 });

    expect(isModelEligible(cohort, signal)).toBe(false);
  });

  it('returns true when score exactly equals threshold', () => {
    const cohort: ModelCohort = {
      model_id: 'exact-match',
      personal_score: 0.7,
      sample_count: 20,
      weight: 0.4,
    };

    const signal = makeSignal({ qualifying_score: 0.7 });

    expect(isModelEligible(cohort, signal)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Integration: full routing pipeline
// ---------------------------------------------------------------------------

describe('full routing pipeline', () => {
  it('scores → select → eligible flow produces correct model', () => {
    const aggregate = makeAggregate({
      model_cohorts: [
        { model_id: 'opus', personal_score: 0.95, sample_count: 100, weight: 0.6 },
        { model_id: 'sonnet', personal_score: 0.85, sample_count: 80, weight: 0.3 },
        { model_id: 'haiku', personal_score: 0.7, sample_count: 50, weight: 0.1 },
      ],
    });

    const profiles = [
      makeProfile({ model_id: 'opus', routing_weight: 0.5, cost_per_token: { input: '3000', output: '15000' } }),
      makeProfile({ model_id: 'sonnet', routing_weight: 0.3, cost_per_token: { input: '1000', output: '5000' } }),
      makeProfile({ model_id: 'haiku', routing_weight: 0.2, cost_per_token: { input: '250', output: '1250' } }),
    ];

    const scores = computeModelRoutingScores(aggregate, profiles);
    const selected = selectModel(scores, 0.1);
    const weights = computeCompositeBasketWeights(profiles);

    // Opus: 0.95 * 0.5 = 0.475, Sonnet: 0.85 * 0.3 = 0.255, Haiku: 0.7 * 0.2 = 0.14
    expect(selected).toBe('opus');
    expect(scores[0].model_id).toBe('opus');

    // Basket weights should normalize to 1.0
    const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);
    expect(totalWeight).toBeCloseTo(1.0, 10);
  });
});
