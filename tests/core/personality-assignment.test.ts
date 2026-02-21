/**
 * Tests for PersonalityAssignment schema (S1-T6, S1-T7).
 *
 * Validates schema structure, field validation, NftId integration,
 * tier enum, and fingerprint hash format.
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import {
  PersonalityAssignmentSchema,
  PersonalityTierSchema,
  type PersonalityAssignment,
  type PersonalityTier,
} from '../../src/core/personality-assignment.js';

const VALID_ASSIGNMENT: PersonalityAssignment = {
  token_id: 'eip155:1/0xbEeFbeEfbeEfbeEFbeEfbeEfBEeFBEEfBeEfBeef/42',
  archetype: 'sage',
  ancestor: 'merlin',
  era: 'medieval',
  element: 'fire',
  tier: 'standard',
  fingerprint_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
};

describe('PersonalityAssignmentSchema', () => {
  it('validates a correct assignment', () => {
    expect(Value.Check(PersonalityAssignmentSchema, VALID_ASSIGNMENT)).toBe(true);
  });

  it('has $id = PersonalityAssignment', () => {
    expect(PersonalityAssignmentSchema.$id).toBe('PersonalityAssignment');
  });

  it('rejects additional properties', () => {
    const withExtra = { ...VALID_ASSIGNMENT, extra_field: 'should fail' };
    expect(Value.Check(PersonalityAssignmentSchema, withExtra)).toBe(false);
  });

  describe('token_id (NftId format)', () => {
    it('accepts valid EIP-155 NftId', () => {
      expect(Value.Check(PersonalityAssignmentSchema, VALID_ASSIGNMENT)).toBe(true);
    });

    it('rejects missing eip155 prefix', () => {
      const invalid = { ...VALID_ASSIGNMENT, token_id: '0xbeef/42' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects invalid collection address (too short)', () => {
      const invalid = { ...VALID_ASSIGNMENT, token_id: 'eip155:1/0xbeef/42' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects chainId 0', () => {
      const invalid = { ...VALID_ASSIGNMENT, token_id: 'eip155:0/0xbEeFbeEfbeEfbeEFbeEfbeEfBEeFBEEfBeEfBeef/42' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });
  });

  describe('fingerprint_hash', () => {
    it('accepts valid 64-char lowercase hex', () => {
      expect(Value.Check(PersonalityAssignmentSchema, VALID_ASSIGNMENT)).toBe(true);
    });

    it('rejects too short hash (32 chars)', () => {
      const invalid = { ...VALID_ASSIGNMENT, fingerprint_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects uppercase hex', () => {
      const invalid = { ...VALID_ASSIGNMENT, fingerprint_hash: 'A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2C3D4E5F6A1B2' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects non-hex characters', () => {
      const invalid = { ...VALID_ASSIGNMENT, fingerprint_hash: 'g1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });
  });

  describe('string fields (extensible)', () => {
    it('rejects empty archetype', () => {
      const invalid = { ...VALID_ASSIGNMENT, archetype: '' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects empty ancestor', () => {
      const invalid = { ...VALID_ASSIGNMENT, ancestor: '' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects empty era', () => {
      const invalid = { ...VALID_ASSIGNMENT, era: '' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('rejects empty element', () => {
      const invalid = { ...VALID_ASSIGNMENT, element: '' };
      expect(Value.Check(PersonalityAssignmentSchema, invalid)).toBe(false);
    });

    it('accepts arbitrary non-empty string values', () => {
      const custom = { ...VALID_ASSIGNMENT, archetype: 'custom-type-123', era: 'future' };
      expect(Value.Check(PersonalityAssignmentSchema, custom)).toBe(true);
    });
  });
});

describe('PersonalityTierSchema', () => {
  it('accepts basic', () => {
    expect(Value.Check(PersonalityTierSchema, 'basic')).toBe(true);
  });

  it('accepts standard', () => {
    expect(Value.Check(PersonalityTierSchema, 'standard')).toBe(true);
  });

  it('accepts premium', () => {
    expect(Value.Check(PersonalityTierSchema, 'premium')).toBe(true);
  });

  it('rejects unknown tier', () => {
    expect(Value.Check(PersonalityTierSchema, 'enterprise')).toBe(false);
  });
});
