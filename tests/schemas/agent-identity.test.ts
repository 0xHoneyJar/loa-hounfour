/**
 * Tests for AgentIdentity schema (S3-T3, S3-T6).
 *
 * Validates schema validation, trust levels, agent types,
 * and cross-field constraint evaluation.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  AgentIdentitySchema,
  TrustLevelSchema,
  AgentTypeSchema,
  TRUST_LEVELS,
  DELEGATION_TRUST_THRESHOLD,
  trustLevelIndex,
  meetsThreshold,
  type AgentIdentity,
  type TrustLevel,
} from '../../src/schemas/agent-identity.js';
import '../../src/validators/index.js';

const validAgent: AgentIdentity = {
  agent_id: 'agent-alice',
  display_name: 'Alice',
  agent_type: 'human',
  capabilities: ['governance', 'delegation'],
  trust_level: 'trusted',
  delegation_authority: ['invoke'],
  max_delegation_depth: 2,
  governance_weight: 0.5,
  contract_version: '5.5.0',
};

describe('AgentIdentitySchema', () => {
  it('validates a correct agent identity', () => {
    expect(Value.Check(AgentIdentitySchema, validAgent)).toBe(true);
  });

  it('has $id = AgentIdentity', () => {
    expect(AgentIdentitySchema.$id).toBe('AgentIdentity');
  });

  it('rejects missing required fields', () => {
    const { agent_id: _, ...noId } = validAgent;
    expect(Value.Check(AgentIdentitySchema, noId)).toBe(false);
  });

  it('rejects invalid agent_id pattern', () => {
    expect(Value.Check(AgentIdentitySchema, { ...validAgent, agent_id: 'AB' })).toBe(false);
    expect(Value.Check(AgentIdentitySchema, { ...validAgent, agent_id: '1-starts-with-number' })).toBe(false);
  });

  it('rejects empty capabilities', () => {
    expect(Value.Check(AgentIdentitySchema, { ...validAgent, capabilities: [] })).toBe(false);
  });

  it('accepts optional metadata', () => {
    const withMeta = { ...validAgent, metadata: { region: 'us-east' } };
    expect(Value.Check(AgentIdentitySchema, withMeta)).toBe(true);
  });

  it('accepts agent without metadata', () => {
    const { metadata: _, ...noMeta } = validAgent;
    expect(Value.Check(AgentIdentitySchema, noMeta)).toBe(true);
  });

  it('rejects additional properties', () => {
    const extra = { ...validAgent, unknown_field: 'bad' };
    expect(Value.Check(AgentIdentitySchema, extra)).toBe(false);
  });

  it('rejects governance_weight > 1', () => {
    expect(Value.Check(AgentIdentitySchema, { ...validAgent, governance_weight: 1.5 })).toBe(false);
  });

  it('rejects governance_weight < 0', () => {
    expect(Value.Check(AgentIdentitySchema, { ...validAgent, governance_weight: -0.1 })).toBe(false);
  });

  it('rejects max_delegation_depth > 10', () => {
    expect(Value.Check(AgentIdentitySchema, { ...validAgent, max_delegation_depth: 11 })).toBe(false);
  });
});

describe('TrustLevelSchema', () => {
  for (const level of TRUST_LEVELS) {
    it(`accepts "${level}"`, () => {
      expect(Value.Check(TrustLevelSchema, level)).toBe(true);
    });
  }

  it('rejects unknown trust level', () => {
    expect(Value.Check(TrustLevelSchema, 'admin')).toBe(false);
  });
});

describe('AgentTypeSchema', () => {
  const types = ['model', 'orchestrator', 'human', 'service', 'composite'];

  for (const t of types) {
    it(`accepts "${t}"`, () => {
      expect(Value.Check(AgentTypeSchema, t)).toBe(true);
    });
  }

  it('rejects unknown agent type', () => {
    expect(Value.Check(AgentTypeSchema, 'robot')).toBe(false);
  });
});

describe('TRUST_LEVELS', () => {
  it('has 5 levels', () => {
    expect(TRUST_LEVELS).toHaveLength(5);
  });

  it('is in ascending order', () => {
    expect(TRUST_LEVELS[0]).toBe('untrusted');
    expect(TRUST_LEVELS[4]).toBe('sovereign');
  });
});

describe('DELEGATION_TRUST_THRESHOLD', () => {
  it('is "verified"', () => {
    expect(DELEGATION_TRUST_THRESHOLD).toBe('verified');
  });

  it('is at index 2 in TRUST_LEVELS (middle)', () => {
    expect(TRUST_LEVELS.indexOf(DELEGATION_TRUST_THRESHOLD)).toBe(2);
  });
});

describe('trustLevelIndex', () => {
  it('returns 0 for untrusted', () => {
    expect(trustLevelIndex('untrusted')).toBe(0);
  });

  it('returns 1 for basic', () => {
    expect(trustLevelIndex('basic')).toBe(1);
  });

  it('returns 2 for verified', () => {
    expect(trustLevelIndex('verified')).toBe(2);
  });

  it('returns 3 for trusted', () => {
    expect(trustLevelIndex('trusted')).toBe(3);
  });

  it('returns 4 for sovereign', () => {
    expect(trustLevelIndex('sovereign')).toBe(4);
  });

  it('throws on unknown level', () => {
    expect(() => trustLevelIndex('admin' as TrustLevel)).toThrow('Unknown trust level');
  });
});

describe('meetsThreshold', () => {
  it('sovereign meets any threshold', () => {
    for (const t of TRUST_LEVELS) {
      expect(meetsThreshold('sovereign', t)).toBe(true);
    }
  });

  it('untrusted meets only untrusted', () => {
    expect(meetsThreshold('untrusted', 'untrusted')).toBe(true);
    expect(meetsThreshold('untrusted', 'basic')).toBe(false);
    expect(meetsThreshold('untrusted', 'verified')).toBe(false);
  });

  it('verified meets DELEGATION_TRUST_THRESHOLD', () => {
    expect(meetsThreshold('verified', DELEGATION_TRUST_THRESHOLD)).toBe(true);
  });

  it('basic does not meet DELEGATION_TRUST_THRESHOLD', () => {
    expect(meetsThreshold('basic', DELEGATION_TRUST_THRESHOLD)).toBe(false);
  });
});
