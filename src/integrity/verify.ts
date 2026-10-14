/**
 * Reference verifier functions (FR-C2, v8.8.0).
 *
 * Two pure helpers that a consumer composes with its own keyring and
 * policy to check the cryptographic and revocation claims carried by
 * hounfour envelopes:
 *
 *   - `verifyEnvelopeSignatureEd25519` checks one Ed25519 signature
 *     over the canonical signing input of an envelope.
 *   - `lookupRevocation` answers "was this signer key revoked at time
 *     T according to these revocation lists?".
 *
 * Audit-trail integrity is already covered by `verifyAuditTrailIntegrity`
 * in `src/commons/audit-trail-hash.ts`; the reference verifier reuses it
 * unchanged. The language-neutral conformance suite for all three lives
 * under `vectors/verifier/` and is run by the TS and Go reference
 * implementations (`npm run verifier:parity`).
 *
 * **Signing input** (SDD §5): the UTF-8 bytes of
 * `safeCanonicalize(envelope without the omitted fields)`. That is NFC
 * normalisation of every string and object key, then RFC 8785 JCS, with
 * the 100 KB canonical-size cap from
 * `docs/architecture/hashing-spec-freeze-v8.5.md`. The omitted fields
 * default to the signature field plus `quorum_signatures`, which matches
 * the RevocationList signed-payload boundary (see
 * `docs/revocation-list-protocol.md`).
 *
 * **Shape, not authority** (ADR-010). These helpers return facts about
 * bytes. They do not decide whether an envelope is acceptable.
 * Explicit non-constraints:
 *
 *   - Public-key resolution is NOT performed. The caller passes the
 *     public key; mapping `signer_key_id` (or any other identifier) to
 *     key material is the consumer keyring's job.
 *   - Signer competence is NOT evaluated. `SignerCompetenceRule` and any
 *     m-of-n quorum policy stay consumer-side; a caller that needs a
 *     quorum calls the signature function once per quorum entry.
 *   - Revocation-list signatures and cross-field invariants (RL-1..RL-12)
 *     are NOT checked by `lookupRevocation`. A list is admitted when it
 *     passes structural shape validation; the caller verifies the list
 *     signature first if it needs to trust the list.
 *   - Freshness (`max_staleness_seconds`) is NOT enforced. Staleness
 *     tolerance is consumer policy.
 *
 * WebCrypto (`globalThis.crypto.subtle`, algorithm `Ed25519`) is the
 * only signature primitive used, so the helper runs unchanged in Node
 * 22+, Deno, Bun and modern browsers without a new dependency.
 *
 * @see docs/architecture/reference-verifier.md
 * @see docs/adr/ADR-010-class-vs-policy-boundary.md
 * @since v8.8.0 (FR-C2)
 */
import { Value } from '@sinclair/typebox/value';
import {
  safeCanonicalize,
  CanonicalizeSizeError,
  CanonicalizeKeyCollisionError,
  CanonicalizeNFCError,
} from '../utilities/safe-canonicalize.js';
import {
  RevocationListSchema,
  type RevocationList,
} from '../canonical/revocation-list.js';

// ---------------------------------------------------------------------------
// Ed25519 envelope signature verification
// ---------------------------------------------------------------------------

/**
 * Result of `verifyEnvelopeSignatureEd25519`.
 *
 * - `verified: true`: the signature verifies over the canonical signing
 *   input under the supplied public key.
 * - `verified: false`: the input is malformed or the signature does not
 *   verify. `reason` is one of the stable codes listed on the function.
 * - `verified: 'unverifiable'`: the check could not be performed (no
 *   signature present, or the runtime lacks WebCrypto Ed25519). This is
 *   NOT a pass; callers that need a signature treat it as a failure.
 */
export type Ed25519VerifyResult =
  | { verified: true }
  | { verified: false; reason: string }
  | { verified: 'unverifiable'; reason: string };

