import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  allocateRecipients,
  validateBillingRecipients,
} from '../../src/utilities/billing.js';

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
});
