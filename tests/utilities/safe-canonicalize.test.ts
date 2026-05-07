import { describe, it, expect } from 'vitest';
import {
  safeCanonicalize,
  CanonicalizeSizeError,
  CanonicalizeNFCError,
  CanonicalizeKeyCollisionError,
  SAFE_CANONICALIZE_DEFAULT_MAX_BYTES,
} from '../../src/utilities/safe-canonicalize.js';

describe('safeCanonicalize — RFC 8785 conformance', () => {
  it('produces lex-sorted keys', () => {
    const out = safeCanonicalize({ b: 1, a: 2, c: 3 });
    expect(out).toBe('{"a":2,"b":1,"c":3}');
  });

  it('emits no whitespace', () => {
    const out = safeCanonicalize({ nested: { a: 1, b: [2, 3] } });
    expect(out).toBe('{"nested":{"a":1,"b":[2,3]}}');
  });

  it('serializes integers without a trailing .0', () => {
    expect(safeCanonicalize(42)).toBe('42');
    expect(safeCanonicalize({ n: 100 })).toBe('{"n":100}');
  });

  it('serializes booleans and null', () => {
    expect(safeCanonicalize({ a: true, b: false, c: null })).toBe(
      '{"a":true,"b":false,"c":null}',
    );
  });
});

describe('safeCanonicalize — NFC normalization (G4)', () => {
  // 'café' as NFC (single precomposed é, U+00E9) vs NFD (e + U+0301)
  const nfc = 'café'; // café
  const nfd = 'café'; // cafe + combining acute

  it('NFC and NFD inputs produce byte-identical canonical output', () => {
    expect(nfc).not.toBe(nfd); // sanity: distinct strings
    const a = safeCanonicalize({ name: nfc });
    const b = safeCanonicalize({ name: nfd });
    expect(a).toBe(b);
  });

  it('normalizes string values nested in arrays and objects', () => {
    const a = safeCanonicalize({ tags: [nfc, nfc], meta: { x: nfc } });
    const b = safeCanonicalize({ tags: [nfd, nfd], meta: { x: nfd } });
    expect(a).toBe(b);
  });

  it('normalizes object keys (combining-mark keys produce identical canonical form)', () => {
    const a = safeCanonicalize({ [nfc]: 1 });
    const b = safeCanonicalize({ [nfd]: 1 });
    expect(a).toBe(b);
  });

  it('does not mutate the input payload', () => {
    const input = { name: nfd };
    const before = input.name;
    safeCanonicalize(input);
    expect(input.name).toBe(before);
  });
});

