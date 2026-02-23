/**
 * Tests for Community Engagement Signal schemas.
 *
 * @see DR-S10 — Community engagement primitives
 * @since v7.7.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  EngagementSignalTypeSchema,
  CommunityEngagementSignalSchema,
} from '../../src/governance/community-engagement.js';

// ---------------------------------------------------------------------------
// EngagementSignalType
// ---------------------------------------------------------------------------

describe('EngagementSignalTypeSchema', () => {
  const validTypes = ['participation', 'endorsement', 'contribution', 'cultural_resonance'];

  for (const t of validTypes) {
    it(`accepts "${t}"`, () => {
      expect(Value.Check(EngagementSignalTypeSchema, t)).toBe(true);
    });
  }

  it('has correct $id', () => {
    expect(EngagementSignalTypeSchema.$id).toBe('EngagementSignalType');
  });

  it('rejects unknown values', () => {
    expect(Value.Check(EngagementSignalTypeSchema, 'unknown')).toBe(false);
    expect(Value.Check(EngagementSignalTypeSchema, '')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(EngagementSignalTypeSchema, 42)).toBe(false);
    expect(Value.Check(EngagementSignalTypeSchema, null)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CommunityEngagementSignal
// ---------------------------------------------------------------------------

describe('CommunityEngagementSignalSchema', () => {
  const valid = {
    signal_id: '550e8400-e29b-41d4-a716-446655440090',
    personality_id: 'agent-alpha',
    collection_id: 'collection-alpha',
    signal_type: 'participation',
    weight: 0.6,
    context: 'Voted in governance proposal GP-2026-001.',
    source_event_id: '550e8400-e29b-41d4-a716-446655440091',
    recorded_at: '2026-02-20T10:00:00Z',
    contract_version: '7.7.0',
  };

  it('accepts valid engagement signal with all fields', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, valid)).toBe(true);
  });

  it('accepts engagement signal without optional fields', () => {
    const { context, source_event_id, ...minimal } = valid;
    expect(Value.Check(CommunityEngagementSignalSchema, minimal)).toBe(true);
  });

  it('has correct $id', () => {
    expect(CommunityEngagementSignalSchema.$id).toBe('CommunityEngagementSignal');
  });

  it('rejects weight > 1', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, weight: 1.5 })).toBe(false);
  });

  it('rejects weight < 0', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, weight: -0.1 })).toBe(false);
  });

  it('accepts boundary weights 0 and 1', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, weight: 0 })).toBe(true);
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, weight: 1 })).toBe(true);
  });

  it('rejects empty personality_id', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, personality_id: '' })).toBe(false);
  });

  it('rejects empty collection_id', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, collection_id: '' })).toBe(false);
  });

  it('rejects invalid signal_type', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, signal_type: 'unknown' })).toBe(false);
  });

  it('rejects invalid signal_id (not uuid)', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, signal_id: 'bad' })).toBe(false);
  });

  it('rejects invalid contract_version', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, contract_version: 'bad' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, extra: true })).toBe(false);
  });

  it('validates all signal types', () => {
    for (const t of ['participation', 'endorsement', 'contribution', 'cultural_resonance']) {
      expect(Value.Check(CommunityEngagementSignalSchema, { ...valid, signal_type: t })).toBe(true);
    }
  });
});
