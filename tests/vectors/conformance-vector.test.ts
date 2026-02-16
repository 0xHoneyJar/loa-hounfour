/**
 * Tests for ConformanceVector meta-schema and sub-schemas.
 *
 * Validates MatchingRulesSchema, CrossFieldExpectationSchema,
 * and ConformanceVectorSchema per SDD §3.3.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  MatchingRulesSchema,
  CrossFieldExpectationSchema,
  ConformanceVectorSchema,
  type ConformanceVector,
  type MatchingRules,
} from '../../src/schemas/model/conformance-vector.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeVector(overrides: Partial<ConformanceVector> = {}): ConformanceVector {
  return {
    vector_id: 'conformance-normalization-001',
    category: 'provider-normalization',
    description: 'Basic provider normalization test',
    contract_version: '5.1.0',
    input: { model: 'gpt-4', prompt: 'hello' },
    expected_output: { model_id: 'gpt-4', content: 'hello' },
    expected_valid: true,
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// MatchingRulesSchema
// ---------------------------------------------------------------------------

describe('MatchingRulesSchema', () => {
  it('accepts empty object (all fields optional)', () => {
    expect(Value.Check(MatchingRulesSchema, {})).toBe(true);
  });

  it('accepts full matching rules', () => {
    const rules: MatchingRules = {
      select_fields: ['model_id', 'content'],
      volatile_fields: ['timestamp', 'request_id'],
      numeric_tolerance: 0.001,
      canonicalize_strings: true,
      null_handling: 'strict',
    };
    expect(Value.Check(MatchingRulesSchema, rules)).toBe(true);
  });

  it('accepts null_handling = "equivalent"', () => {
    expect(Value.Check(MatchingRulesSchema, { null_handling: 'equivalent' })).toBe(true);
  });

  it('rejects unknown null_handling values', () => {
    expect(Value.Check(MatchingRulesSchema, { null_handling: 'loose' })).toBe(false);
  });

  it('rejects negative numeric_tolerance', () => {
    expect(Value.Check(MatchingRulesSchema, { numeric_tolerance: -0.01 })).toBe(false);
  });

  it('rejects empty string in select_fields', () => {
    expect(Value.Check(MatchingRulesSchema, { select_fields: [''] })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(MatchingRulesSchema, { unknown_field: true })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// CrossFieldExpectationSchema
// ---------------------------------------------------------------------------

describe('CrossFieldExpectationSchema', () => {
  it('accepts valid expectation', () => {
    const exp = {
      rule_id: 'certified-requires-vectors',
      expected_severity: 'error',
    };
    expect(Value.Check(CrossFieldExpectationSchema, exp)).toBe(true);
  });

  it('accepts warning severity', () => {
    const exp = {
      rule_id: 'community-no-vectors',
      expected_severity: 'warning',
    };
    expect(Value.Check(CrossFieldExpectationSchema, exp)).toBe(true);
  });

  it('accepts optional expected_message_pattern', () => {
    const exp = {
      rule_id: 'test-rule',
      expected_severity: 'error',
      expected_message_pattern: 'must provide.*vectors',
    };
    expect(Value.Check(CrossFieldExpectationSchema, exp)).toBe(true);
  });

  it('rejects empty rule_id', () => {
    expect(Value.Check(CrossFieldExpectationSchema, {
      rule_id: '',
      expected_severity: 'error',
    })).toBe(false);
  });

  it('rejects unknown severity', () => {
    expect(Value.Check(CrossFieldExpectationSchema, {
      rule_id: 'test',
      expected_severity: 'info',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(CrossFieldExpectationSchema, {
      rule_id: 'test',
      expected_severity: 'error',
      extra: true,
    })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ConformanceVectorSchema
// ---------------------------------------------------------------------------

describe('ConformanceVectorSchema', () => {
  it('accepts a minimal valid vector', () => {
    expect(Value.Check(ConformanceVectorSchema, makeVector())).toBe(true);
  });

  it('accepts a vector with all optional fields', () => {
    const full = makeVector({
      matching_rules: {
        select_fields: ['model_id'],
        volatile_fields: ['timestamp'],
        numeric_tolerance: 0.01,
        canonicalize_strings: false,
        null_handling: 'equivalent',
      },
      cross_field_validations: [
        { rule_id: 'test-rule', expected_severity: 'error' },
      ],
      metadata: { author: 'test', ticket: 'S2-T2' },
    });
    expect(Value.Check(ConformanceVectorSchema, full)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ConformanceVectorSchema.$id).toBe('ConformanceVector');
  });

  // vector_id pattern tests
  describe('vector_id pattern', () => {
    it('accepts conformance-normalization-001', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-normalization-001',
      }))).toBe(true);
    });

    it('accepts conformance-pricing-123', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-pricing-123',
      }))).toBe(true);
    });

    it('rejects missing prefix', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'normalization-001',
      }))).toBe(false);
    });

    it('rejects uppercase category', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-NORM-001',
      }))).toBe(false);
    });

    it('rejects non-numeric suffix', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-pricing-abc',
      }))).toBe(false);
    });

    // v5.2.0 — Dual-pattern: 4-digit IDs and hyphenated categories
    it('accepts 4-digit vector ID (v5.2.0)', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-reservation-enforcement-0001',
      }))).toBe(true);
    });

    it('accepts hyphenated category in ID', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-tool-call-roundtrip-001',
      }))).toBe(true);
    });

    it('accepts alphanumeric category with digits', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-v2-pricing-0001',
      }))).toBe(true);
    });

    it('rejects leading digit in category', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-2fast-001',
      }))).toBe(false);
    });

    it('rejects 2-digit suffix', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-pricing-01',
      }))).toBe(false);
    });

    it('rejects 5-digit suffix', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-pricing-00001',
      }))).toBe(false);
    });

    it('preserves backward compatibility with 3-digit IDs', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        vector_id: 'conformance-pricing-999',
      }))).toBe(true);
    });
  });

  // category validation
  describe('category', () => {
    it('accepts all valid categories', () => {
      const categories = [
        'provider-normalization',
        'pricing-calculation',
        'thinking-trace',
        'tool-call-roundtrip',
        'ensemble-position',
      ] as const;
      for (const category of categories) {
        expect(Value.Check(ConformanceVectorSchema, makeVector({ category }))).toBe(true);
      }
    });

    it('rejects invalid category', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        category: 'unknown' as never,
      }))).toBe(false);
    });
  });

  // contract_version pattern
  describe('contract_version', () => {
    it('accepts semver format', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        contract_version: '5.1.0',
      }))).toBe(true);
    });

    it('rejects non-semver', () => {
      expect(Value.Check(ConformanceVectorSchema, makeVector({
        contract_version: 'v5.1.0',
      }))).toBe(false);
    });
  });

  // expected_valid field
  it('requires expected_valid boolean', () => {
    const vec = makeVector();
    delete (vec as Record<string, unknown>).expected_valid;
    expect(Value.Check(ConformanceVectorSchema, vec)).toBe(false);
  });

  // additionalProperties
  it('rejects additional properties', () => {
    const vec = { ...makeVector(), extra_field: true };
    expect(Value.Check(ConformanceVectorSchema, vec)).toBe(false);
  });
});
