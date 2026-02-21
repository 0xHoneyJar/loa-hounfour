/**
 * Tests for Reputation Command Schemas (S3-T1).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time)
import {
  RecordQualityEventCommandSchema,
  QueryReputationCommandSchema,
  ResetReputationCommandSchema,
  type RecordQualityEventCommand,
  type QueryReputationCommand,
  type ResetReputationCommand,
} from '../../src/governance/reputation-commands.js';

const VALID_QUALITY_EVENT = {
  event_id: 'qe-001',
  personality_id: 'bear-001',
  collection_id: 'honeycomb',
  pool_id: 'pool-alpha',
  satisfaction: 0.8,
  coherence: 0.9,
  safety: 1.0,
  composite_score: 0.88,
  evaluator_id: 'evaluator-1',
  occurred_at: '2026-02-21T01:00:00Z',
  contract_version: '7.2.0',
};

// ---------------------------------------------------------------------------
// RecordQualityEventCommand
// ---------------------------------------------------------------------------

describe('RecordQualityEventCommandSchema', () => {
  const valid: RecordQualityEventCommand = {
    command_id: 'cmd-001',
    quality_event: VALID_QUALITY_EVENT,
    contract_version: '7.2.0',
  };

  it('has $id = RecordQualityEventCommand', () => {
    expect(RecordQualityEventCommandSchema.$id).toBe('RecordQualityEventCommand');
  });

  it('validates a correct command', () => {
    expect(Value.Check(RecordQualityEventCommandSchema, valid)).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(RecordQualityEventCommandSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects empty command_id', () => {
    expect(Value.Check(RecordQualityEventCommandSchema, { ...valid, command_id: '' })).toBe(false);
  });

  it('rejects missing quality_event', () => {
    const { quality_event, ...rest } = valid;
    expect(Value.Check(RecordQualityEventCommandSchema, rest)).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(RecordQualityEventCommandSchema, { ...valid, contract_version: 'abc' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// QueryReputationCommand
// ---------------------------------------------------------------------------

describe('QueryReputationCommandSchema', () => {
  const valid: QueryReputationCommand = {
    command_id: 'cmd-002',
    personality_id: 'bear-001',
    pool_id: 'pool-alpha',
    contract_version: '7.2.0',
  };

  it('has $id = QueryReputationCommand', () => {
    expect(QueryReputationCommandSchema.$id).toBe('QueryReputationCommand');
  });

  it('validates a correct command without include_history', () => {
    expect(Value.Check(QueryReputationCommandSchema, valid)).toBe(true);
  });

  it('validates with include_history = true', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, include_history: true })).toBe(true);
  });

  it('validates with include_history = false', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, include_history: false })).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects empty personality_id', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, personality_id: '' })).toBe(false);
  });

  it('rejects empty pool_id', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, pool_id: '' })).toBe(false);
  });

  // v7.2.0 — collection_id (Bridgebuilder Finding F2)
  it('validates with optional collection_id present', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, collection_id: 'honeycomb' })).toBe(true);
  });

  it('validates without collection_id (backwards compatible)', () => {
    expect(Value.Check(QueryReputationCommandSchema, valid)).toBe(true);
  });

  it('rejects empty collection_id', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, collection_id: '' })).toBe(false);
  });

  // v7.3.0 — model_id (Bridgebuilder C5 + Spec I)
  it('validates with optional model_id present', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, model_id: 'native' })).toBe(true);
  });

  it('validates without model_id (backwards compatible)', () => {
    expect(Value.Check(QueryReputationCommandSchema, valid)).toBe(true);
  });

  it('rejects empty model_id', () => {
    expect(Value.Check(QueryReputationCommandSchema, { ...valid, model_id: '' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ResetReputationCommand
// ---------------------------------------------------------------------------

describe('ResetReputationCommandSchema', () => {
  const valid: ResetReputationCommand = {
    command_id: 'cmd-003',
    personality_id: 'bear-001',
    collection_id: 'honeycomb',
    pool_id: 'pool-alpha',
    reason: 'Manual reset by governance',
    actor: 'admin-1',
    contract_version: '7.2.0',
  };

  it('has $id = ResetReputationCommand', () => {
    expect(ResetReputationCommandSchema.$id).toBe('ResetReputationCommand');
  });

  it('validates a correct command', () => {
    expect(Value.Check(ResetReputationCommandSchema, valid)).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ResetReputationCommandSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects empty reason', () => {
    expect(Value.Check(ResetReputationCommandSchema, { ...valid, reason: '' })).toBe(false);
  });

  it('rejects empty actor', () => {
    expect(Value.Check(ResetReputationCommandSchema, { ...valid, actor: '' })).toBe(false);
  });

  it('rejects missing collection_id', () => {
    const { collection_id, ...rest } = valid;
    expect(Value.Check(ResetReputationCommandSchema, rest)).toBe(false);
  });
});
