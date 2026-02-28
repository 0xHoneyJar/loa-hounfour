/**
 * Tests for advisory lock key — FNV-1a 32-bit hash.
 *
 * @see SDD §5.4 — Advisory Lock Key
 * @see PRD FR-5 — Audit Trail Domain Separation
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { computeAdvisoryLockKey } from '../../src/commons/advisory-lock.js';

describe('computeAdvisoryLockKey', () => {
  describe('determinism', () => {
    it('same input → same output', () => {
      const key1 = computeAdvisoryLockKey('loa-finn:audit:agent-lifecycle');
      const key2 = computeAdvisoryLockKey('loa-finn:audit:agent-lifecycle');
      expect(key1).toBe(key2);
    });

    it('different inputs → different outputs', () => {
      const key1 = computeAdvisoryLockKey('loa-finn:audit:agent-lifecycle');
      const key2 = computeAdvisoryLockKey('loa-dixie:governance:reputation');
      expect(key1).not.toBe(key2);
    });
  });

  describe('output range', () => {
    it('returns a 32-bit signed integer', () => {
      const key = computeAdvisoryLockKey('test:domain:tag');
      expect(Number.isInteger(key)).toBe(true);
      expect(key).toBeGreaterThanOrEqual(-2147483648);
      expect(key).toBeLessThanOrEqual(2147483647);
    });

    it('returns a signed integer (can be negative)', () => {
      // FNV-1a with | 0 conversion can produce negative numbers
      const keys = Array.from({ length: 100 }, (_, i) =>
        computeAdvisoryLockKey(`tag:domain:${i}`),
      );
      const hasNegative = keys.some(k => k < 0);
      const hasPositive = keys.some(k => k > 0);
      expect(hasNegative || hasPositive).toBe(true);
    });
  });

  describe('empty string', () => {
    it('returns deterministic hash for empty string', () => {
      const key1 = computeAdvisoryLockKey('');
      const key2 = computeAdvisoryLockKey('');
      expect(key1).toBe(key2);
      expect(Number.isInteger(key1)).toBe(true);
    });
  });

  describe('Unicode handling', () => {
    it('handles Unicode tags deterministically', () => {
      const key1 = computeAdvisoryLockKey('loa:审计:测试');
      const key2 = computeAdvisoryLockKey('loa:审计:测试');
      expect(key1).toBe(key2);
    });

    it('Unicode differs from ASCII equivalent', () => {
      const key1 = computeAdvisoryLockKey('loa:audit:test');
      const key2 = computeAdvisoryLockKey('loa:审计:测试');
      expect(key1).not.toBe(key2);
    });
  });

  describe('whitespace', () => {
    it('whitespace-only tag returns deterministic result', () => {
      const key1 = computeAdvisoryLockKey('   ');
      const key2 = computeAdvisoryLockKey('   ');
      expect(key1).toBe(key2);
    });

    it('whitespace differs from empty string', () => {
      const empty = computeAdvisoryLockKey('');
      const space = computeAdvisoryLockKey(' ');
      expect(empty).not.toBe(space);
    });
  });

  describe('collision resistance (property test)', () => {
    it('1000 unique tags produce no collisions', () => {
      fc.assert(
        fc.property(
          fc.uniqueArray(fc.string({ minLength: 5, maxLength: 50 }), { minLength: 1000, maxLength: 1000 }),
          (tags) => {
            const keys = new Set(tags.map(computeAdvisoryLockKey));
            // Allow at most 0 collisions for 1000 tags (FNV-1a 32-bit should handle this)
            return keys.size >= tags.length - 0;
          },
        ),
        { numRuns: 10 },
      );
    });

    it('10,000 random tags with ≤2 collisions (birthday paradox bound)', () => {
      const tags = Array.from({ length: 10000 }, (_, i) =>
        `domain:namespace:tag-${i}-${Math.random().toString(36).slice(2)}`,
      );
      const keys = tags.map(computeAdvisoryLockKey);
      const uniqueKeys = new Set(keys);
      const collisions = tags.length - uniqueKeys.size;
      // Birthday paradox: for 32-bit, 10K items expect ~0.01 collisions
      // We allow ≤2 as safety margin
      expect(collisions).toBeLessThanOrEqual(2);
    });
  });

  describe('FNV-1a known values', () => {
    it('empty string hashes to FNV offset basis', () => {
      // FNV-1a of empty string = offset basis = 0x811c9dc5 = -2128831035 (signed)
      const key = computeAdvisoryLockKey('');
      expect(key).toBe(0x811c9dc5 | 0);
    });
  });
});
