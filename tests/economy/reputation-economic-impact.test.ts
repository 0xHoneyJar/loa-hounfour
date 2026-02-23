/**
 * Tests for Reputation Economic Impact schemas — the feedback loop from trust to capital.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @since v7.7.0 (Sprint 2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  EconomicImpactTypeSchema,
  ReputationTriggerEventSchema,
  EconomicImpactEntrySchema,
  ReputationEconomicImpactSchema,
} from '../../src/economy/reputation-economic-impact.js';

// ---------------------------------------------------------------------------
// EconomicImpactType
// ---------------------------------------------------------------------------

describe('EconomicImpactTypeSchema', () => {
  const validTypes = [
    'tier_upgrade',
    'tier_downgrade',
    'access_granted',
    'access_revoked',
    'budget_adjusted',
    'routing_changed',
  ];

  for (const t of validTypes) {
    it(`accepts "${t}"`, () => {
      expect(Value.Check(EconomicImpactTypeSchema, t)).toBe(true);
    });
  }

  it('has correct $id', () => {
    expect(EconomicImpactTypeSchema.$id).toBe('EconomicImpactType');
  });

  it('rejects unknown values', () => {
    expect(Value.Check(EconomicImpactTypeSchema, 'unknown')).toBe(false);
    expect(Value.Check(EconomicImpactTypeSchema, '')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ReputationTriggerEvent
// ---------------------------------------------------------------------------

describe('ReputationTriggerEventSchema', () => {
  it('accepts state_transition with from/to states', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'state_transition',
      from_state: 'warming',
      to_state: 'established',
      score_delta: 0.15,
    })).toBe(true);
  });

  it('accepts score_change with delta only', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'score_change',
      score_delta: -0.05,
    })).toBe(true);
  });

  it('accepts demotion event', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'demotion',
      from_state: 'established',
      to_state: 'warming',
    })).toBe(true);
  });

  it('accepts decay event', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'decay',
      score_delta: -0.01,
    })).toBe(true);
  });

  it('has correct $id', () => {
    expect(ReputationTriggerEventSchema.$id).toBe('ReputationTriggerEvent');
  });

  it('rejects invalid event_type', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'unknown',
    })).toBe(false);
  });

  it('rejects invalid reputation state', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'state_transition',
      from_state: 'nonexistent',
      to_state: 'established',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'decay',
      extra: true,
    })).toBe(false);
  });

  it('accepts minimal trigger (event_type only)', () => {
    expect(Value.Check(ReputationTriggerEventSchema, {
      event_type: 'decay',
    })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// EconomicImpactEntry
// ---------------------------------------------------------------------------

describe('EconomicImpactEntrySchema', () => {
  it('accepts valid entry with policy_version_id', () => {
    expect(Value.Check(EconomicImpactEntrySchema, {
      impact_type: 'tier_upgrade',
      description: 'Promoted to standard tier.',
      policy_version_id: '550e8400-e29b-41d4-a716-446655440071',
    })).toBe(true);
  });

  it('accepts valid entry without policy_version_id', () => {
    expect(Value.Check(EconomicImpactEntrySchema, {
      impact_type: 'access_revoked',
      description: 'Access removed due to demotion.',
    })).toBe(true);
  });

  it('has correct $id', () => {
    expect(EconomicImpactEntrySchema.$id).toBe('EconomicImpactEntry');
  });

  it('rejects empty description', () => {
    expect(Value.Check(EconomicImpactEntrySchema, {
      impact_type: 'tier_upgrade',
      description: '',
    })).toBe(false);
  });

  it('rejects invalid impact_type', () => {
    expect(Value.Check(EconomicImpactEntrySchema, {
      impact_type: 'unknown',
      description: 'Bad type.',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(EconomicImpactEntrySchema, {
      impact_type: 'tier_upgrade',
      description: 'Valid.',
      extra: true,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ReputationEconomicImpact
// ---------------------------------------------------------------------------

describe('ReputationEconomicImpactSchema', () => {
  const valid = {
    impact_id: '550e8400-e29b-41d4-a716-446655440070',
    personality_id: 'agent-alpha',
    collection_id: 'collection-alpha',
    trigger_event: {
      event_type: 'state_transition',
      from_state: 'warming',
      to_state: 'established',
      score_delta: 0.15,
    },
    impacts: [
      {
        impact_type: 'tier_upgrade',
        description: 'Agent promoted to standard billing tier.',
      },
    ],
    occurred_at: '2026-02-20T10:00:00Z',
    contract_version: '7.7.0',
  };

  it('accepts valid reputation economic impact', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, valid)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ReputationEconomicImpactSchema.$id).toBe('ReputationEconomicImpact');
  });

  it('rejects empty impacts array', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, { ...valid, impacts: [] })).toBe(false);
  });

  it('accepts multiple impacts', () => {
    const multi = {
      ...valid,
      impacts: [
        { impact_type: 'tier_upgrade', description: 'Promoted.' },
        { impact_type: 'budget_adjusted', description: 'Budget increased.' },
        { impact_type: 'routing_changed', description: 'Routing updated.' },
      ],
    };
    expect(Value.Check(ReputationEconomicImpactSchema, multi)).toBe(true);
  });

  it('rejects empty personality_id', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, { ...valid, personality_id: '' })).toBe(false);
  });

  it('rejects empty collection_id', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, { ...valid, collection_id: '' })).toBe(false);
  });

  it('rejects invalid impact_id (not uuid)', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, { ...valid, impact_id: 'not-uuid' })).toBe(false);
  });

  it('rejects invalid contract_version', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, { ...valid, contract_version: 'bad' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ReputationEconomicImpactSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects missing trigger_event', () => {
    const { trigger_event, ...rest } = valid;
    expect(Value.Check(ReputationEconomicImpactSchema, rest)).toBe(false);
  });

  it('round-trips all impact types', () => {
    const types = ['tier_upgrade', 'tier_downgrade', 'access_granted', 'access_revoked', 'budget_adjusted', 'routing_changed'];
    for (const t of types) {
      const modified = {
        ...valid,
        impacts: [{ impact_type: t, description: `Impact: ${t}` }],
      };
      expect(Value.Check(ReputationEconomicImpactSchema, modified)).toBe(true);
    }
  });
});
