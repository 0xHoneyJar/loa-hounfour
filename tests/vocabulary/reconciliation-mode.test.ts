import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  ReconciliationModeSchema,
  RECONCILIATION_MODES,
  type ReconciliationMode,
} from '../../src/vocabulary/reconciliation-mode.js';

describe('ReconciliationModeSchema', () => {
  it('accepts protocol_authoritative', () => {
    expect(Value.Check(ReconciliationModeSchema, 'protocol_authoritative')).toBe(true);
  });

  it('accepts provider_invoice_authoritative', () => {
    expect(Value.Check(ReconciliationModeSchema, 'provider_invoice_authoritative')).toBe(true);
  });

  it('rejects unknown values', () => {
    expect(Value.Check(ReconciliationModeSchema, 'unknown')).toBe(false);
    expect(Value.Check(ReconciliationModeSchema, '')).toBe(false);
    expect(Value.Check(ReconciliationModeSchema, 'PROTOCOL_AUTHORITATIVE')).toBe(false);
  });

  it('rejects non-string values', () => {
    expect(Value.Check(ReconciliationModeSchema, 42)).toBe(false);
    expect(Value.Check(ReconciliationModeSchema, null)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReconciliationModeSchema.$id).toBe('ReconciliationMode');
  });
});

describe('RECONCILIATION_MODES', () => {
  it('contains exactly 2 modes', () => {
    expect(RECONCILIATION_MODES).toHaveLength(2);
  });

  it('includes all valid modes', () => {
    expect(RECONCILIATION_MODES).toContain('protocol_authoritative');
    expect(RECONCILIATION_MODES).toContain('provider_invoice_authoritative');
  });
});
