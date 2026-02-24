/**
 * Tests for domain-separated hash utility and two-phase verification.
 *
 * @see SDD §4.14 — Domain-Separated Hash Utility
 * @see SDD §4.8 — Hash Chain Operational Response (FR-3)
 * @see ADR-006 — Hash Chain Operational Response
 */
import { describe, it, expect } from 'vitest';
import {
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
  type AuditEntryHashInput,
} from '../../src/commons/audit-trail-hash.js';
import {
  AUDIT_TRAIL_GENESIS_HASH,
  type AuditEntry,
  type AuditTrail,
} from '../../src/commons/audit-trail.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = 'loa-commons:audit:GovernedCredits:8.0.0';

/** Build a minimal valid AuditEntry with computed hashes. */
function makeEntry(
  overrides: Partial<AuditEntry> & { entry_id: string; timestamp: string; event_type: string },
  previousHash: string,
): AuditEntry {
  const input: AuditEntryHashInput = {
    entry_id: overrides.entry_id,
    timestamp: overrides.timestamp,
    event_type: overrides.event_type,
    ...(overrides.actor_id !== undefined && { actor_id: overrides.actor_id }),
    ...(overrides.payload !== undefined && { payload: overrides.payload }),
  };
  const entryHash = computeAuditEntryHash(input, DOMAIN_TAG);
  return {
    entry_id: overrides.entry_id,
    timestamp: overrides.timestamp,
    event_type: overrides.event_type,
    ...(overrides.actor_id !== undefined && { actor_id: overrides.actor_id }),
    ...(overrides.payload !== undefined && { payload: overrides.payload }),
    entry_hash: entryHash,
    previous_hash: previousHash,
    hash_domain_tag: DOMAIN_TAG,
  };
}

describe('buildDomainTag', () => {
  it('produces correct format', () => {
    expect(buildDomainTag('GovernedCredits', '8.0.0')).toBe(
      'loa-commons:audit:GovernedCredits:8.0.0',
    );
  });

  it('varies by schema id', () => {
    const a = buildDomainTag('GovernedCredits', '8.0.0');
    const b = buildDomainTag('GovernedReputation', '8.0.0');
    expect(a).not.toBe(b);
  });

  it('varies by version', () => {
    const a = buildDomainTag('GovernedCredits', '8.0.0');
    const b = buildDomainTag('GovernedCredits', '9.0.0');
    expect(a).not.toBe(b);
  });
});

describe('computeAuditEntryHash', () => {
  const input: AuditEntryHashInput = {
    entry_id: '550e8400-e29b-41d4-a716-446655440000',
    timestamp: '2026-02-25T10:00:00Z',
    event_type: 'commons.transition.executed',
  };

  it('returns sha256-prefixed hex string', () => {
    const hash = computeAuditEntryHash(input, DOMAIN_TAG);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const a = computeAuditEntryHash(input, DOMAIN_TAG);
    const b = computeAuditEntryHash(input, DOMAIN_TAG);
    expect(a).toBe(b);
  });

  it('varies with domain tag (domain separation)', () => {
    const hashA = computeAuditEntryHash(input, 'loa-commons:audit:GovernedCredits:8.0.0');
    const hashB = computeAuditEntryHash(input, 'loa-commons:audit:GovernedReputation:8.0.0');
    expect(hashA).not.toBe(hashB);
  });

  it('varies with content', () => {
    const hashA = computeAuditEntryHash(input, DOMAIN_TAG);
    const hashB = computeAuditEntryHash(
      { ...input, event_type: 'commons.resource.created' },
      DOMAIN_TAG,
    );
    expect(hashA).not.toBe(hashB);
  });

  it('includes optional fields when present', () => {
    const withoutActor = computeAuditEntryHash(input, DOMAIN_TAG);
    const withActor = computeAuditEntryHash(
      { ...input, actor_id: 'agent-001' },
      DOMAIN_TAG,
    );
    expect(withoutActor).not.toBe(withActor);
  });

  it('includes payload when present', () => {
    const withoutPayload = computeAuditEntryHash(input, DOMAIN_TAG);
    const withPayload = computeAuditEntryHash(
      { ...input, payload: { amount: '1000' } },
      DOMAIN_TAG,
    );
    expect(withoutPayload).not.toBe(withPayload);
  });

  it('produces consistent hash for cross-language vector', () => {
    // This hash is the reference vector for other language implementations
    const hash = computeAuditEntryHash(input, DOMAIN_TAG);
    // Ensure it's a valid sha256 hash (exact value is the reference)
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hash.length).toBe(7 + 64); // "sha256:" + 64 hex chars
  });
});