/** Options accepted by `verifyEnvelopeSignatureEd25519`. */
export interface Ed25519VerifyOptions {
  /** Name of the field carrying the `ed25519:<86 base64url>` signature. Default `'signature'`. */
  signatureField?: string;
  /**
   * Fields removed from the envelope before canonicalisation. Default
   * `[signatureField, 'quorum_signatures']`. The signature field is
   * always removed even when this list omits it, because a signature
   * cannot sign itself (decision recorded for SDD §5).
   */
  omitFields?: string[];
}

const SIGNATURE_PREFIX = 'ed25519:';
const PUBKEY_PREFIX = 'ed25519-pub:';
const B64URL_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';

/**
 * Strict unpadded base64url decode (RFC 4648 §5) of exactly
 * `expectedBytes` bytes. Rejects padding, foreign characters, wrong
 * lengths, and non-zero trailing bits (non-canonical encodings), so the
 * same text decodes the same way in every runtime. Returns null on any
 * failure.
 */
function decodeBase64UrlStrict(text: string, expectedBytes: number): Uint8Array<ArrayBuffer> | null {
  const expectedChars = Math.ceil((expectedBytes * 4) / 3);
  if (text.length !== expectedChars) return null;
  const out = new Uint8Array(expectedBytes);
  let buffer = 0;
  let bits = 0;
  let o = 0;
  for (let i = 0; i < text.length; i += 1) {
    const v = B64URL_ALPHABET.indexOf(text[i]);
    if (v < 0) return null;
    buffer = (buffer << 6) | v;
    bits += 6;
    if (bits >= 8) {
      bits -= 8;
      out[o] = (buffer >> bits) & 0xff;
      o += 1;
      buffer &= (1 << bits) - 1;
    }
  }
  // Leftover bits must be zero for a canonical encoding.
  if (o !== expectedBytes || buffer !== 0) return null;
  return out;
}

// An unpaired UTF-16 surrogate: a high surrogate not followed by a low
// one, or a low surrogate not preceded by a high one.
const LONE_SURROGATE_RE = /[\uD800-\uDBFF](?![\uDC00-\uDFFF])|(?<![\uD800-\uDBFF])[\uDC00-\uDFFF]/;

/**
 * Throw CanonicalizeNFCError when any string or key in the tree contains
 * an unpaired surrogate. `String.prototype.normalize` does not throw on
 * such strings and the JCS writer would escape them as `\uXXXX`, but
 * ill-formed strings have no UTF-8 encoding, and runtimes with UTF-8
 * strings cannot reproduce those bytes. Both reference runtimes therefore
 * reject them as `canonical_nfc_failed` (decision, bridge iter-2).
 */
