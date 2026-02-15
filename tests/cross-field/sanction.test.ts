/**
 * Cross-field validator tests for Sanction escalation rule wiring (BB-V4-DEEP-004, BB-C7-TEST-004).
 */
import { describe, it, expect } from 'vitest';
import { validate } from '../../src/validators/index.js';
import { SanctionSchema } from '../../src/schemas/sanction.js';

const VALID_SANCTION = {
  sanction_id: 's1',
  agent_id: 'a1',
  severity: 'warning',
  trigger: {
    violation_type: 'content_policy',
    occurrence_count: 1,
    evidence_event_ids: ['e1'],
  },
  imposed_by: 'automatic',
  imposed_at: '2026-01-01T00:00:00Z',
  appeal_available: true,
  contract_version: '4.4.0',
};

describe('Sanction escalation rule wiring cross-field validation', () => {
  // content_policy: thresholds [1, 3, 5], severity_progression ['warning', 'rate_limited', 'suspended']

  it('no escalation warning when severity matches rule for content_policy at occurrence 1', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'content_policy', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('warns when severity does not match escalation rule for content_policy at occurrence 3', () => {
    // At occurrence 3, expected severity is 'rate_limited'; using 'warning' should warn
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'content_policy', occurrence_count: 3, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'))).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('expected "rate_limited"'))).toBe(true);
  });

  it('no escalation warning when severity matches rule for content_policy at occurrence 5', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'suspended',
      trigger: { violation_type: 'content_policy', occurrence_count: 5, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('warns when severity does not match escalation rule for content_policy at occurrence 6 (above max threshold)', () => {
    // At occurrence 6 (>= threshold 5), expected severity is 'suspended'
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'content_policy', occurrence_count: 6, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('expected "suspended"'))).toBe(true);
  });

  // billing_fraud: thresholds [1], severity_progression ['terminated']

  it('no escalation warning for billing_fraud terminated at occurrence 1', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'terminated',
      trigger: { violation_type: 'billing_fraud', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('warns when billing_fraud severity is not terminated', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'billing_fraud', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('expected "terminated"'))).toBe(true);
  });

  // community_guideline: thresholds [1, 3, 7], severity_progression ['warning', 'rate_limited', 'suspended']

  it('no escalation warning for community_guideline warning at occurrence 2 (under threshold 3)', () => {
    // occurrence_count=2 is >= threshold[0]=1 but < threshold[1]=3, so expected is 'warning'
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'community_guideline', occurrence_count: 2, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('warns when community_guideline severity is wrong at occurrence 3', () => {
    // At occurrence 3 (>= threshold[1]=3), expected severity is 'rate_limited'
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'community_guideline', occurrence_count: 3, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('expected "rate_limited"'))).toBe(true);
  });

  // rate_abuse: thresholds [1, 2, 5, 10], severity_progression ['warning', 'rate_limited', 'pool_restricted', 'suspended']

  it('correctly identifies pool_restricted for rate_abuse at occurrence 5', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'pool_restricted',
      trigger: { violation_type: 'rate_abuse', occurrence_count: 5, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('warns when rate_abuse severity is wrong at occurrence 10', () => {
    // At occurrence 10 (>= threshold[3]=10), expected 'suspended'
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      expires_at: '2026-06-01T00:00:00Z',
      trigger: { violation_type: 'rate_abuse', occurrence_count: 10, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('expected "suspended"'))).toBe(true);
  });

  // safety_violation: thresholds [1, 2], severity_progression ['suspended', 'terminated']

  it('no escalation warning for safety_violation suspended at occurrence 1', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'suspended',
      trigger: { violation_type: 'safety_violation', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('no escalation warning for safety_violation terminated at occurrence 2', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'terminated',
      trigger: { violation_type: 'safety_violation', occurrence_count: 2, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(true);
    const hasEscalationWarning = result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'));
    expect(hasEscalationWarning).toBeFalsy();
  });

  it('rejects when expires_at is before imposed_at (BB-C8-I1-CMP-018)', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      imposed_at: '2026-06-01T00:00:00Z',
      expires_at: '2026-01-01T00:00:00Z', // before imposed_at
      trigger: { violation_type: 'content_policy', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('expires_at must be after imposed_at'))).toBe(true);
    }
  });

  it('rejects when expires_at equals imposed_at (BB-C8-I1-CMP-018)', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'warning',
      imposed_at: '2026-06-01T00:00:00Z',
      expires_at: '2026-06-01T00:00:00Z', // equal — not strictly after
      trigger: { violation_type: 'content_policy', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    expect(result.valid).toBe(false);
    if (!result.valid) {
      expect(result.errors.some((e) => e.includes('expires_at must be after imposed_at'))).toBe(true);
    }
  });

  it('escalation mismatch is a WARNING, not an error (operators may override)', () => {
    const doc = {
      ...VALID_SANCTION,
      severity: 'suspended',
      trigger: { violation_type: 'content_policy', occurrence_count: 1, evidence_event_ids: ['e1'] },
    };
    const result = validate(SanctionSchema, doc);
    // Should still be valid (warning, not error)
    expect(result.valid).toBe(true);
    expect(result.valid === true && result.warnings?.some((w) => w.includes('does not match escalation rule'))).toBe(true);
  });
});
