import { describe, it, expect } from 'vitest';
import { validateCreditNote } from '../../src/utilities/billing.js';
import type { CreditNote, BillingEntry } from '../../src/schemas/billing-entry.js';

function makeCreditNote(overrides: Partial<CreditNote> = {}): CreditNote {
  return {
    id: 'cn_001',
    references_billing_entry: 'be_001',
    reason: 'refund',
    amount_micro: '1000000',
    recipients: [
      {
        address: '0x1234',
        role: 'provider',
        share_bps: 7000,
        amount_micro: '700000',
      },
      {
        address: '0x5678',
        role: 'platform',
        share_bps: 3000,
        amount_micro: '300000',
      },
    ],
    issued_at: '2026-02-14T12:00:00Z',
    contract_version: '3.0.0',
    ...overrides,
  };
}

describe('validateCreditNote (v3.2.0, BB-ADV-003)', () => {
  it('valid credit note passes', () => {
    const result = validateCreditNote(makeCreditNote());
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it('zero amount_micro is invalid', () => {
    const result = validateCreditNote(makeCreditNote({
      amount_micro: '0',
      recipients: [
        { address: '0x1234', role: 'provider', share_bps: 10000, amount_micro: '0' },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('zero'))).toBe(true);
  });

  it('recipients share_bps must sum to 10000', () => {
    const result = validateCreditNote(makeCreditNote({
      recipients: [
        { address: '0x1234', role: 'provider', share_bps: 5000, amount_micro: '500000' },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('share_bps'))).toBe(true);
  });

  it('recipients amount_micro must sum to total', () => {
    const result = validateCreditNote(makeCreditNote({
      recipients: [
        { address: '0x1234', role: 'provider', share_bps: 7000, amount_micro: '600000' },
        { address: '0x5678', role: 'platform', share_bps: 3000, amount_micro: '300000' },
      ],
    }));
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('amount_micro sum'))).toBe(true);
  });

  it('over-credit: credit exceeding original charge is invalid (BB-C6-004)', () => {
    const originalEntry = {
      id: 'be_001',
      trace_id: 'trace_001',
      tenant_id: 'tenant_001',
      cost_type: 'model_inference',
      provider: 'anthropic',
      model: 'claude-opus-4-6',
      pool_id: 'opus-main',
      currency: 'USD',
      precision: 6,
      raw_cost_micro: '500000',
      multiplier_bps: 10000,
      total_cost_micro: '500000',
      rounding_policy: 'largest_remainder',
      recipients: [
        { address: '0x1234', role: 'provider', share_bps: 10000, amount_micro: '500000' },
      ],
      idempotency_key: 'idem_001',
      timestamp: '2026-02-14T12:00:00Z',
      contract_version: '3.2.0',
    } as BillingEntry;

    const result = validateCreditNote(
      makeCreditNote({ amount_micro: '1000000' }),
      { originalEntry },
    );
    expect(result.valid).toBe(false);
    expect(result.errors.some(e => e.includes('over-credit'))).toBe(true);
  });

  it('credit within original charge is valid with originalEntry', () => {
    const originalEntry = {
      id: 'be_001',
      trace_id: 'trace_001',
      tenant_id: 'tenant_001',
      cost_type: 'model_inference',
      provider: 'anthropic',
      model: 'claude-opus-4-6',
      pool_id: 'opus-main',
      currency: 'USD',
      precision: 6,
      raw_cost_micro: '2000000',
      multiplier_bps: 10000,
      total_cost_micro: '2000000',
      rounding_policy: 'largest_remainder',
      recipients: [
        { address: '0x1234', role: 'provider', share_bps: 10000, amount_micro: '2000000' },
      ],
      idempotency_key: 'idem_002',
      timestamp: '2026-02-14T12:00:00Z',
      contract_version: '3.2.0',
    } as BillingEntry;

    const result = validateCreditNote(
      makeCreditNote({ amount_micro: '1000000' }),
      { originalEntry },
    );
    expect(result.valid).toBe(true);
  });
});
