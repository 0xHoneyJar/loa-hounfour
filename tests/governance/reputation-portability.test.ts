/**
 * Tests for ReputationPortability schemas (v7.5.0, DR-S2).
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js'; // Register format validators (date-time, uuid)
import {
  PortabilityScopeSchema,
  ReputationPortabilityRequestSchema,
  PortabilityResponseSchema,
} from '../../src/governance/reputation-portability.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('PortabilityScopeSchema', () => {
  it('accepts "full"', () => {
    expect(Value.Check(PortabilityScopeSchema, 'full')).toBe(true);
  });

  it('accepts "score_only"', () => {
    expect(Value.Check(PortabilityScopeSchema, 'score_only')).toBe(true);
  });

  it('accepts "state_only"', () => {
    expect(Value.Check(PortabilityScopeSchema, 'state_only')).toBe(true);
  });

  it('rejects unknown scope', () => {
    expect(Value.Check(PortabilityScopeSchema, 'partial')).toBe(false);
  });
});

describe('ReputationPortabilityRequestSchema', () => {
  const validRequest = {
    request_id: '880e8400-e29b-41d4-a716-446655440010',
    personality_id: 'personality-xyz',
    source_collection_id: 'collection-A',
    source_pool_id: 'pool-1',
    target_collection_id: 'collection-B',
    target_pool_id: 'pool-2',
    scope: 'full' as const,
    justification: 'Migration to better-aligned collection.',
    requested_at: '2026-02-20T00:00:00Z',
    expires_at: '2026-03-20T00:00:00Z',
    contract_version: '7.5.0',
  };

  it('accepts valid request', () => {
    expect(Value.Check(ReputationPortabilityRequestSchema, validRequest)).toBe(true);
  });

  it('rejects missing personality_id', () => {
    const { personality_id: _, ...incomplete } = validRequest;
    expect(Value.Check(ReputationPortabilityRequestSchema, incomplete)).toBe(false);
  });

  it('has correct $id', () => {
    expect(ReputationPortabilityRequestSchema.$id).toBe('ReputationPortabilityRequest');
  });
});

describe('PortabilityResponseSchema', () => {
  it('accepts accepted response with credential_id', () => {
    const response = {
      response_id: '990e8400-e29b-41d4-a716-446655440020',
      request_id: '880e8400-e29b-41d4-a716-446655440010',
      responder_collection_id: 'collection-B',
      decision: 'accepted' as const,
      credential_id: 'aa0e8400-e29b-41d4-a716-446655440030',
      responded_at: '2026-02-21T00:00:00Z',
      contract_version: '7.5.0',
    };
    expect(Value.Check(PortabilityResponseSchema, response)).toBe(true);
  });

  it('accepts rejected response with reason', () => {
    const response = {
      response_id: '990e8400-e29b-41d4-a716-446655440021',
      request_id: '880e8400-e29b-41d4-a716-446655440010',
      responder_collection_id: 'collection-B',
      decision: 'rejected' as const,
      rejection_reason: 'Collection does not accept external reputation transfers.',
      responded_at: '2026-02-21T00:00:00Z',
      contract_version: '7.5.0',
    };
    expect(Value.Check(PortabilityResponseSchema, response)).toBe(true);
  });

  it('accepts pending_governance response with proposal_id', () => {
    const response = {
      response_id: '990e8400-e29b-41d4-a716-446655440022',
      request_id: '880e8400-e29b-41d4-a716-446655440010',
      responder_collection_id: 'collection-B',
      decision: 'pending_governance' as const,
      governance_proposal_id: 'cc0e8400-e29b-41d4-a716-446655440050',
      responded_at: '2026-02-21T00:00:00Z',
      contract_version: '7.5.0',
    };
    expect(Value.Check(PortabilityResponseSchema, response)).toBe(true);
  });

  it('has correct $id', () => {
    expect(PortabilityResponseSchema.$id).toBe('PortabilityResponse');
  });
});

describe('ReputationPortability constraints', () => {
  it('different-collections: passes when source != target', () => {
    const data = { source_collection_id: 'A', target_collection_id: 'B' };
    expect(evaluateConstraint(data, 'source_collection_id != target_collection_id')).toBe(true);
  });

  it('different-collections: fails when source == target', () => {
    const data = { source_collection_id: 'A', target_collection_id: 'A' };
    expect(evaluateConstraint(data, 'source_collection_id != target_collection_id')).toBe(false);
  });

  it('expiry-after-request: passes when expires_at > requested_at', () => {
    const data = { expires_at: '2026-03-20T00:00:00Z', requested_at: '2026-02-20T00:00:00Z' };
    expect(evaluateConstraint(data, 'is_after(expires_at, requested_at)')).toBe(true);
  });

  it('expiry-after-request: fails when expires_at <= requested_at', () => {
    const data = { expires_at: '2026-02-20T00:00:00Z', requested_at: '2026-02-20T00:00:00Z' };
    expect(evaluateConstraint(data, 'is_after(expires_at, requested_at)')).toBe(false);
  });

  it('accepted-needs-credential: passes when accepted with credential', () => {
    const data = { decision: 'accepted', credential_id: 'abc-123' };
    expect(evaluateConstraint(data, "decision != 'accepted' || credential_id != null")).toBe(true);
  });

  it('accepted-needs-credential: fails when accepted without credential', () => {
    const data = { decision: 'accepted' };
    expect(evaluateConstraint(data, "decision != 'accepted' || credential_id != null")).toBe(false);
  });

  it('rejected-needs-reason: passes when rejected with reason', () => {
    const data = { decision: 'rejected', rejection_reason: 'Policy prohibits.' };
    expect(evaluateConstraint(data, "decision != 'rejected' || rejection_reason != null")).toBe(true);
  });

  it('governance-needs-proposal: passes when pending with proposal', () => {
    const data = { decision: 'pending_governance', governance_proposal_id: 'prop-1' };
    expect(evaluateConstraint(data, "decision != 'pending_governance' || governance_proposal_id != null")).toBe(true);
  });
});
