/**
 * Verifies the CT-01 hybrid carve-out: `safeCanonicalize` and its companion
 * exports (`SAFE_CANONICALIZE_DEFAULT_MAX_BYTES`, `CanonicalizeKeyCollisionError`,
 * `SafeCanonicalizeOptions` type) resolve from the public integrity barrel,
 * and the runtime behavior matches the source-of-truth helper.
 *
 * @see src/integrity/index.ts
 * @see docs/architecture/canonicalization-spec-v8.6.md
 * @since v8.6.0 (PR-A3.0)
 */
import { describe, it, expect } from 'vitest';
import {
  safeCanonicalize,
  SAFE_CANONICALIZE_DEFAULT_MAX_BYTES,
  CanonicalizeKeyCollisionError,
} from '../../src/integrity/index.js';
import { safeCanonicalize as safeCanonicalizeFromSource } from '../../src/utilities/safe-canonicalize.js';

describe('integrity barrel — CT-01 hybrid re-export', () => {
  it('exports safeCanonicalize as a callable function', () => {
    expect(typeof safeCanonicalize).toBe('function');
  });

  it('exports SAFE_CANONICALIZE_DEFAULT_MAX_BYTES as a number constant', () => {
    expect(typeof SAFE_CANONICALIZE_DEFAULT_MAX_BYTES).toBe('number');
    expect(SAFE_CANONICALIZE_DEFAULT_MAX_BYTES).toBe(100_000);
  });

  it('exports CanonicalizeKeyCollisionError as a constructable class', () => {
    expect(typeof CanonicalizeKeyCollisionError).toBe('function');
    const err = new CanonicalizeKeyCollisionError('test', ['a', 'b']);
    expect(err).toBeInstanceOf(CanonicalizeKeyCollisionError);
    expect(err).toBeInstanceOf(Error);
  });

  it('barrel-exported safeCanonicalize is the same identity as the source helper', () => {
    expect(safeCanonicalize).toBe(safeCanonicalizeFromSource);
  });

  it('barrel-exported safeCanonicalize produces deterministic canonical output', () => {
    const a = safeCanonicalize({ b: 2, a: 1 });
    const b = safeCanonicalize({ a: 1, b: 2 });
    expect(a).toBe(b);
    expect(a).toBe('{"a":1,"b":2}');
  });

  it('barrel-exported safeCanonicalize NFC-normalizes string values', () => {
    // U+00E9 (precomposed) vs U+0065 U+0301 (decomposed) — same visible char.
    const precomposed = safeCanonicalize({ name: 'é' });
    const decomposed = safeCanonicalize({ name: 'é' });
    expect(precomposed).toBe(decomposed);
  });
});
