/**
 * Tests for the PanelVerdict constraint file (PR-A1.4, v8.4.0).
 *
 * Covers PV-1 .. PV-4 from SDD section 3.6:
 *   - PV-1: bucket-verdict normative pairing table
 *   - PV-2: juror_verdicts.length in [4, 16]
 *   - PV-3: asymmetric_blocker_signal.validated equals the disjunction of
 *           cross_model_agreement >= 0.7 OR same_model_reviewer_score >= 600
 *   - PV-4: signing_context audience/scope non-empty + contract_version length >= 5
 *           (well-formed semver pattern enforced at the schema layer per pass-3 fix)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'PanelVerdict.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function ruleExpr(id: string): string {
  const rule = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule.expression as string;
}

describe('PanelVerdict constraint file structure', () => {
  it('targets the PanelVerdict schema', () => {
    expect(constraintFile.schema_id).toBe('PanelVerdict');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 4 constraints (PV-1 .. PV-4)', () => {
    expect(constraintFile.constraints).toHaveLength(4);
    const ids = constraintFile.constraints.map((c: { id: string }) => c.id);
    expect(ids).toEqual(['PV-1', 'PV-2', 'PV-3', 'PV-4']);
  });

  it('marks every constraint evaluator as library', () => {
    for (const c of constraintFile.constraints) {
      expect(c.evaluator).toBe('library');
    }
  });
});

describe('PV-1 — bucket-verdict normative pairing table', () => {
  const expr = ruleExpr('PV-1');

  it('passes for HIGH_CONSENSUS + proceed', () => {
    expect(evaluateConstraint({ bucket: 'HIGH_CONSENSUS', verdict: 'proceed' }, expr)).toBe(true);
  });

  it('passes for DISPUTED + defer', () => {
    expect(evaluateConstraint({ bucket: 'DISPUTED', verdict: 'defer' }, expr)).toBe(true);
  });

  it('passes for BLOCKER + reject', () => {
    expect(evaluateConstraint({ bucket: 'BLOCKER', verdict: 'reject' }, expr)).toBe(true);
  });

  it('passes for LOW_VALUE + proceed (permissive)', () => {
    expect(evaluateConstraint({ bucket: 'LOW_VALUE', verdict: 'proceed' }, expr)).toBe(true);
  });

  it('passes for LOW_VALUE + defer (permissive)', () => {
    expect(evaluateConstraint({ bucket: 'LOW_VALUE', verdict: 'defer' }, expr)).toBe(true);
  });

  it('passes for LOW_VALUE + low_value_pass (permissive)', () => {
    expect(evaluateConstraint({ bucket: 'LOW_VALUE', verdict: 'low_value_pass' }, expr)).toBe(true);
  });

  it('fails for HIGH_CONSENSUS + defer (off-table)', () => {
    expect(evaluateConstraint({ bucket: 'HIGH_CONSENSUS', verdict: 'defer' }, expr)).toBe(false);
  });

  it('fails for DISPUTED + proceed (off-table)', () => {
    expect(evaluateConstraint({ bucket: 'DISPUTED', verdict: 'proceed' }, expr)).toBe(false);
  });

  it('fails for BLOCKER + proceed (off-table)', () => {
    expect(evaluateConstraint({ bucket: 'BLOCKER', verdict: 'proceed' }, expr)).toBe(false);
  });

  it('fails for HIGH_CONSENSUS + low_value_pass (off-table — only LOW_VALUE admits)', () => {
    expect(evaluateConstraint({ bucket: 'HIGH_CONSENSUS', verdict: 'low_value_pass' }, expr)).toBe(false);
  });
});

describe('PV-2 — juror_verdicts.length in [4, 16]', () => {
  const expr = ruleExpr('PV-2');

  it('passes for the lower bound (4 jurors)', () => {
    expect(evaluateConstraint({ juror_verdicts: new Array(4).fill({}) }, expr)).toBe(true);
  });

  it('passes for the upper bound (16 jurors)', () => {
    expect(evaluateConstraint({ juror_verdicts: new Array(16).fill({}) }, expr)).toBe(true);
  });

  it('fails for 3 jurors (below the lower bound)', () => {
    expect(evaluateConstraint({ juror_verdicts: new Array(3).fill({}) }, expr)).toBe(false);
  });

  it('fails for 17 jurors (above the upper bound)', () => {
    expect(evaluateConstraint({ juror_verdicts: new Array(17).fill({}) }, expr)).toBe(false);
  });
});

describe('PV-3 — asymmetric_blocker_signal validated/threshold consistency', () => {
  const expr = ruleExpr('PV-3');

  it('passes when asymmetric_blocker_signal is null (rule does not apply)', () => {
    expect(evaluateConstraint({ asymmetric_blocker_signal: null }, expr)).toBe(true);
  });

  it('passes when validated == true and cross_model_agreement >= 0.7', () => {
    const data = {
      asymmetric_blocker_signal: {
        cross_validation: { validated: true, cross_model_agreement: 0.85, same_model_reviewer_score: 100 },
      },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when validated == true and same_model_reviewer_score >= 600', () => {
    const data = {
      asymmetric_blocker_signal: {
        cross_validation: { validated: true, cross_model_agreement: 0.5, same_model_reviewer_score: 700 },
      },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when validated == false and neither threshold is met', () => {
    const data = {
      asymmetric_blocker_signal: {
        cross_validation: { validated: false, cross_model_agreement: 0.4, same_model_reviewer_score: 300 },
      },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when validated == true but neither threshold is met', () => {
    const data = {
      asymmetric_blocker_signal: {
        cross_validation: { validated: true, cross_model_agreement: 0.5, same_model_reviewer_score: 400 },
      },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when validated == false but a threshold is met', () => {
    const data = {
      asymmetric_blocker_signal: {
        cross_validation: { validated: false, cross_model_agreement: 0.9, same_model_reviewer_score: 100 },
      },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('PV-4 — signing_context audience/scope non-empty + contract_version length floor', () => {
  const expr = ruleExpr('PV-4');

  it('passes for a well-formed signing_context', () => {
    const data = {
      signing_context: { audience: 'org-a', scope: 'panel-v1/security-review', contract_version: '8.4.0' },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when audience is empty', () => {
    const data = {
      signing_context: { audience: '', scope: 'panel-v1', contract_version: '8.4.0' },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when scope is empty', () => {
    const data = {
      signing_context: { audience: 'org-a', scope: '', contract_version: '8.4.0' },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when contract_version is shorter than the semver minimum (length < 5)', () => {
    const data = {
      signing_context: { audience: 'org-a', scope: 'panel-v1', contract_version: '8.4' },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('PV-4 — evaluation_note documents the schema-level pattern enforcement', () => {
  it('records that DSL grammar v2.0 has no regex builtin and the pattern is enforced at the schema layer', () => {
    const rule = constraintFile.constraints.find((c: { id: string }) => c.id === 'PV-4');
    expect(rule.evaluation_note).toContain('schema layer');
    expect(rule.evaluation_note).toContain('SigningContextSchema');
  });
});
