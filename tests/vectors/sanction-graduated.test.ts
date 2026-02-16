/**
 * Tests for graduated Sanction fields (v5.1.0).
 *
 * S4-T2: Schema backward compat, new fields.
 * S4-T3: Cross-field validator rules and constraint file.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { SanctionSchema, type Sanction } from '../../src/schemas/sanction.js';
import { validate } from '../../src/validators/index.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeSanction(overrides: Partial<Sanction> = {}): Sanction {
  return {
    sanction_id: 'sanction-001',
    agent_id: 'agent-001',
    severity: 'warning',
    trigger: {
      violation_type: 'content_policy',
      occurrence_count: 1,
      evidence_event_ids: ['evt-001'],
    },
    imposed_by: 'automatic',
    imposed_at: '2026-02-16T10:00:00Z',
    appeal_available: true,
    expires_at: '2026-02-17T10:00:00Z',
    contract_version: '5.1.0',
    ...overrides,
  } as Sanction;
}

// ---------------------------------------------------------------------------
// S4-T2: Schema backward compatibility
// ---------------------------------------------------------------------------

describe('Sanction graduated fields — schema (S4-T2)', () => {
  it('v5.0.0 Sanction (without new fields) validates against v5.1.0 schema', () => {
    const v500 = makeSanction({ contract_version: '5.0.0' });
    expect(Value.Check(SanctionSchema, v500)).toBe(true);
  });

  it('accepts sanction with severity_level', () => {
    const s = makeSanction({ severity_level: 'warning' });
    expect(Value.Check(SanctionSchema, s)).toBe(true);
  });

  it('accepts sanction with duration_seconds', () => {
    const s = makeSanction({ duration_seconds: 86400 });
    expect(Value.Check(SanctionSchema, s)).toBe(true);
  });

  it('accepts sanction with duration_seconds = 0 (indefinite)', () => {
    const s = makeSanction({ duration_seconds: 0 });
    expect(Value.Check(SanctionSchema, s)).toBe(true);
  });

  it('accepts sanction with appeal_dispute_id', () => {
    const s = makeSanction({
      appeal_dispute_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    expect(Value.Check(SanctionSchema, s)).toBe(true);
  });

  it('accepts sanction with escalated_from', () => {
    const s = makeSanction({ escalated_from: 'sanction-000' });
    expect(Value.Check(SanctionSchema, s)).toBe(true);
  });

  it('accepts sanction with all new fields', () => {
    const s = makeSanction({
      severity_level: 'rate_limited',
      duration_seconds: 259200,
      appeal_dispute_id: '550e8400-e29b-41d4-a716-446655440000',
      escalated_from: 'sanction-000',
    });
    expect(Value.Check(SanctionSchema, s)).toBe(true);
  });

  it('rejects invalid severity_level', () => {
    const s = { ...makeSanction(), severity_level: 'terminated' };
    expect(Value.Check(SanctionSchema, s)).toBe(false);
  });

  it('rejects invalid appeal_dispute_id (not uuid)', () => {
    const s = { ...makeSanction(), appeal_dispute_id: 'not-a-uuid' };
    expect(Value.Check(SanctionSchema, s)).toBe(false);
  });

  it('rejects negative duration_seconds', () => {
    const s = { ...makeSanction(), duration_seconds: -1 };
    expect(Value.Check(SanctionSchema, s)).toBe(false);
  });

  it('rejects non-integer duration_seconds', () => {
    const s = { ...makeSanction(), duration_seconds: 1.5 };
    expect(Value.Check(SanctionSchema, s)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// S4-T3: Cross-field validator — graduated rules
// ---------------------------------------------------------------------------

describe('Sanction cross-field validator — graduated (S4-T3)', () => {
  it('existing rules still work: terminated with expires_at is error', () => {
    const s = makeSanction({
      severity: 'terminated',
      expires_at: '2026-02-17T10:00:00Z',
      appeal_available: false,
    });
    const result = validate(SanctionSchema, s);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain(
      'expires_at must not be present when severity is "terminated" (termination is permanent)',
    );
  });

  it('warns when severity_level present without duration_seconds', () => {
    const s = makeSanction({ severity_level: 'warning' });
    const result = validate(SanctionSchema, s);
    expect(result.valid).toBe(true);
    expect(result.warnings).toContain(
      'severity_level present without duration_seconds — timed sanctions should specify duration',
    );
  });

  it('no warning when severity_level = suspended without duration (indefinite is expected)', () => {
    const s = makeSanction({
      severity: 'suspended',
      severity_level: 'suspended',
      expires_at: undefined,
    });
    const result = validate(SanctionSchema, s);
    const warnings = result.warnings ?? [];
    expect(warnings).not.toContain(
      'severity_level present without duration_seconds — timed sanctions should specify duration',
    );
  });

  it('warns when severity differs from severity_level', () => {
    const s = makeSanction({
      severity: 'warning',
      severity_level: 'rate_limited',
      duration_seconds: 259200,
    });
    const result = validate(SanctionSchema, s);
    expect(result.warnings).toContain(
      'severity ("warning") differs from severity_level ("rate_limited") — severity_level takes precedence for enforcement',
    );
  });

  it('no warning when severity matches severity_level', () => {
    const s = makeSanction({
      severity: 'rate_limited',
      severity_level: 'rate_limited',
      duration_seconds: 259200,
    });
    const result = validate(SanctionSchema, s);
    const warnings = result.warnings ?? [];
    expect(warnings).not.toContain(
      expect.stringContaining('differs from severity_level'),
    );
  });

  it('error when appeal_dispute_id present but appeal_available is false', () => {
    const s = makeSanction({
      appeal_available: false,
      appeal_dispute_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    const result = validate(SanctionSchema, s);
    expect(result.valid).toBe(false);
    expect(result.errors).toContain('appeal_dispute_id present but appeal_available is false');
  });

  it('no error when appeal_dispute_id present and appeal_available is true', () => {
    const s = makeSanction({
      appeal_available: true,
      appeal_dispute_id: '550e8400-e29b-41d4-a716-446655440000',
    });
    const result = validate(SanctionSchema, s);
    expect(result.valid).toBe(true);
  });

  it('existing escalation rule check still works', () => {
    // content_policy at occurrence 1 should be warning
    const s = makeSanction({
      severity: 'suspended', // wrong — should be warning for content_policy at count 1
      expires_at: undefined, // suspended doesn't need expires_at
      trigger: {
        violation_type: 'content_policy',
        occurrence_count: 1,
        evidence_event_ids: ['evt-001'],
      },
    });
    const result = validate(SanctionSchema, s);
    const warnings = result.warnings ?? [];
    expect(warnings.some(w => w.includes('does not match escalation rule'))).toBe(true);
  });

  it('valid graduated sanction passes all checks', () => {
    const s = makeSanction({
      severity: 'rate_limited',
      severity_level: 'rate_limited',
      duration_seconds: 259200,
      trigger: {
        violation_type: 'content_policy',
        occurrence_count: 3,
        evidence_event_ids: ['evt-001', 'evt-002', 'evt-003'],
      },
    });
    const result = validate(SanctionSchema, s);
    expect(result.valid).toBe(true);
  });
});
