import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ReservationTierSchema,
  RESERVATION_TIER_MAP,
  type ReservationTier,
} from '../../src/vocabulary/reservation-tier.js';

describe('ReservationTierSchema', () => {
  it('accepts 0 (minimum)', () => {
    expect(Value.Check(ReservationTierSchema, 0)).toBe(true);
  });

  it('accepts 10000 (maximum, 100%)', () => {
    expect(Value.Check(ReservationTierSchema, 10000)).toBe(true);
  });

  it('accepts 300 (self_declared default)', () => {
    expect(Value.Check(ReservationTierSchema, 300)).toBe(true);
  });

  it('accepts 500 (community_verified default)', () => {
    expect(Value.Check(ReservationTierSchema, 500)).toBe(true);
  });

  it('accepts 1000 (protocol_certified default)', () => {
    expect(Value.Check(ReservationTierSchema, 1000)).toBe(true);
  });

  it('rejects negative values', () => {
    expect(Value.Check(ReservationTierSchema, -1)).toBe(false);
  });

  it('rejects values above 10000', () => {
    expect(Value.Check(ReservationTierSchema, 10001)).toBe(false);
  });

  it('rejects non-integers', () => {
    expect(Value.Check(ReservationTierSchema, 3.5)).toBe(false);
  });

  it('rejects strings', () => {
    expect(Value.Check(ReservationTierSchema, '300')).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReservationTierSchema.$id).toBe('ReservationTier');
  });
});

describe('RESERVATION_TIER_MAP', () => {
  it('maps self_declared to 300 bps', () => {
    expect(RESERVATION_TIER_MAP.self_declared).toBe(300);
  });

  it('maps community_verified to 500 bps', () => {
    expect(RESERVATION_TIER_MAP.community_verified).toBe(500);
  });

  it('maps protocol_certified to 1000 bps', () => {
    expect(RESERVATION_TIER_MAP.protocol_certified).toBe(1000);
  });

  it('has exactly 3 entries', () => {
    expect(Object.keys(RESERVATION_TIER_MAP)).toHaveLength(3);
  });

  it('has monotonically increasing values', () => {
    expect(RESERVATION_TIER_MAP.self_declared).toBeLessThan(RESERVATION_TIER_MAP.community_verified);
    expect(RESERVATION_TIER_MAP.community_verified).toBeLessThan(RESERVATION_TIER_MAP.protocol_certified);
  });

  it('all values are valid ReservationTier', () => {
    for (const bps of Object.values(RESERVATION_TIER_MAP)) {
      expect(Value.Check(ReservationTierSchema, bps)).toBe(true);
    }
  });

  it('type compatibility: values assignable to ReservationTier', () => {
    const tier: ReservationTier = RESERVATION_TIER_MAP.self_declared;
    expect(tier).toBe(300);
  });
});
