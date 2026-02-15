/**
 * Cross-field validator tests for EscrowEntry expires_at (BB-V4-DEEP-002).
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { EscrowEntrySchema } from '../../src/schemas/escrow-entry.js';

const VALID_ESCROW_ENTRY = {
  escrow_id: '12345678-1234-4123-8123-123456789abc',
  payer_id: 'a1',
  payee_id: 'a2',
  amount_micro: '1000000',
  state: 'held',
  held_at: '2026-01-01T00:00:00Z',
  contract_version: '4.4.0',
};

describe('EscrowEntry expires_at cross-field validation', () => {
  it('warns when held escrow has no expires_at', () => {
    const result = validate(EscrowEntrySchema, VALID_ESCROW_ENTRY);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('held escrow should have expires_at'))).toBe(true);
  });

  it('no TTL warning when held escrow has expires_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'held',
      expires_at: '2026-02-01T00:00:00Z',
    };
    const result = validate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(true);
    // Should not have the TTL warning
    const hasTtlWarning = result.valid === true && result.warnings?.some((w) => w.includes('held escrow should have expires_at'));
    expect(hasTtlWarning).toBeFalsy();
  });

  it('rejects expires_at equal to held_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'held',
      expires_at: '2026-01-01T00:00:00Z', // same as held_at
    };
    const result = validate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.some((e) => e.includes('expires_at must be after held_at'))).toBe(true);
  });

  it('rejects expires_at before held_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'held',
      expires_at: '2025-12-01T00:00:00Z',
    };
    const result = validate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.some((e) => e.includes('expires_at must be after held_at'))).toBe(true);
  });

  it('accepts expires_at after held_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'held',
      expires_at: '2026-02-01T00:00:00Z',
    };
    const result = validate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(true);
  });

  it('rejects expired state without expires_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'expired',
    };
    const result = validate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(false);
    expect(result.valid === false && result.errors.some((e) => e.includes('expired state requires expires_at'))).toBe(true);
  });

  it('accepts expired state with valid expires_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      state: 'expired',
      expires_at: '2026-01-15T00:00:00Z',
    };
    const result = validate(EscrowEntrySchema, doc);
    expect(result.valid).toBe(true);
  });

  it('schema accepts optional expires_at field', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      expires_at: '2026-06-01T00:00:00Z',
    };
    const result = validate(EscrowEntrySchema, doc, { crossField: false });
    expect(result.valid).toBe(true);
  });

  it('schema rejects invalid date-time for expires_at', () => {
    const doc = {
      ...VALID_ESCROW_ENTRY,
      expires_at: 'not-a-date',
    };
    const result = validate(EscrowEntrySchema, doc, { crossField: false });
    expect(result.valid).toBe(false);
  });
});
