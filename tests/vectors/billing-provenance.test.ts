/**
 * Tests for BillingEntry provenance fields (v5.1.0) and cross-field validators.
 *
 * S3-T3: Provenance fields, S3-T4: Validator rules, S3-T5: pricing_applied.
 * IMP-007: Backward compatibility — v5.0.0 payloads must validate.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { BillingEntrySchema, type BillingEntry } from '../../src/schemas/billing-entry.js';
import { CompletionResultSchema, type CompletionResult } from '../../src/schemas/model/completion-result.js';
import { validate } from '../../src/validators/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeBillingEntry(overrides: Partial<BillingEntry> = {}): BillingEntry {
  return {
    id: 'billing-001',
    trace_id: 'trace-001',
    tenant_id: 'tenant-001',
    cost_type: 'model_inference',
    provider: 'openai',
    currency: 'USD',
    precision: 6,
    raw_cost_micro: '50000',
    multiplier_bps: 10000,
    total_cost_micro: '50000',
    rounding_policy: 'largest_remainder',
    recipients: [{
      address: '0xProvider',
      role: 'provider',
      share_bps: 10000,
      amount_micro: '50000',
    }],
    idempotency_key: 'idem-001',
    timestamp: '2026-02-16T10:00:00Z',
    contract_version: '5.1.0',
    ...overrides,
  } as BillingEntry;
}

function makeCompletionResult(overrides: Partial<CompletionResult> = {}): CompletionResult {
  return {
    request_id: '550e8400-e29b-41d4-a716-446655440000',
    model: 'gpt-4-turbo',
    provider: 'openai',
    content: 'Hello',
    finish_reason: 'stop',
    usage: {
      prompt_tokens: 100,
      completion_tokens: 50,
      total_tokens: 150,
      cost_micro: '50000',
    },
    latency_ms: 250,
    contract_version: '5.1.0',
    ...overrides,
  } as CompletionResult;
}

// ---------------------------------------------------------------------------
// S3-T3: BillingEntry provenance fields
// ---------------------------------------------------------------------------

describe('BillingEntry provenance fields (S3-T3)', () => {
  it('accepts billing entry without provenance fields (backward compatibility)', () => {
    const entry = makeBillingEntry();
    expect(Value.Check(BillingEntrySchema, entry)).toBe(true);
  });

  it('accepts billing entry with source_completion_id', () => {
    const entry = makeBillingEntry({
      source_completion_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(Value.Check(BillingEntrySchema, entry)).toBe(true);
  });

  it('accepts billing entry with pricing_snapshot', () => {
    const entry = makeBillingEntry({
      pricing_snapshot: {
        input_per_million_micro: '30000000',
        output_per_million_micro: '60000000',
      },
    });
    expect(Value.Check(BillingEntrySchema, entry)).toBe(true);
  });

  it('accepts billing entry with reconciliation_mode', () => {
    const entry = makeBillingEntry({
      reconciliation_mode: 'protocol_authoritative',
    });
    expect(Value.Check(BillingEntrySchema, entry)).toBe(true);
  });

  it('accepts billing entry with reconciliation_delta_micro', () => {
    const entry = makeBillingEntry({
      reconciliation_mode: 'provider_invoice_authoritative',
      reconciliation_delta_micro: '500',
    });
    expect(Value.Check(BillingEntrySchema, entry)).toBe(true);
  });

  it('accepts billing entry with all provenance fields', () => {
    const entry = makeBillingEntry({
      source_completion_id: '550e8400-e29b-41d4-a716-446655440000',
      pricing_snapshot: {
        input_per_million_micro: '30000000',
        output_per_million_micro: '60000000',
      },
      reconciliation_mode: 'protocol_authoritative',
    });
    expect(Value.Check(BillingEntrySchema, entry)).toBe(true);
  });

  it('rejects invalid source_completion_id (not uuid)', () => {
    const entry = makeBillingEntry({
      source_completion_id: 'not-a-uuid',
    });
    expect(Value.Check(BillingEntrySchema, entry)).toBe(false);
  });

  it('rejects invalid reconciliation_mode', () => {
    const entry = { ...makeBillingEntry(), reconciliation_mode: 'unknown' };
    expect(Value.Check(BillingEntrySchema, entry)).toBe(false);
  });

  // IMP-007: Backward compatibility golden fixture
  it('v5.0.0 BillingEntry (without new fields) validates against v5.1.0 schema', () => {
    const v500Entry = makeBillingEntry({ contract_version: '5.0.0' });
    // No provenance fields present — must still pass
    expect(Value.Check(BillingEntrySchema, v500Entry)).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// S3-T4: BillingEntry cross-field validator — provenance rules
// ---------------------------------------------------------------------------

describe('BillingEntry cross-field validator — provenance (S3-T4)', () => {
  it('warns when non-zero cost has no source_completion_id', () => {
    const entry = makeBillingEntry({ total_cost_micro: '50000' });
    const result = validate(BillingEntrySchema, entry);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      'non-zero cost should include source_completion_id for provenance',
    );
  });

  it('no provenance warning for zero cost', () => {
    const entry = makeBillingEntry({
      total_cost_micro: '0',
      raw_cost_micro: '0',
      recipients: [{ address: '0xP', role: 'provider', share_bps: 10000, amount_micro: '0' }],
    });
    const result = validate(BillingEntrySchema, entry);
    const warnings = result.warnings ?? [];
    expect(warnings).not.toContain(
      'non-zero cost should include source_completion_id for provenance',
    );
  });

  it('warns when source_completion_id present without pricing_snapshot', () => {
    const entry = makeBillingEntry({
      source_completion_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    const result = validate(BillingEntrySchema, entry);
    expect(result.warnings).toContain(
      'source_completion_id present without pricing_snapshot',
    );
  });

  it('no warning when both source_completion_id and pricing_snapshot present', () => {
    const entry = makeBillingEntry({
      source_completion_id: '550e8400-e29b-41d4-a716-446655440000',
      pricing_snapshot: {
        input_per_million_micro: '30000000',
        output_per_million_micro: '60000000',
      },
    });
    const result = validate(BillingEntrySchema, entry);
    const warnings = result.warnings ?? [];
    expect(warnings).not.toContain(
      'source_completion_id present without pricing_snapshot',
    );
  });

  it('warns when reconciliation_delta without provider_invoice_authoritative', () => {
    const entry = makeBillingEntry({
      reconciliation_mode: 'protocol_authoritative',
      reconciliation_delta_micro: '500',
    });
    const result = validate(BillingEntrySchema, entry);
    expect(result.warnings).toContain(
      'reconciliation_delta_micro only applies with provider_invoice_authoritative mode',
    );
  });

  it('no warning for delta with provider_invoice_authoritative', () => {
    const entry = makeBillingEntry({
      reconciliation_mode: 'provider_invoice_authoritative',
      reconciliation_delta_micro: '500',
      source_completion_id: '550e8400-e29b-41d4-a716-446655440000',
      pricing_snapshot: {
        input_per_million_micro: '30000000',
        output_per_million_micro: '60000000',
      },
    });
    const result = validate(BillingEntrySchema, entry);
    const warnings = result.warnings ?? [];
    expect(warnings).not.toContain(
      'reconciliation_delta_micro only applies with provider_invoice_authoritative mode',
    );
  });
});

// ---------------------------------------------------------------------------
// S3-T5: CompletionResult.pricing_applied
// ---------------------------------------------------------------------------

describe('CompletionResult.pricing_applied (S3-T5)', () => {
  it('accepts CompletionResult without pricing_applied (backward compat)', () => {
    const result = makeCompletionResult();
    expect(Value.Check(CompletionResultSchema, result)).toBe(true);
  });

  it('accepts CompletionResult with pricing_applied', () => {
    const result = makeCompletionResult({
      pricing_applied: {
        input_per_million_micro: '30000000',
        output_per_million_micro: '60000000',
      },
    });
    expect(Value.Check(CompletionResultSchema, result)).toBe(true);
  });

  it('accepts pricing_applied with optional thinking rate', () => {
    const result = makeCompletionResult({
      pricing_applied: {
        input_per_million_micro: '15000000',
        output_per_million_micro: '75000000',
        thinking_per_million_micro: '15000000',
      },
    });
    expect(Value.Check(CompletionResultSchema, result)).toBe(true);
  });

  it('v5.0.0 CompletionResult validates against v5.1.0 schema', () => {
    const v500 = makeCompletionResult({ contract_version: '5.0.0' });
    expect(Value.Check(CompletionResultSchema, v500)).toBe(true);
  });
});
