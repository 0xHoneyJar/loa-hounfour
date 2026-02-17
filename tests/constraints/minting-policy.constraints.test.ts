/**
 * Tests for MintingPolicy constraint file (S3-T4).
 *
 * Validates the max-positive constraint on minting policy.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const rootDir = join(__dirname, '..', '..');
const constraintPath = join(rootDir, 'constraints', 'MintingPolicy.constraints.json');
const constraintFile = JSON.parse(readFileSync(constraintPath, 'utf-8'));

function findConstraint(id: string) {
  return constraintFile.constraints.find((c: { id: string }) => c.id === id);
}

describe('MintingPolicy constraint file', () => {
  it('has correct schema_id', () => {
    expect(constraintFile.schema_id).toBe('MintingPolicy');
  });

  it('has contract_version 6.0.0', () => {
    expect(constraintFile.contract_version).toBe('6.0.0');
  });

  it('has 2 constraints', () => {
    expect(constraintFile.constraints).toHaveLength(2);
  });

  it('all constraints have type_signature', () => {
    for (const c of constraintFile.constraints) {
      expect(c.type_signature, `${c.id} missing type_signature`).toBeDefined();
    }
  });
});

describe('minting-policy-max-positive', () => {
  const c = findConstraint('minting-policy-max-positive');

  it('passes for positive max_mint_per_epoch', () => {
    const data = { max_mint_per_epoch: '1000000000' };
    expect(evaluateConstraint(data, c.expression)).toBe(true);
  });

  it('fails for zero max_mint_per_epoch', () => {
    const data = { max_mint_per_epoch: '0' };
    expect(evaluateConstraint(data, c.expression)).toBe(false);
  });

  it('passes for very large max_mint_per_epoch', () => {
    const data = { max_mint_per_epoch: '999999999999999999' };
    expect(evaluateConstraint(data, c.expression)).toBe(true);
  });
});

describe('minting-policy-governance-requires-constraints', () => {
  const c = findConstraint('minting-policy-governance-requires-constraints');

  it('passes when governance required and constraints exist', () => {
    const data = { requires_governance_approval: true, mint_constraints: ['max-daily'] };
    expect(evaluateConstraint(data, c.expression)).toBe(true);
  });

  it('fails when governance required but no constraints', () => {
    const data = { requires_governance_approval: true, mint_constraints: [] };
    expect(evaluateConstraint(data, c.expression)).toBe(false);
  });

  it('passes when governance not required and no constraints', () => {
    const data = { requires_governance_approval: false, mint_constraints: [] };
    expect(evaluateConstraint(data, c.expression)).toBe(true);
  });
});
