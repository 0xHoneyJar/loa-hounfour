/**
 * Tests for ConservationProperty and ConservationPropertyRegistry schemas (S1-T1, S1-T2).
 *
 * Validates schema structure, TypeBox validation, canonical invariant data,
 * and enforcement mechanism/universe enum constraints.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (uuid)
import {
  ConservationPropertySchema,
  ConservationPropertyRegistrySchema,
  EnforcementMechanismSchema,
  InvariantUniverseSchema,
  CANONICAL_CONSERVATION_PROPERTIES,
  ENFORCEMENT_MECHANISMS,
  type ConservationProperty,
  type ConservationPropertyRegistry,
} from '../../src/integrity/conservation-properties.js';

const validProperty: ConservationProperty = {
  invariant_id: 'I-1',
  name: 'Lot balance non-negativity',
  ltl_formula: 'G(lot.balance >= 0)',
  description: 'Credit lot balance can never go negative.',
  universe: 'single_lot',
  enforcement: 'db_check',
  error_codes: ['LOT_BALANCE_NEGATIVE'],
  severity: 'critical',
  contract_version: '5.5.0',
};

const validRegistry: ConservationPropertyRegistry = {
  registry_id: '550e8400-e29b-41d4-a716-446655440099',
  total_count: 2,
  properties: [
    validProperty,
    {
      invariant_id: 'I-2',
      name: 'Lot conservation',
      ltl_formula: 'G(lot.available + lot.reserved + lot.consumed == lot.original)',
      description: 'Sum of lot states equals original allocation',
      universe: 'single_lot',
      enforcement: 'db_check',
      error_codes: ['LOT_CONSERVATION_VIOLATED'],
      severity: 'critical',
      contract_version: '5.5.0',
    },
  ],
  coverage: { single_lot: 2 },
  contract_version: '5.5.0',
};

describe('ConservationPropertySchema', () => {
  it('validates a valid conservation property', () => {
    expect(Value.Check(ConservationPropertySchema, validProperty)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ConservationPropertySchema.$id).toBe('ConservationProperty');
  });

  it('rejects invalid invariant_id pattern', () => {
    const invalid = { ...validProperty, invariant_id: 'INV-1' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('rejects empty name', () => {
    const invalid = { ...validProperty, name: '' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('rejects empty ltl_formula', () => {
    const invalid = { ...validProperty, ltl_formula: '' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('rejects invalid universe', () => {
    const invalid = { ...validProperty, universe: 'financial' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('rejects invalid enforcement', () => {
    const invalid = { ...validProperty, enforcement: 'soft_warning' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('rejects invalid severity', () => {
    const invalid = { ...validProperty, severity: 'low' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('requires at least one error_code', () => {
    const invalid = { ...validProperty, error_codes: [] };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('rejects additional properties', () => {
    const invalid = { ...validProperty, extra_field: 'nope' };
    expect(Value.Check(ConservationPropertySchema, invalid)).toBe(false);
  });

  it('accepts all valid universes', () => {
    for (const universe of ['single_lot', 'account', 'platform', 'bilateral'] as const) {
      const prop = { ...validProperty, universe };
      expect(Value.Check(ConservationPropertySchema, prop)).toBe(true);
    }
  });

  it('accepts all valid enforcement mechanisms', () => {
    for (const enforcement of ['db_check', 'application', 'reconciliation', 'db_unique'] as const) {
      const prop = { ...validProperty, enforcement };
      expect(Value.Check(ConservationPropertySchema, prop)).toBe(true);
    }
  });

  it('accepts all valid severities', () => {
    for (const severity of ['critical', 'error', 'warning'] as const) {
      const prop = { ...validProperty, severity };
      expect(Value.Check(ConservationPropertySchema, prop)).toBe(true);
    }
  });

  it('accepts optional reconciliation_failure_codes', () => {
    const withReconciliation = {
      ...validProperty,
      reconciliation_failure_codes: ['RECON_MISMATCH'],
    };
    expect(Value.Check(ConservationPropertySchema, withReconciliation)).toBe(true);
  });
});

describe('EnforcementMechanismSchema', () => {
  it('validates all 4 mechanisms', () => {
    for (const mechanism of ENFORCEMENT_MECHANISMS) {
      expect(Value.Check(EnforcementMechanismSchema, mechanism)).toBe(true);
    }
  });

  it('rejects invalid mechanism', () => {
    expect(Value.Check(EnforcementMechanismSchema, 'manual_review')).toBe(false);
  });
});

describe('InvariantUniverseSchema', () => {
  it('validates all 4 universes', () => {
    for (const universe of ['single_lot', 'account', 'platform', 'bilateral']) {
      expect(Value.Check(InvariantUniverseSchema, universe)).toBe(true);
    }
  });

  it('rejects invalid universe', () => {
    expect(Value.Check(InvariantUniverseSchema, 'financial')).toBe(false);
  });
});

describe('ConservationPropertyRegistrySchema', () => {
  it('validates a valid registry', () => {
    expect(Value.Check(ConservationPropertyRegistrySchema, validRegistry)).toBe(true);
  });

  it('has correct $id', () => {
    expect(ConservationPropertyRegistrySchema.$id).toBe('ConservationPropertyRegistry');
  });

  it('has x-cross-field-validated marker', () => {
    expect(
      (ConservationPropertyRegistrySchema as Record<string, unknown>)['x-cross-field-validated'],
    ).toBe(true);
  });

  it('rejects additional properties', () => {
    const invalid = { ...validRegistry, extra: true };
    expect(Value.Check(ConservationPropertyRegistrySchema, invalid)).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    const invalid = { ...validRegistry, contract_version: 'bad' };
    expect(Value.Check(ConservationPropertyRegistrySchema, invalid)).toBe(false);
  });

  it('rejects zero total_count (minimum 1)', () => {
    const invalid = { ...validRegistry, total_count: 0 };
    expect(Value.Check(ConservationPropertyRegistrySchema, invalid)).toBe(false);
  });

  it('requires at least one property (minItems: 1)', () => {
    const invalid = { ...validRegistry, properties: [], total_count: 1 };
    expect(Value.Check(ConservationPropertyRegistrySchema, invalid)).toBe(false);
  });
});

describe('CANONICAL_CONSERVATION_PROPERTIES', () => {
  it('contains exactly 14 invariants', () => {
    expect(CANONICAL_CONSERVATION_PROPERTIES).toHaveLength(14);
  });

  it('all invariants have unique IDs', () => {
    const ids = CANONICAL_CONSERVATION_PROPERTIES.map(p => p.invariant_id);
    expect(new Set(ids).size).toBe(14);
  });

  it('IDs are numbered I-1 through I-14', () => {
    for (let i = 0; i < 14; i++) {
      expect(CANONICAL_CONSERVATION_PROPERTIES[i].invariant_id).toBe(`I-${i + 1}`);
    }
  });

  it('all invariants validate against the schema', () => {
    for (const prop of CANONICAL_CONSERVATION_PROPERTIES) {
      expect(
        Value.Check(ConservationPropertySchema, prop),
        `Invariant ${prop.invariant_id} failed schema validation`,
      ).toBe(true);
    }
  });

  it('all invariants have non-empty LTL formulas', () => {
    for (const prop of CANONICAL_CONSERVATION_PROPERTIES) {
      expect(prop.ltl_formula.length).toBeGreaterThan(0);
    }
  });

  it('covers all 4 universes', () => {
    const universes = new Set(CANONICAL_CONSERVATION_PROPERTIES.map(p => p.universe));
    expect(universes).toEqual(new Set(['single_lot', 'account', 'platform', 'bilateral']));
  });

  it('every invariant has at least one error code', () => {
    for (const prop of CANONICAL_CONSERVATION_PROPERTIES) {
      expect(prop.error_codes.length).toBeGreaterThan(0);
    }
  });

  it('is readonly (frozen)', () => {
    const arr: readonly ConservationProperty[] = CANONICAL_CONSERVATION_PROPERTIES;
    expect(Array.isArray(arr)).toBe(true);
  });
});
