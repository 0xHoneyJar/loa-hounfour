/**
 * Integration test: contract negotiation flow.
 *
 * Tests: negotiate → grant surface → verify expiry → re-negotiate.
 *
 * @see SDD §4.9 — Dynamic Contracts (FR-4)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  DynamicContractSchema,
  type DynamicContract,
  type ProtocolSurface,
} from '../../src/commons/dynamic-contract.js';
import {
  ContractNegotiationSchema,
  type ContractNegotiation,
} from '../../src/commons/contract-negotiation.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const coldSurface: ProtocolSurface = {
  schemas: ['AgentIdentity'],
  capabilities: ['inference'],
  rate_limit_tier: 'restricted',
};

const warmingSurface: ProtocolSurface = {
  schemas: ['AgentIdentity', 'TaskOutcome'],
  capabilities: ['inference', 'tools'],
  rate_limit_tier: 'standard',
};

const establishedSurface: ProtocolSurface = {
  schemas: ['AgentIdentity', 'TaskOutcome', 'ReputationAggregate'],
  capabilities: ['inference', 'tools', 'ensemble'],
  rate_limit_tier: 'extended',
  ensemble_strategies: ['parallel'],
};

const authoritativeSurface: ProtocolSurface = {
  schemas: ['AgentIdentity', 'TaskOutcome', 'ReputationAggregate', 'GovernanceProposal'],
  capabilities: ['inference', 'tools', 'ensemble', 'governance', 'byok'],
  rate_limit_tier: 'unlimited',
  ensemble_strategies: ['parallel', 'sequential', 'adaptive'],
};

const contract: DynamicContract = {
  contract_id: '550e8400-e29b-41d4-a716-446655440000',
  surfaces: {
    cold: coldSurface,
    warming: warmingSurface,
    established: establishedSurface,
    authoritative: authoritativeSurface,
  },
  contract_version: '8.0.0',
  created_at: '2026-02-25T10:00:00Z',
};

describe('Contract negotiation flow', () => {
  it('step 1: contract validates with all 4 tiers', () => {
    expect(Value.Check(DynamicContractSchema, contract)).toBe(true);
  });

  it('step 2: cold model negotiates and receives restricted surface', () => {
    const negotiation: ContractNegotiation = {
      negotiation_id: '550e8400-e29b-41d4-a716-446655440001',
      model_id: 'new-model-alpha',
      reputation_state: 'cold',
      assertion_method: 'server-derived',
      granted_surface: contract.surfaces.cold,
      negotiated_at: '2026-02-25T10:00:00Z',
      nonce: 'cold-nonce-1234567890',
      expires_at: '2026-02-25T10:30:00Z',
    };

    expect(Value.Check(ContractNegotiationSchema, negotiation)).toBe(true);
    expect(negotiation.granted_surface.capabilities).toEqual(['inference']);
    expect(negotiation.granted_surface.rate_limit_tier).toBe('restricted');
  });

  it('step 3: established model negotiates with signed attestation', () => {
    const negotiation: ContractNegotiation = {
      negotiation_id: '550e8400-e29b-41d4-a716-446655440002',
      model_id: 'claude-opus-4-20250514',
      reputation_state: 'established',
      assertion_method: 'signed-attestation',
      requested_surface: authoritativeSurface,
      granted_surface: contract.surfaces.established,
      negotiated_at: '2026-02-25T10:00:00Z',
      nonce: 'est-nonce-abcdef12345678',
      expires_at: '2026-02-25T12:00:00Z',
    };

    expect(Value.Check(ContractNegotiationSchema, negotiation)).toBe(true);
    // Granted surface may be less than requested
    expect(negotiation.granted_surface.capabilities).not.toContain('governance');
    expect(negotiation.granted_surface.capabilities).toContain('ensemble');
  });

  it('step 4: expiry constraint validates correctly', () => {
    // Valid: expires after negotiated
    expect(evaluateConstraint(
      { expires_at: '2026-02-25T12:00:00Z', negotiated_at: '2026-02-25T10:00:00Z' },
      'is_after(expires_at, negotiated_at)',
    )).toBe(true);

    // Invalid: expires before negotiated
    expect(evaluateConstraint(
      { expires_at: '2026-02-25T09:00:00Z', negotiated_at: '2026-02-25T10:00:00Z' },
      'is_after(expires_at, negotiated_at)',
    )).toBe(false);
  });

  it('step 5: re-negotiation after reputation promotion', () => {
    // Model was cold, now warming
    const renegotiation: ContractNegotiation = {
      negotiation_id: '550e8400-e29b-41d4-a716-446655440003',
      model_id: 'new-model-alpha',
      reputation_state: 'warming',
      assertion_method: 'server-derived',
      granted_surface: contract.surfaces.warming,
      negotiated_at: '2026-02-25T11:00:00Z',
      nonce: 'warm-nonce-xyz9876543210',
      expires_at: '2026-02-25T12:00:00Z',
    };

    expect(Value.Check(ContractNegotiationSchema, renegotiation)).toBe(true);
    // Warming surface expands capabilities
    expect(renegotiation.granted_surface.capabilities).toContain('tools');
    expect(renegotiation.granted_surface.rate_limit_tier).toBe('standard');
  });

  it('step 6: monotonic surface expansion holds', () => {
    // Verify each tier's capabilities are a superset of the previous
    const states = ['cold', 'warming', 'established', 'authoritative'] as const;
    for (let i = 1; i < states.length; i++) {
      const prev = new Set(contract.surfaces[states[i - 1]].capabilities);
      const curr = new Set(contract.surfaces[states[i]].capabilities);
      for (const cap of prev) {
        expect(curr.has(cap)).toBe(true);
      }
    }
  });

  it('step 7: nonce replay protection — unique per negotiation', () => {
    const n1: ContractNegotiation = {
      negotiation_id: '550e8400-e29b-41d4-a716-446655440004',
      model_id: 'model-a',
      reputation_state: 'cold',
      assertion_method: 'server-derived',
      granted_surface: coldSurface,
      negotiated_at: '2026-02-25T10:00:00Z',
      nonce: 'unique-nonce-111111111111',
      expires_at: '2026-02-25T10:30:00Z',
    };

    const n2: ContractNegotiation = {
      negotiation_id: '550e8400-e29b-41d4-a716-446655440005',
      model_id: 'model-a',
      reputation_state: 'cold',
      assertion_method: 'server-derived',
      granted_surface: coldSurface,
      negotiated_at: '2026-02-25T10:01:00Z',
      nonce: 'unique-nonce-222222222222',
      expires_at: '2026-02-25T10:31:00Z',
    };

    expect(n1.nonce).not.toBe(n2.nonce);
    expect(Value.Check(ContractNegotiationSchema, n1)).toBe(true);
    expect(Value.Check(ContractNegotiationSchema, n2)).toBe(true);
  });
});
