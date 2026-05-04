/**
 * Tests for DeliberationDissentSchema (FR-A3, v8.4.0).
 *
 * Validates schema shape, ULID pattern enforcement on dissent_id,
 * narrative bounds (1-16384), the closed concern_type union, and
 * cited_claim_ids element non-emptiness.
 *
 * DeliberationDissent has no cross-field rules — its constraints
 * (DD-1, DD-2) are TypeBox-expressible bounds, doubled in the
 * constraint file as belt-and-braces.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  DeliberationDissentSchema,
  type DeliberationDissent,
} from '../../src/governance/deliberation-dissent.js';
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

const VALID_ULID = '01H8XGJWBWBAQ4N5GVZSPRJZG7';

const validDissent: DeliberationDissent = {
  dissent_id: VALID_ULID,
  artifact_id: '550e8400-e29b-41d4-a716-446655440000',
  juror: validAgent,
  concern_type: 'minority_verdict',
  narrative: 'I dissent because the grounding for claim-2 is weaker than the panel acknowledged.',
  cited_claim_ids: ['claim-root', 'claim-2'],
  raised_at: '2026-05-05T00:01:30Z',
  contract_version: '8.4.0',
};

describe('DeliberationDissentSchema', () => {
  it('validates a canonical fixture', () => {
    expect(Value.Check(DeliberationDissentSchema, validDissent)).toBe(true);
  });

  it('has $id = DeliberationDissent', () => {
    expect(DeliberationDissentSchema.$id).toBe('DeliberationDissent');
  });

  it('rejects when dissent_id is missing', () => {
    const { dissent_id: _drop, ...rest } = validDissent;
    expect(Value.Check(DeliberationDissentSchema, rest)).toBe(false);
  });

  it('rejects a dissent_id containing an excluded letter (L)', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, dissent_id: '01H8XGJWBWLAQ4N5GVZSPRJZG7' })).toBe(false);
  });

  it('rejects a dissent_id of wrong length (25 chars)', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, dissent_id: VALID_ULID.slice(0, 25) })).toBe(false);
  });

  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, severity: 'high' })).toBe(false);
  });

  it('rejects an invalid concern_type literal', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, concern_type: 'rant' })).toBe(false);
  });

  it('rejects an empty narrative (minLength)', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, narrative: '' })).toBe(false);
  });

  it('rejects a narrative longer than 16384 chars (maxLength)', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, narrative: 'x'.repeat(16385) })).toBe(false);
  });

  it('rejects an empty string in cited_claim_ids', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, cited_claim_ids: [''] })).toBe(false);
  });

  it('accepts an empty cited_claim_ids array (minItems: 0)', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, cited_claim_ids: [] })).toBe(true);
  });

  it('rejects a contract_version that is not semver-shaped', () => {
    expect(Value.Check(DeliberationDissentSchema, { ...validDissent, contract_version: '8' })).toBe(false);
  });
});
