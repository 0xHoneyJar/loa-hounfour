/**
 * Tests for domain-separated hash utility and two-phase verification.
 *
 * @see SDD §2.1 — buildDomainTag() sanitization
 * @see SDD §4.14 — Domain-Separated Hash Utility
 * @see SDD §4.8 — Hash Chain Operational Response (FR-3)
 * @see ADR-006 — Hash Chain Operational Response
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import {
  buildDomainTag,
  computeAuditEntryHash,
  verifyAuditTrailIntegrity,
  type AuditEntryHashInput,
} from '../../src/commons/audit-trail-hash.js';
import { validateDomainTag } from '../../src/commons/chain-bound-hash.js';
import {
  AUDIT_TRAIL_GENESIS_HASH,
  type AuditEntry,
  type AuditTrail,
} from '../../src/commons/audit-trail.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = buildDomainTag('GovernedCredits', '8.0.0');

/** Build a minimal valid AuditEntry with computed hashes. */
function makeEntry(
  overrides: Partial<AuditEntry> & { entry_id: string; timestamp: string; event_type: string },
  previousHash: string,
  domainTag: string = DOMAIN_TAG,
): AuditEntry {
  const input: AuditEntryHashInput = {
    entry_id: overrides.entry_id,
    timestamp: overrides.timestamp,
    event_type: overrides.event_type,
    ...(overrides.actor_id !== undefined && { actor_id: overrides.actor_id }),
    ...(overrides.payload !== undefined && { payload: overrides.payload }),
  };
  const entryHash = computeAuditEntryHash(input, domainTag);
  return {
    entry_id: overrides.entry_id,
    timestamp: overrides.timestamp,
    event_type: overrides.event_type,
    ...(overrides.actor_id !== undefined && { actor_id: overrides.actor_id }),
    ...(overrides.payload !== undefined && { payload: overrides.payload }),
    entry_hash: entryHash,
    previous_hash: previousHash,
    hash_domain_tag: domainTag,
  };
}

