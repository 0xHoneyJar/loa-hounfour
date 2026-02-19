/**
 * Sanction schema drift detection tests.
 *
 * Ensures the Sanction type used in cross-field validators stays in sync
 * with the SanctionSchema definition. If a new field is added to the schema,
 * these tests catch it early.
 *
 * @see SDD §3.2 — Sanction validator type safety
 */
import { describe, it, expect } from 'vitest';
import { SanctionSchema, type Sanction } from '../../src/schemas/sanction.js';

describe('Sanction schema drift detection', () => {
  const schemaProperties = Object.keys(SanctionSchema.properties);

  it('schema has expected required fields', () => {
    expect(schemaProperties).toContain('sanction_id');
    expect(schemaProperties).toContain('agent_id');
    expect(schemaProperties).toContain('severity');
    expect(schemaProperties).toContain('trigger');
    expect(schemaProperties).toContain('imposed_by');
    expect(schemaProperties).toContain('imposed_at');
    expect(schemaProperties).toContain('appeal_available');
    expect(schemaProperties).toContain('contract_version');
  });

  it('schema has expected optional fields', () => {
    expect(schemaProperties).toContain('expires_at');
    expect(schemaProperties).toContain('escalation_rule_applied');
    expect(schemaProperties).toContain('severity_level');
    expect(schemaProperties).toContain('duration_seconds');
    expect(schemaProperties).toContain('appeal_dispute_id');
    expect(schemaProperties).toContain('escalated_from');
  });

  it('type Sanction is structurally compatible with schema', () => {
    // This test verifies that Static<typeof SanctionSchema> resolves to the expected shape.
    // If a field is added to SanctionSchema, this enforces it's reflected in the type.
    const sample: Sanction = {
      sanction_id: 'test-001',
      agent_id: 'agent-001',
      severity: 'warning',
      trigger: {
        violation_type: 'rate_abuse',
        occurrence_count: 1,
        evidence_event_ids: ['evt-001'],
      },
      imposed_by: 'automatic',
      imposed_at: '2026-01-01T00:00:00Z',
      appeal_available: true,
      contract_version: '5.1.0',
    };
    // Verify it compiles and has expected keys
    expect(sample.sanction_id).toBe('test-001');
    expect(sample.severity).toBe('warning');
  });

  it('total field count matches expected (catches untracked additions)', () => {
    // Update this count when fields are added to SanctionSchema
    expect(schemaProperties.length).toBe(14);
  });

  it('schema has x-cross-field-validated marker', () => {
    expect((SanctionSchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
  });

  it('schema has additionalProperties: false', () => {
    expect(SanctionSchema.additionalProperties).toBe(false);
  });

  it('severity field covers all expected levels', () => {
    const severitySchema = SanctionSchema.properties.severity;
    const literals = (severitySchema as { anyOf: Array<{ const: string }> }).anyOf.map(
      (s) => s.const,
    );
    expect(literals).toContain('warning');
    expect(literals).toContain('rate_limited');
    expect(literals).toContain('pool_restricted');
    expect(literals).toContain('suspended');
    expect(literals).toContain('terminated');
  });

  it('trigger.violation_type covers all expected types', () => {
    const triggerSchema = SanctionSchema.properties.trigger;
    const vtSchema = (triggerSchema as { properties: Record<string, { anyOf: Array<{ const: string }> }> }).properties.violation_type;
    const literals = vtSchema.anyOf.map((s) => s.const);
    expect(literals).toContain('rate_abuse');
    expect(literals).toContain('content_policy');
    expect(literals).toContain('billing_fraud');
    expect(literals).toContain('safety_violation');
  });
});
