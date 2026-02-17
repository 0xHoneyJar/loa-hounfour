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

  it('has 1 constraint', () => {
    expect(constraintFile.constraints).toHaveLength(1);
  });

  it('constraint has type_signature', () => {
    expect(constraintFile.constraints[0].type_signature).toBeDefined();
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
