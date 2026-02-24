/**
 * Tests for DynamicContract, ProtocolSurface, and ContractNegotiation schemas.
 *
 * @see SDD §4.9 — Dynamic Contracts (FR-4)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  ProtocolSurfaceSchema,
  DynamicContractSchema,
  type ProtocolSurface,
  type DynamicContract,
} from '../../src/commons/dynamic-contract.js';
import {
  ContractNegotiationSchema,
  type ContractNegotiation,
} from '../../src/commons/contract-negotiation.js';

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
  ensemble_strategies: ['parallel', 'sequential'],
};

const authoritativeSurface: ProtocolSurface = {
  schemas: ['AgentIdentity', 'TaskOutcome', 'ReputationAggregate', 'GovernanceProposal'],
  capabilities: ['inference', 'tools', 'ensemble', 'governance', 'byok'],
  rate_limit_tier: 'unlimited',
  ensemble_strategies: ['parallel', 'sequential', 'adaptive'],
};

describe('ProtocolSurface', () => {
  it('accepts valid surface with minimal fields', () => {
    expect(Value.Check(ProtocolSurfaceSchema, coldSurface)).toBe(true);
  });

  it('accepts surface with ensemble_strategies', () => {
    expect(Value.Check(ProtocolSurfaceSchema, establishedSurface)).toBe(true);
  });

  it('rejects invalid capability', () => {
    expect(Value.Check(ProtocolSurfaceSchema, {
      ...coldSurface,
      capabilities: ['inference', 'teleportation'],
    })).toBe(false);
  });

  it('rejects invalid rate_limit_tier', () => {
    expect(Value.Check(ProtocolSurfaceSchema, {
      ...coldSurface,
      rate_limit_tier: 'super',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(ProtocolSurfaceSchema, {
      ...coldSurface,
      extra: true,
    })).toBe(false);
  });

  it('has correct $id', () => {
    expect(ProtocolSurfaceSchema.$id).toBe('ProtocolSurface');
  });
});

describe('DynamicContract', () => {
  const validContract: DynamicContract = {
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

  it('accepts a valid contract with all 4 tiers', () => {
    expect(Value.Check(DynamicContractSchema, validContract)).toBe(true);
  });

  it('rejects missing contract_id', () => {
    const { contract_id: _, ...rest } = validContract;
    expect(Value.Check(DynamicContractSchema, rest)).toBe(false);
  });

  it('rejects non-uuid contract_id', () => {
    expect(Value.Check(DynamicContractSchema, {
      ...validContract,
      contract_id: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(DynamicContractSchema, {
      ...validContract,
      contract_version: 'v8',
    })).toBe(false);
  });

  it('has correct $id', () => {
    expect(DynamicContractSchema.$id).toBe('DynamicContract');
  });
});

describe('ContractNegotiation', () => {
  const validNegotiation: ContractNegotiation = {
    negotiation_id: '550e8400-e29b-41d4-a716-446655440001',
    model_id: 'claude-opus-4-20250514',
    reputation_state: 'established',
    assertion_method: 'server-derived',
    granted_surface: establishedSurface,
    negotiated_at: '2026-02-25T10:00:00Z',
    nonce: 'a1b2c3d4e5f6g7h8i9j0',
    expires_at: '2026-02-25T11:00:00Z',
  };

  describe('valid instances', () => {
    it('accepts minimal negotiation (no requested_surface)', () => {
      expect(Value.Check(ContractNegotiationSchema, validNegotiation)).toBe(true);
    });

    it('accepts negotiation with requested_surface', () => {
      const withRequest: ContractNegotiation = {
        ...validNegotiation,
        requested_surface: authoritativeSurface,
      };
      expect(Value.Check(ContractNegotiationSchema, withRequest)).toBe(true);
    });

    it('accepts signed-attestation assertion method', () => {
      const signed: ContractNegotiation = {
        ...validNegotiation,
        assertion_method: 'signed-attestation',
      };
      expect(Value.Check(ContractNegotiationSchema, signed)).toBe(true);
    });

    it('accepts all reputation states', () => {
      for (const state of ['cold', 'warming', 'established', 'authoritative'] as const) {
        const n: ContractNegotiation = { ...validNegotiation, reputation_state: state };
        expect(Value.Check(ContractNegotiationSchema, n)).toBe(true);
      }
    });
  });

  describe('invalid instances', () => {
    it('rejects nonce shorter than 16 characters', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        nonce: 'short',
      })).toBe(false);
    });

    it('rejects nonce longer than 64 characters', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        nonce: 'x'.repeat(65),
      })).toBe(false);
    });

    it('rejects invalid assertion_method', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        assertion_method: 'self-asserted',
      })).toBe(false);
    });

    it('rejects invalid reputation_state', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        reputation_state: 'legendary',
      })).toBe(false);
    });

    it('rejects missing expires_at', () => {
      const { expires_at: _, ...rest } = validNegotiation;
      expect(Value.Check(ContractNegotiationSchema, rest)).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        extra: true,
      })).toBe(false);
    });
  });

  describe('replay protection', () => {
    it('nonce accepts 16-character minimum', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        nonce: 'a'.repeat(16),
      })).toBe(true);
    });

    it('nonce accepts 64-character maximum', () => {
      expect(Value.Check(ContractNegotiationSchema, {
        ...validNegotiation,
        nonce: 'a'.repeat(64),
      })).toBe(true);
    });
  });

  describe('$id metadata', () => {
    it('has correct $id', () => {
      expect(ContractNegotiationSchema.$id).toBe('ContractNegotiation');
    });
  });
});
