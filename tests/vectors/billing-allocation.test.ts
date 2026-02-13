import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  allocateRecipients,
  validateBillingRecipients,
  validateBillingEntry,
} from '../../src/utilities/billing.js';
import type { BillingEntry } from '../../src/schemas/billing-entry.js';

const VECTORS_DIR = join(__dirname, '../../vectors/billing');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Billing Allocation Golden Vectors', () => {
  const data = loadVectors('allocation.json');

  describe('allocation', () => {
    for (const v of data.allocation_vectors as Array<{
      id: string;
      totalCostMicro: string;
      recipients: Array<{ address: string; role: string; share_bps: number }>;
      expected: Array<{ address: string; role: string; share_bps: number; amount_micro: string }>;
      note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = allocateRecipients(v.recipients, v.totalCostMicro);
        expect(result).toEqual(v.expected);
      });
    }
  });

  describe('zero-dust invariant', () => {
    for (const v of data.allocation_vectors as Array<{
      id: string; totalCostMicro: string;
      recipients: Array<{ address: string; role: string; share_bps: number }>;
      note: string;
    }>) {
      it(`${v.id}: sum equals total`, () => {
        const result = allocateRecipients(v.recipients, v.totalCostMicro);
        const sum = result.reduce((acc, r) => acc + BigInt(r.amount_micro), 0n);
        expect(sum).toBe(BigInt(v.totalCostMicro));
      });
    }
  });

  describe('validation', () => {
    it('accepts valid recipients', () => {
      const recipients = allocateRecipients([
        { address: '0xA', role: 'provider', share_bps: 6000 },
        { address: '0xB', role: 'platform', share_bps: 4000 },
      ], '10000');
      const result = validateBillingRecipients(recipients, '10000');
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('rejects share_bps not summing to 10000', () => {
      const result = validateBillingRecipients([
        { address: '0xA', role: 'provider', share_bps: 5000, amount_micro: '5000' },
        { address: '0xB', role: 'platform', share_bps: 4000, amount_micro: '4000' },
      ], '9000');
      expect(result.valid).toBe(false);
      expect(result.errors[0]).toContain('share_bps sum');
    });
  });

  describe('validateBillingEntry', () => {
    function makeEntry(overrides: Partial<BillingEntry> = {}): BillingEntry {
      const recipients = allocateRecipients([
        { address: '0xProvider', role: 'provider', share_bps: 6000 },
        { address: '0xPlatform', role: 'platform', share_bps: 4000 },
      ], '25000');
      return {
        id: 'bill-test-001',
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
        contract_version: '2.3.0',
        ...overrides,
      };
    }

    it('accepts valid billing entry', () => {
      const entry = makeEntry();
      const result = validateBillingEntry(entry);
      expect(result.valid).toBe(true);
    });

    it('rejects mismatched total_cost_micro', () => {
      const entry = makeEntry({ total_cost_micro: '99999' });
      const result = validateBillingEntry(entry);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('total_cost_micro');
      }
    });

    it('rejects mismatched recipient amounts', () => {
      const entry = makeEntry({
        recipients: [
          { address: '0xA', role: 'provider', share_bps: 6000, amount_micro: '1' },
          { address: '0xB', role: 'platform', share_bps: 4000, amount_micro: '2' },
        ],
      });
      const result = validateBillingEntry(entry);
      expect(result.valid).toBe(false);
      if (!result.valid) {
        expect(result.reason).toContain('amount_micro sum');
      }
    });

    it('accepts zero cost entry', () => {
      const recipients = allocateRecipients([
        { address: '0xA', role: 'provider', share_bps: 10000 },
      ], '0');
      const entry = makeEntry({
        raw_cost_micro: '0',
        multiplier_bps: 10000,
        total_cost_micro: '0',
        recipients,
      });
      const result = validateBillingEntry(entry);
      expect(result.valid).toBe(true);
    });

    it('accepts max multiplier boundary (10x)', () => {
      const recipients = allocateRecipients([
        { address: '0xA', role: 'provider', share_bps: 10000 },
      ], '100000');
      const entry = makeEntry({
        raw_cost_micro: '10000',
        multiplier_bps: 100000,
        total_cost_micro: '100000',
        recipients,
      });
      const result = validateBillingEntry(entry);
      expect(result.valid).toBe(true);
    });
  });

  describe('input guards', () => {
    it('throws on empty recipients', () => {
      expect(() => allocateRecipients([], '10000')).toThrow('recipients must not be empty');
    });

    it('throws on share_bps not summing to 10000', () => {
      expect(() => allocateRecipients([
        { address: '0xA', role: 'provider', share_bps: 5000 },
      ], '10000')).toThrow('share_bps must sum to 10000');
    });

    it('throws on negative totalCostMicro', () => {
      expect(() => allocateRecipients([
        { address: '0xA', role: 'provider', share_bps: 10000 },
      ], '-1000')).toThrow('totalCostMicro must be non-negative');
    });
  });
});
