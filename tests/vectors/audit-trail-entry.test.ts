/**
 * Tests for AuditTrailEntry schema (S8-T1).
 *
 * Validates schema structure, cross-field constraints (distinct IDs),
 * conservation status linkage, and bidirectional provenance semantics.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { validate } from '../../src/validators/index.js';
import {
  AuditTrailEntrySchema,
  type AuditTrailEntry,
} from '../../src/schemas/audit-trail-entry.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeEntry(overrides: Partial<AuditTrailEntry> = {}): AuditTrailEntry {
  return {
    entry_id: '00000000-0000-0000-0000-000000000001',
    completion_id: '00000000-0000-0000-0000-000000000002',
    billing_entry_id: '00000000-0000-0000-0000-000000000003',
    agent_id: 'agent-001',
    provider: 'openai',
    model_id: 'gpt-4o',
    cost_micro: '50000',
    timestamp: '2026-02-16T10:00:00Z',
    conservation_status: 'conserved',
    contract_version: '5.2.0',
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Schema validation
// ---------------------------------------------------------------------------

describe('AuditTrailEntrySchema', () => {
  it('accepts valid entry', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry());
    expect(result.valid).toBe(true);
  });

  it('has $id AuditTrailEntry', () => {
    expect(AuditTrailEntrySchema.$id).toBe('AuditTrailEntry');
  });

  it('has x-cross-field-validated annotation', () => {
    expect((AuditTrailEntrySchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(AuditTrailEntrySchema, {
      ...makeEntry(),
      extra_field: 'should-fail',
    })).toBe(false);
  });

  it('requires all mandatory fields', () => {
    const required = [
      'entry_id', 'completion_id', 'billing_entry_id', 'agent_id',
      'provider', 'model_id', 'cost_micro', 'timestamp',
      'conservation_status', 'contract_version',
    ];
    for (const field of required) {
      const entry = makeEntry();
      delete (entry as Record<string, unknown>)[field];
      expect(Value.Check(AuditTrailEntrySchema, entry)).toBe(false);
    }
  });

  it('accepts entry with metadata', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry({
      metadata: { 'x-trace-id': 'abc123', 'x-region': 'us-east-1' },
    }));
    expect(result.valid).toBe(true);
  });

  it('accepts entry without metadata', () => {
    const entry = makeEntry();
    delete entry.metadata;
    expect(validate(AuditTrailEntrySchema, entry).valid).toBe(true);
  });

  // Conservation status values
  it('accepts conservation_status "conserved"', () => {
    expect(validate(AuditTrailEntrySchema, makeEntry({ conservation_status: 'conserved' })).valid).toBe(true);
  });

  it('accepts conservation_status "violated"', () => {
    expect(validate(AuditTrailEntrySchema, makeEntry({ conservation_status: 'violated' })).valid).toBe(true);
  });

  it('accepts conservation_status "unverifiable"', () => {
    expect(validate(AuditTrailEntrySchema, makeEntry({ conservation_status: 'unverifiable' })).valid).toBe(true);
  });

  it('rejects invalid conservation_status', () => {
    expect(Value.Check(AuditTrailEntrySchema, makeEntry({ conservation_status: 'unknown' as never }))).toBe(false);
  });

  // MicroUSD format
  it('accepts negative cost_micro', () => {
    expect(validate(AuditTrailEntrySchema, makeEntry({ cost_micro: '-50000' })).valid).toBe(true);
  });

  it('accepts zero cost_micro', () => {
    expect(validate(AuditTrailEntrySchema, makeEntry({ cost_micro: '0' })).valid).toBe(true);
  });

  it('rejects non-numeric cost_micro', () => {
    expect(Value.Check(AuditTrailEntrySchema, makeEntry({ cost_micro: 'abc' }))).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// Cross-field validation
// ---------------------------------------------------------------------------

describe('AuditTrailEntry cross-field validation', () => {
  it('errors when completion_id equals billing_entry_id', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry({
      completion_id: '00000000-0000-0000-0000-000000000002',
      billing_entry_id: '00000000-0000-0000-0000-000000000002',
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('completion_id and billing_entry_id must be different');
    }
  });

  it('errors when entry_id equals completion_id', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry({
      entry_id: '00000000-0000-0000-0000-000000000002',
      completion_id: '00000000-0000-0000-0000-000000000002',
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('entry_id must differ from completion_id');
    }
  });

  it('errors when entry_id equals billing_entry_id', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry({
      entry_id: '00000000-0000-0000-0000-000000000003',
      billing_entry_id: '00000000-0000-0000-0000-000000000003',
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors).toContain('entry_id must differ from billing_entry_id');
    }
  });

  it('errors when metadata exceeds 10KB', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry({
      metadata: { 'x-data': 'x'.repeat(11000) },
    }));
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some(e => e.includes('10KB'))).toBe(true);
    }
  });

  it('passes with all distinct IDs', () => {
    const result = validate(AuditTrailEntrySchema, makeEntry());
    expect(result.valid).toBe(true);
  });
});
