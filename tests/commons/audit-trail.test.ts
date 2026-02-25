/**
 * Tests for AuditEntry, AuditTrail schemas and AUDIT_TRAIL_GENESIS_HASH.
 *
 * @see SDD §4.3 — AuditTrail (FR-1.3)
 * @see SDD §4.3.1 — Audit Trail Checkpointing (Flatline IMP-003)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  AuditEntrySchema,
  AuditTrailSchema,
  AUDIT_TRAIL_GENESIS_HASH,
  type AuditEntry,
  type AuditTrail,
} from '../../src/commons/audit-trail.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const SAMPLE_HASH = 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';

describe('AUDIT_TRAIL_GENESIS_HASH', () => {
  it('equals SHA-256 of empty string', () => {
    expect(GENESIS).toBe(
      'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
    );
  });

  it('matches SCORING_PATH_GENESIS_HASH format', () => {
    expect(GENESIS).toMatch(/^sha256:[a-f0-9]{64}$/);
  });
});

describe('AuditEntry', () => {
  const validEntry: AuditEntry = {
    entry_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-02-25T10:00:00Z',
    event_type: 'commons.transition.executed',
    entry_hash: SAMPLE_HASH,
    previous_hash: GENESIS,
    hash_domain_tag: 'loa-commons:audit:GovernedCredits:8.0.0',
  };

  describe('valid instances', () => {
    it('accepts a full entry with all fields', () => {
      const entry: AuditEntry = {
        ...validEntry,
        actor_id: 'agent-001',
        payload: { amount: '1000' },
      };
      expect(Value.Check(AuditEntrySchema, entry)).toBe(true);
    });

    it('accepts minimal entry without optional fields', () => {
      expect(Value.Check(AuditEntrySchema, validEntry)).toBe(true);
    });

    it('accepts entry with null-ish payload', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        payload: null,
      })).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects missing entry_id', () => {
      const { entry_id, ...rest } = validEntry;
      expect(Value.Check(AuditEntrySchema, rest)).toBe(false);
    });

    it('rejects invalid event_type pattern', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        event_type: 'invalid-event',
      })).toBe(false);
    });

    it('rejects entry_hash without sha256: prefix', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        entry_hash: 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2',
      })).toBe(false);
    });

    it('rejects missing hash_domain_tag', () => {
      const { hash_domain_tag, ...rest } = validEntry;
      expect(Value.Check(AuditEntrySchema, rest)).toBe(false);
    });

    it('rejects empty hash_domain_tag', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        hash_domain_tag: '',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        extra: true,
      })).toBe(false);
    });

    it('rejects non-uuid entry_id', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        entry_id: 'not-a-uuid',
      })).toBe(false);
    });

    it('rejects entry_hash with wrong length', () => {
      expect(Value.Check(AuditEntrySchema, {
        ...validEntry,
        entry_hash: 'sha256:abc123',
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "AuditEntry"', () => {
      expect(AuditEntrySchema.$id).toBe('AuditEntry');
    });

    it('has additionalProperties false', () => {
      expect(AuditEntrySchema.additionalProperties).toBe(false);
    });
  });
});

describe('AuditTrail', () => {
  const validEntry: AuditEntry = {
    entry_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-02-25T10:00:00Z',
    event_type: 'commons.transition.executed',
    entry_hash: SAMPLE_HASH,
    previous_hash: GENESIS,
    hash_domain_tag: 'loa-commons:audit:GovernedCredits:8.0.0',
  };

  const validTrail: AuditTrail = {
    entries: [validEntry],
    hash_algorithm: 'sha256',
    genesis_hash: GENESIS,
    integrity_status: 'verified',
  };

  describe('valid instances', () => {
    it('accepts a trail with one entry', () => {
      expect(Value.Check(AuditTrailSchema, validTrail)).toBe(true);
    });

    it('accepts an empty trail', () => {
      expect(Value.Check(AuditTrailSchema, {
        ...validTrail,
        entries: [],
      })).toBe(true);
    });

    it('accepts a trail with checkpoint fields', () => {
      expect(Value.Check(AuditTrailSchema, {
        ...validTrail,
        checkpoint_hash: SAMPLE_HASH,
        checkpoint_index: 5,
      })).toBe(true);
    });

    it.each(['verified', 'unverified', 'quarantined'] as const)(
      'accepts integrity_status "%s"',
      (status) => {
        expect(Value.Check(AuditTrailSchema, {
          ...validTrail,
          integrity_status: status,
        })).toBe(true);
      },
    );
  });

  describe('invalid instances', () => {
    it('rejects invalid hash_algorithm', () => {
      expect(Value.Check(AuditTrailSchema, {
        ...validTrail,
        hash_algorithm: 'md5',
      })).toBe(false);
    });

    it('rejects unknown integrity_status', () => {
      expect(Value.Check(AuditTrailSchema, {
        ...validTrail,
        integrity_status: 'corrupted',
      })).toBe(false);
    });

    it('rejects missing genesis_hash', () => {
      const { genesis_hash, ...rest } = validTrail;
      expect(Value.Check(AuditTrailSchema, rest)).toBe(false);
    });

    it('rejects negative checkpoint_index', () => {
      expect(Value.Check(AuditTrailSchema, {
        ...validTrail,
        checkpoint_hash: SAMPLE_HASH,
        checkpoint_index: -1,
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(AuditTrailSchema, {
        ...validTrail,
        extra: true,
      })).toBe(false);
    });
  });

  describe('schema metadata', () => {
    it('has $id "AuditTrail"', () => {
      expect(AuditTrailSchema.$id).toBe('AuditTrail');
    });

    it('has additionalProperties false', () => {
      expect(AuditTrailSchema.additionalProperties).toBe(false);
    });
  });
});
