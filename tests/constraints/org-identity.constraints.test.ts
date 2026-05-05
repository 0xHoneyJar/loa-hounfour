/**
 * Tests for the OrgIdentity constraint file (PR-A1.4, v8.4.0).
 *
 * Covers OI-1 from SDD section 3.6:
 *   - OI-1: current_representatives.length >= 1 (SP-007 minimum-rep cardinality)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'OrgIdentity.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function ruleExpr(id: string): string {
  const rule = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule.expression as string;
}

describe('OrgIdentity constraint file structure', () => {
  it('targets the OrgIdentity schema', () => {
    expect(constraintFile.schema_id).toBe('OrgIdentity');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 1 constraint (OI-1)', () => {
    expect(constraintFile.constraints).toHaveLength(1);
    expect(constraintFile.constraints[0].id).toBe('OI-1');
  });

  it('marks OI-1 evaluator as library', () => {
    expect(constraintFile.constraints[0].evaluator).toBe('library');
  });
});

describe('OI-1 — current_representatives.length >= 1', () => {
  const expr = ruleExpr('OI-1');

  it('passes when current_representatives carries one entry', () => {
    expect(evaluateConstraint({ current_representatives: [{ agent_id: 'rep-1' }] }, expr)).toBe(true);
  });

  it('passes when current_representatives carries many entries', () => {
    expect(evaluateConstraint({
      current_representatives: [{ agent_id: 'rep-1' }, { agent_id: 'rep-2' }, { agent_id: 'rep-3' }],
    }, expr)).toBe(true);
  });

  it('fails when current_representatives is empty (SP-007 violation)', () => {
    expect(evaluateConstraint({ current_representatives: [] }, expr)).toBe(false);
  });
});
