import { describe, it, expect } from 'vitest';
import { validateCreditNote } from '../../src/utilities/billing.js';
import type { CreditNote } from '../../src/schemas/billing-entry.js';

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
});
