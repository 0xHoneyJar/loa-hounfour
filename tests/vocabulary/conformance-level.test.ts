import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ConformanceLevelSchema,
  CONFORMANCE_LEVEL_ORDER,
  type ConformanceLevel,
} from '../../src/schemas/model/conformance-level.js';

describe('ConformanceLevelSchema', () => {
  it('accepts self_declared', () => {
    expect(Value.Check(ConformanceLevelSchema, 'self_declared')).toBe(true);
  });

  it('accepts community_verified', () => {
    expect(Value.Check(ConformanceLevelSchema, 'community_verified')).toBe(true);
  });

  it('accepts protocol_certified', () => {
    expect(Value.Check(ConformanceLevelSchema, 'protocol_certified')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(Value.Check(ConformanceLevelSchema, 'unknown')).toBe(false);
    expect(Value.Check(ConformanceLevelSchema, '')).toBe(false);
    expect(Value.Check(ConformanceLevelSchema, 'SELF_DECLARED')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(ConformanceLevelSchema, 42)).toBe(false);
    expect(Value.Check(ConformanceLevelSchema, null)).toBe(false);
    expect(Value.Check(ConformanceLevelSchema, true)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ConformanceLevelSchema.$id).toBe('ConformanceLevel');
  });
});

describe('CONFORMANCE_LEVEL_ORDER', () => {
  it('orders self_declared < community_verified < protocol_certified', () => {
    expect(CONFORMANCE_LEVEL_ORDER.self_declared).toBeLessThan(
      CONFORMANCE_LEVEL_ORDER.community_verified,
    );
    expect(CONFORMANCE_LEVEL_ORDER.community_verified).toBeLessThan(
      CONFORMANCE_LEVEL_ORDER.protocol_certified,
    );
  });

  it('covers all ConformanceLevel values', () => {
    const levels: ConformanceLevel[] = [
      'self_declared',
      'community_verified',
      'protocol_certified',
    ];
    for (const level of levels) {
      expect(CONFORMANCE_LEVEL_ORDER[level]).toBeDefined();
    }
  });
});
