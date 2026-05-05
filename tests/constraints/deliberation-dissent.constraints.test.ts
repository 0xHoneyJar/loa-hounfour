/**
 * Tests for the DeliberationDissent constraint file (PR-A1.4, v8.4.0).
 *
 * Covers DD-1, DD-2 from SDD section 3.6:
 *   - DD-1: narrative.length in [1, 16384]
 *   - DD-2: every cited_claim_ids entry is a non-empty string
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'DeliberationDissent.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function ruleExpr(id: string): string {
  const rule = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule.expression as string;
}

describe('DeliberationDissent constraint file structure', () => {
  it('targets the DeliberationDissent schema', () => {
    expect(constraintFile.schema_id).toBe('DeliberationDissent');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 2 constraints (DD-1, DD-2)', () => {
    expect(constraintFile.constraints).toHaveLength(2);
    const ids = constraintFile.constraints.map((c: { id: string }) => c.id);
    expect(ids).toEqual(['DD-1', 'DD-2']);
  });

  it('marks every constraint evaluator as library', () => {
    for (const c of constraintFile.constraints) {
      expect(c.evaluator).toBe('library');
    }
  });
});

describe('DD-1 — narrative.length in [1, 16384]', () => {
  const expr = ruleExpr('DD-1');

  it('passes for a single-character narrative (lower bound)', () => {
    expect(evaluateConstraint({ narrative: 'x' }, expr)).toBe(true);
  });

  it('passes at the upper bound (16384 characters)', () => {
    expect(evaluateConstraint({ narrative: 'a'.repeat(16384) }, expr)).toBe(true);
  });

  it('fails on an empty narrative', () => {
    expect(evaluateConstraint({ narrative: '' }, expr)).toBe(false);
  });

  it('fails when narrative exceeds 16384 characters', () => {
    expect(evaluateConstraint({ narrative: 'a'.repeat(16385) }, expr)).toBe(false);
  });
});

describe('DD-2 — cited_claim_ids entries non-empty strings', () => {
  const expr = ruleExpr('DD-2');

  it('passes for an empty cited_claim_ids array (vacuous)', () => {
    expect(evaluateConstraint({ cited_claim_ids: [] }, expr)).toBe(true);
  });

  it('passes when every entry is a non-empty string', () => {
    expect(evaluateConstraint({ cited_claim_ids: ['claim-a', 'claim-b'] }, expr)).toBe(true);
  });

  it('fails when any entry is an empty string', () => {
    expect(evaluateConstraint({ cited_claim_ids: ['claim-a', ''] }, expr)).toBe(false);
  });
});

describe('DD-2 — evaluation_note documents the consumer-side cross-record obligation', () => {
  it('records that cross-record existence is consumer-side per NF-1 and R6', () => {
    const rule = constraintFile.constraints.find((c: { id: string }) => c.id === 'DD-2');
    expect(rule.evaluation_note).toContain('Cross-record existence');
    expect(rule.evaluation_note).toContain('consumer-side');
  });
});
