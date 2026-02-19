/**
 * Tests for JWS signature utilities.
 *
 * SDD §3.5 — JWS compact serialization, RFC 8785 JCS canonicalization.
 * IMP-003 — Negative test vectors: algorithm confusion, key-type mismatch,
 *   malformed tokens, alg:none rejection.
 * IMP-004 — SignatureVerificationResult discriminated union.
 */
import { describe, it, expect } from 'vitest';
import * as jose from 'jose';
import {
  canonicalizeProviderSpec,
  verifyProviderSignature,
  type SignatureVerificationResult,
  type KeyResolver,
} from '../../src/utilities/signature.js';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function generateES256KeyPair() {
  return jose.generateKeyPair('ES256');
}

async function generateEdDSAKeyPair() {
  return jose.generateKeyPair('EdDSA');
}

async function signSpec(
  spec: Record<string, unknown>,
  privateKey: jose.KeyLike,
  alg: string,
  kid?: string,
): Promise<string> {
  const canonical = canonicalizeProviderSpec(spec);
  const header: jose.JWSHeaderParameters = { alg };
  if (kid) header.kid = kid;
  const jws = await new jose.CompactSign(new TextEncoder().encode(canonical))
    .setProtectedHeader(header)
    .sign(privateKey);
  return jws;
}

const sampleSpec = {
  spec_id: '550e8400-e29b-41d4-a716-446655440000',
  provider: 'test-provider',
  display_name: 'Test Provider',
  version: '1.0.0',
  contract_version: '5.2.0',
  models: [{ model_id: 'test-model', status: 'active' }],
  published_at: '2026-01-01T00:00:00Z',
  conformance_level: 'self_declared',
};

// ---------------------------------------------------------------------------
// canonicalizeProviderSpec
// ---------------------------------------------------------------------------

describe('canonicalizeProviderSpec', () => {
  it('removes signature field from output', () => {
    const spec = { ...sampleSpec, signature: 'some.jws.token' };
    const canonical = canonicalizeProviderSpec(spec);
    expect(canonical).not.toContain('"signature"');
  });

  it('produces deterministic output regardless of key order', () => {
    const spec1 = { a: 1, b: 2, c: 3 };
    const spec2 = { c: 3, a: 1, b: 2 };
    expect(canonicalizeProviderSpec(spec1)).toBe(canonicalizeProviderSpec(spec2));
  });

  it('handles nested objects', () => {
    const spec = { outer: { z: 1, a: 2 }, name: 'test' };
    const canonical = canonicalizeProviderSpec(spec);
    expect(canonical).toBe('{"name":"test","outer":{"a":2,"z":1}}');
  });

  it('handles empty object', () => {
    expect(canonicalizeProviderSpec({})).toBe('{}');
  });

  it('preserves all non-signature fields', () => {
    const canonical = canonicalizeProviderSpec(sampleSpec);
    expect(canonical).toContain('"spec_id"');
    expect(canonical).toContain('"provider"');
    expect(canonical).toContain('"display_name"');
  });
});

// ---------------------------------------------------------------------------
// verifyProviderSignature — valid signatures
// ---------------------------------------------------------------------------

