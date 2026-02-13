import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { validate } from '../../src/validators/index.js';
import { TransferSpecSchema, TransferEventSchema } from '../../src/schemas/transfer-spec.js';

const VECTORS_DIR = join(__dirname, '../../vectors/transfer');
function loadVectors(filename: string) {
  return JSON.parse(readFileSync(join(VECTORS_DIR, filename), 'utf8'));
}

describe('Transfer Golden Vectors', () => {
  const data = loadVectors('transfers.json');

  describe('valid transfer specs', () => {
    for (const v of data.valid_specs as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(TransferSpecSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('valid transfer events', () => {
    for (const v of data.valid_events as Array<{
      id: string; data: Record<string, unknown>; note: string;
    }>) {
      it(`${v.id}: ${v.note}`, () => {
        const result = validate(TransferEventSchema, v.data);
        expect(result.valid).toBe(true);
      });
    }
  });

  describe('invalid data rejected', () => {
    it('rejects invalid ethereum address', () => {
      const result = validate(TransferSpecSchema, {
        transfer_id: 'xfer_test',
        nft_id: 'eip155:1/0x5Af0D9827E0c53E4799BB226655A1de152A425a5/42',
        from_owner: 'not-an-address',
        to_owner: '0x2222222222222222222222222222222222222222',
        scenario: 'sale',
        sealing_policy: {
          encryption_scheme: 'none',
          key_derivation: 'none',
          access_audit: false,
          previous_owner_access: 'none',
        },
        initiated_at: '2026-01-15T10:00:00Z',
        initiated_by: 'test',
        contract_version: '2.0.0',
      });
      expect(result.valid).toBe(false);
    });
  });
});
