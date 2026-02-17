/**
 * Tests for MintingPolicy schema (S3-T3).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import { MintingPolicySchema } from '../../src/economy/minting-policy.js';

const validPolicy = {
  policy_id: '123e4567-e89b-12d3-a456-426614174000',
  registry_id: '123e4567-e89b-12d3-a456-426614174001',
  mint_authority: 'governance-council',
  mint_constraints: ['budget-scope-overspend', 'governance-tier-ordering'],
  max_mint_per_epoch: '1000000000',
  epoch_seconds: 86400,
  requires_governance_approval: true,
  contract_version: '6.0.0',
};

describe('MintingPolicySchema', () => {
  it('accepts valid policy', () => {
    expect(Value.Check(MintingPolicySchema, validPolicy)).toBe(true);
  });

  it('rejects non-uuid policy_id', () => {
    expect(Value.Check(MintingPolicySchema, { ...validPolicy, policy_id: 'bad' })).toBe(false);
  });

  it('rejects empty mint_authority', () => {
    expect(Value.Check(MintingPolicySchema, { ...validPolicy, mint_authority: '' })).toBe(false);
  });

  it('rejects non-numeric max_mint_per_epoch', () => {
    expect(Value.Check(MintingPolicySchema, { ...validPolicy, max_mint_per_epoch: 'abc' })).toBe(false);
  });

  it('rejects zero epoch_seconds', () => {
    expect(Value.Check(MintingPolicySchema, { ...validPolicy, epoch_seconds: 0 })).toBe(false);
  });

  it('accepts empty mint_constraints', () => {
    expect(Value.Check(MintingPolicySchema, { ...validPolicy, mint_constraints: [] })).toBe(true);
  });

  it('has correct $id', () => {
    expect(MintingPolicySchema.$id).toBe('MintingPolicy');
  });

  it('rejects bad contract_version format', () => {
    expect(Value.Check(MintingPolicySchema, { ...validPolicy, contract_version: 'v6' })).toBe(false);
  });
});
