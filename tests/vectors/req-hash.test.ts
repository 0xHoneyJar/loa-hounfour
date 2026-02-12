/**
 * req_hash conformance test vectors.
 *
 * 7 canonical vectors + 3 security vectors per SDD 6.1 and Task 1.6.
 */
import { describe, it, expect } from 'vitest';
import { gzipSync, deflateSync, brotliCompressSync } from 'node:zlib';
import {
  computeReqHash,
  verifyReqHash,
  decompressBody,
  DecompressionError,
  EMPTY_BODY_HASH,
} from '../../src/integrity/req-hash.js';

describe('req_hash conformance vectors', () => {
  // Vector 1: Plain body (no encoding)
  it('V1: plain JSON body', () => {
    const body = Buffer.from('{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}');
    const hash = computeReqHash(body);
    expect(hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(verifyReqHash(body, hash)).toBe(true);
  });

  // Vector 2: gzip-compressed body
  it('V2: gzip compressed body', () => {
    const plain = Buffer.from('{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}');
    const compressed = gzipSync(plain);
    const hashFromPlain = computeReqHash(plain);
    const hashFromGzip = computeReqHash(compressed, 'gzip');
    expect(hashFromGzip).toBe(hashFromPlain);
  });

  // Vector 3: brotli-compressed body
  it('V3: brotli compressed body', () => {
    const plain = Buffer.from('{"model":"gpt-4o","messages":[{"role":"user","content":"hello"}]}');
    const compressed = brotliCompressSync(plain);
    const hashFromPlain = computeReqHash(plain);
    const hashFromBr = computeReqHash(compressed, 'br');
    expect(hashFromBr).toBe(hashFromPlain);
  });

  // Vector 4: chunked (identity encoding, body as-is)
  it('V4: identity encoding (pass-through)', () => {
    const body = Buffer.from('{"chunked":"data"}');
    const hash1 = computeReqHash(body);
    const hash2 = computeReqHash(body, 'identity');
    expect(hash1).toBe(hash2);
  });

  // Vector 5: trailing newline
  it('V5: trailing newline matters', () => {
    const bodyNoNewline = Buffer.from('{"key":"value"}');
    const bodyWithNewline = Buffer.from('{"key":"value"}\n');
    const hash1 = computeReqHash(bodyNoNewline);
    const hash2 = computeReqHash(bodyWithNewline);
    expect(hash1).not.toBe(hash2); // Different bytes = different hash
  });

  // Vector 6: double-gzip (2 encoding layers)
  it('V6: double-gzip (2 layers)', () => {
    const plain = Buffer.from('{"double":"gzip"}');
    const once = gzipSync(plain);
    const twice = gzipSync(once);
    const hashFromPlain = computeReqHash(plain);
    const hashFromDouble = computeReqHash(twice, 'gzip, gzip');
    expect(hashFromDouble).toBe(hashFromPlain);
  });

  // Vector 7: UTF-8 BOM
  it('V7: UTF-8 BOM preserved in hash', () => {
    const bom = Buffer.from([0xef, 0xbb, 0xbf]);
    const body = Buffer.from('{"key":"value"}');
    const withBom = Buffer.concat([bom, body]);
    const hashNoBom = computeReqHash(body);
    const hashWithBom = computeReqHash(withBom);
    expect(hashNoBom).not.toBe(hashWithBom); // BOM bytes included in hash
  });

  // Empty body
  it('empty body produces known hash', () => {
    const hash = computeReqHash(Buffer.alloc(0));
    expect(hash).toBe(EMPTY_BODY_HASH);
  });
});

describe('req_hash security vectors', () => {
  // Security Vector 1: zip bomb
  it('S1: zip bomb rejected (high compression ratio)', () => {
    // Create a highly compressible payload (1MB of zeros)
    const payload = Buffer.alloc(1024 * 1024, 0);
    const compressed = gzipSync(payload);
    // With small max body, ratio check triggers
    expect(() =>
      computeReqHash(compressed, 'gzip', {
        maxBodyBytes: 512,
        maxCompressionRatio: 10,
      }),
    ).toThrow(DecompressionError);
  });

  // Security Vector 2: unknown encoding rejected
  it('S2: unknown encoding rejected', () => {
    const body = Buffer.from('{"key":"value"}');
    expect(() => computeReqHash(body, 'lz4')).toThrow(DecompressionError);
    expect(() => computeReqHash(body, 'zstd')).toThrow(DecompressionError);
  });

  // Security Vector 3: triple-nested encoding rejected
  it('S3: triple-nested encoding rejected (max depth 2)', () => {
    const body = Buffer.from('test');
    expect(() => computeReqHash(body, 'gzip, gzip, gzip')).toThrow(DecompressionError);
  });
});

describe('verifyReqHash constant-time comparison', () => {
  it('returns true for matching hash', () => {
    const body = Buffer.from('test body');
    const hash = computeReqHash(body);
    expect(verifyReqHash(body, hash)).toBe(true);
  });

  it('returns false for non-matching hash', () => {
    const body = Buffer.from('test body');
    expect(verifyReqHash(body, 'sha256:0000000000000000000000000000000000000000000000000000000000000000')).toBe(false);
  });

  it('returns false for different length hash', () => {
    const body = Buffer.from('test');
    expect(verifyReqHash(body, 'sha256:short')).toBe(false);
  });
});
