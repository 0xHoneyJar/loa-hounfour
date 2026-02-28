/**
 * Tests for chain-bound hash — extends audit entry hashing with chain linkage.
 *
 * @see SDD §5.1 — Chain-Bound Hash
 * @see PRD FR-5 — Audit Trail Domain Separation + Chain-Bound Hash
 */
import { describe, it, expect } from 'vitest';
import {
  computeChainBoundHash,
  validateDomainTag,
  ChainBoundHashError,
  AUDIT_TRAIL_GENESIS_HASH,
} from '../../src/commons/chain-bound-hash.js';
import { computeAuditEntryHash } from '../../src/commons/audit-trail-hash.js';
import type { AuditEntryHashInput } from '../../src/commons/audit-trail-hash.js';

const GENESIS = AUDIT_TRAIL_GENESIS_HASH;
const DOMAIN_TAG = 'loa-finn:audit:agent-lifecycle';

const SAMPLE_ENTRY: AuditEntryHashInput = {
  entry_id: '550e8400-e29b-41d4-a716-446655440000',
  timestamp: '2026-02-28T12:00:00.000Z',
  event_type: 'commons.transition.executed',
  actor_id: 'agent-001',
  payload: { action: 'test' },
};

describe('validateDomainTag', () => {
  it('accepts valid 3-segment tag', () => {
    expect(validateDomainTag('loa-finn:audit:agent-lifecycle')).toEqual({ valid: true });
  });

  it('accepts valid 4-segment tag', () => {
    expect(validateDomainTag('loa-commons:audit:governed-credits:8-0-0')).toEqual({ valid: true });
  });

  it('rejects empty string', () => {
    const result = validateDomainTag('');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects fewer than 3 segments', () => {
    const result = validateDomainTag('loa:audit');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('3 colon-separated');
  });

  it('rejects empty segments', () => {
    const result = validateDomainTag('loa::audit:test');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('empty');
  });

  it('rejects uppercase segments', () => {
    const result = validateDomainTag('Loa:Audit:Test');
    expect(result.valid).toBe(false);
    expect(result.error).toContain('lowercase');
  });

  it('allows hyphens and underscores', () => {
    expect(validateDomainTag('loa-finn:audit_trail:agent-life_cycle')).toEqual({ valid: true });
  });
});

describe('computeChainBoundHash', () => {
  it('produces sha256 format', () => {
    const hash = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it('is deterministic', () => {
    const hash1 = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
    const hash2 = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
    expect(hash1).toBe(hash2);
  });

  it('differs from content-only hash', () => {
    const contentHash = computeAuditEntryHash(SAMPLE_ENTRY, DOMAIN_TAG);
    const chainBoundHash = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
    expect(chainBoundHash).not.toBe(contentHash);
  });

  it('varies with different previousHash', () => {
    const hash1 = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
    const fakeHash = 'sha256:' + 'a'.repeat(64);
    const hash2 = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, fakeHash);
    expect(hash1).not.toBe(hash2);
  });

  it('varies with different domain tag', () => {
    const hash1 = computeChainBoundHash(SAMPLE_ENTRY, 'loa-finn:audit:agent-lifecycle', GENESIS);
    const hash2 = computeChainBoundHash(SAMPLE_ENTRY, 'loa-dixie:audit:reputation', GENESIS);
    expect(hash1).not.toBe(hash2);
  });

  it('builds a verifiable chain', () => {
    const entry1: AuditEntryHashInput = {
      entry_id: '00000000-0000-0000-0000-000000000001',
      timestamp: '2026-02-28T12:00:00.000Z',
      event_type: 'commons.transition.executed',
    };
    const entry2: AuditEntryHashInput = {
      entry_id: '00000000-0000-0000-0000-000000000002',
      timestamp: '2026-02-28T12:01:00.000Z',
      event_type: 'commons.transition.executed',
    };

    const hash1 = computeChainBoundHash(entry1, DOMAIN_TAG, GENESIS);
    const hash2 = computeChainBoundHash(entry2, DOMAIN_TAG, hash1);

    // Both should be valid hashes
    expect(hash1).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(hash2).toMatch(/^sha256:[a-f0-9]{64}$/);
    // Chain-bound: hash2 depends on hash1
    expect(hash2).not.toBe(hash1);
  });

  describe('error handling', () => {
    it('throws ChainBoundHashError on empty domain tag', () => {
      expect(() => computeChainBoundHash(SAMPLE_ENTRY, '', GENESIS))
        .toThrow(ChainBoundHashError);
      try {
        computeChainBoundHash(SAMPLE_ENTRY, '', GENESIS);
      } catch (e) {
        expect((e as ChainBoundHashError).code).toBe('INVALID_DOMAIN_TAG');
      }
    });

    it('throws ChainBoundHashError on invalid previous hash format', () => {
      expect(() => computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, 'not-a-hash'))
        .toThrow(ChainBoundHashError);
      try {
        computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, 'not-a-hash');
      } catch (e) {
        expect((e as ChainBoundHashError).code).toBe('INVALID_PREVIOUS_HASH');
      }
    });

    it('throws on invalid domain tag segments', () => {
      expect(() => computeChainBoundHash(SAMPLE_ENTRY, 'a:b', GENESIS))
        .toThrow(ChainBoundHashError);
    });
  });

  describe('tamper detection', () => {
    it('detects payload modification', () => {
      const original = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
      const tampered = computeChainBoundHash(
        { ...SAMPLE_ENTRY, payload: { action: 'tampered' } },
        DOMAIN_TAG,
        GENESIS,
      );
      expect(original).not.toBe(tampered);
    });

    it('detects timestamp modification', () => {
      const original = computeChainBoundHash(SAMPLE_ENTRY, DOMAIN_TAG, GENESIS);
      const tampered = computeChainBoundHash(
        { ...SAMPLE_ENTRY, timestamp: '2026-02-28T13:00:00.000Z' },
        DOMAIN_TAG,
        GENESIS,
      );
      expect(original).not.toBe(tampered);
    });
  });
});
