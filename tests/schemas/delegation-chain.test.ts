/**
 * Tests for DelegationChain schema (S1-T1).
 *
 * Validates schema structure, TypeBox validation, and type exports.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  DelegationChainSchema,
  DelegationLinkSchema,
  type DelegationChain,
  type DelegationLink,
} from '../../src/schemas/model/routing/delegation-chain.js';

const validLink: DelegationLink = {
  delegator: 'agent-alice',
  delegatee: 'agent-bob',
  task_type: 'inference',
  authority_scope: ['budget_spend', 'model_select'],
  budget_allocated_micro: '1000000',
  timestamp: '2026-02-17T10:00:00Z',
  outcome: 'completed',
  outcome_timestamp: '2026-02-17T10:05:00Z',
};

const validChain: DelegationChain = {
  chain_id: '550e8400-e29b-41d4-a716-446655440001',
  root_delegator: 'agent-alice',
  links: [
    validLink,
    {
      delegator: 'agent-bob',
      delegatee: 'provider-openai',
      task_type: 'inference',
      authority_scope: ['model_select'],
      budget_allocated_micro: '500000',
      timestamp: '2026-02-17T10:01:00Z',
      outcome: 'completed',
      outcome_timestamp: '2026-02-17T10:03:00Z',
    },
  ],
  max_depth: 5,
  authority_conservation: true,
  status: 'completed',
  contract_version: '5.4.0',
};

describe('DelegationLinkSchema', () => {
  it('validates a valid delegation link', () => {
    expect(Value.Check(DelegationLinkSchema, validLink)).toBe(true);
  });

  it('rejects missing delegator', () => {
    const invalid = { ...validLink, delegator: '' };
    expect(Value.Check(DelegationLinkSchema, invalid)).toBe(false);
  });

  it('rejects empty authority_scope', () => {
    const invalid = { ...validLink, authority_scope: [] };
    expect(Value.Check(DelegationLinkSchema, invalid)).toBe(false);
  });

  it('accepts link without optional fields', () => {
    const minimal: DelegationLink = {
      delegator: 'agent-alice',
      delegatee: 'agent-bob',
      task_type: 'review',
      authority_scope: ['budget_spend'],
      timestamp: '2026-02-17T10:00:00Z',
      outcome: 'pending',
    };
    expect(Value.Check(DelegationLinkSchema, minimal)).toBe(true);
  });

  it('rejects additional properties', () => {
    const withExtra = { ...validLink, extra: 'not allowed' };
    expect(Value.Check(DelegationLinkSchema, withExtra)).toBe(false);
  });
});

describe('DelegationChainSchema', () => {
  it('validates a valid 2-link chain', () => {
    expect(Value.Check(DelegationChainSchema, validChain)).toBe(true);
  });

  it('rejects missing required fields', () => {
    const { chain_id: _, ...noId } = validChain;
    expect(Value.Check(DelegationChainSchema, noId)).toBe(false);
  });

  it('rejects empty links array', () => {
    const invalid = { ...validChain, links: [] };
    expect(Value.Check(DelegationChainSchema, invalid)).toBe(false);
  });

  it('rejects max_depth > 10', () => {
    const invalid = { ...validChain, max_depth: 11 };
    expect(Value.Check(DelegationChainSchema, invalid)).toBe(false);
  });

  it('rejects max_depth < 1', () => {
    const invalid = { ...validChain, max_depth: 0 };
    expect(Value.Check(DelegationChainSchema, invalid)).toBe(false);
  });

  it('accepts all valid status values', () => {
    for (const status of ['active', 'completed', 'failed', 'revoked'] as const) {
      const chain = { ...validChain, status };
      expect(Value.Check(DelegationChainSchema, chain)).toBe(true);
    }
  });

  it('rejects invalid status', () => {
    const invalid = { ...validChain, status: 'cancelled' };
    expect(Value.Check(DelegationChainSchema, invalid)).toBe(false);
  });

  it('accepts optional revocation_policy', () => {
    const withPolicy = { ...validChain, revocation_policy: 'cascade' as const };
    expect(Value.Check(DelegationChainSchema, withPolicy)).toBe(true);
  });

  it('accepts non_cascade revocation_policy', () => {
    const withPolicy = { ...validChain, revocation_policy: 'non_cascade' as const };
    expect(Value.Check(DelegationChainSchema, withPolicy)).toBe(true);
  });

  it('rejects invalid revocation_policy', () => {
    const invalid = { ...validChain, revocation_policy: 'partial' };
    expect(Value.Check(DelegationChainSchema, invalid)).toBe(false);
  });

  it('validates chain without revocation_policy (backward compat)', () => {
    const { revocation_policy: _, ...noPolicy } = validChain;
    expect(Value.Check(DelegationChainSchema, noPolicy)).toBe(true);
  });

  it('rejects additional properties', () => {
    const withExtra = { ...validChain, extra_field: 'not allowed' };
    expect(Value.Check(DelegationChainSchema, withExtra)).toBe(false);
  });

  it('has correct $id', () => {
    expect(DelegationChainSchema.$id).toBe('DelegationChain');
  });

  it('has x-cross-field-validated marker', () => {
    expect((DelegationChainSchema as Record<string, unknown>)['x-cross-field-validated']).toBe(true);
  });

  it('rejects invalid contract_version format', () => {
    const invalid = { ...validChain, contract_version: 'not-semver' };
    expect(Value.Check(DelegationChainSchema, invalid)).toBe(false);
  });
});
