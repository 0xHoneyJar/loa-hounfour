import { describe, it, expect } from 'vitest';
import { ESCALATION_RULES, VIOLATION_TYPES, SANCTION_SEVERITY_LEVELS, SANCTION_SEVERITY_ORDER } from '../../src/vocabulary/sanctions.js';

describe('ESCALATION_RULES structural invariants', () => {
  it('every violation type has an escalation rule', () => {
    for (const vt of VIOLATION_TYPES) {
      expect(ESCALATION_RULES[vt]).toBeDefined();
    }
  });

  it('thresholds length matches severity_progression length', () => {
    for (const [vt, rule] of Object.entries(ESCALATION_RULES)) {
      expect(rule.thresholds.length).toBe(rule.severity_progression.length);
    }
  });

  it('thresholds are monotonically increasing', () => {
    for (const [vt, rule] of Object.entries(ESCALATION_RULES)) {
      for (let i = 1; i < rule.thresholds.length; i++) {
        expect(rule.thresholds[i]).toBeGreaterThan(rule.thresholds[i - 1]);
      }
    }
  });

  it('severity progressions are monotonically increasing', () => {
    for (const [vt, rule] of Object.entries(ESCALATION_RULES)) {
      for (let i = 1; i < rule.severity_progression.length; i++) {
        expect(SANCTION_SEVERITY_ORDER[rule.severity_progression[i]])
          .toBeGreaterThanOrEqual(SANCTION_SEVERITY_ORDER[rule.severity_progression[i - 1]]);
      }
    }
  });

  it('all severity values are valid levels', () => {
    for (const rule of Object.values(ESCALATION_RULES)) {
      for (const sev of rule.severity_progression) {
        expect(SANCTION_SEVERITY_LEVELS).toContain(sev);
      }
    }
  });

  it('billing_fraud and identity_spoofing are immediate termination', () => {
    expect(ESCALATION_RULES.billing_fraud.thresholds).toEqual([1]);
    expect(ESCALATION_RULES.billing_fraud.severity_progression).toEqual(['terminated']);
    expect(ESCALATION_RULES.identity_spoofing.thresholds).toEqual([1]);
    expect(ESCALATION_RULES.identity_spoofing.severity_progression).toEqual(['terminated']);
  });
});
