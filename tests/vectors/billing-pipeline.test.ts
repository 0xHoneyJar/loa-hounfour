import { describe, it, expect } from 'vitest';
import { validateBillingEntryFull } from '../../src/validators/billing.js';
import { allocateRecipients } from '../../src/utilities/billing.js';

describe('Billing Validation Pipeline (BB-C4-ADV-003)', () => {
  function makeValidEntry() {
    const recipients = allocateRecipients([
      { address: '0xProvider', role: 'provider', share_bps: 6000 },
      { address: '0xPlatform', role: 'platform', share_bps: 4000 },
    ], '25000');
    return {
      id: 'bill-pipe-001',
      trace_id: 'trace-001',
      tenant_id: 'tenant-001',
      cost_type: 'model_inference',
      provider: 'anthropic',
      model: 'claude-opus-4-6',
      currency: 'USD',
      precision: 6,
      raw_cost_micro: '10000',
      multiplier_bps: 25000,
      total_cost_micro: '25000',
      rounding_policy: 'largest_remainder',
      recipients,
      idempotency_key: 'idem-001',
      timestamp: '2026-02-14T10:00:00Z',
      contract_version: '3.0.0',
    };
  }

  it('validates a correct entry and returns typed BillingEntry', () => {
    const result = validateBillingEntryFull(makeValidEntry());
    expect(result.valid).toBe(true);
    if (result.valid) {
      expect(result.entry.id).toBe('bill-pipe-001');
      expect(result.entry.total_cost_micro).toBe('25000');
    }
  });

  it('rejects invalid schema (missing required field)', () => {
    const { id: _, ...noId } = makeValidEntry();
    const result = validateBillingEntryFull(noId);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain('id');
    }
  });

  it('rejects invalid schema (wrong type)', () => {
    const entry = { ...makeValidEntry(), precision: 'not-a-number' };
    const result = validateBillingEntryFull(entry);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });

  it('rejects valid schema with bad arithmetic (cross-field failure)', () => {
    const entry = makeValidEntry();
    entry.total_cost_micro = '99999'; // Wrong total
    const result = validateBillingEntryFull(entry);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('total_cost_micro');
    }
  });

  it('rejects valid schema with bad recipient split', () => {
    const entry = makeValidEntry();
    entry.recipients = [
      { address: '0xA', role: 'provider', share_bps: 6000, amount_micro: '1' },
      { address: '0xB', role: 'platform', share_bps: 4000, amount_micro: '2' },
    ];
    const result = validateBillingEntryFull(entry);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors[0]).toContain('amount_micro sum');
    }
  });

  it('rejects null input', () => {
    const result = validateBillingEntryFull(null);
    expect(result.valid).toBe(false);
  });

  it('rejects undefined input', () => {
    const result = validateBillingEntryFull(undefined);
    expect(result.valid).toBe(false);
  });

  it('rejects empty object', () => {
    const result = validateBillingEntryFull({});
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.length).toBeGreaterThan(0);
    }
  });
});
