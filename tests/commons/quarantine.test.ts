/**
 * Tests for QuarantineRecord and QuarantineStatus schemas.
 *
 * @see SDD §4.8.2 — QuarantineRecord
 * @see ADR-006 — Hash Chain Operational Response
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import '../../src/validators/index.js';
import {
  QuarantineStatusSchema,
  QuarantineRecordSchema,
  type QuarantineRecord,
} from '../../src/commons/quarantine.js';
import {
  HashChainDiscontinuitySchema,
  type HashChainDiscontinuity,
} from '../../src/commons/hash-chain-discontinuity.js';

describe('QuarantineStatus', () => {
  it('accepts "active"', () => {
    expect(Value.Check(QuarantineStatusSchema, 'active')).toBe(true);
  });

  it('accepts "reconciled"', () => {
    expect(Value.Check(QuarantineStatusSchema, 'reconciled')).toBe(true);
  });

  it('accepts "dismissed"', () => {
    expect(Value.Check(QuarantineStatusSchema, 'dismissed')).toBe(true);
  });

  it('rejects invalid status', () => {
    expect(Value.Check(QuarantineStatusSchema, 'pending')).toBe(false);
    expect(Value.Check(QuarantineStatusSchema, '')).toBe(false);
    expect(Value.Check(QuarantineStatusSchema, 42)).toBe(false);
  });
});

describe('QuarantineRecord', () => {
  const validRecord: QuarantineRecord = {
    quarantine_id: '550e8400-e29b-41d4-a716-446655440010',
    discontinuity_id: '550e8400-e29b-41d4-a716-446655440020',
    resource_type: 'GovernedCredits',
    resource_id: 'lot-001',
    status: 'active',
    quarantined_at: '2026-02-25T10:00:00Z',
    first_affected_index: 5,
    last_affected_index: 10,
  };

  describe('valid instances', () => {
    it('accepts minimal active record', () => {
      expect(Value.Check(QuarantineRecordSchema, validRecord)).toBe(true);
    });

    it('accepts reconciled record with resolved_at', () => {
      const reconciled: QuarantineRecord = {
        ...validRecord,
        status: 'reconciled',
        resolved_at: '2026-02-25T11:00:00Z',
        resolution_notes: 'Entries verified manually — false positive from migration.',
      };
      expect(Value.Check(QuarantineRecordSchema, reconciled)).toBe(true);
    });

    it('accepts dismissed record with resolved_at', () => {
      const dismissed: QuarantineRecord = {
        ...validRecord,
        status: 'dismissed',
        resolved_at: '2026-02-25T11:00:00Z',
        resolution_notes: 'Entries corrupted beyond recovery.',
      };
      expect(Value.Check(QuarantineRecordSchema, dismissed)).toBe(true);
    });

    it('accepts single-entry quarantine (first == last)', () => {
      const single: QuarantineRecord = {
        ...validRecord,
        first_affected_index: 5,
        last_affected_index: 5,
      };
      expect(Value.Check(QuarantineRecordSchema, single)).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects missing quarantine_id', () => {
      const { quarantine_id: _, ...rest } = validRecord;
      expect(Value.Check(QuarantineRecordSchema, rest)).toBe(false);
    });

    it('rejects non-uuid quarantine_id', () => {
      expect(Value.Check(QuarantineRecordSchema, {
        ...validRecord,
        quarantine_id: 'not-a-uuid',
      })).toBe(false);
    });

    it('rejects negative first_affected_index', () => {
      expect(Value.Check(QuarantineRecordSchema, {
        ...validRecord,
        first_affected_index: -1,
      })).toBe(false);
    });

    it('rejects non-integer index', () => {
      expect(Value.Check(QuarantineRecordSchema, {
        ...validRecord,
        first_affected_index: 5.5,
      })).toBe(false);
    });

    it('rejects empty resource_type', () => {
      expect(Value.Check(QuarantineRecordSchema, {
        ...validRecord,
        resource_type: '',
      })).toBe(false);
    });

    it('rejects additional properties', () => {
      expect(Value.Check(QuarantineRecordSchema, {
        ...validRecord,
        extra_field: true,
      })).toBe(false);
    });

    it('rejects resolution_notes exceeding 2000 chars', () => {
      expect(Value.Check(QuarantineRecordSchema, {
        ...validRecord,
        resolution_notes: 'x'.repeat(2001),
      })).toBe(false);
    });
  });

  describe('$id metadata', () => {
    it('has correct $id', () => {
      expect(QuarantineRecordSchema.$id).toBe('QuarantineRecord');
    });
  });
});

describe('HashChainDiscontinuity', () => {
  const SAMPLE_HASH = 'sha256:a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
  const OTHER_HASH = 'sha256:f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5d4c3b2a1f6e5';

  const validDiscontinuity: HashChainDiscontinuity = {
    discontinuity_id: '550e8400-e29b-41d4-a716-446655440020',
    resource_type: 'GovernedCredits',
    resource_id: 'lot-001',
    detected_at: '2026-02-25T10:00:00Z',
    entry_index: 5,
    expected_hash: SAMPLE_HASH,
    actual_hash: OTHER_HASH,
    last_known_good_index: 4,
    affected_entries: 6,
    detector: 'integrity-check-service',
    failure_phase: 'content',
  };

  describe('valid instances', () => {
    it('accepts content-phase discontinuity', () => {
      expect(Value.Check(HashChainDiscontinuitySchema, validDiscontinuity)).toBe(true);
    });

    it('accepts chain-phase discontinuity', () => {
      const chain: HashChainDiscontinuity = {
        ...validDiscontinuity,
        failure_phase: 'chain',
      };
      expect(Value.Check(HashChainDiscontinuitySchema, chain)).toBe(true);
    });

    it('accepts last_known_good_index of -1 (no good entries)', () => {
      const noGood: HashChainDiscontinuity = {
        ...validDiscontinuity,
        entry_index: 0,
        last_known_good_index: -1,
      };
      expect(Value.Check(HashChainDiscontinuitySchema, noGood)).toBe(true);
    });
  });

  describe('invalid instances', () => {
    it('rejects invalid hash format', () => {
      expect(Value.Check(HashChainDiscontinuitySchema, {
        ...validDiscontinuity,
        expected_hash: 'md5:abc123',
      })).toBe(false);
    });

    it('rejects invalid failure_phase', () => {
      expect(Value.Check(HashChainDiscontinuitySchema, {
        ...validDiscontinuity,
        failure_phase: 'unknown',
      })).toBe(false);
    });

    it('rejects negative entry_index', () => {
      expect(Value.Check(HashChainDiscontinuitySchema, {
        ...validDiscontinuity,
        entry_index: -1,
      })).toBe(false);
    });

    it('rejects missing detector', () => {
      const { detector: _, ...rest } = validDiscontinuity;
      expect(Value.Check(HashChainDiscontinuitySchema, rest)).toBe(false);
    });
  });

  describe('$id metadata', () => {
    it('has correct $id', () => {
      expect(HashChainDiscontinuitySchema.$id).toBe('HashChainDiscontinuity');
    });
  });
});
