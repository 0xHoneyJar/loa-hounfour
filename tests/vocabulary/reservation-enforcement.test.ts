import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ReservationEnforcementSchema,
  RESERVATION_ENFORCEMENT_MODES,
  type ReservationEnforcement,
} from '../../src/vocabulary/reservation-enforcement.js';

describe('ReservationEnforcementSchema', () => {
  it('accepts "strict"', () => {
    expect(Value.Check(ReservationEnforcementSchema, 'strict')).toBe(true);
  });

  it('accepts "advisory"', () => {
    expect(Value.Check(ReservationEnforcementSchema, 'advisory')).toBe(true);
  });

  it('accepts "unsupported"', () => {
    expect(Value.Check(ReservationEnforcementSchema, 'unsupported')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(Value.Check(ReservationEnforcementSchema, 'relaxed')).toBe(false);
    expect(Value.Check(ReservationEnforcementSchema, '')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(ReservationEnforcementSchema, 42)).toBe(false);
    expect(Value.Check(ReservationEnforcementSchema, true)).toBe(false);
    expect(Value.Check(ReservationEnforcementSchema, null)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReservationEnforcementSchema.$id).toBe('ReservationEnforcement');
  });
});

describe('RESERVATION_ENFORCEMENT_MODES', () => {
  it('contains exactly 3 modes', () => {
    expect(RESERVATION_ENFORCEMENT_MODES).toHaveLength(3);
  });

  it('includes all valid modes', () => {
    expect(RESERVATION_ENFORCEMENT_MODES).toContain('strict');
    expect(RESERVATION_ENFORCEMENT_MODES).toContain('advisory');
    expect(RESERVATION_ENFORCEMENT_MODES).toContain('unsupported');
  });

  it('type compatibility: values assignable to ReservationEnforcement', () => {
    const mode: ReservationEnforcement = RESERVATION_ENFORCEMENT_MODES[0];
    expect(mode).toBe('strict');
  });
});
