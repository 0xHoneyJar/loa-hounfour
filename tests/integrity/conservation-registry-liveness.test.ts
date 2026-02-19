/**
 * Tests for ConservationPropertyRegistry extension with liveness (S1-T3).
 *
 * Validates that the registry now requires liveness_properties and liveness_count,
 * and that the count drift guard works correctly.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ConservationPropertyRegistrySchema,
  ConservationPropertySchema,
  CANONICAL_CONSERVATION_PROPERTIES,
  type ConservationPropertyRegistry,
  type ConservationProperty,
} from '../../src/integrity/conservation-properties.js';
import {
  CANONICAL_LIVENESS_PROPERTIES,
  type LivenessProperty,
} from '../../src/integrity/liveness-properties.js';

const minimalProperty: ConservationProperty = {
  invariant_id: 'I-1',
  name: 'Test property',
  description: 'Test',
  ltl_formula: 'G(x >= 0)',
  universe: 'single_lot',
  enforcement: 'db_check',
  error_codes: ['TEST_ERR'],
  severity: 'critical',
  contract_version: '6.0.0',
};

const minimalLiveness: LivenessProperty = {
  liveness_id: 'L-1',
  name: 'Test liveness',
  description: 'Test forward progress',
  ltl_formula: 'G(pending => F_t(3600, done))',
  companion_safety: 'I-1',
  universe: 'single_lot',
  timeout_behavior: 'reaper',
  timeout_seconds: 3600,
  error_codes: ['TEST_TIMEOUT'],
  severity: 'error',
  contract_version: '6.0.0',
};

const validRegistryWithLiveness: ConservationPropertyRegistry = {
  registry_id: '550e8400-e29b-41d4-a716-446655440099',
  total_count: 1,
  properties: [minimalProperty],
  coverage: { single_lot: 1 },
  liveness_properties: [minimalLiveness],
  liveness_count: 1,
  contract_version: '6.0.0',
};

describe('ConservationPropertyRegistry with liveness (v6.0.0)', () => {
  it('validates a registry with liveness properties', () => {
    expect(Value.Check(ConservationPropertyRegistrySchema, validRegistryWithLiveness)).toBe(true);
  });

  it('validates a registry with empty liveness (zero count)', () => {
    const emptyLiveness: ConservationPropertyRegistry = {
      ...validRegistryWithLiveness,
      liveness_properties: [],
      liveness_count: 0,
    };
    expect(Value.Check(ConservationPropertyRegistrySchema, emptyLiveness)).toBe(true);
  });

  it('rejects registry WITHOUT liveness_properties field', () => {
    const { liveness_properties: _, liveness_count: __, ...noLiveness } = validRegistryWithLiveness;
    expect(Value.Check(ConservationPropertyRegistrySchema, noLiveness)).toBe(false);
  });

  it('rejects registry WITHOUT liveness_count field', () => {
    const { liveness_count: _, ...noCount } = validRegistryWithLiveness;
    expect(Value.Check(ConservationPropertyRegistrySchema, noCount)).toBe(false);
  });

  it('rejects negative liveness_count', () => {
    const invalid = { ...validRegistryWithLiveness, liveness_count: -1 };
    expect(Value.Check(ConservationPropertyRegistrySchema, invalid)).toBe(false);
  });

  it('validates a full registry with canonical properties and liveness', () => {
    const fullRegistry: ConservationPropertyRegistry = {
      registry_id: '550e8400-e29b-41d4-a716-446655440099',
      total_count: 14,
      properties: [...CANONICAL_CONSERVATION_PROPERTIES],
      coverage: { single_lot: 6, account: 2, platform: 4, bilateral: 2 },
      liveness_properties: [...CANONICAL_LIVENESS_PROPERTIES],
      liveness_count: 6,
      contract_version: '6.0.0',
    };
    expect(Value.Check(ConservationPropertyRegistrySchema, fullRegistry)).toBe(true);
  });

  it('still requires at least one safety property (minItems: 1)', () => {
    const noProperties = {
      ...validRegistryWithLiveness,
      properties: [],
      total_count: 0,
    };
    expect(Value.Check(ConservationPropertyRegistrySchema, noProperties)).toBe(false);
  });

  it('validates liveness items against LivenessPropertySchema', () => {
    const invalidLiveness = {
      ...validRegistryWithLiveness,
      liveness_properties: [{ ...minimalLiveness, liveness_id: 'INVALID' }],
    };
    expect(Value.Check(ConservationPropertyRegistrySchema, invalidLiveness)).toBe(false);
  });
});
