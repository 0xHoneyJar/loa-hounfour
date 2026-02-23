import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ConformanceCategorySchema,
  CONFORMANCE_CATEGORIES,
  type ConformanceCategory,
} from '../../src/vocabulary/conformance-category.js';

describe('ConformanceCategorySchema', () => {
  const validCategories: ConformanceCategory[] = [
    'provider-normalization',
    'pricing-calculation',
    'thinking-trace',
    'tool-call-roundtrip',
    'ensemble-position',
    'reservation-enforcement',
    'delegation-chain',
    'inter-agent-transaction',
    'conservation-properties',
    'jwt-boundary',
    'agent-identity',
  ];

  for (const category of validCategories) {
    it(`accepts "${category}"`, () => {
      expect(Value.Check(ConformanceCategorySchema, category)).toBe(true);
    });
  }

  it('rejects unknown values', () => {
    expect(Value.Check(ConformanceCategorySchema, 'unknown')).toBe(false);
    expect(Value.Check(ConformanceCategorySchema, '')).toBe(false);
    expect(Value.Check(ConformanceCategorySchema, 'PROVIDER_NORMALIZATION')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(ConformanceCategorySchema, 42)).toBe(false);
    expect(Value.Check(ConformanceCategorySchema, null)).toBe(false);
    expect(Value.Check(ConformanceCategorySchema, true)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ConformanceCategorySchema.$id).toBe('ConformanceCategory');
  });
});

describe('CONFORMANCE_CATEGORIES', () => {
  it('contains exactly 30 categories', () => {
    expect(CONFORMANCE_CATEGORIES).toHaveLength(30);
  });

  it('includes all valid categories', () => {
    expect(CONFORMANCE_CATEGORIES).toContain('provider-normalization');
    expect(CONFORMANCE_CATEGORIES).toContain('pricing-calculation');
    expect(CONFORMANCE_CATEGORIES).toContain('thinking-trace');
    expect(CONFORMANCE_CATEGORIES).toContain('tool-call-roundtrip');
    expect(CONFORMANCE_CATEGORIES).toContain('ensemble-position');
    expect(CONFORMANCE_CATEGORIES).toContain('reservation-enforcement');
    expect(CONFORMANCE_CATEGORIES).toContain('delegation-chain');
    expect(CONFORMANCE_CATEGORIES).toContain('inter-agent-transaction');
    expect(CONFORMANCE_CATEGORIES).toContain('conservation-properties');
    expect(CONFORMANCE_CATEGORIES).toContain('jwt-boundary');
  });

  it('is typed as readonly', () => {
    // `as const` provides compile-time immutability; verify values are correct at runtime
    const categories: readonly string[] = CONFORMANCE_CATEGORIES;
    expect(categories).toEqual([
      'provider-normalization',
      'pricing-calculation',
      'thinking-trace',
      'tool-call-roundtrip',
      'ensemble-position',
      'reservation-enforcement',
      'delegation-chain',
      'inter-agent-transaction',
      'conservation-properties',
      'jwt-boundary',
      'agent-identity',
      'capability-scoped-trust',
      'liveness-properties',
      'registry-bridge',
      'delegation-tree',
      'bridge-transfer-saga',
      'delegation-outcome',
      'monetary-policy',
      'permission-boundary',
      'governance-proposal',
      'micro-usdc',
      'personality-assignment',
      'reputation-aggregate',
      'reputation-credential',
      'access-policy',
      'event-subscription',
      'reputation-portability',
      'delegation-quality',
      'collection-governance-config',
      'constraint-lifecycle',
    ]);
  });
});
