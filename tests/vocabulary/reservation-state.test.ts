import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ReservationStateSchema,
  RESERVATION_STATES,
  RESERVATION_STATE_TRANSITIONS,
  isValidReservationTransition,
  type ReservationState,
} from '../../src/vocabulary/reservation-state.js';

describe('ReservationStateSchema', () => {
  it('accepts "active"', () => {
    expect(Value.Check(ReservationStateSchema, 'active')).toBe(true);
  });

  it('accepts "expired"', () => {
    expect(Value.Check(ReservationStateSchema, 'expired')).toBe(true);
  });

  it('accepts "revoked"', () => {
    expect(Value.Check(ReservationStateSchema, 'revoked')).toBe(true);
  });

  it('rejects unknown strings', () => {
    expect(Value.Check(ReservationStateSchema, 'pending')).toBe(false);
    expect(Value.Check(ReservationStateSchema, '')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(ReservationStateSchema, 1)).toBe(false);
    expect(Value.Check(ReservationStateSchema, null)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReservationStateSchema.$id).toBe('ReservationState');
  });
});

describe('RESERVATION_STATES', () => {
  it('contains exactly 3 states', () => {
    expect(RESERVATION_STATES).toHaveLength(3);
  });

  it('includes all valid states', () => {
    expect(RESERVATION_STATES).toContain('active');
    expect(RESERVATION_STATES).toContain('expired');
    expect(RESERVATION_STATES).toContain('revoked');
  });

  it('type compatibility', () => {
    const state: ReservationState = RESERVATION_STATES[0];
    expect(state).toBe('active');
  });
});

describe('RESERVATION_STATE_TRANSITIONS', () => {
  it('active can transition to expired', () => {
    expect(RESERVATION_STATE_TRANSITIONS.active).toContain('expired');
  });

  it('active can transition to revoked', () => {
    expect(RESERVATION_STATE_TRANSITIONS.active).toContain('revoked');
  });

  it('expired is terminal (no transitions)', () => {
    expect(RESERVATION_STATE_TRANSITIONS.expired).toHaveLength(0);
  });

  it('revoked is terminal (no transitions)', () => {
    expect(RESERVATION_STATE_TRANSITIONS.revoked).toHaveLength(0);
  });
});

describe('isValidReservationTransition', () => {
  it('allows active → expired', () => {
    expect(isValidReservationTransition('active', 'expired')).toBe(true);
  });

  it('allows active → revoked', () => {
    expect(isValidReservationTransition('active', 'revoked')).toBe(true);
  });

  it('rejects active → active (no self-transition)', () => {
    expect(isValidReservationTransition('active', 'active')).toBe(false);
  });

  it('rejects expired → active (terminal)', () => {
    expect(isValidReservationTransition('expired', 'active')).toBe(false);
  });

  it('rejects expired → revoked (terminal)', () => {
    expect(isValidReservationTransition('expired', 'revoked')).toBe(false);
  });

  it('rejects revoked → active (terminal)', () => {
    expect(isValidReservationTransition('revoked', 'active')).toBe(false);
  });

  it('rejects revoked → expired (terminal)', () => {
    expect(isValidReservationTransition('revoked', 'expired')).toBe(false);
  });
});
