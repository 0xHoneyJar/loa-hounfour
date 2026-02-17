/**
 * Tests for MonetaryPolicy schema — coupling minting to conservation invariants.
 *
 * @see SDD §2.4 — MonetaryPolicy Schema
 * @since v7.0.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  ReviewTriggerSchema,
  MonetaryPolicySchema,
} from '../../src/economy/monetary-policy.js';

// ---------------------------------------------------------------------------
// ReviewTrigger
// ---------------------------------------------------------------------------

describe('ReviewTriggerSchema', () => {
  it('accepts epoch_boundary trigger', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'epoch_boundary',
      epoch_interval: 30,
    })).toBe(true);
  });

  it('accepts supply_threshold trigger', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'supply_threshold',
      threshold_pct: 80,
    })).toBe(true);
  });

  it('accepts manual trigger', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'manual',
    })).toBe(true);
  });

  it('accepts governance_vote trigger', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'governance_vote',
    })).toBe(true);
  });

  it('rejects invalid trigger_type', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'unknown',
    })).toBe(false);
  });

  it('rejects threshold_pct > 100', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'supply_threshold',
      threshold_pct: 150,
    })).toBe(false);
  });

  it('rejects epoch_interval < 1', () => {
    expect(Value.Check(ReviewTriggerSchema, {
      trigger_type: 'epoch_boundary',
      epoch_interval: 0,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// MonetaryPolicy
// ---------------------------------------------------------------------------

describe('MonetaryPolicySchema', () => {
  const validPolicy = {
    policy_id: '00000000-0000-0000-0000-000000000201',
    registry_id: '00000000-0000-0000-0000-000000000020',
    minting_policy_id: 'mp-treasury-001',
    conservation_ceiling: '100000000000',
    coupling_invariant: 'bigint_gte(collateral, bigint_sub(conservation_ceiling, current_supply))',
    collateral_ratio_bps: 15000,
    review_trigger: {
      trigger_type: 'epoch_boundary',
      epoch_interval: 30,
    },
    last_reviewed_at: '2026-01-01T00:00:00Z',
    contract_version: '7.0.0',
  };

  it('accepts valid policy', () => {
    expect(Value.Check(MonetaryPolicySchema, validPolicy)).toBe(true);
  });

  it('accepts null last_reviewed_at', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, last_reviewed_at: null })).toBe(true);
  });

  it('rejects non-uuid policy_id', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, policy_id: 'not-a-uuid' })).toBe(false);
  });

  it('rejects non-numeric conservation_ceiling', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, conservation_ceiling: 'abc' })).toBe(false);
  });

  it('rejects negative collateral_ratio_bps', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, collateral_ratio_bps: -100 })).toBe(false);
  });

  it('rejects empty minting_policy_id', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, minting_policy_id: '' })).toBe(false);
  });

  it('rejects empty coupling_invariant', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, coupling_invariant: '' })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, contract_version: 'v7' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(MonetaryPolicySchema, { ...validPolicy, extra: true })).toBe(false);
  });
});
