/**
 * Tests for CollectionGovernanceConfig schemas (v7.6.0, DR-S5 + DR-S6).
 *
 * Validates per-collection governance configuration including:
 * - Bayesian conservatism parameter (pseudo_count)
 * - State machine transition thresholds
 * - Temporal decay policy with demotion rules
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  DemotionRuleSchema,
  ReputationDecayPolicySchema,
  CollectionGovernanceConfigSchema,
  DEFAULT_DEMOTION_RULES,
  type DemotionRule,
  type CollectionGovernanceConfig,
} from '../../src/governance/collection-governance-config.js';

// ---------------------------------------------------------------------------
// DemotionRule
// ---------------------------------------------------------------------------

describe('DemotionRuleSchema', () => {
  const validRule: DemotionRule = {
    from_state: 'authoritative',
    to_state: 'established',
    inactivity_days: 90,
    require_decayed_below: 0.7,
  };

  it('accepts a valid demotion rule', () => {
    expect(Value.Check(DemotionRuleSchema, validRule)).toBe(true);
  });

  it('accepts rule without require_decayed_below', () => {
    const { require_decayed_below: _, ...minimal } = validRule;
    expect(Value.Check(DemotionRuleSchema, minimal)).toBe(true);
  });

  it('rejects inactivity_days < 1', () => {
    expect(Value.Check(DemotionRuleSchema, { ...validRule, inactivity_days: 0 })).toBe(false);
  });

  it('rejects require_decayed_below > 1', () => {
    expect(Value.Check(DemotionRuleSchema, { ...validRule, require_decayed_below: 1.5 })).toBe(false);
  });

  it('rejects require_decayed_below < 0', () => {
    expect(Value.Check(DemotionRuleSchema, { ...validRule, require_decayed_below: -0.1 })).toBe(false);
  });

  it('accepts all valid state pairs', () => {
    const pairs: [string, string][] = [
      ['authoritative', 'established'],
      ['established', 'warming'],
      ['warming', 'cold'],
      ['authoritative', 'cold'],
    ];
    for (const [from, to] of pairs) {
      expect(Value.Check(DemotionRuleSchema, {
        from_state: from,
        to_state: to,
        inactivity_days: 30,
      })).toBe(true);
    }
  });
});

// ---------------------------------------------------------------------------
// ReputationDecayPolicy
// ---------------------------------------------------------------------------

describe('ReputationDecayPolicySchema', () => {
  const validPolicy = {
    half_life_days: 30,
    demotion_rules: [
      { from_state: 'authoritative', to_state: 'established', inactivity_days: 90 },
    ],
    enable_auto_demotion: false,
  };

  it('accepts a valid decay policy', () => {
    expect(Value.Check(ReputationDecayPolicySchema, validPolicy)).toBe(true);
  });

  it('accepts empty demotion rules', () => {
    expect(Value.Check(ReputationDecayPolicySchema, {
      ...validPolicy,
      demotion_rules: [],
    })).toBe(true);
  });

  it('rejects half_life_days < 1', () => {
    expect(Value.Check(ReputationDecayPolicySchema, {
      ...validPolicy,
      half_life_days: 0,
    })).toBe(false);
  });

  it('accepts multiple demotion rules', () => {
    expect(Value.Check(ReputationDecayPolicySchema, {
      half_life_days: 60,
      demotion_rules: [
        { from_state: 'authoritative', to_state: 'established', inactivity_days: 90, require_decayed_below: 0.7 },
        { from_state: 'established', to_state: 'warming', inactivity_days: 180 },
      ],
      enable_auto_demotion: true,
    })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// CollectionGovernanceConfig
// ---------------------------------------------------------------------------

describe('CollectionGovernanceConfigSchema', () => {
  const validConfig: CollectionGovernanceConfig = {
    config_id: '550e8400-e29b-41d4-a716-446655440050',
    collection_id: 'collection-alpha',
    pseudo_count: 3,
    state_thresholds: {
      warming_min_events: 1,
      established_min_samples: 5,
      authoritative_min_weight: 0.9,
    },
    decay_policy: {
      half_life_days: 30,
      demotion_rules: [
        { from_state: 'authoritative', to_state: 'established', inactivity_days: 90 },
      ],
      enable_auto_demotion: false,
    },
    updated_at: '2026-01-15T10:00:00Z',
    contract_version: '7.6.0',
  };

  it('accepts a valid config', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, validConfig)).toBe(true);
  });

  it('rejects pseudo_count < 1', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      pseudo_count: 0,
    })).toBe(false);
  });

  it('rejects missing collection_id', () => {
    const { collection_id: _, ...without } = validConfig;
    expect(Value.Check(CollectionGovernanceConfigSchema, without)).toBe(false);
  });

  it('rejects empty collection_id', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      collection_id: '',
    })).toBe(false);
  });

  it('rejects authoritative_min_weight > 1', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      state_thresholds: { ...validConfig.state_thresholds, authoritative_min_weight: 1.1 },
    })).toBe(false);
  });

  it('rejects authoritative_min_weight < 0', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      state_thresholds: { ...validConfig.state_thresholds, authoritative_min_weight: -0.1 },
    })).toBe(false);
  });

  it('rejects established_min_samples < 1', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      state_thresholds: { ...validConfig.state_thresholds, established_min_samples: 0 },
    })).toBe(false);
  });

  it('rejects invalid uuid for config_id', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      config_id: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      contract_version: 'v7.6.0',
    })).toBe(false);
  });

  // Conservative community (high k)
  it('accepts conservative community config (k=10)', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      pseudo_count: 10,
      state_thresholds: {
        warming_min_events: 3,
        established_min_samples: 15,
        authoritative_min_weight: 0.95,
      },
      decay_policy: {
        half_life_days: 90,
        demotion_rules: [
          { from_state: 'authoritative', to_state: 'established', inactivity_days: 180, require_decayed_below: 0.5 },
        ],
        enable_auto_demotion: true,
      },
    })).toBe(true);
  });

  // Permissive community (low k)
  it('accepts permissive community config (k=1)', () => {
    expect(Value.Check(CollectionGovernanceConfigSchema, {
      ...validConfig,
      pseudo_count: 1,
      state_thresholds: {
        warming_min_events: 1,
        established_min_samples: 2,
        authoritative_min_weight: 0.5,
      },
      decay_policy: {
        half_life_days: 7,
        demotion_rules: [],
        enable_auto_demotion: false,
      },
    })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// DEFAULT_DEMOTION_RULES
// ---------------------------------------------------------------------------

describe('DEFAULT_DEMOTION_RULES', () => {
  it('has 2 default rules', () => {
    expect(DEFAULT_DEMOTION_RULES).toHaveLength(2);
  });

  it('first rule demotes authoritative → established', () => {
    expect(DEFAULT_DEMOTION_RULES[0].from_state).toBe('authoritative');
    expect(DEFAULT_DEMOTION_RULES[0].to_state).toBe('established');
    expect(DEFAULT_DEMOTION_RULES[0].inactivity_days).toBe(90);
  });

  it('second rule demotes established → warming', () => {
    expect(DEFAULT_DEMOTION_RULES[1].from_state).toBe('established');
    expect(DEFAULT_DEMOTION_RULES[1].to_state).toBe('warming');
    expect(DEFAULT_DEMOTION_RULES[1].inactivity_days).toBe(180);
  });

  it('all default rules validate against schema', () => {
    for (const rule of DEFAULT_DEMOTION_RULES) {
      expect(Value.Check(DemotionRuleSchema, rule)).toBe(true);
    }
  });

  it('only demotes backward in state machine', () => {
    const stateOrder = ['cold', 'warming', 'established', 'authoritative'];
    for (const rule of DEFAULT_DEMOTION_RULES) {
      const fromIdx = stateOrder.indexOf(rule.from_state);
      const toIdx = stateOrder.indexOf(rule.to_state);
      expect(fromIdx).toBeGreaterThan(toIdx);
    }
  });
});

// ---------------------------------------------------------------------------
// Integration: pseudo_count impact on personal weight
// ---------------------------------------------------------------------------

describe('Integration: pseudo_count impact', () => {
  it('k=3 (default): 27 observations yields w=0.9, 28 exceeds', async () => {
    const { computePersonalWeight } = await import('../../src/governance/reputation-aggregate.js');
    expect(computePersonalWeight(27, 3)).toBeCloseTo(0.9, 10);
    expect(computePersonalWeight(28, 3)).toBeGreaterThan(0.9);
  });

  it('k=10 (conservative): 90 observations yields w=0.9, 91 exceeds', async () => {
    const { computePersonalWeight } = await import('../../src/governance/reputation-aggregate.js');
    expect(computePersonalWeight(90, 10)).toBeCloseTo(0.9, 10);
    expect(computePersonalWeight(91, 10)).toBeGreaterThan(0.9);
  });

  it('k=1 (permissive): 9 observations yields w=0.9, 10 exceeds', async () => {
    const { computePersonalWeight } = await import('../../src/governance/reputation-aggregate.js');
    expect(computePersonalWeight(9, 1)).toBeCloseTo(0.9, 10);
    expect(computePersonalWeight(10, 1)).toBeGreaterThan(0.9);
  });

  it('all k values produce w=0 at sampleCount=0', async () => {
    const { computePersonalWeight } = await import('../../src/governance/reputation-aggregate.js');
    for (const k of [1, 3, 5, 10]) {
      expect(computePersonalWeight(0, k)).toBe(0);
    }
  });
});
