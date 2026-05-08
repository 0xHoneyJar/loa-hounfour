/**
 * PR-A3.4 (FR-B2 / NFR-4) — Tests for `canonical_size_cap` LOCAL builtin.
 *
 * Covers both the standalone evaluator (structured diagnostic surface)
 * and the constraint-DSL wrapper (boolean surface).
 *
 * @see src/constraints/builtins/canonical-size-cap.ts
 */
import { describe, it, expect } from 'vitest';
import {
  evaluateCanonicalSizeCap,
} from '../../src/constraints/builtins/canonical-size-cap.js';
import { canonicalByteLength } from '../../src/utilities/canonical-size-cap.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('evaluateCanonicalSizeCap (standalone)', () => {
  describe('Happy path', () => {
    it('empty object well within cap', () => {
      const result = evaluateCanonicalSizeCap({}, 4096);
      expect(result.valid).toBe(true);
      expect(result.diagnostic).toBeUndefined();
    });

    it('small payload with cap=4096', () => {
      const result = evaluateCanonicalSizeCap({ foo: 'bar', n: 42 }, 4096);
      expect(result.valid).toBe(true);
    });

    it('boundary case: payload at exactly the cap (≤ check, not <)', () => {
      // Construct a payload whose canonical byte length is exactly N.
      const padding = 'x'.repeat(80);
      const payload = { padding };
      const len = canonicalByteLength(payload);
      // The cap = exact length should pass.
      const result = evaluateCanonicalSizeCap(payload, len);
      expect(result.valid).toBe(true);
    });

    it('cap=0 with empty array fails (canonical "[]" is 2 bytes > 0)', () => {
      const result = evaluateCanonicalSizeCap([], 0);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_EXCEEDED');
    });
  });

  describe('CANONICAL_SIZE_CAP_EXCEEDED', () => {
    it('fires when payload exceeds cap by 1 byte', () => {
      const padding = 'x'.repeat(80);
      const payload = { padding };
      const len = canonicalByteLength(payload);
      const result = evaluateCanonicalSizeCap(payload, len - 1);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_EXCEEDED');
      expect(result.diagnostic?.actual_bytes).toBe(len);
      expect(result.diagnostic?.cap_bytes).toBe(len - 1);
    });

    it('fires for large payload at default 4096-byte cap', () => {
      // Build a payload that's ~5 KB canonical.
      const big = 'x'.repeat(5000);
      const result = evaluateCanonicalSizeCap({ big }, 4096);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_EXCEEDED');
      expect(result.diagnostic?.actual_bytes).toBeGreaterThan(4096);
    });
  });

  describe('CANONICAL_SIZE_CAP_INVALID_INPUT', () => {
    it('rejects negative byte_cap', () => {
      const result = evaluateCanonicalSizeCap({}, -1);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_INVALID_INPUT');
    });

    it('rejects non-integer byte_cap', () => {
      const result = evaluateCanonicalSizeCap({}, 3.14);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_INVALID_INPUT');
    });

    it('rejects NaN byte_cap', () => {
      const result = evaluateCanonicalSizeCap({}, NaN);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_INVALID_INPUT');
    });

    it('rejects Infinity byte_cap', () => {
      const result = evaluateCanonicalSizeCap({}, Infinity);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_INVALID_INPUT');
    });

    it('rejects non-number byte_cap', () => {
      const result = evaluateCanonicalSizeCap({}, '4096' as unknown as number);
      expect(result.valid).toBe(false);
      expect(result.diagnostic?.code).toBe('CANONICAL_SIZE_CAP_INVALID_INPUT');
    });
  });
});

describe('canonical_size_cap (constraint-DSL wrapper)', () => {
  it('returns true for small payload under cap', () => {
    const data = { value: { foo: 'bar' } };
    const result = evaluateConstraint(data, 'canonical_size_cap(value, 4096)');
    expect(result).toBe(true);
  });

  it('returns false when payload exceeds cap', () => {
    const data = { value: { big: 'x'.repeat(5000) } };
    const result = evaluateConstraint(data, 'canonical_size_cap(value, 4096)');
    expect(result).toBe(false);
  });
});
