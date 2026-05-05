/**
 * Tests for the SuccessionPolicy constraint file (PR-A1.4, v8.4.0).
 *
 * Covers SP-1, SP-2 from SDD section 3.6:
 *   - SP-1: asymmetric ladder thresholds (amend >= rotate >= add >= remove)
 *   - SP-2: non-decreasing cooldowns (amend >= rotate >= add >= remove)
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'SuccessionPolicy.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function ruleExpr(id: string): string {
  const rule = constraintFile.constraints.find((c: { id: string }) => c.id === id);
  if (!rule) throw new Error(`rule ${id} not found`);
  return rule.expression as string;
}

describe('SuccessionPolicy constraint file structure', () => {
  it('targets the SuccessionPolicy schema', () => {
    expect(constraintFile.schema_id).toBe('SuccessionPolicy');
  });

  it('declares contract_version 8.4.0', () => {
    expect(constraintFile.contract_version).toBe('8.4.0');
  });

  it('contains exactly 2 constraints (SP-1, SP-2)', () => {
    expect(constraintFile.constraints).toHaveLength(2);
    const ids = constraintFile.constraints.map((c: { id: string }) => c.id);
    expect(ids).toEqual(['SP-1', 'SP-2']);
  });

  it('marks every constraint evaluator as library', () => {
    for (const c of constraintFile.constraints) {
      expect(c.evaluator).toBe('library');
    }
  });
});

describe('SP-1 — asymmetric ladder thresholds (amend >= rotate >= add >= remove)', () => {
  const expr = ruleExpr('SP-1');

  it('passes for a strictly-decreasing ladder', () => {
    const data = {
      amend: { threshold: 0.9 },
      rotate: { threshold: 0.7 },
      add: { threshold: 0.5 },
      remove: { threshold: 0.3 },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when all thresholds are equal (degenerate but valid)', () => {
    const data = {
      amend: { threshold: 0.5 },
      rotate: { threshold: 0.5 },
      add: { threshold: 0.5 },
      remove: { threshold: 0.5 },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when remove threshold exceeds add', () => {
    const data = {
      amend: { threshold: 0.9 },
      rotate: { threshold: 0.7 },
      add: { threshold: 0.5 },
      remove: { threshold: 0.6 },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when rotate threshold exceeds amend', () => {
    const data = {
      amend: { threshold: 0.5 },
      rotate: { threshold: 0.9 },
      add: { threshold: 0.5 },
      remove: { threshold: 0.3 },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});

describe('SP-2 — non-decreasing cooldowns (amend >= rotate >= add >= remove)', () => {
  const expr = ruleExpr('SP-2');

  it('passes for a strictly-decreasing cooldown ladder', () => {
    const data = {
      amend: { cooldown_seconds: 86400 },
      rotate: { cooldown_seconds: 3600 },
      add: { cooldown_seconds: 600 },
      remove: { cooldown_seconds: 60 },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when all cooldowns are equal (degenerate but valid)', () => {
    const data = {
      amend: { cooldown_seconds: 60 },
      rotate: { cooldown_seconds: 60 },
      add: { cooldown_seconds: 60 },
      remove: { cooldown_seconds: 60 },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('passes when all cooldowns are zero', () => {
    const data = {
      amend: { cooldown_seconds: 0 },
      rotate: { cooldown_seconds: 0 },
      add: { cooldown_seconds: 0 },
      remove: { cooldown_seconds: 0 },
    };
    expect(evaluateConstraint(data, expr)).toBe(true);
  });

  it('fails when remove cooldown exceeds add', () => {
    const data = {
      amend: { cooldown_seconds: 86400 },
      rotate: { cooldown_seconds: 3600 },
      add: { cooldown_seconds: 60 },
      remove: { cooldown_seconds: 600 },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });

  it('fails when rotate cooldown exceeds amend', () => {
    const data = {
      amend: { cooldown_seconds: 60 },
      rotate: { cooldown_seconds: 3600 },
      add: { cooldown_seconds: 60 },
      remove: { cooldown_seconds: 60 },
    };
    expect(evaluateConstraint(data, expr)).toBe(false);
  });
});
