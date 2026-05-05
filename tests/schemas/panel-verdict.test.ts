/**
 * Tests for PanelVerdictSchema (FR-A2, v8.4.0).
 *
 * Validates schema shape, required fields, and ≥5 mutation classes,
 * plus juror_verdicts cardinality bounds (minItems=4, maxItems=16),
 * Ed25519 pattern enforcement on signature fields, and the inline
 * JurorVerdictSchema reuse of DelegationVoteSchema (OQ2 Option c).
 *
 * Cross-field rules (PV-1..4) are enforced by the constraint file
 * landing in PR-A1.4; this suite validates only TypeBox-level schema rules.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  PanelVerdictSchema,
  type PanelVerdict,
  type JurorVerdict,
} from '../../src/governance/panel-verdict.js';
import type { AgentIdentity } from '../../src/schemas/agent-identity.js';
import '../../src/validators/index.js';

const validAgent = (suffix: string): AgentIdentity => ({
  agent_id: `agent-${suffix}`,
  display_name: `Agent ${suffix}`,
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
});

const ED25519_SIG = 'ed25519:' + 'A'.repeat(86);
const ED25519_PUB = 'ed25519-pub:' + 'A'.repeat(43);

const validJuror = (suffix: string): JurorVerdict => ({
  juror: validAgent(suffix),
  vote: {
    voter_id: `agent-${suffix}`,
    vote: 'agree',
    result: { decision: 'proceed' },
    confidence: 0.85,
  },
  score: 800,
  voted_at: '2026-05-05T00:00:00Z',
});

const validVerdict: PanelVerdict = {
  verdict_id: '550e8400-e29b-41d4-a716-446655440010',
  artifact_id: '550e8400-e29b-41d4-a716-446655440000',
  bucket: 'HIGH_CONSENSUS',
  verdict: 'proceed',
  juror_verdicts: [
    validJuror('alice'),
    validJuror('bob'),
    validJuror('carol'),
    validJuror('dave'),
  ],
  signature: ED25519_SIG,
  signed_by: ED25519_PUB,
  signing_key_id: 'panel-key-2026-05',
  signing_algorithm: 'ed25519',
  signed_at: '2026-05-05T00:01:00Z',
  resolved_at: '2026-05-05T00:02:00Z',
  signing_context: {
    audience: 'panel-runner-v1',
    scope: 'panel-v1/security-review',
    contract_version: '8.4.0',
  },
};

describe('PanelVerdictSchema', () => {
  it('validates a canonical fixture with 4 jurors', () => {
    expect(Value.Check(PanelVerdictSchema, validVerdict)).toBe(true);
  });

  it('has $id = PanelVerdict', () => {
    expect(PanelVerdictSchema.$id).toBe('PanelVerdict');
  });

  it('declares x-cross-field-validated:true', () => {
    expect((PanelVerdictSchema as { 'x-cross-field-validated'?: boolean })['x-cross-field-validated']).toBe(true);
  });

  it('rejects when verdict_id is missing', () => {
    const { verdict_id: _drop, ...rest } = validVerdict;
    expect(Value.Check(PanelVerdictSchema, rest)).toBe(false);
  });

  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(PanelVerdictSchema, { ...validVerdict, extra: true })).toBe(false);
  });

  it('rejects juror_verdicts with fewer than 4 entries (minItems)', () => {
    const mutated = {
      ...validVerdict,
      juror_verdicts: validVerdict.juror_verdicts.slice(0, 3),
    };
    expect(Value.Check(PanelVerdictSchema, mutated)).toBe(false);
  });

  it('rejects juror_verdicts with more than 16 entries (maxItems)', () => {
    const mutated = {
      ...validVerdict,
      juror_verdicts: Array.from({ length: 17 }, (_, i) => validJuror(`j${i}`)),
    };
    expect(Value.Check(PanelVerdictSchema, mutated)).toBe(false);
  });

  it('rejects a signature without the ed25519: prefix', () => {
    expect(Value.Check(PanelVerdictSchema, { ...validVerdict, signature: 'rsa:' + 'A'.repeat(86) })).toBe(false);
  });

  it('rejects an invalid bucket literal', () => {
    expect(Value.Check(PanelVerdictSchema, { ...validVerdict, bucket: 'OK' })).toBe(false);
  });

  it('rejects a juror score above 1000', () => {
    const mutated = {
      ...validVerdict,
      juror_verdicts: [
        { ...validVerdict.juror_verdicts[0], score: 1001 },
        ...validVerdict.juror_verdicts.slice(1),
      ],
    };
    expect(Value.Check(PanelVerdictSchema, mutated)).toBe(false);
  });

  it('rejects a signing_context.contract_version that is not semver-shaped', () => {
    const mutated = {
      ...validVerdict,
      signing_context: { ...validVerdict.signing_context, contract_version: 'v8.4.0' },
    };
    expect(Value.Check(PanelVerdictSchema, mutated)).toBe(false);
  });

  it('rejects an empty signing_context.audience', () => {
    const mutated = {
      ...validVerdict,
      signing_context: { ...validVerdict.signing_context, audience: '' },
    };
    expect(Value.Check(PanelVerdictSchema, mutated)).toBe(false);
  });
});
