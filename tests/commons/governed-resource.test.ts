/**
 * Tests for GovernanceClass, GOVERNED_RESOURCE_FIELDS, and GovernanceMutation.
 *
 * @see SDD §4.1 — GovernedResource Governance Fields (FR-1.1)
 * @see SDD §4.7 — GovernanceMutation (Flatline SKP-004)
 */
import { describe, it, expect } from 'vitest';
import { Type, type Static } from '@sinclair/typebox';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  GovernanceClassSchema,
  GOVERNED_RESOURCE_FIELDS,
  GovernanceMutationSchema,
  type GovernanceClass,
  type GovernanceMutation,
} from '../../src/commons/governed-resource.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '../../src/commons/audit-trail.js';

describe('GovernanceClass', () => {
  it.each(['protocol-fixed', 'registry-extensible', 'community-defined'] satisfies GovernanceClass[])(
    'accepts "%s"',
    (value) => {
      expect(Value.Check(GovernanceClassSchema, value)).toBe(true);
    },
  );

  it('rejects unknown class', () => {
    expect(Value.Check(GovernanceClassSchema, 'unknown')).toBe(false);
  });

  it('has $id "GovernanceClass"', () => {
    expect(GovernanceClassSchema.$id).toBe('GovernanceClass');
  });
});

describe('GOVERNED_RESOURCE_FIELDS', () => {
  // Create a test schema that spreads the fields
  const TestGovernedSchema = Type.Object({
    test_field: Type.String(),
    ...GOVERNED_RESOURCE_FIELDS,
  }, { additionalProperties: false });

  type TestGoverned = Static<typeof TestGovernedSchema>;

  const GENESIS = AUDIT_TRAIL_GENESIS_HASH;

  const validInstance: TestGoverned = {
    test_field: 'hello',
    conservation_law: {
      invariants: [],
      enforcement: 'advisory',
      scope: 'per-entry',
    },
    audit_trail: {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    },
    state_machine: {
      states: [{ name: 'active' }],
      transitions: [],
      initial_state: 'active',
      terminal_states: [],
    },
    governance_class: 'protocol-fixed',
    version: 0,
    contract_version: '8.0.0',
  };

  it('validates a complete governed resource instance', () => {
    expect(Value.Check(TestGovernedSchema, validInstance)).toBe(true);
  });

  it('validates with governance_extensions', () => {
    expect(Value.Check(TestGovernedSchema, {
      ...validInstance,
      governance_extensions: {
        'commons.checkpoint': { enabled: true },
        'commons.acl': ['read', 'write'],
      },
    })).toBe(true);
  });

  it('validates with governance_extensions omitted', () => {
    // governance_extensions is optional
    const { governance_extensions, ...rest } = validInstance;
    expect(Value.Check(TestGovernedSchema, rest)).toBe(true);
  });

  it('rejects negative version', () => {
    expect(Value.Check(TestGovernedSchema, {
      ...validInstance,
      version: -1,
    })).toBe(false);
  });

  it('rejects non-integer version', () => {
    expect(Value.Check(TestGovernedSchema, {
      ...validInstance,
      version: 1.5,
    })).toBe(false);
  });

  it('rejects invalid contract_version', () => {
    expect(Value.Check(TestGovernedSchema, {
      ...validInstance,
      contract_version: 'not-semver',
    })).toBe(false);
  });

  it('rejects missing version', () => {
    const { version, ...rest } = validInstance;
    expect(Value.Check(TestGovernedSchema, rest)).toBe(false);
  });

  it('contains all expected field keys', () => {
    const keys = Object.keys(GOVERNED_RESOURCE_FIELDS);
    expect(keys).toContain('conservation_law');
    expect(keys).toContain('audit_trail');
    expect(keys).toContain('state_machine');
    expect(keys).toContain('governance_class');
    expect(keys).toContain('version');
    expect(keys).toContain('governance_extensions');
    expect(keys).toContain('contract_version');
  });
});

describe('GovernanceMutation', () => {
  const validMutation: GovernanceMutation = {
    mutation_id: '550e8400-e29b-41d4-a716-446655440000',
    expected_version: 0,
    mutated_at: '2026-02-25T10:00:00Z',
  };

  describe('valid instances', () => {
    it('accepts a full mutation envelope', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        actor_id: 'agent-001',
      })).toBe(true);
    });

    it('accepts minimal mutation (without actor_id)', () => {
      expect(Value.Check(GovernanceMutationSchema, validMutation)).toBe(true);
    });

    it('accepts version 0 (new resource)', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        expected_version: 0,
      })).toBe(true);
    });

    it('accepts high version number', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        expected_version: 999999,
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects non-uuid mutation_id', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        mutation_id: 'not-a-uuid',
      })).toBe(false);
    });

    it('rejects negative expected_version', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        expected_version: -1,
      })).toBe(false);
    });

    it('rejects missing mutation_id', () => {
      const { mutation_id, ...rest } = validMutation;
      expect(Value.Check(GovernanceMutationSchema, rest)).toBe(false);
    });

    it('rejects invalid mutated_at format', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        mutated_at: 'not-a-date',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(GovernanceMutationSchema, {
        ...validMutation,
        extra: true,
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "GovernanceMutation"', () => {
      expect(GovernanceMutationSchema.$id).toBe('GovernanceMutation');
    });

    it('has additionalProperties false', () => {
      expect(GovernanceMutationSchema.additionalProperties).toBe(false);
    });
  });
});
