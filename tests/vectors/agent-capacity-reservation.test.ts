/**
 * Tests for AgentCapacityReservation schema.
 *
 * Validates schema structure, tier boundaries, state transitions,
 * and temporal ordering per SDD §3.8.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
// Import validators to register format validators (uuid, date-time) as side effect
import '../../src/validators/index.js';
import {
  AgentCapacityReservationSchema,
  type AgentCapacityReservation,
} from '../../src/schemas/model/routing/agent-capacity-reservation.js';
import { RESERVATION_TIER_MAP } from '../../src/vocabulary/reservation-tier.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeReservation(overrides: Partial<AgentCapacityReservation> = {}): AgentCapacityReservation {
  return {
    reservation_id: '550e8400-e29b-41d4-a716-446655440000',
    agent_id: 'agent-001',
    conformance_level: 'self_declared',
    reserved_capacity_bps: 300,
    state: 'active',
    effective_from: '2026-01-01T00:00:00Z',
    budget_scope_id: 'scope-001',
    contract_version: '5.2.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('AgentCapacityReservationSchema', () => {
  it('accepts a minimal valid reservation', () => {
    expect(Value.Check(AgentCapacityReservationSchema, makeReservation())).toBe(true);
  });

  it('accepts reservation with all optional fields', () => {
    const full = makeReservation({
      effective_until: '2026-12-31T23:59:59Z',
      metadata: { source: 'auto-provisioned' },
    });
    expect(Value.Check(AgentCapacityReservationSchema, full)).toBe(true);
  });

  it('has correct $id', () => {
    expect(AgentCapacityReservationSchema.$id).toBe('AgentCapacityReservation');
  });

  it('has x-cross-field-validated marker', () => {
    expect((AgentCapacityReservationSchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
  });

  it('rejects additional properties', () => {
    const invalid = { ...makeReservation(), extra_field: true };
    expect(Value.Check(AgentCapacityReservationSchema, invalid)).toBe(false);
  });

  // ---------------------------------------------------------------------------
  // Tier validation
  // ---------------------------------------------------------------------------

  describe('tier boundaries', () => {
    it('accepts self_declared tier with 300 bps', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        conformance_level: 'self_declared',
        reserved_capacity_bps: RESERVATION_TIER_MAP.self_declared,
      }))).toBe(true);
    });

    it('accepts community_verified tier with 500 bps', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        conformance_level: 'community_verified',
        reserved_capacity_bps: RESERVATION_TIER_MAP.community_verified,
      }))).toBe(true);
    });

    it('accepts protocol_certified tier with 1000 bps', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        conformance_level: 'protocol_certified',
        reserved_capacity_bps: RESERVATION_TIER_MAP.protocol_certified,
      }))).toBe(true);
    });

    it('accepts 0 bps (minimum)', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        reserved_capacity_bps: 0,
      }))).toBe(true);
    });

    it('accepts 10000 bps (maximum, 100%)', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        reserved_capacity_bps: 10000,
      }))).toBe(true);
    });

    it('rejects negative bps', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        reserved_capacity_bps: -1,
      }))).toBe(false);
    });

    it('rejects bps above 10000', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        reserved_capacity_bps: 10001,
      }))).toBe(false);
    });

    it('rejects fractional bps', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        reserved_capacity_bps: 300.5,
      }))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // State field
  // ---------------------------------------------------------------------------

  describe('state field', () => {
    it('accepts "active"', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({ state: 'active' }))).toBe(true);
    });

    it('accepts "expired"', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({ state: 'expired' }))).toBe(true);
    });

    it('accepts "revoked"', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({ state: 'revoked' }))).toBe(true);
    });

    it('rejects unknown state', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        state: 'pending' as never,
      }))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Conformance level
  // ---------------------------------------------------------------------------

  describe('conformance_level', () => {
    it('accepts all valid levels', () => {
      for (const level of ['self_declared', 'community_verified', 'protocol_certified'] as const) {
        expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
          conformance_level: level,
        }))).toBe(true);
      }
    });

    it('rejects invalid level', () => {
      expect(Value.Check(AgentCapacityReservationSchema, makeReservation({
        conformance_level: 'unknown' as never,
      }))).toBe(false);
    });
  });

  // ---------------------------------------------------------------------------
  // Required fields
  // ---------------------------------------------------------------------------

  describe('required fields', () => {
    it('rejects missing reservation_id', () => {
      const r = makeReservation();
      delete (r as Record<string, unknown>).reservation_id;
      expect(Value.Check(AgentCapacityReservationSchema, r)).toBe(false);
    });

    it('rejects missing agent_id', () => {
      const r = makeReservation();
      delete (r as Record<string, unknown>).agent_id;
      expect(Value.Check(AgentCapacityReservationSchema, r)).toBe(false);
    });

    it('rejects missing state', () => {
      const r = makeReservation();
      delete (r as Record<string, unknown>).state;
      expect(Value.Check(AgentCapacityReservationSchema, r)).toBe(false);
    });
  });
});
