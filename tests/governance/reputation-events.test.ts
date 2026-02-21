/**
 * Tests for Reputation Event Payload Schemas (S3-T2).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ReputationStateChangedPayloadSchema,
  QualityEventRecordedPayloadSchema,
  CollectionScoreUpdatedPayloadSchema,
  type ReputationStateChangedPayload,
  type QualityEventRecordedPayload,
  type CollectionScoreUpdatedPayload,
} from '../../src/governance/reputation-events.js';

// ---------------------------------------------------------------------------
// ReputationStateChangedPayload
// ---------------------------------------------------------------------------

describe('ReputationStateChangedPayloadSchema', () => {
  const valid: ReputationStateChangedPayload = {
    personality_id: 'bear-001',
    collection_id: 'honeycomb',
    pool_id: 'pool-alpha',
    from_state: 'cold',
    to_state: 'warming',
    trigger: 'First QualityEvent recorded',
    blended_score: 0.5,
  };

  it('has $id = ReputationStateChangedPayload', () => {
    expect(ReputationStateChangedPayloadSchema.$id).toBe('ReputationStateChangedPayload');
  });

  it('validates a correct payload', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, valid)).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects invalid from_state', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, from_state: 'unknown' })).toBe(false);
  });

  it('rejects invalid to_state', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, to_state: 'unknown' })).toBe(false);
  });

  it('rejects blended_score out of range', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, blended_score: 1.5 })).toBe(false);
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, blended_score: -0.1 })).toBe(false);
  });

  it('rejects empty trigger', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, trigger: '' })).toBe(false);
  });

  it('accepts boundary blended_score values', () => {
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, blended_score: 0 })).toBe(true);
    expect(Value.Check(ReputationStateChangedPayloadSchema, { ...valid, blended_score: 1 })).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// QualityEventRecordedPayload
// ---------------------------------------------------------------------------

describe('QualityEventRecordedPayloadSchema', () => {
  const valid: QualityEventRecordedPayload = {
    personality_id: 'bear-001',
    pool_id: 'pool-alpha',
    quality_event_id: 'qe-001',
    composite_score: 0.88,
    new_sample_count: 5,
    new_blended_score: 0.73,
  };

  it('has $id = QualityEventRecordedPayload', () => {
    expect(QualityEventRecordedPayloadSchema.$id).toBe('QualityEventRecordedPayload');
  });

  it('validates a correct payload', () => {
    expect(Value.Check(QualityEventRecordedPayloadSchema, valid)).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(QualityEventRecordedPayloadSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects new_sample_count < 1', () => {
    expect(Value.Check(QualityEventRecordedPayloadSchema, { ...valid, new_sample_count: 0 })).toBe(false);
  });

  it('rejects composite_score out of range', () => {
    expect(Value.Check(QualityEventRecordedPayloadSchema, { ...valid, composite_score: 1.5 })).toBe(false);
  });

  it('rejects new_blended_score out of range', () => {
    expect(Value.Check(QualityEventRecordedPayloadSchema, { ...valid, new_blended_score: -0.1 })).toBe(false);
  });

  it('rejects empty quality_event_id', () => {
    expect(Value.Check(QualityEventRecordedPayloadSchema, { ...valid, quality_event_id: '' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CollectionScoreUpdatedPayload
// ---------------------------------------------------------------------------

describe('CollectionScoreUpdatedPayloadSchema', () => {
  const valid: CollectionScoreUpdatedPayload = {
    collection_id: 'honeycomb',
    pool_id: 'pool-alpha',
    new_score: 0.65,
    member_count: 25,
    trimmed_count: 5,
  };

  it('has $id = CollectionScoreUpdatedPayload', () => {
    expect(CollectionScoreUpdatedPayloadSchema.$id).toBe('CollectionScoreUpdatedPayload');
  });

  it('validates a correct payload', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, valid)).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects new_score out of range', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, new_score: 1.1 })).toBe(false);
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, new_score: -0.1 })).toBe(false);
  });

  it('rejects negative member_count', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, member_count: -1 })).toBe(false);
  });

  it('rejects negative trimmed_count', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, trimmed_count: -1 })).toBe(false);
  });

  it('accepts zero member_count and trimmed_count', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, member_count: 0, trimmed_count: 0 })).toBe(true);
  });

  it('rejects empty collection_id', () => {
    expect(Value.Check(CollectionScoreUpdatedPayloadSchema, { ...valid, collection_id: '' })).toBe(false);
  });
});
