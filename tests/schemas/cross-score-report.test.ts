/**
 * Tests for CrossScoreReportSchema (FR-A4, v8.4.0).
 *
 * Validates schema shape, score-dimension bounds (0-1000),
 * mode literal union, and Ed25519 pattern enforcement.
 *
 * The single cross-field rule (CSR-1, no-self-scoring) is
 * enforced by the constraint file landing in PR-A1.4; this
 * suite validates only TypeBox-level schema rules.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  CrossScoreReportSchema,
  type CrossScoreReport,
} from '../../src/governance/cross-score-report.js';
import type { AgentIdentity } from '../../src/schemas/agent-identity.js';
import '../../src/validators/index.js';

const buildAgent = (suffix: string): AgentIdentity => ({
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

const ED25519_SIG = 'ed25519:' + 'B'.repeat(86);
const ED25519_PUB = 'ed25519-pub:' + 'B'.repeat(43);

const validReport: CrossScoreReport = {
  report_id: '550e8400-e29b-41d4-a716-446655440020',
  pairwise_scores: [
    {
      scorer: buildAgent('alice'),
      scored: buildAgent('bob'),
      output_score: 800,
      reasoning_score: 750,
      grounding_score: 900,
    },
    {
      scorer: buildAgent('bob'),
      scored: buildAgent('alice'),
      output_score: 700,
      reasoning_score: 650,
      grounding_score: 850,
    },
  ],
  mode: 'shadow',
  signature: ED25519_SIG,
  signed_by: ED25519_PUB,
  signing_key_id: 'cross-score-key-2026-05',
  signing_algorithm: 'ed25519',
  signed_at: '2026-05-05T00:05:00Z',
  signing_context: {
    audience: 'cross-score-runner-v1',
    scope: 'cross-score/shadow',
    contract_version: '8.4.0',
  },
  resolved_at: '2026-05-05T00:06:00Z',
};

describe('CrossScoreReportSchema', () => {
  it('validates a canonical fixture', () => {
    expect(Value.Check(CrossScoreReportSchema, validReport)).toBe(true);
  });

  it('has $id = CrossScoreReport', () => {
    expect(CrossScoreReportSchema.$id).toBe('CrossScoreReport');
  });

  it('declares x-cross-field-validated:true', () => {
    expect((CrossScoreReportSchema as { 'x-cross-field-validated'?: boolean })['x-cross-field-validated']).toBe(true);
  });

  it('rejects when report_id is missing', () => {
    const { report_id: _drop, ...rest } = validReport;
    expect(Value.Check(CrossScoreReportSchema, rest)).toBe(false);
  });

  it('rejects an unexpected additional property at the root', () => {
    expect(Value.Check(CrossScoreReportSchema, { ...validReport, extra: 1 })).toBe(false);
  });

  it('rejects a signature without the ed25519: prefix', () => {
    expect(Value.Check(CrossScoreReportSchema, { ...validReport, signature: 'sig:' + 'A'.repeat(86) })).toBe(false);
  });

  it('rejects an invalid mode literal', () => {
    expect(Value.Check(CrossScoreReportSchema, { ...validReport, mode: 'audit' })).toBe(false);
  });

  it('rejects output_score above 1000', () => {
    const mutated = {
      ...validReport,
      pairwise_scores: [
        { ...validReport.pairwise_scores[0], output_score: 1001 },
        validReport.pairwise_scores[1],
      ],
    };
    expect(Value.Check(CrossScoreReportSchema, mutated)).toBe(false);
  });

  it('rejects reasoning_score below 0', () => {
    const mutated = {
      ...validReport,
      pairwise_scores: [
        { ...validReport.pairwise_scores[0], reasoning_score: -1 },
        validReport.pairwise_scores[1],
      ],
    };
    expect(Value.Check(CrossScoreReportSchema, mutated)).toBe(false);
  });

  it('rejects an empty signing_context.scope', () => {
    const mutated = {
      ...validReport,
      signing_context: { ...validReport.signing_context, scope: '' },
    };
    expect(Value.Check(CrossScoreReportSchema, mutated)).toBe(false);
  });

  it('rejects when signing_algorithm is not the literal ed25519', () => {
    expect(Value.Check(CrossScoreReportSchema, { ...validReport, signing_algorithm: 'rsa' })).toBe(false);
  });
});