describe('safeCanonicalize — size cap (G3)', () => {
  it('default cap is 100 KB', () => {
    expect(SAFE_CANONICALIZE_DEFAULT_MAX_BYTES).toBe(100_000);
  });

  it('throws CanonicalizeSizeError when canonical output exceeds default cap', () => {
    // ~150 KB of 'a' characters in a single string field. Canonicalized
    // form is `{"x":"aaaa...aaaa"}` plus quoting overhead.
    const big = 'a'.repeat(150_000);
    expect(() => safeCanonicalize({ x: big })).toThrowError(CanonicalizeSizeError);
  });

  it('error carries the actual serialized byte count and configured cap', () => {
    const big = 'a'.repeat(150_000);
    let caught: unknown;
    try {
      safeCanonicalize({ x: big });
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(CanonicalizeSizeError);
    const err = caught as CanonicalizeSizeError;
    expect(err.code).toBe('CANONICALIZE_SIZE_EXCEEDED');
    expect(err.maxBytes).toBe(100_000);
    expect(err.serializedBytes).toBeGreaterThan(150_000);
  });

  it('explicit maxBytes override accepts larger payloads', () => {
    const big = 'a'.repeat(150_000);
    const out = safeCanonicalize({ x: big }, { maxBytes: 1_000_000 });
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(150_000);
  });

  it('rejects payloads exactly at maxBytes + 1', () => {
    // Canonical form of `{"x":"<n a's>"}` = `{"x":"` (6) + n + `"}` (2) = n + 8 bytes.
    const cap = 100;
    const ok = safeCanonicalize({ x: 'a'.repeat(cap - 8) }, { maxBytes: cap });
    expect(Buffer.byteLength(ok, 'utf8')).toBe(cap);
    // One more byte of payload should push the canonical to cap+1 and throw.
    expect(() => safeCanonicalize({ x: 'a'.repeat(cap - 7) }, { maxBytes: cap })).toThrowError(
      CanonicalizeSizeError,
    );
  });
});

describe('safeCanonicalize — Type.Unknown / mixed payload walk (OQ-S4)', () => {
  it('walks deeply nested mixed structures', () => {
    const payload = {
      a: { b: { c: { d: { e: 'leaf' } } } },
      list: [1, 'two', { three: 3, four: [true, null, false] }],
    };
    const out = safeCanonicalize(payload);
    // Smoke: runs to completion, deterministic output.
    const out2 = safeCanonicalize(payload);
    expect(out).toBe(out2);
  });

  it('passes through non-string leaves unchanged (numbers, booleans, null)', () => {
    expect(safeCanonicalize({ n: 42, b: true, z: null })).toBe('{"b":true,"n":42,"z":null}');
  });

  it('throws TypeError for structurally-unrepresentable values (undefined leaf)', () => {
    expect(() => safeCanonicalize(undefined)).toThrowError(TypeError);
  });
});

describe('safeCanonicalize — error types', () => {
  it('CanonicalizeSizeError exposes a stable error name and code', () => {
    const big = 'a'.repeat(150_000);
    try {
      safeCanonicalize({ x: big });
    } catch (e) {
      expect((e as Error).name).toBe('CanonicalizeSizeError');
      expect((e as CanonicalizeSizeError).code).toBe('CANONICALIZE_SIZE_EXCEEDED');
    }
  });

  it('CanonicalizeNFCError has a stable code (sanity check)', () => {
    const err = new CanonicalizeNFCError('test');
    expect(err.code).toBe('CANONICALIZE_NFC_FAILED');
    expect(err.name).toBe('CanonicalizeNFCError');
  });

  it('CanonicalizeKeyCollisionError has a stable code', () => {
    const err = new CanonicalizeKeyCollisionError('café', ['café', 'café']);
    expect(err.code).toBe('CANONICALIZE_KEY_COLLISION');
    expect(err.name).toBe('CanonicalizeKeyCollisionError');
    expect(err.normalizedKey).toBe('café');
    expect(err.originalKeys).toEqual(['café', 'café']);
  });
});

describe('safeCanonicalize — NFC key-collision rejection (Issue #76 F5)', () => {
  // 'café' as NFC (precomposed é, U+00E9) vs NFD (e + U+0301).
  // Both fold to the same NFC string; an object containing BOTH as
  // distinct keys is structurally ambiguous after canonicalization.
  // Use explicit codepoint escapes so the editor / source-file encoding
  // does not silently fold the two forms into the same bytes.
  const nfc = 'café';            // precomposed é
  const nfd = 'café';           // e + combining acute

  it('throws CanonicalizeKeyCollisionError when distinct input keys NFC-fold identically', () => {
    expect(nfc).not.toBe(nfd); // sanity: distinct input strings
    expect(() => safeCanonicalize({ [nfc]: 1, [nfd]: 2 })).toThrow(
      CanonicalizeKeyCollisionError,
    );
  });

  it('error carries the normalized form and both original input keys', () => {
    try {
      safeCanonicalize({ [nfc]: 1, [nfd]: 2 });
    } catch (e) {
      expect(e).toBeInstanceOf(CanonicalizeKeyCollisionError);
      const err = e as CanonicalizeKeyCollisionError;
      expect(err.normalizedKey.normalize('NFC')).toBe(err.normalizedKey);
      // Both original keys must appear in the error context. The order
      // matches insertion order: nfc first, nfd second.
      expect(err.originalKeys).toEqual([nfc, nfd]);
    }
  });

  it('detects collisions in deeply-nested objects', () => {
    expect(() =>
      safeCanonicalize({ outer: { [nfc]: 1, [nfd]: 2 } }),
    ).toThrow(CanonicalizeKeyCollisionError);
  });

  it('does NOT throw when the same key is present only once (idempotence)', () => {
    expect(() => safeCanonicalize({ [nfc]: 1 })).not.toThrow();
    expect(() => safeCanonicalize({ [nfd]: 1 })).not.toThrow();
  });

  it('does NOT throw when collision-prone keys live in different objects', () => {
    expect(() =>
      safeCanonicalize({ first: { [nfc]: 1 }, second: { [nfd]: 2 } }),
    ).not.toThrow();
  });

  it('preserves the existing single-key NFC-folding contract', () => {
    // The pre-existing behavior — that {nfc:1} and {nfd:1} produce the
    // same canonical bytes — MUST continue to hold. Collision detection
    // only fires when both forms appear in the same object.
    expect(safeCanonicalize({ [nfc]: 1 })).toBe(safeCanonicalize({ [nfd]: 1 }));
  });
});
