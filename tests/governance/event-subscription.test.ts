/**
 * Tests for EventSubscription schemas (v7.5.0, DR-S1).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid, uri)
import {
  EventFilterSchema,
  DeliveryMethodSchema,
  EventCursorSchema,
  EventSubscriptionSchema,
} from '../../src/governance/event-subscription.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('EventFilterSchema', () => {
  it('accepts empty filter (no criteria)', () => {
    expect(Value.Check(EventFilterSchema, {})).toBe(true);
  });

  it('accepts filter with personality_ids', () => {
    expect(Value.Check(EventFilterSchema, { personality_ids: ['p1', 'p2'] })).toBe(true);
  });

  it('accepts filter with score_thresholds', () => {
    expect(Value.Check(EventFilterSchema, { score_thresholds: { min: 0.3, max: 0.8 } })).toBe(true);
  });

  it('accepts combined filters', () => {
    expect(Value.Check(EventFilterSchema, {
      collection_ids: ['c1'],
      event_types: ['state_changed'],
      state_transitions: ['cold→warming'],
    })).toBe(true);
  });

  it('rejects score_thresholds outside [0,1]', () => {
    expect(Value.Check(EventFilterSchema, { score_thresholds: { min: -0.1 } })).toBe(false);
    expect(Value.Check(EventFilterSchema, { score_thresholds: { max: 1.5 } })).toBe(false);
  });
});

describe('DeliveryMethodSchema', () => {
  it('accepts webhook', () => {
    expect(Value.Check(DeliveryMethodSchema, 'webhook')).toBe(true);
  });

  it('accepts sse', () => {
    expect(Value.Check(DeliveryMethodSchema, 'sse')).toBe(true);
  });

  it('rejects unknown method', () => {
    expect(Value.Check(DeliveryMethodSchema, 'grpc')).toBe(false);
  });
});

describe('EventCursorSchema', () => {
  it('accepts cursor with after_event_id', () => {
    expect(Value.Check(EventCursorSchema, {
      after_event_id: '550e8400-e29b-41d4-a716-446655440000',
      limit: 50,
    })).toBe(true);
  });

  it('accepts cursor with after_timestamp', () => {
    expect(Value.Check(EventCursorSchema, {
      after_timestamp: '2026-01-01T00:00:00Z',
    })).toBe(true);
  });

  it('accepts empty cursor', () => {
    expect(Value.Check(EventCursorSchema, {})).toBe(true);
  });
});

describe('EventSubscriptionSchema', () => {
  const validSubscription = {
    subscription_id: '550e8400-e29b-41d4-a716-446655440000',
    subscriber_id: 'svc-analytics',
    pool_id: 'pool-alpha',
    filter: { collection_ids: ['c1'] },
    delivery: {
      method: 'webhook' as const,
      endpoint: 'https://example.com/hook',
    },
    active: true,
    created_at: '2026-02-23T00:00:00Z',
    contract_version: '7.5.0',
  };

  it('accepts valid webhook subscription', () => {
    expect(Value.Check(EventSubscriptionSchema, validSubscription)).toBe(true);
  });

  it('accepts valid SSE subscription without endpoint', () => {
    const sse = { ...validSubscription, delivery: { method: 'sse' as const } };
    expect(Value.Check(EventSubscriptionSchema, sse)).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { subscription_id: _, ...incomplete } = validSubscription;
    expect(Value.Check(EventSubscriptionSchema, incomplete)).toBe(false);
  });

  it('has correct $id', () => {
    expect(EventSubscriptionSchema.$id).toBe('EventSubscription');
  });
});

describe('EventSubscription constraints', () => {
  it('webhook-needs-endpoint: passes when webhook has endpoint', () => {
    const data = { delivery: { method: 'webhook', endpoint: 'https://example.com' } };
    expect(evaluateConstraint(data, "delivery.method != 'webhook' || delivery.endpoint != null")).toBe(true);
  });

  it('webhook-needs-endpoint: fails when webhook has no endpoint', () => {
    const data = { delivery: { method: 'webhook' } };
    expect(evaluateConstraint(data, "delivery.method != 'webhook' || delivery.endpoint != null")).toBe(false);
  });

  it('webhook-needs-endpoint: passes for SSE without endpoint', () => {
    const data = { delivery: { method: 'sse' } };
    expect(evaluateConstraint(data, "delivery.method != 'webhook' || delivery.endpoint != null")).toBe(true);
  });

  it('cursor-exclusive: passes with only after_event_id', () => {
    const data = { cursor: { after_event_id: 'abc', after_timestamp: null } };
    expect(evaluateConstraint(data, 'cursor == null || cursor.after_event_id == null || cursor.after_timestamp == null')).toBe(true);
  });

  it('cursor-exclusive: passes with no cursor', () => {
    const data = { cursor: null };
    expect(evaluateConstraint(data, 'cursor == null || cursor.after_event_id == null || cursor.after_timestamp == null')).toBe(true);
  });
});
