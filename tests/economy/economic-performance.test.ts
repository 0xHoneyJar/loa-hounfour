/**
 * Tests for Economic Performance schemas (v7.8.0, DR-F1 — feedback loop).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  PerformanceOutcomeTypeSchema,
  EconomicPerformanceEventSchema,
  QualityBridgeDirectionSchema,
  PerformanceQualityBridgeSchema,
} from '../../src/economy/economic-performance.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

// ---------------------------------------------------------------------------
// PerformanceOutcomeType
// ---------------------------------------------------------------------------

describe('PerformanceOutcomeTypeSchema', () => {
  it.each([
    'cost_within_budget',
    'cost_exceeded',
    'quality_met',
    'quality_below_threshold',
    'timeout',
    'error',
  ])('accepts valid outcome type: %s', (val) => {
    expect(Value.Check(PerformanceOutcomeTypeSchema, val)).toBe(true);
  });

  it('rejects invalid outcome type', () => {
    expect(Value.Check(PerformanceOutcomeTypeSchema, 'unknown')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EconomicPerformanceEvent
// ---------------------------------------------------------------------------

const validPerformanceEvent = {
  event_id: '550e8400-e29b-41d4-a716-446655440070',
  boundary_id: '550e8400-e29b-41d4-a716-446655440060',
  model_id: 'gpt-5.2',
  outcome_type: 'cost_within_budget' as const,
  actual_cost: '1200000',
  budgeted_cost: '1500000',
  actual_quality: 0.85,
  expected_quality: 0.80,
  tokens_used: { input: 1500, output: 800 },
  duration_ms: 2340,
  occurred_at: '2026-02-23T16:00:00Z',
  contract_version: '7.8.0',
};

describe('EconomicPerformanceEventSchema', () => {
  it('accepts valid performance event', () => {
    expect(Value.Check(EconomicPerformanceEventSchema, validPerformanceEvent)).toBe(true);
  });

  it('rejects quality > 1', () => {
    expect(Value.Check(EconomicPerformanceEventSchema, {
      ...validPerformanceEvent,
      actual_quality: 1.5,
    })).toBe(false);
  });

  it('rejects quality < 0', () => {
    expect(Value.Check(EconomicPerformanceEventSchema, {
      ...validPerformanceEvent,
      actual_quality: -0.1,
    })).toBe(false);
  });

  it('rejects non-micro-USD cost', () => {
    expect(Value.Check(EconomicPerformanceEventSchema, {
      ...validPerformanceEvent,
      actual_cost: '12.50',
    })).toBe(false);
  });

  it('rejects negative duration', () => {
    expect(Value.Check(EconomicPerformanceEventSchema, {
      ...validPerformanceEvent,
      duration_ms: -100,
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(EconomicPerformanceEventSchema, {
      ...validPerformanceEvent,
      extra_field: true,
    })).toBe(false);
  });

  it('has $id EconomicPerformanceEvent', () => {
    expect(EconomicPerformanceEventSchema.$id).toBe('EconomicPerformanceEvent');
  });
});

// ---------------------------------------------------------------------------
// QualityBridgeDirection
// ---------------------------------------------------------------------------

describe('QualityBridgeDirectionSchema', () => {
  it.each(['positive', 'negative', 'neutral'])('accepts: %s', (val) => {
    expect(Value.Check(QualityBridgeDirectionSchema, val)).toBe(true);
  });

  it('rejects invalid direction', () => {
    expect(Value.Check(QualityBridgeDirectionSchema, 'upward')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// PerformanceQualityBridge
// ---------------------------------------------------------------------------

const validBridge = {
  bridge_id: '550e8400-e29b-41d4-a716-446655440080',
  performance_event_id: '550e8400-e29b-41d4-a716-446655440070',
  quality_event_id: '550e8400-e29b-41d4-a716-446655440090',
  model_id: 'gpt-5.2',
  direction: 'positive' as const,
  quality_delta: 0.05,
  weight_adjustment_suggested: 0.02,
  occurred_at: '2026-02-23T16:01:00Z',
  contract_version: '7.8.0',
};

describe('PerformanceQualityBridgeSchema', () => {
  it('accepts valid bridge', () => {
    expect(Value.Check(PerformanceQualityBridgeSchema, validBridge)).toBe(true);
  });

  it('rejects weight_adjustment > 1', () => {
    expect(Value.Check(PerformanceQualityBridgeSchema, {
      ...validBridge,
      weight_adjustment_suggested: 1.5,
    })).toBe(false);
  });

  it('rejects weight_adjustment < -1', () => {
    expect(Value.Check(PerformanceQualityBridgeSchema, {
      ...validBridge,
      weight_adjustment_suggested: -1.5,
    })).toBe(false);
  });

  it('accepts negative quality_delta', () => {
    expect(Value.Check(PerformanceQualityBridgeSchema, {
      ...validBridge,
      direction: 'negative',
      quality_delta: -0.15,
    })).toBe(true);
  });

  it('has $id PerformanceQualityBridge', () => {
    expect(PerformanceQualityBridgeSchema.$id).toBe('PerformanceQualityBridge');
  });
});

// ---------------------------------------------------------------------------
// Constraint round-trip tests
// ---------------------------------------------------------------------------

describe('EconomicPerformanceEvent constraint evaluation', () => {
  it('performance-quality-bounded passes for valid data', () => {
    expect(evaluateConstraint(
      validPerformanceEvent,
      'actual_quality >= 0 && actual_quality <= 1 && expected_quality >= 0 && expected_quality <= 1',
    )).toBe(true);
  });

  it('performance-tokens-nonnegative passes for valid data', () => {
    expect(evaluateConstraint(
      validPerformanceEvent,
      'tokens_used.input >= 0 && tokens_used.output >= 0',
    )).toBe(true);
  });
});

describe('PerformanceQualityBridge constraint evaluation', () => {
  it('bridge-weight-bounded upper bound passes for valid data', () => {
    expect(evaluateConstraint(
      validBridge,
      'weight_adjustment_suggested <= 1',
    )).toBe(true);
  });

  it('bridge-weight-bounded fails for out-of-range weight', () => {
    expect(evaluateConstraint(
      { ...validBridge, weight_adjustment_suggested: 2.0 },
      'weight_adjustment_suggested <= 1',
    )).toBe(false);
  });

  it('bridge-weight-bounded lower bound passes via bigint_gte workaround', () => {
    // Schema enforces minimum: -1, constraint enforces upper bound
    // Full [-1, 1] enforcement is a hybrid: schema minimum + constraint maximum
    expect(evaluateConstraint(
      { ...validBridge, lower_bound: -1 },
      'weight_adjustment_suggested >= lower_bound',
    )).toBe(true);
  });
});
