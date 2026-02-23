/**
 * Tests for ReputationRoutingSignal schema and sub-types.
 *
 * @see DR-S7 — Reputation as routing signal
 * @since v7.6.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  RoutingSignalTypeSchema,
  ReputationRoutingSignalSchema,
} from '../../src/governance/reputation-routing.js';

// ---------------------------------------------------------------------------
// RoutingSignalType
// ---------------------------------------------------------------------------

describe('RoutingSignalTypeSchema', () => {
  it('accepts all valid signal types', () => {
    for (const t of ['model_preference', 'task_eligibility', 'delegation_priority']) {
      expect(Value.Check(RoutingSignalTypeSchema, t), `type: ${t}`).toBe(true);
    }
  });

  it('rejects invalid signal type', () => {
    expect(Value.Check(RoutingSignalTypeSchema, 'unknown_signal')).toBe(false);
    expect(Value.Check(RoutingSignalTypeSchema, '')).toBe(false);
  });

  it('has correct $id', () => {
    expect(RoutingSignalTypeSchema.$id).toBe('RoutingSignalType');
  });
});

// ---------------------------------------------------------------------------
// ReputationRoutingSignal
// ---------------------------------------------------------------------------

describe('ReputationRoutingSignalSchema', () => {
  const validSignal = {
    signal_id: '550e8400-e29b-41d4-a716-446655440060',
    personality_id: 'personality-alpha',
    signal_type: 'model_preference',
    qualifying_state: 'established',
    qualifying_score: 0.75,
    model_preferences: [
      { model_id: 'claude-opus', min_cohort_score: 0.8 },
      { model_id: 'gpt-4o', min_cohort_score: 0.7 },
    ],
    routing_weight: 0.6,
    effective_at: '2026-01-15T00:00:00Z',
    contract_version: '7.6.0',
  };

  it('accepts valid model preference signal', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, validSignal)).toBe(true);
  });

  it('accepts signal without model_preferences', () => {
    const { model_preferences, ...without } = validSignal;
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...without,
      signal_type: 'task_eligibility',
    })).toBe(true);
  });

  it('accepts signal with expires_at', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      expires_at: '2026-07-15T00:00:00Z',
    })).toBe(true);
  });

  it('rejects qualifying_score out of range', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      qualifying_score: 1.5,
    })).toBe(false);
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      qualifying_score: -0.1,
    })).toBe(false);
  });

  it('rejects routing_weight out of range', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      routing_weight: 1.5,
    })).toBe(false);
  });

  it('rejects non-uuid signal_id', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      signal_id: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects empty personality_id', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      personality_id: '',
    })).toBe(false);
  });

  it('rejects invalid effective_at format', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      effective_at: 'not-a-date',
    })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      contract_version: 'v7',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      extra_field: true,
    })).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReputationRoutingSignalSchema.$id).toBe('ReputationRoutingSignal');
  });

  it('accepts all valid qualifying states', () => {
    for (const state of ['cold', 'warming', 'established', 'authoritative']) {
      expect(Value.Check(ReputationRoutingSignalSchema, {
        ...validSignal,
        qualifying_state: state,
      }), `state: ${state}`).toBe(true);
    }
  });

  it('rejects invalid qualifying state', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      qualifying_state: 'unknown_state',
    })).toBe(false);
  });

  it('rejects model preference with empty model_id', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      model_preferences: [{ model_id: '', min_cohort_score: 0.5 }],
    })).toBe(false);
  });

  it('rejects model preference with min_cohort_score out of range', () => {
    expect(Value.Check(ReputationRoutingSignalSchema, {
      ...validSignal,
      model_preferences: [{ model_id: 'claude-opus', min_cohort_score: 1.5 }],
    })).toBe(false);
  });
});
