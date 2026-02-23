/**
 * Tests for computeRebalancedWeights utility (v7.8.0, DR-F2).
 */
import { describe, it, expect } from 'vitest';
import { computeRebalancedWeights } from '../../src/utilities/model-routing.js';
import type { ModelEconomicProfile } from '../../src/economy/model-economic-profile.js';
import type { EconomicPerformanceEvent } from '../../src/economy/economic-performance.js';

function makeProfile(model_id: string, weight: number): ModelEconomicProfile {
  return {
    profile_id: `550e8400-e29b-41d4-a716-44665544${model_id.padStart(4, '0')}`,
    model_id,
    cost_per_token: { input: '250', output: '1000' },
    quality_yield: 0.8,
    routing_weight: weight,
    effective_at: '2026-02-01T00:00:00Z',
    contract_version: '7.8.0',
  };
}

function makeEvent(
  model_id: string,
  actual_quality: number,
  expected_quality: number,
): EconomicPerformanceEvent {
  return {
    event_id: `550e8400-e29b-41d4-a716-44665544${Math.random().toString(16).slice(2, 6)}`,
    boundary_id: '550e8400-e29b-41d4-a716-446655440060',
    model_id,
    outcome_type: actual_quality >= expected_quality ? 'quality_met' : 'quality_below_threshold',
    actual_cost: '1200000',
    budgeted_cost: '1500000',
    actual_quality,
    expected_quality,
    tokens_used: { input: 1000, output: 500 },
    duration_ms: 2000,
    occurred_at: '2026-02-23T16:00:00Z',
    contract_version: '7.8.0',
  };
}

describe('computeRebalancedWeights', () => {
  it('returns empty for empty profiles', () => {
    expect(computeRebalancedWeights([], [])).toEqual([]);
  });

  it('preserves weights when no performance events', () => {
    const profiles = [makeProfile('a', 0.6), makeProfile('b', 0.4)];
    const result = computeRebalancedWeights(profiles, []);
    expect(result[0].weight).toBeCloseTo(0.6, 4);
    expect(result[1].weight).toBeCloseTo(0.4, 4);
  });

  it('increases weight for outperforming models', () => {
    const profiles = [makeProfile('a', 0.5), makeProfile('b', 0.5)];
    const events = [
      makeEvent('a', 0.95, 0.80), // a outperforms by +0.15
      makeEvent('b', 0.70, 0.80), // b underperforms by -0.10
    ];
    const result = computeRebalancedWeights(profiles, events);
    // a should gain weight, b should lose weight
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });

  it('decreases weight for underperforming models', () => {
    const profiles = [makeProfile('a', 0.5), makeProfile('b', 0.5)];
    const events = [
      makeEvent('a', 0.50, 0.80), // a severely underperforms
      makeEvent('b', 0.90, 0.80), // b outperforms
    ];
    const result = computeRebalancedWeights(profiles, events);
    expect(result[0].weight).toBeLessThan(result[1].weight);
  });

  it('preserves normalization (sum = 1.0)', () => {
    const profiles = [makeProfile('a', 0.3), makeProfile('b', 0.3), makeProfile('c', 0.4)];
    const events = [
      makeEvent('a', 0.95, 0.80),
      makeEvent('b', 0.50, 0.80),
      makeEvent('c', 0.85, 0.80),
    ];
    const result = computeRebalancedWeights(profiles, events);
    const sum = result.reduce((s, e) => s + e.weight, 0);
    expect(sum).toBeCloseTo(1.0, 6);
  });

  it('no change with dampingFactor = 0', () => {
    const profiles = [makeProfile('a', 0.6), makeProfile('b', 0.4)];
    const events = [makeEvent('a', 0.95, 0.80)];
    const result = computeRebalancedWeights(profiles, events, 0);
    expect(result[0].weight).toBeCloseTo(0.6, 4);
    expect(result[1].weight).toBeCloseTo(0.4, 4);
  });

  it('handles single model (weight stays 1.0)', () => {
    const profiles = [makeProfile('solo', 1.0)];
    const events = [makeEvent('solo', 0.95, 0.80)];
    const result = computeRebalancedWeights(profiles, events);
    expect(result).toHaveLength(1);
    expect(result[0].weight).toBeCloseTo(1.0, 6);
  });

  it('handles multiple events per model', () => {
    const profiles = [makeProfile('a', 0.5), makeProfile('b', 0.5)];
    const events = [
      makeEvent('a', 0.90, 0.80),
      makeEvent('a', 0.85, 0.80),
      makeEvent('b', 0.70, 0.80),
      makeEvent('b', 0.65, 0.80),
    ];
    const result = computeRebalancedWeights(profiles, events);
    // a averages +0.075, b averages -0.125 → a gains weight
    expect(result[0].weight).toBeGreaterThan(result[1].weight);
  });
});
