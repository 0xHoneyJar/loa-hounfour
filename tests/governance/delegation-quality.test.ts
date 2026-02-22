/**
 * Tests for DelegationQuality schemas (v7.5.0, DR-S3).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  QualitySignalLevelSchema,
  OutcomeQualityMappingSchema,
  DEFAULT_OUTCOME_QUALITY_MAPPING,
  QUALITY_SIGNAL_SCORES,
  DelegationQualityEventSchema,
  type QualitySignalLevel,
} from '../../src/governance/delegation-quality.js';

describe('QualitySignalLevelSchema', () => {
  const validLevels: QualitySignalLevel[] = ['high', 'moderate', 'low', 'negative'];

  for (const level of validLevels) {
    it(`accepts "${level}"`, () => {
      expect(Value.Check(QualitySignalLevelSchema, level)).toBe(true);
    });
  }

  it('rejects unknown level', () => {
    expect(Value.Check(QualitySignalLevelSchema, 'medium')).toBe(false);
    expect(Value.Check(QualitySignalLevelSchema, 'excellent')).toBe(false);
  });

  it('has correct $id', () => {
    expect(QualitySignalLevelSchema.$id).toBe('QualitySignalLevel');
  });
});

describe('OutcomeQualityMappingSchema', () => {
  it('accepts valid mapping', () => {
    expect(Value.Check(OutcomeQualityMappingSchema, {
      unanimous: 'high',
      majority: 'moderate',
      deadlock: 'low',
      escalation: 'negative',
    })).toBe(true);
  });

  it('accepts non-default mapping', () => {
    expect(Value.Check(OutcomeQualityMappingSchema, {
      unanimous: 'high',
      majority: 'high',
      deadlock: 'moderate',
      escalation: 'low',
    })).toBe(true);
  });

  it('rejects missing outcome type', () => {
    expect(Value.Check(OutcomeQualityMappingSchema, {
      unanimous: 'high',
      majority: 'moderate',
      deadlock: 'low',
    })).toBe(false);
  });

  it('rejects invalid signal level', () => {
    expect(Value.Check(OutcomeQualityMappingSchema, {
      unanimous: 'high',
      majority: 'moderate',
      deadlock: 'low',
      escalation: 'unknown',
    })).toBe(false);
  });

  it('has correct $id', () => {
    expect(OutcomeQualityMappingSchema.$id).toBe('OutcomeQualityMapping');
  });
});

describe('DEFAULT_OUTCOME_QUALITY_MAPPING', () => {
  it('maps unanimous to high', () => {
    expect(DEFAULT_OUTCOME_QUALITY_MAPPING.unanimous).toBe('high');
  });

  it('maps majority to moderate', () => {
    expect(DEFAULT_OUTCOME_QUALITY_MAPPING.majority).toBe('moderate');
  });

  it('maps deadlock to low', () => {
    expect(DEFAULT_OUTCOME_QUALITY_MAPPING.deadlock).toBe('low');
  });

  it('maps escalation to negative', () => {
    expect(DEFAULT_OUTCOME_QUALITY_MAPPING.escalation).toBe('negative');
  });

  it('validates against schema', () => {
    expect(Value.Check(OutcomeQualityMappingSchema, DEFAULT_OUTCOME_QUALITY_MAPPING)).toBe(true);
  });
});

describe('QUALITY_SIGNAL_SCORES', () => {
  it('high is 0.95', () => {
    expect(QUALITY_SIGNAL_SCORES.high).toBe(0.95);
  });

  it('moderate is 0.70', () => {
    expect(QUALITY_SIGNAL_SCORES.moderate).toBe(0.70);
  });

  it('low is 0.35', () => {
    expect(QUALITY_SIGNAL_SCORES.low).toBe(0.35);
  });

  it('negative is 0.10', () => {
    expect(QUALITY_SIGNAL_SCORES.negative).toBe(0.10);
  });

  it('all scores are in [0, 1]', () => {
    for (const score of Object.values(QUALITY_SIGNAL_SCORES)) {
      expect(score).toBeGreaterThanOrEqual(0);
      expect(score).toBeLessThanOrEqual(1);
    }
  });

  it('scores are monotonically decreasing: high > moderate > low > negative', () => {
    expect(QUALITY_SIGNAL_SCORES.high).toBeGreaterThan(QUALITY_SIGNAL_SCORES.moderate);
    expect(QUALITY_SIGNAL_SCORES.moderate).toBeGreaterThan(QUALITY_SIGNAL_SCORES.low);
    expect(QUALITY_SIGNAL_SCORES.low).toBeGreaterThan(QUALITY_SIGNAL_SCORES.negative);
  });
});

describe('DelegationQualityEventSchema', () => {
  const validEvent = {
    event_id: 'aa0e8400-e29b-41d4-a716-446655440100',
    outcome_id: 'bb0e8400-e29b-41d4-a716-446655440200',
    tree_node_id: 'node-root',
    personality_id: 'personality-alice',
    collection_id: 'collection-alpha',
    pool_id: 'pool-1',
    outcome_type: 'unanimous' as const,
    quality_signal: 'high' as const,
    quality_score: 0.95,
    mapping_used: {
      unanimous: 'high' as const,
      majority: 'moderate' as const,
      deadlock: 'low' as const,
      escalation: 'negative' as const,
    },
    occurred_at: '2026-02-23T12:00:00Z',
    contract_version: '7.5.0',
  };

  it('accepts valid event', () => {
    expect(Value.Check(DelegationQualityEventSchema, validEvent)).toBe(true);
  });

  it('accepts event with optional model_id', () => {
    const withModel = { ...validEvent, model_id: 'gpt-4o' };
    expect(Value.Check(DelegationQualityEventSchema, withModel)).toBe(true);
  });

  it('accepts escalation with negative signal', () => {
    const escalation = {
      ...validEvent,
      outcome_type: 'escalation' as const,
      quality_signal: 'negative' as const,
      quality_score: 0.10,
    };
    expect(Value.Check(DelegationQualityEventSchema, escalation)).toBe(true);
  });

  it('rejects missing personality_id', () => {
    const { personality_id: _, ...incomplete } = validEvent;
    expect(Value.Check(DelegationQualityEventSchema, incomplete)).toBe(false);
  });

  it('rejects missing outcome_type', () => {
    const { outcome_type: _, ...incomplete } = validEvent;
    expect(Value.Check(DelegationQualityEventSchema, incomplete)).toBe(false);
  });

  it('rejects quality_score outside [0, 1]', () => {
    expect(Value.Check(DelegationQualityEventSchema, { ...validEvent, quality_score: 1.5 })).toBe(false);
    expect(Value.Check(DelegationQualityEventSchema, { ...validEvent, quality_score: -0.1 })).toBe(false);
  });

  it('rejects invalid outcome_type', () => {
    expect(Value.Check(DelegationQualityEventSchema, { ...validEvent, outcome_type: 'consensus' })).toBe(false);
  });

  it('rejects invalid quality_signal', () => {
    expect(Value.Check(DelegationQualityEventSchema, { ...validEvent, quality_signal: 'medium' })).toBe(false);
  });

  it('has correct $id', () => {
    expect(DelegationQualityEventSchema.$id).toBe('DelegationQualityEvent');
  });
});

describe('Delegation Quality integration', () => {
  it('DEFAULT_OUTCOME_QUALITY_MAPPING values all have corresponding scores', () => {
    for (const signal of Object.values(DEFAULT_OUTCOME_QUALITY_MAPPING)) {
      expect(QUALITY_SIGNAL_SCORES[signal]).toBeDefined();
      expect(typeof QUALITY_SIGNAL_SCORES[signal]).toBe('number');
    }
  });

  it('score lookup from default mapping is consistent', () => {
    expect(QUALITY_SIGNAL_SCORES[DEFAULT_OUTCOME_QUALITY_MAPPING.unanimous]).toBe(0.95);
    expect(QUALITY_SIGNAL_SCORES[DEFAULT_OUTCOME_QUALITY_MAPPING.majority]).toBe(0.70);
    expect(QUALITY_SIGNAL_SCORES[DEFAULT_OUTCOME_QUALITY_MAPPING.deadlock]).toBe(0.35);
    expect(QUALITY_SIGNAL_SCORES[DEFAULT_OUTCOME_QUALITY_MAPPING.escalation]).toBe(0.10);
  });
});