function assertWellFormedTree(value: unknown): void {
  if (typeof value === 'string') {
    if (LONE_SURROGATE_RE.test(value)) {
      throw new CanonicalizeNFCError('string contains an unpaired surrogate');
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const v of value) assertWellFormedTree(v);
    return;
  }
  if (value !== null && typeof value === 'object') {
    for (const [k, v] of Object.entries(value)) {
      assertWellFormedTree(k);
      assertWellFormedTree(v);
    }
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function resolvePublicKey(publicKey: Uint8Array | string): Uint8Array<ArrayBuffer> | null {
  if (typeof publicKey === 'string') {
    if (!publicKey.startsWith(PUBKEY_PREFIX)) return null;
    return decodeBase64UrlStrict(publicKey.slice(PUBKEY_PREFIX.length), 32);
  }
  if (publicKey instanceof Uint8Array && publicKey.length === 32) {
    const copy = new Uint8Array(32);
    copy.set(publicKey);
    return copy;
  }
  return null;
}

/**
 * Verify an Ed25519 signature carried inside an envelope.
 *
 * Steps (in this order; the first failing step decides the result):
 *
 *   1. `envelope` must be a plain object, else `false / envelope_not_object`.
 *      Invalid options give `false / options_invalid`.
 *   2. The signature field must be present and not null, else
 *      `'unverifiable' / signature_missing`.
 *   3. Its value must be `ed25519:` + 86 canonical base64url chars
 *      decoding to 64 bytes, else `false / signature_malformed`.
 *   4. The public key must be 32 raw bytes or `ed25519-pub:` + 43
 *      canonical base64url chars, else `false / public_key_malformed`.
 *   5. Canonical signing input = UTF-8 of `safeCanonicalize(envelope
 *      minus omitted fields)`. Any string or key holding an unpaired
 *      surrogate is rejected first as `canonical_nfc_failed`. Failures map to
 *      `canonical_size_cap_exceeded`, `canonical_key_collision`,
 *      `canonical_nfc_failed` or `canonicalization_failed` (all `false`).
 *   6. WebCrypto Ed25519 must be available, else
 *      `'unverifiable' / webcrypto_ed25519_unavailable`.
 *   7. Verify; a bad signature gives `false / signature_mismatch`.
 *
 * Never throws. The reason vocabulary is stable and shared with the Go
 * reference implementation so conformance results diff byte for byte.
 */
export async function verifyEnvelopeSignatureEd25519(
  envelope: Record<string, unknown>,
  publicKey: Uint8Array | string,
  options?: Ed25519VerifyOptions,
): Promise<Ed25519VerifyResult> {
  try {
    if (!isPlainObject(envelope)) {
      return { verified: false, reason: 'envelope_not_object' };
    }
    const signatureField = options?.signatureField ?? 'signature';
    const omitFields = options?.omitFields ?? [signatureField, 'quorum_signatures'];
    if (
      typeof signatureField !== 'string' ||
      signatureField.length === 0 ||
      !Array.isArray(omitFields) ||
      !omitFields.every((f) => typeof f === 'string')
    ) {
      return { verified: false, reason: 'options_invalid' };
    }

    // Absent, undefined and JSON null all mean "no signature" (decision,
    // bridge iter-1): a null placeholder cannot be told apart from an
    // unsigned envelope, so both runtimes report it as unverifiable.
    if (!Object.prototype.hasOwnProperty.call(envelope, signatureField) ||
        envelope[signatureField] === undefined || envelope[signatureField] === null) {
      return { verified: 'unverifiable', reason: 'signature_missing' };
    }
    const sigValue = envelope[signatureField];
    if (typeof sigValue !== 'string' || !sigValue.startsWith(SIGNATURE_PREFIX)) {
      return { verified: false, reason: 'signature_malformed' };
    }
    const signature = decodeBase64UrlStrict(sigValue.slice(SIGNATURE_PREFIX.length), 64);
    if (signature === null) {
      return { verified: false, reason: 'signature_malformed' };
    }

    const rawKey = resolvePublicKey(publicKey);
    if (rawKey === null) {
      return { verified: false, reason: 'public_key_malformed' };
    }

    const omit = new Set<string>(omitFields);
    omit.add(signatureField);
    const unsigned: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(envelope)) {
      if (!omit.has(k)) unsigned[k] = v;
    }

    let canonical: string;
    try {
      assertWellFormedTree(unsigned);
      canonical = safeCanonicalize(unsigned);
    } catch (e) {
      if (e instanceof CanonicalizeSizeError) {
        return { verified: false, reason: 'canonical_size_cap_exceeded' };
      }
      if (e instanceof CanonicalizeKeyCollisionError) {
        return { verified: false, reason: 'canonical_key_collision' };
      }
      if (e instanceof CanonicalizeNFCError) {
        return { verified: false, reason: 'canonical_nfc_failed' };
      }
      return { verified: false, reason: 'canonicalization_failed' };
    }
    const message = new TextEncoder().encode(canonical);

    const subtle = (globalThis as { crypto?: { subtle?: SubtleCrypto } }).crypto?.subtle;
    if (subtle === undefined) {
      return { verified: 'unverifiable', reason: 'webcrypto_ed25519_unavailable' };
    }
    let key: CryptoKey;
    try {
      key = await subtle.importKey('raw', rawKey, { name: 'Ed25519' }, false, ['verify']);
    } catch (e) {
      // DataError means the bytes are not a valid Ed25519 point
      // encoding; anything else means the runtime lacks Ed25519.
      if (e instanceof Error && e.name === 'DataError') {
        return { verified: false, reason: 'public_key_malformed' };
      }
      return { verified: 'unverifiable', reason: 'webcrypto_ed25519_unavailable' };
    }
    const ok = await subtle.verify({ name: 'Ed25519' }, key, signature, message);
    return ok ? { verified: true } : { verified: false, reason: 'signature_mismatch' };
  } catch {
    return { verified: false, reason: 'verification_error' };
  }
}

// ---------------------------------------------------------------------------
// Revocation lookup
// ---------------------------------------------------------------------------

/**
 * Result of `lookupRevocation`.
 *
 * - `revoked`: true when an applicable list carries an entry for the key
 *   with `revoked_at` at or before `at`.
 * - `revoked_at` / `reason`: copied from that entry when `revoked`.
 * - `list_id`: when `revoked`, the most recent (by `issued_at`) applicable
 *   list carrying the revoking entry; otherwise the most recent applicable
 *   list, or absent when no list is applicable.
 * - `list_valid`: false when at least one supplied list failed structural
 *   shape validation; such lists are ignored and named in
 *   `list_validity_reason`.
 * - `error`: `'at_invalid'` when `at` is not a valid instant. No lookup
 *   was performed; the result then carries `revoked: false`,
 *   `list_valid: false` and `list_validity_reason: 'at_invalid'`.
 *   Callers MUST check `error` before reading `revoked`.
 */
export interface RevocationLookupResult {
  revoked: boolean;
  revoked_at?: string;
  list_id?: string;
  reason?: string;
  list_valid: boolean;
  list_validity_reason?: string;
  error?: 'at_invalid';
}

const AT_INVALID: RevocationLookupResult = {
  revoked: false,
  list_valid: false,
  list_validity_reason: 'at_invalid',
  error: 'at_invalid',
};

const ISO_UTC_RE = /^((\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2}))(?:\.(\d{1,9}))?Z$/;

