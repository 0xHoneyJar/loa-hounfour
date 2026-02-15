/**
 * Cross-field validator tests for Sybil resistance (S1-T5) and
 * escalation linkage (S1-T6) findings.
 *
 * Findings: BB-V4-DEEP-001, BB-V4-DEEP-004
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { ReputationScoreSchema } from '../../src/schemas/reputation-score.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';

// ---------------------------------------------------------------------------
// ReputationScore — Sybil resistance (BB-V4-DEEP-001)
// ---------------------------------------------------------------------------

const VALID_REPUTATION = {
  agent_id: 'a1',
  score: 0.85,
  components: {
    outcome_quality: 0.9,
    performance_consistency: 0.8,
    dispute_ratio: 0.85,
    community_standing: 0.75,
  },
  sample_size: 10,
  last_updated: '2026-01-01T00:00:00Z',
  decay_applied: false,
  contract_version: '5.0.0',
};

describe('ReputationScore — Sybil resistance fields', () => {
  it('validates with min_unique_validators', () => {
    const doc = { ...VALID_REPUTATION, min_unique_validators: 5 };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('validates with validation_graph_hash', () => {
    const doc = { ...VALID_REPUTATION, validation_graph_hash: 'sha256:abc123' };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('validates with both Sybil fields', () => {
    const doc = {
      ...VALID_REPUTATION,
      min_unique_validators: 5,
      validation_graph_hash: 'sha256:abc123',
    };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('errors when sample_size < min_unique_validators', () => {
    const doc = {
      ...VALID_REPUTATION,
      sample_size: 3,
      min_unique_validators: 5,
    };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('sample_size (3) must be >= min_unique_validators (5)'))).toBe(true);
    }
  });

  it('passes when sample_size equals min_unique_validators', () => {
    const doc = {
      ...VALID_REPUTATION,
      sample_size: 5,
      min_unique_validators: 5,
    };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('passes when sample_size exceeds min_unique_validators', () => {
    const doc = {
      ...VALID_REPUTATION,
      sample_size: 10,
      min_unique_validators: 5,
    };
    const result = validate(ReputationScoreSchema, doc);
    expect(result.valid).toBe(true);
  });

  it('no Sybil error when min_unique_validators not set', () => {
    const doc = { ...VALID_REPUTATION, sample_size: 1 };
    const result = validate(ReputationScoreSchema, doc);
    // May have low-sample warning but no Sybil error
    expect(result.valid).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Sanction — Escalation linkage (BB-V4-DEEP-004)
// ---------------------------------------------------------------------------

const VALID_SANCTION = {
  sanction_id: 's1',
  agent_id: 'a1',
  severity: 'warning',
  trigger: {
    violation_type: 'rate_abuse',
    occurrence_count: 3,
    evidence_event_ids: ['evt-1'],
  },
  imposed_by: 'automatic',
  imposed_at: '2026-01-01T00:00:00Z',
  appeal_available: true,
  contract_version: '5.0.0',
};

describe('Sanction — Escalation linkage', () => {
  it('validates with escalation_rule_applied matching violation_type', () => {
    const doc = { ...VALID_SANCTION, escalation_rule_applied: 'rate_abuse' };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    // No escalation mismatch warning (other warnings may exist from base cross-field validator)
    if (result.warnings) {
      expect(result.warnings.every((w) => !w.includes('escalation_rule_applied'))).toBe(true);
    }
  });

  it('warns when escalation_rule_applied does not match violation_type', () => {
    const doc = { ...VALID_SANCTION, escalation_rule_applied: 'data_exfiltration' };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.warnings).toBeDefined();
    expect(result.warnings!.some((w) =>
      w.includes('escalation_rule_applied') && w.includes('should match'),
    )).toBe(true);
  });

  it('no warning when escalation_rule_applied not set', () => {
    const result = validate(SanctionSchema, VALID_SANCTION);
    expect(result.valid).toBe(true);
    // No escalation warning (may have other warnings but not this one)
    if (result.warnings) {
      expect(result.warnings.every((w) => !w.includes('escalation_rule_applied'))).toBe(true);
    }
  });

  it('validates escalation with expires_at', () => {
    const doc = {
      ...VALID_SANCTION,
      escalation_rule_applied: 'rate_abuse',
      expires_at: '2026-02-01T00:00:00Z',
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
  });
});
