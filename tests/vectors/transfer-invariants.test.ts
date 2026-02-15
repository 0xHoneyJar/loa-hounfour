import { describe, it, expect } from 'vitest';
import {
  TRANSFER_CHOREOGRAPHY,
  TRANSFER_INVARIANTS,
  type TransferInvariant,
} from '../../src/vocabulary/transfer-choreography.js';

describe('Transfer Invariants (BB-C4-ADV-002)', () => {
  it('every scenario has at least 2 invariants', () => {
    for (const [scenario, invariants] of Object.entries(TRANSFER_INVARIANTS)) {
      expect(invariants.length).toBeGreaterThanOrEqual(2);
    }
  });

  it('sale includes billing atomicity invariant', () => {
    const sale = TRANSFER_INVARIANTS.sale;
    const billingInvariant = sale.find(i => i.description.includes('billing'));
    expect(billingInvariant).toBeDefined();
    expect(billingInvariant!.enforceable).toBe(false); // Service-layer
  });

  it('all scenarios include terminal event exactly-once', () => {
    for (const [scenario, invariants] of Object.entries(TRANSFER_INVARIANTS)) {
      const terminal = invariants.find(i =>
        i.description.includes('saga.completed') || i.description.includes('saga.rolled_back'),
      );
      expect(terminal).toBeDefined();
    }
  });

  it('invariant structure is well-formed', () => {
    for (const [scenario, invariants] of Object.entries(TRANSFER_INVARIANTS)) {
      for (const inv of invariants) {
        expect(typeof inv.description).toBe('string');
        expect(inv.description.length).toBeGreaterThan(0);
        expect(typeof inv.enforceable).toBe('boolean');
        expect(typeof inv.enforcement_mechanism).toBe('string');
        expect(inv.enforcement_mechanism.length).toBeGreaterThan(0);
      }
    }
  });

  it('covers the same scenarios as TRANSFER_CHOREOGRAPHY', () => {
    const choreoKeys = Object.keys(TRANSFER_CHOREOGRAPHY).sort();
    const invariantKeys = Object.keys(TRANSFER_INVARIANTS).sort();
    expect(invariantKeys).toEqual(choreoKeys);
  });

  it('gift and custody_change have no-billing invariant', () => {
    for (const scenario of ['gift', 'custody_change'] as const) {
      const invariants = TRANSFER_INVARIANTS[scenario];
      const noBilling = invariants.find(i =>
        i.description.toLowerCase().includes('no billing'),
      );
      expect(noBilling).toBeDefined();
    }
  });

  it('admin_recovery has no-sealing invariant', () => {
    const invariants = TRANSFER_INVARIANTS.admin_recovery;
    const noSeal = invariants.find(i =>
      i.description.toLowerCase().includes('no conversations sealed'),
    );
    expect(noSeal).toBeDefined();
  });
});
