/**
 * Tests for the CrossScoreReport constraint file (PR-A1.4, v8.4.0).
 *
 * Covers CSR-1 from SDD section 3.6:
 *   - CSR-1: no self-scoring (scorer.agent_id != scored.agent_id per pairwise entry)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'CrossScoreReport.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function ruleExpr(id: string): string {
  const rule = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule.expression as string;
}

describe('CrossScoreReport constraint file structure', () => {
  it('targets the CrossScoreReport schema', () => {
    expect(constraintFile.schema_id).toBe('CrossScoreReport');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 1 constraint (CSR-1)', () => {
    expect(constraintFile.constraints).toHaveLength(1);
    expect(constraintFile.constraints[0].id).toBe('CSR-1');
  });

  it('marks CSR-1 evaluator as library', () => {
    expect(constraintFile.constraints[0].evaluator).toBe('library');
  });
});

describe('CSR-1 — no-self-scoring per pairwise entry', () => {
  const expr = ruleExpr('CSR-1');

  it('passes for an empty pairwise_scores array (vacuous)', () => {
    expect(evaluateConstraint({ pairwise_scores: [] }, expr)).toBe(true);
  });

  it('passes when every pair scorer/scored agent_id differ', () => {
    const data = {
      pairwise_scores: [
        { scorer: { agent_id: 'a' }, scored: { agent_id: 'b' } },
        { scorer: { agent_id: 'b' }, scored: { agent_id: 'a' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when a pair has scorer.agent_id == scored.agent_id (self-scoring)', () => {
    const data = {
      pairwise_scores: [
        { scorer: { agent_id: 'a' }, scored: { agent_id: 'b' } },
        { scorer: { agent_id: 'self' }, scored: { agent_id: 'self' } },
      ],
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});
