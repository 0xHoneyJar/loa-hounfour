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
  it('contains exactly 6 categories', () => {
    expect(CONFORMANCE_CATEGORIES).toHaveLength(6);
  });

  it('includes all valid categories', () => {
    expect(CONFORMANCE_CATEGORIES).toContain('provider-normalization');
    expect(CONFORMANCE_CATEGORIES).toContain('pricing-calculation');
    expect(CONFORMANCE_CATEGORIES).toContain('thinking-trace');
    expect(CONFORMANCE_CATEGORIES).toContain('tool-call-roundtrip');
    expect(CONFORMANCE_CATEGORIES).toContain('ensemble-position');
    expect(CONFORMANCE_CATEGORIES).toContain('reservation-enforcement');
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
    ]);
  });
});
