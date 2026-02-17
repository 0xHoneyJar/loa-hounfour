/**
 * Tests for LivenessProperty schema, TimeoutBehavior vocabulary,
 * and CANONICAL_LIVENESS_PROPERTIES (S1-T1, S1-T2).
 *
 * Validates schema structure, TypeBox validation, canonical data,
 * timeout behavior, and companion safety references.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  LivenessPropertySchema,
  TimeoutBehaviorSchema,
  CANONICAL_LIVENESS_PROPERTIES,
  TIMEOUT_BEHAVIORS,
  type LivenessProperty,
} from '../../src/integrity/liveness-properties.js';

const validLiveness: LivenessProperty = {
  liveness_id: 'L-1',
  name: 'Reservation resolution liveness',
  description: 'A pending reservation must resolve within bounded time.',
  ltl_formula: 'G(reservation.pending => F_t(3600, reservation.terminal))',
  companion_safety: 'I-11',
  universe: 'single_lot',
  timeout_behavior: 'reaper',
  timeout_seconds: 3600,
  error_codes: ['RESERVATION_RESOLUTION_TIMEOUT'],
  severity: 'error',
  contract_version: '6.0.0',
};

describe('LivenessPropertySchema', () => {
  it('validates a valid liveness property', () => {
    expect(Value.Check(LivenessPropertySchema, validLiveness)).toBe(true);
  });

  it('has correct $id', () => {
    expect(LivenessPropertySchema.$id).toBe('LivenessProperty');
  });

  it('rejects invalid liveness_id pattern', () => {
    const invalid = { ...validLiveness, liveness_id: 'LIV-1' };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('accepts multi-digit liveness_id', () => {
    const valid = { ...validLiveness, liveness_id: 'L-12' };
    expect(Value.Check(LivenessPropertySchema, valid)).toBe(true);
  });

  it('rejects invalid companion_safety pattern', () => {
    const invalid = { ...validLiveness, companion_safety: 'INV-1' };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('rejects empty name', () => {
    const invalid = { ...validLiveness, name: '' };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('rejects empty ltl_formula', () => {
    const invalid = { ...validLiveness, ltl_formula: '' };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('rejects zero timeout_seconds', () => {
    const invalid = { ...validLiveness, timeout_seconds: 0 };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('rejects negative timeout_seconds', () => {
    const invalid = { ...validLiveness, timeout_seconds: -100 };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('rejects additional properties', () => {
    const invalid = { ...validLiveness, extra_field: 'nope' };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('requires at least one error_code', () => {
    const invalid = { ...validLiveness, error_codes: [] };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });

  it('rejects invalid severity', () => {
    const invalid = { ...validLiveness, severity: 'low' };
    expect(Value.Check(LivenessPropertySchema, invalid)).toBe(false);
  });
});

describe('TimeoutBehaviorSchema', () => {
  it('validates all 4 behaviors', () => {
    for (const behavior of TIMEOUT_BEHAVIORS) {
      expect(Value.Check(TimeoutBehaviorSchema, behavior)).toBe(true);
    }
  });

  it('has correct $id', () => {
    expect(TimeoutBehaviorSchema.$id).toBe('TimeoutBehavior');
  });

  it('rejects invalid behavior', () => {
    expect(Value.Check(TimeoutBehaviorSchema, 'auto_retry')).toBe(false);
  });

  it('has exactly 4 behaviors', () => {
    expect(TIMEOUT_BEHAVIORS).toHaveLength(4);
  });
});

describe('CANONICAL_LIVENESS_PROPERTIES', () => {
  it('contains exactly 6 liveness properties', () => {
    expect(CANONICAL_LIVENESS_PROPERTIES).toHaveLength(6);
  });

  it('all have unique liveness_ids', () => {
    const ids = CANONICAL_LIVENESS_PROPERTIES.map(p => p.liveness_id);
    expect(new Set(ids).size).toBe(6);
  });

  it('IDs are numbered L-1 through L-6', () => {
    for (let i = 0; i < 6; i++) {
      expect(CANONICAL_LIVENESS_PROPERTIES[i].liveness_id).toBe(`L-${i + 1}`);
    }
  });

  it('all validate against the schema', () => {
    for (const prop of CANONICAL_LIVENESS_PROPERTIES) {
      expect(
        Value.Check(LivenessPropertySchema, prop),
        `Liveness ${prop.liveness_id} failed schema validation`,
      ).toBe(true);
    }
  });

  it('all have LTL formulas containing F_t operator', () => {
    for (const prop of CANONICAL_LIVENESS_PROPERTIES) {
      expect(prop.ltl_formula).toContain('F_t');
    }
  });

  it('all companion_safety references are valid I-IDs', () => {
    for (const prop of CANONICAL_LIVENESS_PROPERTIES) {
      expect(prop.companion_safety).toMatch(/^I-\d{1,2}$/);
    }
  });

  it('all have contract_version 6.0.0', () => {
    for (const prop of CANONICAL_LIVENESS_PROPERTIES) {
      expect(prop.contract_version).toBe('6.0.0');
    }
  });

  it('covers multiple universes', () => {
    const universes = new Set(CANONICAL_LIVENESS_PROPERTIES.map(p => p.universe));
    expect(universes.size).toBeGreaterThanOrEqual(3);
  });

  it('every property has at least one error code', () => {
    for (const prop of CANONICAL_LIVENESS_PROPERTIES) {
      expect(prop.error_codes.length).toBeGreaterThan(0);
    }
  });
});
