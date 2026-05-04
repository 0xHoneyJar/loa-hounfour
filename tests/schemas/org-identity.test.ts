/**
 * Tests for OrgIdentitySchema (FR-B1, v8.4.0).
 *
 * Validates schema shape, required fields, and ≥5 mutation classes including
 * the SP-007 minimum-rep invariant (current_representatives non-empty).
 *
 * Cross-field rule OI-1 is also enforced by the constraint file landing in
 * PR-A1.4; this suite validates the TypeBox-level expression of the same
 * invariant via `minItems: 1`.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  OrgIdentitySchema,
  type OrgIdentity,
} from '../../src/governance/org-identity.js';
import type { AgentIdentity } from '../../src/schemas/agent-identity.js';
import '../../src/validators/index.js';

const validAgent: AgentIdentity = {
  agent_id: 'agent-alice',
  display_name: 'Alice',
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

const ED25519_PUB = 'ed25519-pub:' + 'A'.repeat(43);
const SHA256_HASH = 'sha256:' + 'a'.repeat(64);

const validOrg: OrgIdentity = {
  org_id: '550e8400-e29b-41d4-a716-446655440000',
  org_public_key: ED25519_PUB,
  current_representatives: [validAgent],
  constitutional_hash: SHA256_HASH,
  created_at: '2026-05-05T00:00:00Z',
  updated_at: '2026-05-05T00:00:00Z',
};

describe('OrgIdentitySchema', () => {
  it('validates a canonical fixture', () => {
    expect(Value.Check(OrgIdentitySchema, validOrg)).toBe(true);
  });

  it('has $id = OrgIdentity', () => {
    expect(OrgIdentitySchema.$id).toBe('OrgIdentity');
  });

  it('declares x-cross-field-validated:true', () => {
    expect((OrgIdentitySchema as { 'x-cross-field-validated'?: boolean })['x-cross-field-validated']).toBe(true);
  });

  it('declares additionalProperties:false', () => {
    expect((OrgIdentitySchema as { additionalProperties?: boolean }).additionalProperties).toBe(false);
  });

  // --- Mutation 1: SP-007 invariant (empty current_representatives) ---
  it('rejects empty current_representatives (SP-007 minItems)', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, current_representatives: [] })).toBe(false);
  });

  // --- Mutation 2: invalid org_public_key pattern ---
  it('rejects an org_public_key without the ed25519-pub: prefix', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, org_public_key: 'rsa-pub:' + 'A'.repeat(43) })).toBe(false);
  });

  it('rejects an org_public_key whose payload is too short', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, org_public_key: 'ed25519-pub:' + 'A'.repeat(40) })).toBe(false);
  });

  // --- Mutation 3: invalid constitutional_hash pattern ---
  it('rejects a constitutional_hash without the sha256: prefix', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, constitutional_hash: 'a'.repeat(64) })).toBe(false);
  });

  it('rejects a constitutional_hash with non-hex characters', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, constitutional_hash: 'sha256:' + 'Z'.repeat(64) })).toBe(false);
  });

  // --- Mutation 4: missing required field ---
  it('rejects when org_id is missing', () => {
    const { org_id: _omit, ...rest } = validOrg;
    expect(Value.Check(OrgIdentitySchema, rest)).toBe(false);
  });

  it('rejects when constitutional_hash is missing', () => {
    const { constitutional_hash: _omit, ...rest } = validOrg;
    expect(Value.Check(OrgIdentitySchema, rest)).toBe(false);
  });

  // --- Mutation 5: additional property ---
  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, extra: true })).toBe(false);
  });

  // --- Mutation 6: invalid org_id format ---
  it('rejects when org_id is not a UUID', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, org_id: 'not-a-uuid' })).toBe(false);
  });

  // --- Mutation 7: created_at / updated_at not ISO 8601 ---
  it('rejects when created_at is not an ISO 8601 date-time', () => {
    expect(Value.Check(OrgIdentitySchema, { ...validOrg, created_at: '2026-05-05' })).toBe(false);
  });
});
