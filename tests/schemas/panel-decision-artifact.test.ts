/**
 * Tests for PanelDecisionArtifactSchema (FR-A1, v8.4.0).
 *
 * Validates schema shape, required fields, and ≥5 mutation classes.
 * Cross-field rules (PDA-1..5) are enforced by the constraint file
 * landing in PR-A1.4; this suite validates only TypeBox-level schema rules.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  PanelDecisionArtifactSchema,
  type PanelDecisionArtifact,
} from '../../src/governance/panel-decision-artifact.js';
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

const validArtifact: PanelDecisionArtifact = {
  artifact_id: '550e8400-e29b-41d4-a716-446655440000',
  proposed_action: {
    action_type: 'mint_token',
    target_id: 'asset-001',
    payload: { amount: '1000', recipient: 'addr-xyz' },
  },
  trust_context: {
    routing_decision: 'panel',
    scope: 'governance/mint',
    reason: 'speculative claim requires panel review',
  },
  claims: [
    {
      claim_id: 'claim-root',
      grounding: {
        type: 'tool_output',
        output_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      },
      confidence: 'high_confidence',
    },
    {
      claim_id: 'claim-derived',
      grounding: {
        type: 'claim_reference',
        claim_id: 'claim-root',
      },
      confidence: 'plausible',
    },
    {
      claim_id: 'claim-judgment',
      grounding: {
        type: 'acknowledged_judgment',
        source: validAgent,
        justification: 'reviewed precedent and concur',
      },
      confidence: 'speculative',
    },
  ],
  question: 'should this mint proceed?',
  scoring_rubric: {
    output_score: { weight: 0.4 },
    reasoning_score: { weight: 0.4 },
    grounding_score: { weight: 0.2 },
  },
  created_at: '2026-05-05T00:00:00Z',
  contract_version: '8.4.0',
};

describe('PanelDecisionArtifactSchema', () => {
  it('validates a canonical fixture', () => {
    expect(Value.Check(PanelDecisionArtifactSchema, validArtifact)).toBe(true);
  });

  it('has $id = PanelDecisionArtifact', () => {
    expect(PanelDecisionArtifactSchema.$id).toBe('PanelDecisionArtifact');
  });

  it('declares x-cross-field-validated:true', () => {
    expect((PanelDecisionArtifactSchema as { 'x-cross-field-validated'?: boolean })['x-cross-field-validated']).toBe(true);
  });

  it('rejects when artifact_id is missing', () => {
    const { artifact_id: _drop, ...rest } = validArtifact;
    expect(Value.Check(PanelDecisionArtifactSchema, rest)).toBe(false);
  });

  it('rejects when artifact_id has wrong type', () => {
    expect(Value.Check(PanelDecisionArtifactSchema, { ...validArtifact, artifact_id: 12345 })).toBe(false);
  });

  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(PanelDecisionArtifactSchema, { ...validArtifact, extra_key: 'oops' })).toBe(false);
  });

  it('rejects an invalid trust_context.routing_decision literal', () => {
    const mutated = {
      ...validArtifact,
      trust_context: { ...validArtifact.trust_context, routing_decision: 'override' },
    };
    expect(Value.Check(PanelDecisionArtifactSchema, mutated)).toBe(false);
  });

  it('rejects when proposed_action.target_id is empty (minLength)', () => {
    const mutated = {
      ...validArtifact,
      proposed_action: { ...validArtifact.proposed_action, target_id: '' },
    };
    expect(Value.Check(PanelDecisionArtifactSchema, mutated)).toBe(false);
  });

  it('rejects an invalid claim grounding type literal', () => {
    const mutated = {
      ...validArtifact,
      claims: [
        {
          claim_id: 'claim-bad',
          grounding: { type: 'rumor' },
          confidence: 'plausible',
        },
      ],
    };
    expect(Value.Check(PanelDecisionArtifactSchema, mutated)).toBe(false);
  });

  it('rejects a contract_version that is not semver-shaped', () => {
    expect(Value.Check(PanelDecisionArtifactSchema, { ...validArtifact, contract_version: '8.4' })).toBe(false);
  });

  it('rejects when question is empty', () => {
    expect(Value.Check(PanelDecisionArtifactSchema, { ...validArtifact, question: '' })).toBe(false);
  });
});
