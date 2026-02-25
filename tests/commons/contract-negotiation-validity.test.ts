/**
 * Tests for ContractNegotiation TTL validation utilities.
 *
 * @see Bridgebuilder Finding F9 — TTL declared but no clock authority
 * @since v8.1.0
 */
import { describe, it, expect } from 'vitest';
import {
  isNegotiationValid,
  computeNegotiationExpiry,
} from '../../src/commons/contract-negotiation-validity.js';
import type { ContractNegotiation } from '../../src/commons/contract-negotiation.js';

const baseNegotiation: ContractNegotiation = {
  negotiation_id: '550e8400-e29b-41d4-a716-446655440000',
  model_id: 'gpt-4',
  reputation_state: 'established',
  assertion_method: 'server-derived',
  granted_surface: {
    schemas: ['GovernedCredits', 'GovernedReputation'],
    capabilities: ['inference', 'ensemble'],
    rate_limit_tier: 'extended',
  },
  negotiated_at: '2026-02-25T10:00:00Z',
  nonce: 'abcdefghijklmnop',
  expires_at: '2026-02-25T11:00:00Z', // 1 hour TTL
};

describe('isNegotiationValid', () => {
  it('returns valid when clock is before expiry', () => {
    const result = isNegotiationValid(baseNegotiation, '2026-02-25T10:30:00Z');
    expect(result.valid).toBe(true);
    expect(result.remaining_ms).toBe(30 * 60 * 1000); // 30 minutes
    expect(result.reason).toContain('valid until');
  });

  it('returns invalid when clock is after expiry', () => {
    const result = isNegotiationValid(baseNegotiation, '2026-02-25T12:00:00Z');
    expect(result.valid).toBe(false);
    expect(result.remaining_ms).toBe(0);
    expect(result.reason).toContain('expired');
  });

  it('returns invalid at exact expiry time', () => {
    const result = isNegotiationValid(baseNegotiation, '2026-02-25T11:00:00Z');
    expect(result.valid).toBe(false);
    expect(result.remaining_ms).toBe(0);
  });

  it('returns valid 1ms before expiry', () => {
    const result = isNegotiationValid(baseNegotiation, '2026-02-25T10:59:59.999Z');
    expect(result.valid).toBe(true);
    expect(result.remaining_ms).toBe(1);
  });

  it('returns invalid for bad expires_at', () => {
    const bad = { ...baseNegotiation, expires_at: 'not-a-date' };
    const result = isNegotiationValid(bad, '2026-02-25T10:30:00Z');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid expires_at');
  });

  it('returns invalid for bad clock time', () => {
    const result = isNegotiationValid(baseNegotiation, 'not-a-date');
    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Invalid clock time');
  });

  it('handles clock at negotiation time (full TTL remaining)', () => {
    const result = isNegotiationValid(baseNegotiation, '2026-02-25T10:00:00Z');
    expect(result.valid).toBe(true);
    expect(result.remaining_ms).toBe(60 * 60 * 1000); // 1 hour
  });
});

describe('computeNegotiationExpiry', () => {
  it('computes correct TTL in milliseconds', () => {
    const result = computeNegotiationExpiry(baseNegotiation);
    expect(result.ttl_ms).toBe(60 * 60 * 1000); // 1 hour
    expect(result.negotiated_at).toBe('2026-02-25T10:00:00Z');
    expect(result.expires_at).toBe('2026-02-25T11:00:00Z');
  });

  it('handles short TTL', () => {
    const short = { ...baseNegotiation, expires_at: '2026-02-25T10:05:00Z' };
    const result = computeNegotiationExpiry(short);
    expect(result.ttl_ms).toBe(5 * 60 * 1000); // 5 minutes
  });

  it('handles long TTL (24 hours)', () => {
    const long = { ...baseNegotiation, expires_at: '2026-02-26T10:00:00Z' };
    const result = computeNegotiationExpiry(long);
    expect(result.ttl_ms).toBe(24 * 60 * 60 * 1000); // 24 hours
  });

  it('returns NaN ttl_ms for invalid dates (F12)', () => {
    const bad = { ...baseNegotiation, negotiated_at: 'not-a-date' };
    const result = computeNegotiationExpiry(bad);
    expect(Number.isNaN(result.ttl_ms)).toBe(true);
  });

  it('returns NaN ttl_ms for invalid expires_at (F12)', () => {
    const bad = { ...baseNegotiation, expires_at: 'garbage' };
    const result = computeNegotiationExpiry(bad);
    expect(Number.isNaN(result.ttl_ms)).toBe(true);
  });
});
