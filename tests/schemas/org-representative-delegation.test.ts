/**
 * Tests for OrgRepresentativeDelegationSchema (FR-B2, v8.4.0).
 *
 * Validates schema shape, required fields, and ≥5 mutation classes including
 * chain depth boundary (>20), the granted_by union (UUID OR genesis sentinel),
 * and Ed25519 signature pattern enforcement.
 *
 * Cross-field rules ORD-1..3 are enforced by the constraint file landing in
 * PR-A1.4; signature verification (ORD-1) and revocation lifecycle (ORD-2)
 * are runtime-deferred per NF-1. This suite validates only TypeBox-level
 * schema rules.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  OrgRepresentativeDelegationSchema,
  ORG_DELEGATION_GENESIS_SENTINEL,
  type OrgRepresentativeDelegation,
} from '../../src/governance/org-representative-delegation.js';
import type { AgentIdentity } from '../../src/schemas/agent-identity.js';
import '../../src/validators/index.js';

const validAgent: AgentIdentity = {
  agent_id: 'agent-rep',
  display_name: 'Representative',
  agent_type: 'human',
  capabilities: ['governance'],
  trust_scopes: {
    scopes: {
      billing: 'trusted',
      governance: 'trusted',
      inference: 'trusted',
      delegation: 'trusted',
      audit: 'trusted',
      composition: 'trusted',
    },
    default_level: 'trusted',
  },
  delegation_authority: ['invoke'],
  max_delegation_depth: 2,
  governance_weight: 0.5,
  contract_version: '8.4.0',
};

const ED25519_SIG = 'ed25519:' + 'A'.repeat(86);
const ED25519_PUB = 'ed25519-pub:' + 'A'.repeat(43);

const validDelegation: OrgRepresentativeDelegation = {
  delegation_id: '550e8400-e29b-41d4-a716-446655440010',
  org_id: '550e8400-e29b-41d4-a716-446655440000',
  representative: validAgent,
  capability_scope: { domain: 'governance', actions: ['vote', 'propose'] },
  expiry: '2027-05-05T00:00:00Z',
  granted_by: ORG_DELEGATION_GENESIS_SENTINEL,
  chain_depth: 0,
  signature: ED25519_SIG,
  signed_by: ED25519_PUB,
  signing_key_id: 'org-key-2026-05',
  signing_algorithm: 'ed25519',
  signed_at: '2026-05-05T00:01:00Z',
  signing_context: {
    audience: '550e8400-e29b-41d4-a716-446655440000',
    scope: 'org-delegation/grant',
    contract_version: '8.4.0',
  },
};

describe('OrgRepresentativeDelegationSchema', () => {
  it('validates a canonical fixture (genesis-rooted, depth 0)', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, validDelegation)).toBe(true);
  });

  it('validates a chained delegation with granted_by as a delegation_id UUID', () => {
    const chained: OrgRepresentativeDelegation = {
      ...validDelegation,
      delegation_id: '550e8400-e29b-41d4-a716-446655440011',
      granted_by: '550e8400-e29b-41d4-a716-446655440010',
      chain_depth: 1,
    };
    expect(Value.Check(OrgRepresentativeDelegationSchema, chained)).toBe(true);
  });

  it('validates with optional revocation envelope present', () => {
    const revoked: OrgRepresentativeDelegation = {
      ...validDelegation,
      revocation: {
        revoked: true,
        revoked_at: '2026-06-05T00:00:00Z',
        revoked_by: 'agent-overseer',
      },
    };
    expect(Value.Check(OrgRepresentativeDelegationSchema, revoked)).toBe(true);
  });

  it('has $id = OrgRepresentativeDelegation', () => {
    expect(OrgRepresentativeDelegationSchema.$id).toBe('OrgRepresentativeDelegation');
  });

  it('declares x-cross-field-validated:true', () => {
    expect((OrgRepresentativeDelegationSchema as { 'x-cross-field-validated'?: boolean })['x-cross-field-validated']).toBe(true);
  });

  it('exports the genesis sentinel as a stable literal', () => {
    expect(ORG_DELEGATION_GENESIS_SENTINEL).toBe('genesis:org-public-key');
  });

  // --- Mutation 1: chain_depth boundary (> 20) ---
  it('rejects chain_depth above the maximum (21)', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, chain_depth: 21 })).toBe(false);
  });

  it('rejects chain_depth below the minimum (-1)', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, chain_depth: -1 })).toBe(false);
  });

  // --- Mutation 2: signature pattern violation ---
  it('rejects a signature without the ed25519: prefix', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, signature: 'rsa:' + 'A'.repeat(86) })).toBe(false);
  });

  it('rejects a signed_by without the ed25519-pub: prefix', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, signed_by: 'rsa-pub:' + 'A'.repeat(43) })).toBe(false);
  });

  // --- Mutation 3: signing_algorithm not pinned to 'ed25519' ---
  it('rejects a signing_algorithm other than "ed25519"', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, signing_algorithm: 'rsa' })).toBe(false);
  });

  // --- Mutation 4: granted_by neither UUID nor genesis sentinel ---
  it('rejects granted_by that is neither a UUID nor the genesis sentinel', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, granted_by: 'genesis:wrong-key' })).toBe(false);
  });

  it('rejects granted_by with a malformed UUID', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, granted_by: 'not-a-uuid' })).toBe(false);
  });

  // --- Mutation 5: signing_context contract_version not semver ---
  it('rejects a signing_context.contract_version that is not semver-shaped', () => {
    const mutated = {
      ...validDelegation,
      signing_context: { ...validDelegation.signing_context, contract_version: '8.4' },
    };
    expect(Value.Check(OrgRepresentativeDelegationSchema, mutated)).toBe(false);
  });

  // --- Mutation 6: missing required field ---
  it('rejects when delegation_id is missing', () => {
    const { delegation_id: _omit, ...rest } = validDelegation;
    expect(Value.Check(OrgRepresentativeDelegationSchema, rest)).toBe(false);
  });

  it('rejects when signing_context is missing', () => {
    const { signing_context: _omit, ...rest } = validDelegation;
    expect(Value.Check(OrgRepresentativeDelegationSchema, rest)).toBe(false);
  });

  // --- Mutation 7: additional property ---
  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(OrgRepresentativeDelegationSchema, { ...validDelegation, extra: true })).toBe(false);
  });

  // --- Mutation 8: revocation envelope shape (additional property) ---
  it('rejects an unexpected additional property inside revocation', () => {
    const mutated = {
      ...validDelegation,
      revocation: {
        revoked: true,
        revoked_at: '2026-06-05T00:00:00Z',
        revoked_by: 'agent-overseer',
        smuggled: 'value',
      },
    };
    expect(Value.Check(OrgRepresentativeDelegationSchema, mutated)).toBe(false);
  });

  // --- Mutation 9: revocation.revoked pinned to literal true (envelope-presence semantics) ---
  it('rejects revocation.revoked = false (must be literal true when envelope is present)', () => {
    const mutated = {
      ...validDelegation,
      revocation: {
        revoked: false,
        revoked_at: '2026-06-05T00:00:00Z',
        revoked_by: 'agent-overseer',
      },
    };
    expect(Value.Check(OrgRepresentativeDelegationSchema, mutated)).toBe(false);
  });
});
