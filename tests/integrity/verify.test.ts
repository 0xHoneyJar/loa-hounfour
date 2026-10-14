/**
 * Unit + property tests for the FR-C2 reference verifier functions
 * (src/integrity/verify.ts). Every reason code and branch is exercised;
 * the conformance suite under vectors/verifier/ is covered separately by
 * verifier-vectors.test.ts.
 *
 * @since v8.8.0 (FR-C2)
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import fc from 'fast-check';
import {
  verifyEnvelopeSignatureEd25519,
  lookupRevocation,
  type RevocationLookupResult,
} from '../../src/integrity/index.js';
import * as RootBarrel from '../../src/index.js';
import { safeCanonicalize } from '../../src/utilities/safe-canonicalize.js';
import type { RevocationList } from '../../src/canonical/revocation-list.js';

const subtle = globalThis.crypto.subtle;

function b64url(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

async function newKey(): Promise<{ priv: CryptoKey; raw: Uint8Array; pub: string }> {
  const kp = (await subtle.generateKey({ name: 'Ed25519' }, true, ['sign', 'verify'])) as CryptoKeyPair;
  const raw = new Uint8Array(await subtle.exportKey('raw', kp.publicKey));
  return { priv: kp.privateKey, raw, pub: `ed25519-pub:${b64url(raw)}` };
}

async function signEnvelope(
  priv: CryptoKey,
  unsigned: Record<string, unknown>,
): Promise<string> {
  const bytes = new TextEncoder().encode(safeCanonicalize(unsigned));
  return `ed25519:${b64url(new Uint8Array(await subtle.sign({ name: 'Ed25519' }, priv, bytes)))}`;
}

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('barrel reachability', () => {
  it('is exported from the integrity barrel and the root barrel', () => {
    expect(typeof verifyEnvelopeSignatureEd25519).toBe('function');
    expect(typeof lookupRevocation).toBe('function');
    expect(RootBarrel.verifyEnvelopeSignatureEd25519).toBe(verifyEnvelopeSignatureEd25519);
    expect(RootBarrel.lookupRevocation).toBe(lookupRevocation);
  });
});

describe('verifyEnvelopeSignatureEd25519', () => {
  it('verifies a valid signature with string and raw-byte public keys', async () => {
    const k = await newKey();
    const unsigned = { kind: 'x', n: 1, body: { s: 'hello' } };
    const env = { ...unsigned, signature: await signEnvelope(k.priv, unsigned) };
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({ verified: true });
    expect(await verifyEnvelopeSignatureEd25519(env, k.raw)).toEqual({ verified: true });
  });

  it('omits quorum_signatures by default and signatureField always', async () => {
    const k = await newKey();
    const unsigned = { kind: 'x' };
    const sig = await signEnvelope(k.priv, unsigned);
    const env = { ...unsigned, signature: sig, quorum_signatures: [{ any: 'thing' }] };
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({ verified: true });
    // omitFields that forgets the signature field still omits it.
    const env2 = { ...unsigned, sig2: sig, extra: 1 };
    expect(
      await verifyEnvelopeSignatureEd25519(env2, k.pub, { signatureField: 'sig2', omitFields: ['extra'] }),
    ).toEqual({ verified: true });
    // Explicit empty omit list: quorum_signatures is then signed over, so mismatch.
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub, { omitFields: [] })).toEqual({
      verified: false,
      reason: 'signature_mismatch',
    });
  });

  it('signs the NFC form: NFD and NFC wire strings verify identically', async () => {
    const k = await newKey();
    const sig = await signEnvelope(k.priv, { s: 'caf\u00e9' });
    expect(await verifyEnvelopeSignatureEd25519({ s: 'cafe\u0301', signature: sig }, k.pub)).toEqual({ verified: true });
    expect(await verifyEnvelopeSignatureEd25519({ s: 'caf\u00e9', signature: sig }, k.pub)).toEqual({ verified: true });
  });

  it.each([
    ['null', null],
    ['array', []],
    ['string', 'x'],
  ])('envelope_not_object for %s', async (_n, env) => {
    const k = await newKey();
    expect(await verifyEnvelopeSignatureEd25519(env as never, k.pub)).toEqual({
      verified: false,
      reason: 'envelope_not_object',
    });
  });

  it.each([
    [{ signatureField: '' }],
    [{ signatureField: 5 as unknown as string }],
    [{ omitFields: 'signature' as unknown as string[] }],
    [{ omitFields: [1] as unknown as string[] }],
  ])('options_invalid for %j', async (opts) => {
    const k = await newKey();
    expect(await verifyEnvelopeSignatureEd25519({ signature: 'x' }, k.pub, opts)).toEqual({
      verified: false,
      reason: 'options_invalid',
    });
  });

  it('signature_missing is unverifiable (absent, undefined or null)', async () => {
    const k = await newKey();
    const expected = { verified: 'unverifiable', reason: 'signature_missing' };
    expect(await verifyEnvelopeSignatureEd25519({ a: 1 }, k.pub)).toEqual(expected);
    expect(await verifyEnvelopeSignatureEd25519({ a: 1, signature: undefined }, k.pub)).toEqual(expected);
    expect(await verifyEnvelopeSignatureEd25519({ a: 1, signature: null }, k.pub)).toEqual(expected);
  });

  it.each([
    ['number', 5],
    ['boolean', true],
    ['wrong prefix', `ed448:${'A'.repeat(86)}`],
    ['short', 'ed25519:AAAA'],
    ['long', `ed25519:${'A'.repeat(87)}`],
    ['bad char', `ed25519:${'A'.repeat(85)}=`],
    ['plus/slash alphabet', `ed25519:${'+'.repeat(86)}`],
    ['non-zero trailing bits', `ed25519:${'A'.repeat(85)}B`],
  ])('signature_malformed: %s', async (_n, sig) => {
    const k = await newKey();
    expect(await verifyEnvelopeSignatureEd25519({ a: 1, signature: sig }, k.pub)).toEqual({
      verified: false,
      reason: 'signature_malformed',
    });
  });

  it.each([
    ['no prefix', 'A'.repeat(43)],
    ['short', 'ed25519-pub:AAAA'],
    ['trailing bits', `ed25519-pub:${'A'.repeat(42)}B`],
    ['31 raw bytes', new Uint8Array(31)],
    ['number', 7],
  ])('public_key_malformed: %s', async (_n, pk) => {
    const sig = `ed25519:${'A'.repeat(86)}`;
    expect(await verifyEnvelopeSignatureEd25519({ a: 1, signature: sig }, pk as never)).toEqual({
      verified: false,
      reason: 'public_key_malformed',
    });
  });

  it('canonical_size_cap_exceeded above 100 KB', async () => {
    const k = await newKey();
    const env = { big: 'x'.repeat(100_001), signature: `ed25519:${'A'.repeat(86)}` };
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({
      verified: false,
      reason: 'canonical_size_cap_exceeded',
    });
  });

  it('canonical_key_collision when two keys NFC-fold together', async () => {
    const k = await newKey();
    const env = { 'caf\u00e9': 1, 'cafe\u0301': 2, signature: `ed25519:${'A'.repeat(86)}` };
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({
      verified: false,
      reason: 'canonical_key_collision',
    });
  });

  it('canonical_nfc_failed for unpaired surrogates in values or keys; pairs are fine', async () => {
    const k = await newKey();
    const sig = `ed25519:${'A'.repeat(86)}`;
    const expected = { verified: false, reason: 'canonical_nfc_failed' };
    for (const bad of ['a\uD800', '\uDC00b', '\uD800\uD800', 'x\uDBFFy']) {
      expect(await verifyEnvelopeSignatureEd25519({ s: bad, signature: sig }, k.pub)).toEqual(expected);
      expect(await verifyEnvelopeSignatureEd25519({ nested: [{ [bad]: 1 }], signature: sig }, k.pub)).toEqual(expected);
    }
    expect(await verifyEnvelopeSignatureEd25519({ s: '\uD83D\uDE00', signature: sig }, k.pub)).toEqual({
      verified: false,
      reason: 'signature_mismatch',
    });
  });

  it('canonicalization_failed for values JSON cannot represent', async () => {
    const k = await newKey();
    const env = { n: 10n, signature: `ed25519:${'A'.repeat(86)}` };
    expect(await verifyEnvelopeSignatureEd25519(env as never, k.pub)).toEqual({
      verified: false,
      reason: 'canonicalization_failed',
    });
  });

  it('webcrypto_ed25519_unavailable when crypto.subtle is absent', async () => {
    const k = await newKey();
    vi.stubGlobal('crypto', {});
    expect(await verifyEnvelopeSignatureEd25519({ a: 1, signature: `ed25519:${'A'.repeat(86)}` }, k.pub)).toEqual({
      verified: 'unverifiable',
      reason: 'webcrypto_ed25519_unavailable',
    });
  });

  it('webcrypto_ed25519_unavailable when importKey rejects as unsupported; DataError maps to public_key_malformed', async () => {
    const k = await newKey();
    const env = { a: 1, signature: `ed25519:${'A'.repeat(86)}` };
    const notSupported = Object.assign(new Error('no'), { name: 'NotSupportedError' });
    vi.stubGlobal('crypto', { subtle: { importKey: () => Promise.reject(notSupported) } });
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({
      verified: 'unverifiable',
      reason: 'webcrypto_ed25519_unavailable',
    });
    const dataError = Object.assign(new Error('bad'), { name: 'DataError' });
    vi.stubGlobal('crypto', { subtle: { importKey: () => Promise.reject(dataError) } });
    expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({
      verified: false,
      reason: 'public_key_malformed',
    });
  });

  it('verification_error instead of throwing on hostile input', async () => {
    const k = await newKey();
    const hostile = new Proxy(
      { signature: `ed25519:${'A'.repeat(86)}` },
      {
        ownKeys() {
          throw new Error('boom');
        },
      },
    );
    expect(await verifyEnvelopeSignatureEd25519(hostile, k.pub)).toEqual({
      verified: false,
      reason: 'verification_error',
    });
  });

  it('property: sign-then-verify holds and any single-field mutation breaks it', async () => {
    const k = await newKey();
    const other = await newKey();
    const json = fc.dictionary(
      fc.string({ minLength: 1, maxLength: 8 }).filter((s) => s !== 'signature' && s !== 'quorum_signatures'),
      fc.oneof(fc.string(), fc.integer(), fc.boolean(), fc.constant(null)),
      { minKeys: 1, maxKeys: 6 },
    );
    await fc.assert(
      fc.asyncProperty(json, async (unsigned) => {
        const nfcKeys = new Set(Object.keys(unsigned).map((x) => x.normalize('NFC')));
        fc.pre(nfcKeys.size === Object.keys(unsigned).length);
        const env = { ...unsigned, signature: await signEnvelope(k.priv, unsigned) };
        expect(await verifyEnvelopeSignatureEd25519(env, k.pub)).toEqual({ verified: true });
        expect(await verifyEnvelopeSignatureEd25519(env, other.pub)).toEqual({
          verified: false,
          reason: 'signature_mismatch',
        });
        const first = Object.keys(unsigned)[0];
        const mutated = { ...env, [first]: { mutated: true } };
        expect(await verifyEnvelopeSignatureEd25519(mutated, k.pub)).toEqual({
          verified: false,
          reason: 'signature_mismatch',
        });
      }),
      { numRuns: 40 },
    );
  });

  it('property: never throws on arbitrary input', async () => {
    await fc.assert(
      fc.asyncProperty(fc.anything(), fc.oneof(fc.string(), fc.uint8Array()), async (env, pk) => {
        const r = await verifyEnvelopeSignatureEd25519(env as never, pk);
        expect(['boolean', 'string']).toContain(typeof r.verified);
      }),
      { numRuns: 200 },
    );
  });
});

// ---------------------------------------------------------------------------
// lookupRevocation
// ---------------------------------------------------------------------------

const KEY_X = `ed25519-pub:${'X'.repeat(42)}A`;
const KEY_Y = `ed25519-pub:${'Y'.repeat(42)}A`;
const SIGNER = `ed25519-pub:${'S'.repeat(42)}A`;

function list(over: Partial<RevocationList> = {}): RevocationList {
  return {
    envelope_kind: 'revocation_list',
    contract_version: '8.7.0',
    cluster_id: 'c',
    list_id: 'l1',
    issued_at: '2026-09-01T00:00:00Z',
    valid_from: '2026-08-01T00:00:00Z',
    valid_until: null,
    max_staleness_seconds: null,
    nonce: 1,
    prev_envelope_hash: null,
    next_page_hash: null,
    revoked_keys: [
      { key_id: KEY_X, reason: 'compromise', revoked_at: '2026-08-15T00:00:00Z', revocation_evidence_hash: null },
    ],
    signer_key_id: SIGNER,
    signature: `ed25519:${'A'.repeat(86)}`,
    quorum_signatures: null,
    root_of_trust_id: null,
    ...over,
  };
}

const AT = new Date('2026-10-01T00:00:00.000Z');

describe('lookupRevocation', () => {
  it('returns revoked with entry details', () => {
    expect(lookupRevocation([list()], KEY_X, AT)).toEqual<RevocationLookupResult>({
      revoked: true,
      revoked_at: '2026-08-15T00:00:00Z',
      list_id: 'l1',
      reason: 'compromise',
      list_valid: true,
    });
  });

  it('returns not revoked with the most recent applicable list_id', () => {
    expect(lookupRevocation([list(), list({ list_id: 'l2', issued_at: '2026-09-02T00:00:00Z' })], KEY_Y, AT)).toEqual({
      revoked: false,
      list_id: 'l2',
      list_valid: true,
    });
  });

  it('empty input: not revoked, no list_id, list_valid', () => {
    expect(lookupRevocation([], KEY_X, AT)).toEqual({ revoked: false, list_valid: true });
  });

  it('valid_from is inclusive and valid_until exclusive', () => {
    const l = list({ valid_until: '2026-10-01T00:00:00Z' });
    expect(lookupRevocation([l], KEY_X, new Date('2026-08-01T00:00:00Z')).list_id).toBe('l1');
    expect(lookupRevocation([l], KEY_X, new Date('2026-07-31T23:59:59.999Z')).list_id).toBeUndefined();
    expect(lookupRevocation([l], KEY_X, AT)).toEqual({ revoked: false, list_valid: true });
    expect(lookupRevocation([l], KEY_X, new Date('2026-09-30T23:59:59.999Z')).revoked).toBe(true);
  });

  it('revoked_at is inclusive and compared on the instant at nanosecond resolution', () => {
    const l = list({
      revoked_keys: [
        { key_id: KEY_X, reason: 'manual', revoked_at: '2026-08-15T00:00:00.0010000Z', revocation_evidence_hash: null },
      ],
    });
    expect(lookupRevocation([l], KEY_X, new Date('2026-08-15T00:00:00.001Z')).revoked).toBe(true);
    expect(lookupRevocation([l], KEY_X, new Date('2026-08-15T00:00:00.000Z')).revoked).toBe(false);
    const nanos = list({
      revoked_keys: [
        { key_id: KEY_X, reason: 'manual', revoked_at: '2026-08-15T00:00:00.000000001Z', revocation_evidence_hash: null },
      ],
    });
    expect(lookupRevocation([nanos], KEY_X, new Date('2026-08-15T00:00:00.000Z')).revoked).toBe(false);
  });

  it('ties on issued_at keep input order', () => {
    const a = list({ list_id: 'first' });
    const b = list({ list_id: 'second' });
    expect(lookupRevocation([a, b], KEY_X, AT).list_id).toBe('first');
    expect(lookupRevocation([b, a], KEY_X, AT).list_id).toBe('second');
  });

  it('falls through to an older list when the newest applicable one has no effective entry', () => {
    const newer = list({ list_id: 'newer', issued_at: '2026-09-10T00:00:00Z', revoked_keys: [] });
    expect(lookupRevocation([list(), newer], KEY_X, AT)).toMatchObject({ revoked: true, list_id: 'l1' });
  });

  it('ignores and reports every shape-invalid list', () => {
    const bad1 = { ...list(), contract_version: '0.0.0' } as unknown as RevocationList;
    const bad2 = 'not-a-list' as unknown as RevocationList;
    expect(lookupRevocation([bad1, list(), bad2], KEY_X, AT)).toEqual({
      revoked: true,
      revoked_at: '2026-08-15T00:00:00Z',
      list_id: 'l1',
      reason: 'compromise',
      list_valid: false,
      list_validity_reason: 'shape_invalid: lists[0], lists[2]',
    });
  });

  it('throws TypeError only when lists is not an array', () => {
    expect(() => lookupRevocation('x' as never, KEY_X, AT)).toThrow(TypeError);
  });

  it.each([
    ['invalid Date', new Date('nope')],
    ['Date beyond year 9999', new Date('+012026-01-01T00:00:00Z')],
    ['date-only string', '2026-01-01'],
    ['offset string', '2026-10-01T02:00:00+02:00'],
    ['space separator', '2026-10-01 00:00:00Z'],
    ['ten fractional digits', '2026-10-01T00:00:00.0000000001Z'],
    ['empty string', ''],
    ['number', 1234 as unknown as string],
  ])('returns the typed at_invalid result for %s (never throws)', (_n, at) => {
    expect(lookupRevocation([list()], KEY_X, at)).toEqual({
      revoked: false,
      list_valid: false,
      list_validity_reason: 'at_invalid',
      error: 'at_invalid',
    });
  });

  it('accepts a strict ISO 8601 UTC string at nanosecond resolution', () => {
    expect(lookupRevocation([list()], KEY_X, '2026-10-01T00:00:00Z')).toEqual(lookupRevocation([list()], KEY_X, AT));
    const nanos = list({
      revoked_keys: [
        { key_id: KEY_X, reason: 'manual', revoked_at: '2026-08-15T00:00:00.000000002Z', revocation_evidence_hash: null },
      ],
    });
    expect(lookupRevocation([nanos], KEY_X, '2026-08-15T00:00:00.000000001Z').revoked).toBe(false);
    expect(lookupRevocation([nanos], KEY_X, '2026-08-15T00:00:00.000000002Z').revoked).toBe(true);
  });

  it('is pure: inputs are not mutated', () => {
    const lists = [list({ list_id: 'b', issued_at: '2026-08-02T00:00:00Z' }), list()];
    const snapshot = JSON.stringify(lists);
    lookupRevocation(lists, KEY_X, AT);
    expect(JSON.stringify(lists)).toBe(snapshot);
  });

  it('property: monotone in `at` while the list stays applicable', () => {
    const ms = fc.integer({ min: Date.parse('2026-08-01T00:00:00Z'), max: Date.parse('2027-08-01T00:00:00Z') });
    fc.assert(
      fc.property(ms, ms, (t1, t2) => {
        const [lo, hi] = t1 <= t2 ? [t1, t2] : [t2, t1];
        const early = lookupRevocation([list()], KEY_X, new Date(lo));
        const late = lookupRevocation([list()], KEY_X, new Date(hi));
        if (early.revoked) expect(late.revoked).toBe(true);
      }),
    );
  });

  it('property: adding lists never un-revokes a key (union monotonicity)', () => {
    const extra = fc.array(
      fc.record({
        issued: fc.integer({ min: 0, max: 30 }),
        revokes: fc.boolean(),
      }),
      { maxLength: 4 },
    );
    fc.assert(
      fc.property(extra, (specs) => {
        const extras = specs.map((s, i) =>
          list({
            list_id: `x${i}`,
            issued_at: `2026-09-${String(Math.min(s.issued + 1, 28)).padStart(2, '0')}T00:00:00Z`,
            revoked_keys: s.revokes
              ? [{ key_id: KEY_X, reason: 'rotation', revoked_at: '2026-08-20T00:00:00Z', revocation_evidence_hash: null }]
              : [],
          }),
        );
        expect(lookupRevocation([list(), ...extras], KEY_X, AT).revoked).toBe(true);
      }),
    );
  });
});
