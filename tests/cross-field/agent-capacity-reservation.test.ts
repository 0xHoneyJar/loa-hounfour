/**
 * Cross-field tests for AgentCapacityReservation schema.
 *
 * Tests temporal ordering, tier minimum warnings, and active reservation
 * semantics per SDD §3.8.
 */
import { describe, it, expect } from 'vitest';
import { validate, getCrossFieldValidatorSchemas } from '../../src/validators/index.js';
import {
  AgentCapacityReservationSchema,
  type AgentCapacityReservation,
} from '../../src/schemas/model/routing/agent-capacity-reservation.js';

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
// Cross-field validator registration
// ---------------------------------------------------------------------------

describe('AgentCapacityReservation cross-field validator', () => {
  it('is registered in the cross-field registry', () => {
    const schemas = getCrossFieldValidatorSchemas();
    expect(schemas).toContain('AgentCapacityReservation');
  });

  it('passes for valid reservation', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation());
    expect(result.valid).toBe(true);
  });

  // --- Temporal ordering ---

  it('errors when effective_until is before effective_from', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      effective_from: '2026-06-01T00:00:00Z',
      effective_until: '2026-01-01T00:00:00Z',
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('effective_until must be after effective_from');
    }
  });

  it('errors when effective_until equals effective_from', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      effective_from: '2026-06-01T00:00:00Z',
      effective_until: '2026-06-01T00:00:00Z',
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('effective_until must be after effective_from');
    }
  });

  it('passes when effective_until is after effective_from', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      effective_from: '2026-01-01T00:00:00Z',
      effective_until: '2026-12-31T23:59:59Z',
    }));
    expect(result.valid).toBe(true);
  });

  it('passes when effective_until is absent', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation());
    expect(result.valid).toBe(true);
  });

  // --- Tier minimum warnings ---

  it('warns when bps below minimum for self_declared (300)', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      conformance_level: 'self_declared',
      reserved_capacity_bps: 100,
    }));
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings?.some(w => w.includes('below minimum'))).toBe(true);
  });

  it('warns when bps below minimum for community_verified (500)', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      conformance_level: 'community_verified',
      reserved_capacity_bps: 300,
    }));
    expect(result.valid).toBe(true);
    expect(result.warnings?.some(w => w.includes('below minimum'))).toBe(true);
  });

  it('warns when bps below minimum for protocol_certified (1000)', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      conformance_level: 'protocol_certified',
      reserved_capacity_bps: 500,
    }));
    expect(result.valid).toBe(true);
    expect(result.warnings?.some(w => w.includes('below minimum'))).toBe(true);
  });

  it('no tier warning when bps meets minimum', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      conformance_level: 'self_declared',
      reserved_capacity_bps: 300,
    }));
    expect(result.valid).toBe(true);
    const tierWarnings = result.warnings?.filter(w => w.includes('below minimum'));
    expect(tierWarnings?.length ?? 0).toBe(0);
  });

  // --- Active reservation with 0 bps ---

  it('warns when active reservation has 0 bps', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      state: 'active',
      reserved_capacity_bps: 0,
    }));
    expect(result.valid).toBe(true);
    expect(result.warnings?.some(w => w.includes('0 bps'))).toBe(true);
  });

  it('no 0 bps warning for expired reservation', () => {
    const result = validate(AgentCapacityReservationSchema, makeReservation({
      state: 'expired',
      reserved_capacity_bps: 0,
    }));
    expect(result.valid).toBe(true);
    const zeroWarnings = result.warnings?.filter(w => w.includes('no capacity guarantee'));
    expect(zeroWarnings?.length ?? 0).toBe(0);
  });
});