const DAYS_IN_MONTH = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

/**
 * Normalise an ISO 8601 UTC timestamp to the fixed-width form
 * `YYYY-MM-DDTHH:MM:SS.nnnnnnnnnZ` so instants compare correctly as
 * strings at nanosecond resolution without platform date parsing.
 *
 * Returns null unless the text names a real instant: year 0001..9999,
 * month 01..12, a day that exists in that month (proleptic Gregorian
 * leap years), hour 00..23, minute 00..59, second 00..59. Leap seconds
 * (`:60`) are rejected (decision): RFC 3339 admits them, but the
 * library's other UTC patterns and JavaScript `Date` do not. Mirrored
 * byte for byte by the Go port.
 */
function normalizeUtc(ts: string): string | null {
  const m = ISO_UTC_RE.exec(ts);
  if (m === null) return null;
  const [year, month, day, hour, minute, second] = m.slice(2, 8).map(Number);
  const leap = (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
  if (
    year < 1 ||
    month < 1 ||
    month > 12 ||
    day < 1 ||
    day > (month === 2 && leap ? 29 : DAYS_IN_MONTH[month - 1]) ||
    hour > 23 ||
    minute > 59 ||
    second > 59
  ) {
    return null;
  }
  return `${m[1]}.${(m[8] ?? '').padEnd(9, '0')}Z`;
}

/**
 * Look up whether `signerKeyId` is revoked at instant `at`.
 *
 * Semantics (SDD §5):
 *   - A list is applicable when `valid_from <= at` and
 *     (`valid_until` is null or `at < valid_until`).
 *   - The key is revoked when any applicable list has an entry with
 *     `key_id === signerKeyId` and `revoked_at <= at`.
 *   - Applicable lists are ranked by `issued_at` descending; ties keep
 *     input order (decision: deterministic, mirrored by the Go port).
 *   - Lists failing `RevocationListSchema` shape validation are ignored
 *     and reported as `list_valid: false` with
 *     `list_validity_reason: "shape_invalid: lists[i], ..."`.
 *
 * `at` is a `Date` (millisecond resolution) or a string in the strict
 * ISO 8601 UTC form `YYYY-MM-DDTHH:MM:SS(.f{1,9})?Z` (nanosecond
 * resolution). Timestamps compare at nanosecond resolution on their
 * textual value. An invalid `Date`, a Date outside years 0001..9999, or
 * a string that is not a real calendar instant (see `normalizeUtc`)
 * yields the `at_invalid` result; it never throws for `at`. A list whose
 * `valid_from`, `valid_until`, `issued_at` or any `revoked_at` is not a
 * real instant is shape-invalid, because the schema pattern does not
 * range-check fields.
 *
 * Pure. Throws `TypeError` only when `lists` is not an array.
 *
 * Non-constraints: list signatures, cross-field invariants (RL-1..RL-12),
 * chain linkage and freshness are NOT checked here (ADR-010; see the
 * module JSDoc).
 */
export function lookupRevocation(
  lists: RevocationList[],
  signerKeyId: string,
  at: string | Date,
): RevocationLookupResult {
  if (!Array.isArray(lists)) {
    throw new TypeError('lookupRevocation: lists must be an array');
  }
  let atNorm: string | null = null;
  if (typeof at === 'string') {
    atNorm = normalizeUtc(at);
  } else if (at instanceof Date && Number.isFinite(at.getTime())) {
    atNorm = normalizeUtc(at.toISOString());
  }
  if (atNorm === null) {
    return { ...AT_INVALID };
  }

  const invalid: string[] = [];
  const applicable: { list: RevocationList; issued: string }[] = [];
  lists.forEach((list, i) => {
    if (!Value.Check(RevocationListSchema, list)) {
      invalid.push(`lists[${i}]`);
      return;
    }
    // The shape pattern does not range-check calendar fields, so an
    // impossible instant (2026-13-40, 2027-02-29, :60) fails here and the
    // list is shape-invalid, as in Go.
    const from = normalizeUtc(list.valid_from);
    const issued = normalizeUtc(list.issued_at);
    const until = list.valid_until === null ? null : normalizeUtc(list.valid_until);
    if (
      from === null ||
      issued === null ||
      (list.valid_until !== null && until === null) ||
      list.revoked_keys.some((e) => normalizeUtc(e.revoked_at) === null)
    ) {
      invalid.push(`lists[${i}]`);
      return;
    }
    if (from <= atNorm && (until === null || atNorm < until)) {
      applicable.push({ list, issued });
    }
  });

  // Stable sort: issued_at descending, ties keep input order.
  applicable.sort((a, b) => (a.issued < b.issued ? 1 : a.issued > b.issued ? -1 : 0));

  const validity: Pick<RevocationLookupResult, 'list_valid' | 'list_validity_reason'> =
    invalid.length === 0
      ? { list_valid: true }
      : { list_valid: false, list_validity_reason: `shape_invalid: ${invalid.join(', ')}` };

  for (const { list } of applicable) {
    for (const entry of list.revoked_keys) {
      if (entry.key_id !== signerKeyId) continue;
      const revokedAt = normalizeUtc(entry.revoked_at) as string;
      if (revokedAt <= atNorm) {
        return {
          revoked: true,
          revoked_at: entry.revoked_at,
          list_id: list.list_id,
          reason: entry.reason,
          ...validity,
        };
      }
    }
  }

  return {
    revoked: false,
    ...(applicable.length > 0 && { list_id: applicable[0].list.list_id }),
    ...validity,
  };
}
