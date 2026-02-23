/**
 * Tests for Model Economic Profile schemas — the SDR basket for multi-model economics.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @since v7.7.0 (Sprint 2)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  CostPerTokenSchema,
  ModelEconomicProfileSchema,
} from '../../src/economy/model-economic-profile.js';

// ---------------------------------------------------------------------------
// CostPerToken
// ---------------------------------------------------------------------------

describe('CostPerTokenSchema', () => {
  const valid = { input: '250', output: '1000' };

  it('accepts valid cost per token', () => {
    expect(Value.Check(CostPerTokenSchema, valid)).toBe(true);
  });

  it('has correct $id', () => {
    expect(CostPerTokenSchema.$id).toBe('CostPerToken');
  });

  it('rejects non-numeric input', () => {
    expect(Value.Check(CostPerTokenSchema, { input: 'abc', output: '1000' })).toBe(false);
  });

  it('rejects non-numeric output', () => {
    expect(Value.Check(CostPerTokenSchema, { input: '250', output: 'xyz' })).toBe(false);
  });

  it('rejects floating-point values', () => {
    expect(Value.Check(CostPerTokenSchema, { input: '2.5', output: '1000' })).toBe(false);
  });

  it('accepts zero cost', () => {
    expect(Value.Check(CostPerTokenSchema, { input: '0', output: '0' })).toBe(true);
  });

  it('rejects negative values (pattern)', () => {
    expect(Value.Check(CostPerTokenSchema, { input: '-100', output: '1000' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(CostPerTokenSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects missing fields', () => {
    expect(Value.Check(CostPerTokenSchema, { input: '250' })).toBe(false);
    expect(Value.Check(CostPerTokenSchema, { output: '1000' })).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// ModelEconomicProfile
// ---------------------------------------------------------------------------

describe('ModelEconomicProfileSchema', () => {
  const valid = {
    profile_id: '550e8400-e29b-41d4-a716-446655440080',
    model_id: 'gpt-4o',
    cost_per_token: {
      input: '250',
      output: '1000',
    },
    quality_yield: 0.87,
    routing_weight: 0.4,
    sample_count: 15000,
    effective_at: '2026-02-01T00:00:00Z',
    contract_version: '7.7.0',
  };

  it('accepts valid model economic profile', () => {
    expect(Value.Check(ModelEconomicProfileSchema, valid)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ModelEconomicProfileSchema.$id).toBe('ModelEconomicProfile');
  });

  it('rejects quality_yield > 1', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, quality_yield: 1.5 })).toBe(false);
  });

  it('rejects quality_yield < 0', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, quality_yield: -0.1 })).toBe(false);
  });

  it('rejects routing_weight > 1', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, routing_weight: 1.5 })).toBe(false);
  });

  it('rejects routing_weight < 0', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, routing_weight: -0.1 })).toBe(false);
  });

  it('accepts boundary values for quality_yield', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, quality_yield: 0 })).toBe(true);
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, quality_yield: 1 })).toBe(true);
  });

  it('accepts boundary values for routing_weight', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, routing_weight: 0 })).toBe(true);
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, routing_weight: 1 })).toBe(true);
  });

  it('rejects empty model_id', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, model_id: '' })).toBe(false);
  });

  it('rejects invalid profile_id (not uuid)', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, profile_id: 'bad-uuid' })).toBe(false);
  });

  it('rejects non-integer sample_count', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, sample_count: 1.5 })).toBe(false);
  });

  it('rejects negative sample_count', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, sample_count: -1 })).toBe(false);
  });

  it('accepts zero sample_count', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, sample_count: 0 })).toBe(true);
  });

  it('rejects invalid contract_version', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, contract_version: 'v7.7' })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ModelEconomicProfileSchema, { ...valid, extra: true })).toBe(false);
  });

  it('rejects missing cost_per_token', () => {
    const { cost_per_token, ...rest } = valid;
    expect(Value.Check(ModelEconomicProfileSchema, rest)).toBe(false);
  });

  it('validates native model profile', () => {
    const native = {
      ...valid,
      profile_id: '550e8400-e29b-41d4-a716-446655440081',
      model_id: 'native',
      cost_per_token: { input: '1500', output: '7500' },
      quality_yield: 0.95,
      routing_weight: 0.6,
      sample_count: 42000,
    };
    expect(Value.Check(ModelEconomicProfileSchema, native)).toBe(true);
  });
});
