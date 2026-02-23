/**
 * Tests for PolicyVersion schema and sub-types.
 *
 * @see DR-S8 — Policy versioning and migration
 * @since v7.6.0 (Sprint 3)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  PolicyTypeSchema,
  PolicyVersionSchema,
} from '../../src/governance/policy-version.js';

// ---------------------------------------------------------------------------
// PolicyType
// ---------------------------------------------------------------------------

describe('PolicyTypeSchema', () => {
  it('accepts all valid policy types', () => {
    for (const t of ['monetary', 'access', 'governance', 'constraint']) {
      expect(Value.Check(PolicyTypeSchema, t), `type: ${t}`).toBe(true);
    }
  });

  it('rejects invalid policy type', () => {
    expect(Value.Check(PolicyTypeSchema, 'unknown')).toBe(false);
    expect(Value.Check(PolicyTypeSchema, '')).toBe(false);
  });

  it('has correct $id', () => {
    expect(PolicyTypeSchema.$id).toBe('PolicyType');
  });
});

// ---------------------------------------------------------------------------
// PolicyVersion
// ---------------------------------------------------------------------------

describe('PolicyVersionSchema', () => {
  const validVersion = {
    version_id: '550e8400-e29b-41d4-a716-446655440070',
    policy_type: 'monetary',
    policy_id: 'conservation-ceiling-policy',
    version: '2.0.0',
    effective_at: '2026-02-01T00:00:00Z',
    contract_version: '7.6.0',
  };

  it('accepts minimal valid policy version', () => {
    expect(Value.Check(PolicyVersionSchema, validVersion)).toBe(true);
  });

  it('accepts version with supersedes', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      supersedes: '550e8400-e29b-41d4-a716-446655440071',
    })).toBe(true);
  });

  it('accepts version with migration_validation', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      migration_validation: 'new_ceiling >= old_ceiling * 0.5',
    })).toBe(true);
  });

  it('accepts version with enacted_by_proposal', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      enacted_by_proposal: '550e8400-e29b-41d4-a716-446655440072',
    })).toBe(true);
  });

  it('accepts full version with all optional fields', () => {
    const full = {
      ...validVersion,
      supersedes: '550e8400-e29b-41d4-a716-446655440071',
      migration_validation: 'new_quorum >= old_quorum * 0.5',
      enacted_by_proposal: '550e8400-e29b-41d4-a716-446655440072',
    };
    expect(Value.Check(PolicyVersionSchema, full)).toBe(true);
  });

  it('rejects non-uuid version_id', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      version_id: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects empty policy_id', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      policy_id: '',
    })).toBe(false);
  });

  it('rejects invalid version format', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      version: 'v2.0',
    })).toBe(false);
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      version: '2.0',
    })).toBe(false);
  });

  it('rejects invalid effective_at format', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      effective_at: 'not-a-date',
    })).toBe(false);
  });

  it('rejects non-uuid supersedes', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      supersedes: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects empty migration_validation', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      migration_validation: '',
    })).toBe(false);
  });

  it('rejects non-uuid enacted_by_proposal', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      enacted_by_proposal: 'not-a-uuid',
    })).toBe(false);
  });

  it('rejects invalid contract_version format', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      contract_version: 'v7',
    })).toBe(false);
  });

  it('rejects additional properties', () => {
    expect(Value.Check(PolicyVersionSchema, {
      ...validVersion,
      extra_field: true,
    })).toBe(false);
  });

  it('has correct $id', () => {
    expect(PolicyVersionSchema.$id).toBe('PolicyVersion');
  });

  it('accepts all valid policy types', () => {
    for (const t of ['monetary', 'access', 'governance', 'constraint']) {
      expect(Value.Check(PolicyVersionSchema, {
        ...validVersion,
        policy_type: t,
      }), `type: ${t}`).toBe(true);
    }
  });

  it('rejects self-supersession', () => {
    // This is a constraint-level check, not schema-level
    // Schema accepts it, but constraint policy-version-supersedes-different catches it
    const selfSupersede = {
      ...validVersion,
      supersedes: validVersion.version_id,
    };
    // Schema still validates (constraints are checked separately)
    expect(Value.Check(PolicyVersionSchema, selfSupersede)).toBe(true);
  });
});