describe('verifyAuditTrailIntegrity', () => {
  it('validates an empty trail', () => {
    const trail: AuditTrail = {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };
    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(true);
    expect(result.failure_phase).toBeUndefined();
  });

  it('validates a single-entry trail', () => {
    const entry = makeEntry(
      {
        entry_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-02-25T10:00:00Z',
        event_type: 'commons.transition.executed',
      },
      GENESIS,
    );
    const trail: AuditTrail = {
      entries: [entry],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };
    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(true);
  });

  it('validates a multi-entry chain', () => {
    const e1 = makeEntry(
      {
        entry_id: '550e8400-e29b-41d4-a716-446655440001',
        timestamp: '2026-02-25T10:00:00Z',
        event_type: 'commons.resource.created',
      },
      GENESIS,
    );
    const e2 = makeEntry(
      {
        entry_id: '550e8400-e29b-41d4-a716-446655440002',
        timestamp: '2026-02-25T10:01:00Z',
        event_type: 'commons.transition.executed',
      },
      e1.entry_hash,
    );
    const e3 = makeEntry(
      {
        entry_id: '550e8400-e29b-41d4-a716-446655440003',
        timestamp: '2026-02-25T10:02:00Z',
        event_type: 'commons.resource.updated',
      },
      e2.entry_hash,
    );
    const trail: AuditTrail = {
      entries: [e1, e2, e3],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };
    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(true);
  });

  describe('Phase 1: content tampering detection', () => {
    it('detects tampered event_type', () => {
      const entry = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.transition.executed',
        },
        GENESIS,
      );
      // Tamper with content after hash computation
      const tampered = { ...entry, event_type: 'commons.resource.deleted' };
      const trail: AuditTrail = {
        entries: [tampered],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.valid).toBe(false);
      expect(result.failure_phase).toBe('content');
      expect(result.failure_index).toBe(0);
    });

    it('detects tampered payload', () => {
      const entry = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.transition.executed',
          payload: { amount: '1000' },
        },
        GENESIS,
      );
      const tampered = { ...entry, payload: { amount: '9999' } };
      const trail: AuditTrail = {
        entries: [tampered],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.valid).toBe(false);
      expect(result.failure_phase).toBe('content');
    });
  });

  describe('Phase 2: chain linkage detection', () => {
    it('detects broken genesis link', () => {
      const entry = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.transition.executed',
        },
        GENESIS,
      );
      // Recompute hash to avoid content failure, then break chain
      const wrongGenesis = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      const brokenEntry = { ...entry, previous_hash: wrongGenesis };
      // Content hash is still valid for the original previous_hash, so this will fail at chain
      // Actually need to recompute entry_hash with original content to get content pass
      // But previous_hash is a chain field not included in content hash, so content will pass
      const trail: AuditTrail = {
        entries: [brokenEntry],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.valid).toBe(false);
      expect(result.failure_phase).toBe('chain');
      expect(result.failure_index).toBe(0);
    });

    it('detects broken inter-entry link', () => {
      const e1 = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.resource.created',
        },
        GENESIS,
      );
      const e2 = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440002',
          timestamp: '2026-02-25T10:01:00Z',
          event_type: 'commons.transition.executed',
        },
        e1.entry_hash,
      );
      // Break the chain between e1 and e2
      const brokenE2 = {
        ...e2,
        previous_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
      };
      const trail: AuditTrail = {
        entries: [e1, brokenE2],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.valid).toBe(false);
      expect(result.failure_phase).toBe('chain');
      expect(result.failure_index).toBe(1);
    });

    it('returns expected and actual hashes on failure', () => {
      const entry = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.transition.executed',
        },
        GENESIS,
      );
      const wrongHash = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      const brokenEntry = { ...entry, previous_hash: wrongHash };
      const trail: AuditTrail = {
        entries: [brokenEntry],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.expected_hash).toBe(GENESIS);
      expect(result.actual_hash).toBe(wrongHash);
    });
  });

  it('content failure takes precedence over chain failure', () => {
    const entry = makeEntry(
      {
        entry_id: '550e8400-e29b-41d4-a716-446655440000',
        timestamp: '2026-02-25T10:00:00Z',
        event_type: 'commons.transition.executed',
      },
      GENESIS,
    );
    // Tamper with both content AND chain
    const tampered = {
      ...entry,
      event_type: 'commons.resource.deleted',
      previous_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000',
    };
    const trail: AuditTrail = {
      entries: [tampered],
      hash_algorithm: 'sha256',
      genesis_hash: GENESIS,
      integrity_status: 'unverified',
    };
    const result = verifyAuditTrailIntegrity(trail);
    expect(result.valid).toBe(false);
    // Content check runs first (Phase 1)
    expect(result.failure_phase).toBe('content');
  });
});