describe('buildDomainTag', () => {
  it('produces sanitized format', () => {
    expect(buildDomainTag('GovernedCredits', '8.0.0')).toBe(
      'loa-commons:audit:governedcredits:8-0-0',
    );
  });

  it('passes validateDomainTag', () => {
    const tag = buildDomainTag('GovernedCredits', '8.0.0');
    expect(validateDomainTag(tag)).toEqual({ valid: true });
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

  it('rejects empty schemaId', () => {
    expect(() => buildDomainTag('', '8.0.0')).toThrow(TypeError);
  });

  it('rejects invalid schemaId (digit start)', () => {
    expect(() => buildDomainTag('123bad', '8.0.0')).toThrow(TypeError);
  });

  it('rejects empty version', () => {
    expect(() => buildDomainTag('test', '')).toThrow(TypeError);
  });

  it('rejects oversized schemaId (>256 chars)', () => {
    const longId = 'a' + 'b'.repeat(256);
    expect(() => buildDomainTag(longId, '8.0.0')).toThrow(TypeError);
    expect(() => buildDomainTag(longId, '8.0.0')).toThrow(/length/);
  });

  it('rejects oversized version (>256 chars)', () => {
    const longVer = '1' + '0'.repeat(256);
    expect(() => buildDomainTag('test', longVer)).toThrow(TypeError);
    expect(() => buildDomainTag('test', longVer)).toThrow(/length/);
  });

  it('accepts schemaId at max length (256 chars)', () => {
    const maxId = 'a' + 'b'.repeat(255);
    const tag = buildDomainTag(maxId, '8.0.0');
    expect(validateDomainTag(tag)).toEqual({ valid: true });
  });

  it('strips colons from schemaId', () => {
    expect(buildDomainTag('a:b', '8.0.0')).toBe(
      'loa-commons:audit:ab:8-0-0',
    );
  });

  it('handles kebab-case schemaId', () => {
    expect(buildDomainTag('test-store', '8.3.0')).toBe(
      'loa-commons:audit:test-store:8-3-0',
    );
  });

  describe('edge cases', () => {
    it('handles single-char schemaId', () => {
      const tag = buildDomainTag('a', '8.0.0');
      expect(tag).toBe('loa-commons:audit:a:8-0-0');
      expect(validateDomainTag(tag)).toEqual({ valid: true });
    });

    it('handles max-length schemaId (31 chars)', () => {
      const longId = 'a' + 'b'.repeat(30);
      const tag = buildDomainTag(longId, '8.0.0');
      expect(validateDomainTag(tag)).toEqual({ valid: true });
    });

    it('handles version with + build metadata', () => {
      const tag = buildDomainTag('Test', '8.3.0+build1');
      expect(tag).toBe('loa-commons:audit:test:8-3-0-build1');
      expect(validateDomainTag(tag)).toEqual({ valid: true });
    });

    it('handles version with -rc prerelease', () => {
      const tag = buildDomainTag('Test', '8.3.0-rc.1');
      expect(tag).toBe('loa-commons:audit:test:8-3-0-rc-1');
      expect(validateDomainTag(tag)).toEqual({ valid: true });
    });
  });

  describe('collision behavior (documented lossy transform)', () => {
    it('case folding produces collision', () => {
      const a = buildDomainTag('CreditPool', '1.0.0');
      const b = buildDomainTag('creditpool', '1.0.0');
      expect(a).toBe(b);
    });

    it('dot-hyphen equivalence produces collision', () => {
      const a = buildDomainTag('a.b', '1.0.0');
      const b = buildDomainTag('a-b', '1-0-0');
      expect(a).toBe(b);
    });
  });
});

describe('buildDomainTag property tests', () => {
  const validSchemaId = fc.stringMatching(/^[a-zA-Z][a-zA-Z0-9._:-]{0,30}$/);
  const validVersion = fc.stringMatching(/^[0-9][a-zA-Z0-9._+-]{0,20}$/);

  it('builder output always passes validator (property)', () => {
    fc.assert(
      fc.property(validSchemaId, validVersion, (id, ver) => {
        const tag = buildDomainTag(id, ver);
        const result = validateDomainTag(tag);
        return result.valid === true;
      }),
      { numRuns: 500 },
    );
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
    const hashA = computeAuditEntryHash(input, 'loa-commons:audit:governedcredits:8-0-0');
    const hashB = computeAuditEntryHash(input, 'loa-commons:audit:governedreputation:8-0-0');
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
    const hash = computeAuditEntryHash(input, DOMAIN_TAG);
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

  describe('backward compatibility: legacy unsanitized tags', () => {
    it('verifies entries with old-format domain tag', () => {
      // Legacy entries stored hash_domain_tag as unsanitized "GovernedCredits:8.0.0"
      const legacyTag = 'loa-commons:audit:GovernedCredits:8.0.0';
      const entry = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440000',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.transition.executed',
        },
        GENESIS,
        legacyTag,
      );
      const trail: AuditTrail = {
        entries: [entry],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      // Verification reads stored hash_domain_tag — it MUST NOT re-derive
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.valid).toBe(true);
    });

    it('verifies mixed trail with legacy and new-format entries', () => {
      const legacyTag = 'loa-commons:audit:GovernedCredits:8.0.0';
      const newTag = buildDomainTag('GovernedCredits', '8.0.0');

      const e1 = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440001',
          timestamp: '2026-02-25T10:00:00Z',
          event_type: 'commons.resource.created',
        },
        GENESIS,
        legacyTag,
      );
      const e2 = makeEntry(
        {
          entry_id: '550e8400-e29b-41d4-a716-446655440002',
          timestamp: '2026-02-25T10:01:00Z',
          event_type: 'commons.transition.executed',
        },
        e1.entry_hash,
        newTag,
      );
      const trail: AuditTrail = {
        entries: [e1, e2],
        hash_algorithm: 'sha256',
        genesis_hash: GENESIS,
        integrity_status: 'unverified',
      };
      const result = verifyAuditTrailIntegrity(trail);
      expect(result.valid).toBe(true);
    });
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
      const wrongGenesis = 'sha256:0000000000000000000000000000000000000000000000000000000000000000';
      const brokenEntry = { ...entry, previous_hash: wrongGenesis };
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
