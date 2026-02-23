/**
 * Tests for Economic Boundary schemas — the membrane between trust and capital.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @since v7.7.0 (Sprint 2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  TrustLayerSnapshotSchema,
  CapitalLayerSnapshotSchema,
  AccessDecisionSchema,
  EconomicBoundarySchema,
} from '../../src/economy/economic-boundary.js';

// ---------------------------------------------------------------------------
// TrustLayerSnapshot
// ---------------------------------------------------------------------------

describe('TrustLayerSnapshotSchema', () => {
  const valid = {
    reputation_state: 'established',
    blended_score: 0.82,
    snapshot_at: '2026-02-20T10:00:00Z',
  };

  it('accepts valid trust layer snapshot', () => {
    expect(Value.Check(TrustLayerSnapshotSchema, valid)).toBe(true);
  });

  it('has correct $id', () => {
    expect(TrustLayerSnapshotSchema.$id).toBe('TrustLayerSnapshot');
  });

  it('rejects blended_score > 1', () => {
    expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, blended_score: 1.5 })).toBe(false);
  });

  it('rejects blended_score < 0', () => {
    expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, blended_score: -0.1 })).toBe(false);
  });

  it('rejects invalid reputation_state', () => {
    expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, reputation_state: 'unknown' })).toBe(false);
  });

  it('rejects missing snapshot_at', () => {
    const { snapshot_at, ...rest } = valid;
    expect(Value.Check(TrustLayerSnapshotSchema, rest)).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, extra: true })).toBe(false);
  });

  it('accepts all valid reputation states', () => {
    for (const state of ['cold', 'warming', 'established', 'authoritative']) {
      expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, reputation_state: state })).toBe(true);
    }
  });

  it('accepts boundary scores 0 and 1', () => {
    expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, blended_score: 0 })).toBe(true);
    expect(Value.Check(TrustLayerSnapshotSchema, { ...valid, blended_score: 1 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CapitalLayerSnapshot
// ---------------------------------------------------------------------------

describe('CapitalLayerSnapshotSchema', () => {
  const valid = {
    budget_remaining: '50000000',
    billing_tier: 'standard',
    budget_period_end: '2026-03-01T00:00:00Z',
  };

  it('accepts valid capital layer snapshot', () => {
    expect(Value.Check(CapitalLayerSnapshotSchema, valid)).toBe(true);
  });

  it('has correct $id', () => {
    expect(CapitalLayerSnapshotSchema.$id).toBe('CapitalLayerSnapshot');
  });

  it('rejects non-numeric budget_remaining', () => {
    expect(Value.Check(CapitalLayerSnapshotSchema, { ...valid, budget_remaining: 'abc' })).toBe(false);
  });

  it('rejects floating-point budget_remaining', () => {
    expect(Value.Check(CapitalLayerSnapshotSchema, { ...valid, budget_remaining: '123.45' })).toBe(false);
  });

  it('rejects empty billing_tier', () => {
    expect(Value.Check(CapitalLayerSnapshotSchema, { ...valid, billing_tier: '' })).toBe(false);
  });

  it('rejects missing budget_period_end', () => {
    const { budget_period_end, ...rest } = valid;
    expect(Value.Check(CapitalLayerSnapshotSchema, rest)).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(CapitalLayerSnapshotSchema, { ...valid, extra: true })).toBe(false);
  });

  it('accepts zero budget', () => {
    expect(Value.Check(CapitalLayerSnapshotSchema, { ...valid, budget_remaining: '0' })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// AccessDecision
// ---------------------------------------------------------------------------

describe('AccessDecisionSchema', () => {
  it('accepts granted decision', () => {
    expect(Value.Check(AccessDecisionSchema, { granted: true })).toBe(true);
  });

  it('accepts granted with policy_id', () => {
    expect(Value.Check(AccessDecisionSchema, {
      granted: true,
      policy_id: 'policy-default',
    })).toBe(true);
  });

  it('accepts denied with reason', () => {
    expect(Value.Check(AccessDecisionSchema, {
      granted: false,
      denial_reason: 'Insufficient reputation.',
    })).toBe(true);
  });

  it('accepts denied with both policy_id and reason', () => {
    expect(Value.Check(AccessDecisionSchema, {
      granted: false,
      policy_id: 'policy-reputation-gated',
      denial_reason: 'Cold state insufficient.',
    })).toBe(true);
  });

  it('has correct $id', () => {
    expect(AccessDecisionSchema.$id).toBe('AccessDecision');
  });

  it('rejects missing granted field', () => {
    expect(Value.Check(AccessDecisionSchema, { denial_reason: 'test' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(AccessDecisionSchema, { granted: true, extra: 'bad' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// EconomicBoundary
// ---------------------------------------------------------------------------

describe('EconomicBoundarySchema', () => {
  const valid = {
    boundary_id: '550e8400-e29b-41d4-a716-446655440060',
    personality_id: 'agent-alpha',
    collection_id: 'collection-alpha',
    trust_layer: {
      reputation_state: 'established',
      blended_score: 0.82,
      snapshot_at: '2026-02-20T10:00:00Z',
    },
    capital_layer: {
      budget_remaining: '50000000',
      billing_tier: 'standard',
      budget_period_end: '2026-03-01T00:00:00Z',
    },
    access_decision: {
      granted: true,
      policy_id: 'policy-default-access',
    },
    evaluated_at: '2026-02-20T10:00:01Z',
    contract_version: '7.7.0',
  };

  it('accepts valid economic boundary', () => {
    expect(Value.Check(EconomicBoundarySchema, valid)).toBe(true);
  });

  it('has correct $id', () => {
    expect(EconomicBoundarySchema.$id).toBe('EconomicBoundary');
  });

  it('rejects empty personality_id', () => {
    expect(Value.Check(EconomicBoundarySchema, { ...valid, personality_id: '' })).toBe(false);
  });

  it('rejects empty collection_id', () => {
    expect(Value.Check(EconomicBoundarySchema, { ...valid, collection_id: '' })).toBe(false);
  });

  it('rejects invalid boundary_id (not uuid)', () => {
    expect(Value.Check(EconomicBoundarySchema, { ...valid, boundary_id: 'not-a-uuid' })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(EconomicBoundarySchema, { ...valid, contract_version: 'v7.7.0' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(EconomicBoundarySchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects missing trust_layer', () => {
    const { trust_layer, ...rest } = valid;
    expect(Value.Check(EconomicBoundarySchema, rest)).toBe(false);
  });

  it('rejects missing capital_layer', () => {
    const { capital_layer, ...rest } = valid;
    expect(Value.Check(EconomicBoundarySchema, rest)).toBe(false);
  });

  it('rejects missing access_decision', () => {
    const { access_decision, ...rest } = valid;
    expect(Value.Check(EconomicBoundarySchema, rest)).toBe(false);
  });

  it('accepts denied access with reason', () => {
    const denied = {
      ...valid,
      access_decision: {
        granted: false,
        denial_reason: 'Reputation state cold does not meet minimum warming.',
      },
    };
    expect(Value.Check(EconomicBoundarySchema, denied)).toBe(true);
  });

  it('round-trips trust_layer snapshot with all reputation states', () => {
    for (const state of ['cold', 'warming', 'established', 'authoritative']) {
      const modified = {
        ...valid,
        trust_layer: { ...valid.trust_layer, reputation_state: state },
      };
      expect(Value.Check(EconomicBoundarySchema, modified)).toBe(true);
    }
  });
});
