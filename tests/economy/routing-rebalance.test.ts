/**
 * Tests for RoutingRebalanceEvent schema (v7.8.0, DR-F2).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  RebalanceTriggerTypeSchema,
  RoutingRebalanceEventSchema,
} from '../../src/economy/routing-rebalance.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('RebalanceTriggerTypeSchema', () => {
  it.each(['periodic', 'threshold_breach', 'manual', 'performance_driven'])('accepts: %s', (val) => {
    expect(Value.Check(RebalanceTriggerTypeSchema, val)).toBe(true);
  });

  it('rejects invalid trigger type', () => {
    expect(Value.Check(RebalanceTriggerTypeSchema, 'automatic')).toBe(false);
  });
});

const validRebalance = {
  event_id: '550e8400-e29b-41d4-a716-446655440100',
  trigger_type: 'periodic' as const,
  before_composition_id: '550e8400-e29b-41d4-a716-446655440101',
  after_composition_id: '550e8400-e29b-41d4-a716-446655440102',
  performance_window_start: '2026-02-01T00:00:00Z',
  performance_window_end: '2026-02-23T00:00:00Z',
  occurred_at: '2026-02-23T16:00:00Z',
  contract_version: '7.8.0',
};

describe('RoutingRebalanceEventSchema', () => {
  it('accepts valid rebalance event', () => {
    expect(Value.Check(RoutingRebalanceEventSchema, validRebalance)).toBe(true);
  });

  it('accepts without optional fields', () => {
    const { performance_window_start, performance_window_end, trigger_details, ...required } = validRebalance;
    expect(Value.Check(RoutingRebalanceEventSchema, required)).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(RoutingRebalanceEventSchema, {
      ...validRebalance,
      extra: true,
    })).toBe(false);
  });

  it('has $id RoutingRebalanceEvent', () => {
    expect(RoutingRebalanceEventSchema.$id).toBe('RoutingRebalanceEvent');
  });
});

describe('RoutingRebalanceEvent constraint evaluation', () => {
  it('rebalance-compositions-differ passes when IDs differ', () => {
    expect(evaluateConstraint(
      validRebalance,
      'before_composition_id != after_composition_id',
    )).toBe(true);
  });

  it('rebalance-compositions-differ fails when IDs match', () => {
    expect(evaluateConstraint(
      { ...validRebalance, after_composition_id: validRebalance.before_composition_id },
      'before_composition_id != after_composition_id',
    )).toBe(false);
  });

  it('rebalance-window-ordered passes when end is after start', () => {
    expect(evaluateConstraint(
      validRebalance,
      'performance_window_start == null || performance_window_end == null || is_after(performance_window_end, performance_window_start)',
    )).toBe(true);
  });
});