describe('verifyProviderSignature', () => {
  describe('valid signatures', () => {
    it('verifies ES256 signature', async () => {
      const { publicKey, privateKey } = await generateES256KeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'ES256', 'key-1');
      const signedSpec = { ...sampleSpec, signature: jws };

      const resolver: KeyResolver = async () => publicKey;
      const result = await verifyProviderSignature(signedSpec, resolver);

      expect(result.verified).toBe(true);
      if (result.verified === true) {
        expect(result.algorithm).toBe('ES256');
        expect(result.key_id).toBe('key-1');
      }
    });

    it('verifies EdDSA signature', async () => {
      const { publicKey, privateKey } = await generateEdDSAKeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'EdDSA');
      const signedSpec = { ...sampleSpec, signature: jws };

      const resolver: KeyResolver = async () => publicKey;
      const result = await verifyProviderSignature(signedSpec, resolver);

      expect(result.verified).toBe(true);
      if (result.verified === true) {
        expect(result.algorithm).toBe('EdDSA');
      }
    });

    it('returns key_id when present in JWS header', async () => {
      const { publicKey, privateKey } = await generateES256KeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'ES256', 'my-key-id');
      const signedSpec = { ...sampleSpec, signature: jws };

      const resolver: KeyResolver = async () => publicKey;
      const result = await verifyProviderSignature(signedSpec, resolver);

      expect(result.verified).toBe(true);
      if (result.verified === true) {
        expect(result.key_id).toBe('my-key-id');
      }
    });

    it('omits key_id when not in JWS header', async () => {
      const { publicKey, privateKey } = await generateES256KeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'ES256');
      const signedSpec = { ...sampleSpec, signature: jws };

      const resolver: KeyResolver = async () => publicKey;
      const result = await verifyProviderSignature(signedSpec, resolver);

      expect(result.verified).toBe(true);
      if (result.verified === true) {
        expect(result.key_id).toBeUndefined();
      }
    });

    it('verifies same spec signed twice produces same canonical', async () => {
      const { publicKey, privateKey } = await generateES256KeyPair();

      const jws1 = await signSpec(sampleSpec, privateKey, 'ES256');
      const jws2 = await signSpec(sampleSpec, privateKey, 'ES256');

      // Different signatures (ECDSA is non-deterministic), but both verify
      expect(jws1).not.toBe(jws2);

      const resolver: KeyResolver = async () => publicKey;
      const r1 = await verifyProviderSignature({ ...sampleSpec, signature: jws1 }, resolver);
      const r2 = await verifyProviderSignature({ ...sampleSpec, signature: jws2 }, resolver);
      expect(r1.verified).toBe(true);
      expect(r2.verified).toBe(true);
    });
  });

  // ---------------------------------------------------------------------------
  // Missing/empty signatures — unverifiable
  // ---------------------------------------------------------------------------

  describe('unverifiable cases', () => {
    it('returns unverifiable for missing signature', async () => {
      const result = await verifyProviderSignature(sampleSpec, null);
      expect(result.verified).toBe('unverifiable');
      if (result.verified === 'unverifiable') {
        expect(result.reason).toContain('Missing');
      }
    });

    it('returns unverifiable for empty signature', async () => {
      const result = await verifyProviderSignature({ ...sampleSpec, signature: '' }, null);
      expect(result.verified).toBe('unverifiable');
    });

    it('returns unverifiable when no key resolver', async () => {
      const { privateKey } = await generateES256KeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'ES256');
      const signedSpec = { ...sampleSpec, signature: jws };

      const result = await verifyProviderSignature(signedSpec, null);
      expect(result.verified).toBe('unverifiable');
      if (result.verified === 'unverifiable') {
        expect(result.reason).toContain('No key resolver');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // IMP-003 — Negative test vectors
  // ---------------------------------------------------------------------------

  describe('negative test vectors (IMP-003)', () => {
    it('rejects alg: "none"', async () => {
      // Craft a JWS with alg: none with a non-empty dummy signature segment
      const header = btoa(JSON.stringify({ alg: 'none' })).replace(/=/g, '');
      const payload = btoa('{}').replace(/=/g, '');
      const fakeJws = `${header}.${payload}.nosig`;

      const resolver: KeyResolver = async () => { throw new Error('should not be called'); };
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: fakeJws },
        resolver,
      );
      expect(result.verified).toBe(false);
      if (result.verified === false) {
        expect(result.reason).toContain('none');
      }
    });

    it('rejects RS256 algorithm (algorithm confusion)', async () => {
      const { privateKey } = await jose.generateKeyPair('RS256');
      const canonical = canonicalizeProviderSpec(sampleSpec);
      const jws = await new jose.CompactSign(new TextEncoder().encode(canonical))
        .setProtectedHeader({ alg: 'RS256' })
        .sign(privateKey);

      const resolver: KeyResolver = async () => privateKey;
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: jws },
        resolver,
      );
      expect(result.verified).toBe(false);
      if (result.verified === false) {
        expect(result.reason).toContain('RS256');
        expect(result.reason).toContain('not allowed');
      }
    });

    it('rejects HS256 algorithm', async () => {
      const secret = new TextEncoder().encode('super-secret-key-must-be-256-bits-at-minimum!');
      const canonical = canonicalizeProviderSpec(sampleSpec);
      const jws = await new jose.CompactSign(new TextEncoder().encode(canonical))
        .setProtectedHeader({ alg: 'HS256' })
        .sign(secret);

      const resolver: KeyResolver = async () => secret;
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: jws },
        resolver,
      );
      expect(result.verified).toBe(false);
      if (result.verified === false) {
        expect(result.reason).toContain('HS256');
      }
    });

    it('rejects key-type mismatch (EdDSA key for ES256 algorithm)', async () => {
      const es256 = await generateES256KeyPair();
      const eddsa = await generateEdDSAKeyPair();

      const jws = await signSpec(sampleSpec, es256.privateKey, 'ES256');
      // Use wrong key type for verification
      const resolver: KeyResolver = async () => eddsa.publicKey;
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: jws },
        resolver,
      );
      expect(result.verified).toBe(false);
    });

    it('rejects malformed compact serialization: extra segments', async () => {
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: 'a.b.c.d' },
        async () => { throw new Error('should not be called'); },
      );
      expect(result.verified).toBe(false);
      if (result.verified === false) {
        expect(result.reason).toContain('Malformed');
      }
    });

    it('rejects malformed compact serialization: empty segments', async () => {
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: 'a..c' },
        async () => { throw new Error('should not be called'); },
      );
      expect(result.verified).toBe(false);
    });

    it('rejects malformed compact serialization: single segment', async () => {
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: 'not-a-jws' },
        async () => { throw new Error('should not be called'); },
      );
      expect(result.verified).toBe(false);
    });

    it('handles key resolution failure gracefully', async () => {
      const { privateKey } = await generateES256KeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'ES256');

      const resolver: KeyResolver = async () => { throw new Error('Key store unavailable'); };
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: jws },
        resolver,
      );
      expect(result.verified).toBe(false);
      if (result.verified === false) {
        expect(result.reason).toContain('Key resolution failed');
      }
    });

    it('detects tampered spec (payload mismatch)', async () => {
      const { publicKey, privateKey } = await generateES256KeyPair();
      const jws = await signSpec(sampleSpec, privateKey, 'ES256');
      const tamperedSpec = { ...sampleSpec, signature: jws, display_name: 'TAMPERED' };

      const resolver: KeyResolver = async () => publicKey;
      const result = await verifyProviderSignature(tamperedSpec, resolver);
      expect(result.verified).toBe(false);
      if (result.verified === false) {
        expect(result.reason).toContain('canonical');
      }
    });
  });

  // ---------------------------------------------------------------------------
  // Never throws
  // ---------------------------------------------------------------------------

  describe('never throws', () => {
    it('returns result for completely invalid input', async () => {
      const result = await verifyProviderSignature(
        { signature: 12345 } as unknown as Record<string, unknown>,
        null,
      );
      expect(result.verified).toBe('unverifiable');
    });

    it('returns result for null signature', async () => {
      const result = await verifyProviderSignature(
        { ...sampleSpec, signature: null },
        null,
      );
      expect(result.verified).toBe('unverifiable');
    });
  });
});
