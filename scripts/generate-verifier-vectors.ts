#!/usr/bin/env tsx
/**
 * Deterministic generator for the reference-verifier conformance suite
 * (FR-C2, SDD §5) under `vectors/verifier/`.
 *
 * Everything is derived from fixed inputs: test keys come from fixed
 * seeds, timestamps are literals, and Ed25519 signatures are
 * deterministic (RFC 8032), so a re-run reproduces the committed files
 * byte for byte. No wall clock is read.
 *
 * Node-only: signs with node:crypto. The library itself verifies with
 * WebCrypto (src/integrity/verify.ts).
 *
 * Expected results are declared by case intent (valid / tampered / ...),
 * NOT computed by the verifier under test. Audit-trail hashes come from
 * the existing `computeAuditEntryHash` writer.
 *
 * Usage:
 *   npx tsx scripts/generate-verifier-vectors.ts          # write files
 *   npx tsx scripts/generate-verifier-vectors.ts --check  # exit 1 on drift
 *
 * @since v8.8.0 (FR-C2)
 */
import { createHash, createPrivateKey, createPublicKey, sign, type KeyObject } from 'node:crypto';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { safeCanonicalize } from '../src/utilities/safe-canonicalize.js';
import { buildDomainTag, computeAuditEntryHash } from '../src/commons/audit-trail-hash.js';
import { AUDIT_TRAIL_GENESIS_HASH } from '../src/commons/audit-trail.js';

export const TEST_KEY_NOTICE =
  'TEST KEY — generated 2026-10-14 for conformance vectors; never use for anything else';

const PKCS8_ED25519_PREFIX = Buffer.from('302e020100300506032b657004220420', 'hex');

interface TestKey {
  name: string;
  privateKey: KeyObject;
  pub: string; // ed25519-pub:<43 base64url>
}

function deriveKey(name: string): TestKey {
  const seed = createHash('sha256').update(`hounfour-verifier-test-key:${name}`).digest();
  const privateKey = createPrivateKey({
    key: Buffer.concat([PKCS8_ED25519_PREFIX, seed]),
    format: 'der',
    type: 'pkcs8',
  });
  const spki = createPublicKey(privateKey).export({ format: 'der', type: 'spki' });
  const raw = spki.subarray(spki.length - 32);
  return { name, privateKey, pub: `ed25519-pub:${raw.toString('base64url')}` };
}

function signCanonical(key: TestKey, unsigned: Record<string, unknown>): string {
  const bytes = Buffer.from(safeCanonicalize(unsigned), 'utf8');
  return `ed25519:${sign(null, bytes, key.privateKey).toString('base64url')}`;
}

function omit(obj: Record<string, unknown>, fields: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(obj)) if (!fields.includes(k)) out[k] = v;
  return out;
}

function clone<T>(v: T): T {
  return JSON.parse(JSON.stringify(v)) as T;
}

type Kind = 'audit-trail' | 'signature' | 'revocation';
interface Case {
  case: string;
  kind: Kind;
  description: string;
  input: Record<string, unknown>;
  expected: Record<string, unknown>;
}

// ---------------------------------------------------------------------------
// Keys
// ---------------------------------------------------------------------------

const KEY_NAMES = ['signer-a', 'signer-b', 'signer-c'] as const;

// ---------------------------------------------------------------------------
// Audit-trail cases
// ---------------------------------------------------------------------------

function auditCases(): Case[] {
  const tag = buildDomainTag('GovernedCredits', '8.8.0');
  const contents = [
    {
      entry_id: '6f1c2a40-0000-4000-8000-000000000001',
      timestamp: '2026-10-14T09:00:00.000Z',
      event_type: 'commons.transition.executed',
      actor_id: 'agent:alpha',
      payload: { amount_micro_usd: '1500000', ratio: 0.1, tiny: 1e-7, big: 1e21 },
    },
    {
      entry_id: '6f1c2a40-0000-4000-8000-000000000002',
      timestamp: '2026-10-14T09:05:00.000Z',
      event_type: 'commons.transition.executed',
      // NFD form on purpose: audit-entry hashing predates the NFC mandate
      // and hashes raw strings (hashing-spec-freeze-v8.5.md §8). Ports
      // must NOT normalise here.
      payload: { note: 'cafe\u0301', nested: { z: [1, 2.5, 'x'], a: null }, emoji: '\u{1F600}' },
    },
    {
      entry_id: '6f1c2a40-0000-4000-8000-000000000003',
      timestamp: '2026-10-14T09:10:00.000Z',
      event_type: 'commons.audit.sealed',
      actor_id: 'agent:beta',
    },
  ];
  const entries: Record<string, unknown>[] = [];
  let prev = AUDIT_TRAIL_GENESIS_HASH;
  for (const c of contents) {
    const entry_hash = computeAuditEntryHash(c, tag);
    entries.push({ ...c, entry_hash, previous_hash: prev, hash_domain_tag: tag });
    prev = entry_hash;
  }
  const trail = {
    entries,
    hash_algorithm: 'sha256',
    genesis_hash: AUDIT_TRAIL_GENESIS_HASH,
    integrity_status: 'unverified',
  };

  const tampered = clone(trail);
  (tampered.entries[1].payload as Record<string, unknown>).note = 'tampered';
  const tamperedRecomputed = computeAuditEntryHash(
    {
      entry_id: tampered.entries[1].entry_id as string,
      timestamp: tampered.entries[1].timestamp as string,
      event_type: tampered.entries[1].event_type as string,
      payload: tampered.entries[1].payload,
    },
    tag,
  );

  const broken = clone(trail);
  const bogus = `sha256:${'ab'.repeat(32)}`;
  broken.entries[2].previous_hash = bogus;

  const genesisMismatch = clone(trail);
  const otherGenesis = `sha256:${'00'.repeat(32)}`;
  genesisMismatch.genesis_hash = otherGenesis;

  return [
    {
      case: 'valid-3-entries',
      kind: 'audit-trail',
      description: 'Three chained entries; NFD payload string, IEEE-754 edge numbers, optional fields absent.',
      input: { trail },
      expected: { valid: true },
    },
    {
      case: 'content-tampered-index-1',
      kind: 'audit-trail',
      description: 'Entry 1 payload edited after hashing; content phase fails at index 1.',
      input: { trail: tampered },
      expected: {
        valid: false,
        failure_phase: 'content',
        failure_index: 1,
        expected_hash: trail.entries[1].entry_hash,
        actual_hash: tamperedRecomputed,
      },
    },
    {
      case: 'chain-broken-index-2',
      kind: 'audit-trail',
      description: 'Entry 2 previous_hash does not link to entry 1; chain phase fails at index 2.',
      input: { trail: broken },
      expected: {
        valid: false,
        failure_phase: 'chain',
        failure_index: 2,
        expected_hash: trail.entries[1].entry_hash,
        actual_hash: bogus,
      },
    },
    {
      case: 'genesis-mismatch',
      kind: 'audit-trail',
      description: 'genesis_hash differs from entry 0 previous_hash; chain phase fails at index 0.',
      input: { trail: genesisMismatch },
      expected: {
        valid: false,
        failure_phase: 'chain',
        failure_index: 0,
        expected_hash: otherGenesis,
        actual_hash: AUDIT_TRAIL_GENESIS_HASH,
      },
    },
    {
      case: 'empty-trail-valid',
      kind: 'audit-trail',
      description: 'No entries; trivially valid.',
      input: {
        trail: { entries: [], hash_algorithm: 'sha256', genesis_hash: AUDIT_TRAIL_GENESIS_HASH, integrity_status: 'unverified' },
      },
      expected: { valid: true },
    },
  ];
}

// ---------------------------------------------------------------------------
// Revocation-list builder (shared by signature + revocation cases)
// ---------------------------------------------------------------------------

interface ListSpec {
  list_id: string;
  nonce: number;
  issued_at: string;
  valid_from: string;
  valid_until: string | null;
  revoked: { key_id: string; reason: string; revoked_at: string }[];
}

function buildList(signer: TestKey, spec: ListSpec, quorum?: TestKey[]): Record<string, unknown> {
  const unsigned: Record<string, unknown> = {
    envelope_kind: 'revocation_list',
    contract_version: '8.7.0',
    cluster_id: 'cluster:verifier-conformance',
    list_id: spec.list_id,
    issued_at: spec.issued_at,
    valid_from: spec.valid_from,
    valid_until: spec.valid_until,
    max_staleness_seconds: 86400,
    nonce: spec.nonce,
    prev_envelope_hash: null,
    next_page_hash: null,
    revoked_keys: spec.revoked.map((r) => ({ ...r, revocation_evidence_hash: null })),
    signer_key_id: signer.pub,
    root_of_trust_id: null,
  };
  const signature = signCanonical(signer, unsigned);
  const quorum_signatures =
    quorum === undefined
      ? null
      : quorum.map((k) => ({ signer_key_id: k.pub, signature: signCanonical(k, unsigned) }));
  return { ...unsigned, signature, quorum_signatures };
}

// ---------------------------------------------------------------------------
// Signature cases
// ---------------------------------------------------------------------------

function signatureCases(keys: Record<string, TestKey>): Case[] {
  const a = keys['signer-a'];
  const b = keys['signer-b'];
  const c = keys['signer-c'];
  const unsigned = {
    envelope_kind: 'verifier_test_envelope',
    contract_version: '8.8.0',
    issued_at: '2026-10-14T10:00:00Z',
    signer_key_id: a.pub,
    body: {
      // NFD on the wire; the signing input is the NFC form.
      note: 'cafe\u0301 \u1100\u1161',
      amount_micro_usd: '2500000',
      weights: [1, 2.5, 0.000001, 1e21],
      flags: { enabled: true, label: null },
    },
  };
  const envelope = { ...unsigned, signature: signCanonical(a, unsigned) };

  const tampered = clone(envelope);
  tampered.body.amount_micro_usd = '2500001';

  const sigText = envelope.signature.slice('ed25519:'.length);
  // 86 chars carry 516 bits; the last 4 must be zero. Flip one of them.
  const last = sigText[85];
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_';
  const nonCanonical = `ed25519:${sigText.slice(0, 85)}${alphabet[alphabet.indexOf(last) | 1]}`;

  const list = buildList(
    a,
    {
      list_id: 'rl-quorum-0001',
      nonce: 7,
      issued_at: '2026-10-14T00:00:00Z',
      valid_from: '2026-10-01T00:00:00Z',
      valid_until: null,
      revoked: [{ key_id: c.pub, reason: 'compromise', revoked_at: '2026-10-13T12:00:00Z' }],
    },
    [a, b],
  );

  return [
    {
      case: 'valid',
      kind: 'signature',
      description: 'Signature over safeCanonicalize(envelope minus signature); wire strings are NFD, signing input is NFC.',
      input: { envelope, public_key: a.pub },
      expected: { verified: true },
    },
    {
      case: 'body-tampered',
      kind: 'signature',
      description: 'One body field changed after signing.',
      input: { envelope: tampered, public_key: a.pub },
      expected: { verified: false, reason: 'signature_mismatch' },
    },
    {
      case: 'wrong-key',
      kind: 'signature',
      description: 'Valid envelope checked against a different public key.',
      input: { envelope, public_key: b.pub },
      expected: { verified: false, reason: 'signature_mismatch' },
    },
    {
      case: 'malformed-signature',
      kind: 'signature',
      description: 'Signature value is not ed25519: plus 86 base64url chars.',
      input: { envelope: { ...envelope, signature: 'ed25519:AAAA' }, public_key: a.pub },
      expected: { verified: false, reason: 'signature_malformed' },
    },
    {
      case: 'malformed-signature-noncanonical-encoding',
      kind: 'signature',
      description: 'Final base64url char sets a trailing pad bit; strict decoders reject it before any crypto.',
      input: { envelope: { ...envelope, signature: nonCanonical }, public_key: a.pub },
      expected: { verified: false, reason: 'signature_malformed' },
    },
    {
      case: 'missing-signature-unverifiable',
      kind: 'signature',
      description: 'No signature field; the check cannot be performed.',
      input: { envelope: unsigned, public_key: a.pub },
      expected: { verified: 'unverifiable', reason: 'signature_missing' },
    },
    {
      case: 'null-signature-unverifiable',
      kind: 'signature',
      description: 'Signature field present but JSON null; treated like an absent signature in every runtime.',
      input: { envelope: { ...unsigned, signature: null }, public_key: a.pub },
      expected: { verified: 'unverifiable', reason: 'signature_missing' },
    },
    {
      case: 'options-invalid-empty-signature-field',
      kind: 'signature',
      description: 'options.signatureField is the empty string; rejected before any other check except envelope shape.',
      input: { envelope, public_key: a.pub, options: { signatureField: '' } },
      expected: { verified: false, reason: 'options_invalid' },
    },
    {
      case: 'lone-surrogate-nfc-failed',
      kind: 'signature',
      description: 'A body string holds an unpaired UTF-16 surrogate (\\ud800 in the file); it has no NFC or UTF-8 form, so every runtime rejects it before any crypto.',
      input: { envelope: { ...envelope, body: { ...envelope.body, note: 'x\ud800y' } }, public_key: a.pub },
      expected: { verified: false, reason: 'canonical_nfc_failed' },
    },
    {
      case: 'public-key-malformed',
      kind: 'signature',
      description: 'Public key string lacks the ed25519-pub: prefix.',
      input: { envelope, public_key: a.pub.slice('ed25519-pub:'.length) },
      expected: { verified: false, reason: 'public_key_malformed' },
    },
    {
      case: 'quorum-field-omitted-valid',
      kind: 'signature',
      description: 'RevocationList with quorum_signatures present; signature verifies with both signature and quorum_signatures omitted.',
      input: { envelope: list, public_key: a.pub },
      expected: { verified: true },
    },
    {
      case: 'quorum-entry-valid',
      kind: 'signature',
      description: 'A quorum entry signs the same bytes as the primary signature; verified via an explicit signatureField on a synthetic view.',
      input: {
        envelope: { ...list, quorum_entry_signature: (list.quorum_signatures as { signature: string }[])[1].signature },
        public_key: b.pub,
        options: { signatureField: 'quorum_entry_signature', omitFields: ['signature', 'quorum_signatures'] },
      },
      expected: { verified: true },
    },
  ];
}

// ---------------------------------------------------------------------------
// Revocation cases
// ---------------------------------------------------------------------------

function revocationCases(keys: Record<string, TestKey>): Case[] {
  const a = keys['signer-a'];
  const b = keys['signer-b'];
  const c = keys['signer-c'];
  const base: ListSpec = {
    list_id: 'rl-0001',
    nonce: 1,
    issued_at: '2026-09-01T00:00:00Z',
    valid_from: '2026-08-01T00:00:00Z',
    valid_until: null,
    revoked: [{ key_id: c.pub, reason: 'compromise', revoked_at: '2026-08-15T00:00:00Z' }],
  };
  const l1 = buildList(a, base);
  const bounded = buildList(a, { ...base, list_id: 'rl-bounded', valid_until: '2026-12-01T00:00:00Z' });
  const later = buildList(a, {
    ...base,
    list_id: 'rl-0002',
    nonce: 2,
    issued_at: '2026-10-01T00:00:00Z',
    revoked: [{ key_id: c.pub, reason: 'rotation', revoked_at: '2026-09-20T00:00:00Z' }],
  });
  const fractional = buildList(a, {
    ...base,
    list_id: 'rl-fraction',
    revoked: [{ key_id: c.pub, reason: 'manual', revoked_at: '2026-08-15T00:00:00.5Z' }],
  });
  const brokenShape = { ...clone(l1), list_id: 'rl-broken', contract_version: '9.9.9' };
  // Passes the schema pattern but names no real instant.
  const impossible = buildList(a, { ...base, list_id: 'rl-impossible', issued_at: '2026-13-40T99:99:99Z' });
  const badLeap = buildList(a, {
    ...base,
    list_id: 'rl-bad-leap',
    revoked: [{ key_id: c.pub, reason: 'manual', revoked_at: '2027-02-29T00:00:00Z' }],
  });
  const atInvalid = { revoked: false, list_valid: false, list_validity_reason: 'at_invalid', error: 'at_invalid' };

  const q = (lists: unknown[], key: string, at: string) => ({ lists, signer_key_id: key, at });
  return [
    {
      case: 'not-revoked',
      kind: 'revocation',
      description: 'Applicable list does not name the key.',
      input: q([l1], b.pub, '2026-10-14T00:00:00.000Z'),
      expected: { revoked: false, list_id: 'rl-0001', list_valid: true },
    },
    {
      case: 'revoked-before-at',
      kind: 'revocation',
      description: 'Key revoked before the query instant.',
      input: q([l1], c.pub, '2026-10-14T00:00:00.000Z'),
      expected: { revoked: true, revoked_at: '2026-08-15T00:00:00Z', list_id: 'rl-0001', reason: 'compromise', list_valid: true },
    },
    {
      case: 'revoked-after-at-not-yet',
      kind: 'revocation',
      description: 'List applicable but its entry takes effect after the query instant.',
      input: q([l1], c.pub, '2026-08-10T00:00:00.000Z'),
      expected: { revoked: false, list_id: 'rl-0001', list_valid: true },
    },
    {
      case: 'list-not-yet-valid',
      kind: 'revocation',
      description: 'Query instant precedes valid_from; no list applies.',
      input: q([l1], c.pub, '2026-07-01T00:00:00.000Z'),
      expected: { revoked: false, list_valid: true },
    },
    {
      case: 'list-expired',
      kind: 'revocation',
      description: 'Query instant equals valid_until (exclusive bound); no list applies.',
      input: q([bounded], c.pub, '2026-12-01T00:00:00.000Z'),
      expected: { revoked: false, list_valid: true },
    },
    {
      case: 'two-lists-latest-wins',
      kind: 'revocation',
      description: 'Two applicable lists revoke the key; the most recent issued_at supplies list_id, revoked_at and reason.',
      input: q([l1, later], c.pub, '2026-10-14T00:00:00.000Z'),
      expected: { revoked: true, revoked_at: '2026-09-20T00:00:00Z', list_id: 'rl-0002', reason: 'rotation', list_valid: true },
    },
    {
      case: 'shape-invalid-list-ignored',
      kind: 'revocation',
      description: 'A list failing shape validation is ignored and reported; the valid list still answers.',
      input: q([brokenShape, l1], c.pub, '2026-10-14T00:00:00.000Z'),
      expected: {
        revoked: true,
        revoked_at: '2026-08-15T00:00:00Z',
        list_id: 'rl-0001',
        reason: 'compromise',
        list_valid: false,
        list_validity_reason: 'shape_invalid: lists[0]',
      },
    },
    {
      case: 'at-invalid',
      kind: 'revocation',
      description: 'at carries a +02:00 offset instead of Z; no lookup is performed and the typed at_invalid result is returned.',
      input: q([l1], c.pub, '2026-10-14T02:00:00+02:00'),
      expected: { revoked: false, list_valid: false, list_validity_reason: 'at_invalid', error: 'at_invalid' },
    },
    {
      case: 'impossible-date-list-shape-invalid',
      kind: 'revocation',
      description: 'issued_at 2026-13-40T99:99:99Z matches the schema pattern but is not an instant; that list is shape-invalid, the valid list answers.',
      input: q([impossible, l1], c.pub, '2026-10-14T00:00:00.000Z'),
      expected: {
        revoked: true,
        revoked_at: '2026-08-15T00:00:00Z',
        list_id: 'rl-0001',
        reason: 'compromise',
        list_valid: false,
        list_validity_reason: 'shape_invalid: lists[0]',
      },
    },
    {
      case: 'invalid-leap-day-list-shape-invalid',
      kind: 'revocation',
      description: 'revoked_at 2027-02-29 does not exist (2027 is not a leap year); the list is shape-invalid.',
      input: q([badLeap], c.pub, '2026-10-14T00:00:00.000Z'),
      expected: { revoked: false, list_valid: false, list_validity_reason: 'shape_invalid: lists[0]' },
    },
    {
      case: 'at-invalid-leap-day',
      kind: 'revocation',
      description: 'at 2027-02-29T00:00:00Z is not a real date.',
      input: q([l1], c.pub, '2027-02-29T00:00:00Z'),
      expected: atInvalid,
    },
    {
      case: 'at-valid-leap-day',
      kind: 'revocation',
      description: 'at 2028-02-29T00:00:00Z exists (2028 is a leap year).',
      input: q([l1], c.pub, '2028-02-29T00:00:00Z'),
      expected: { revoked: true, revoked_at: '2026-08-15T00:00:00Z', list_id: 'rl-0001', reason: 'compromise', list_valid: true },
    },
    {
      case: 'at-invalid-leap-second',
      kind: 'revocation',
      description: 'Second 60 is rejected (leap seconds are not instants in this library).',
      input: q([l1], c.pub, '2026-06-30T23:59:60Z'),
      expected: atInvalid,
    },
    {
      case: 'at-year-0001-min',
      kind: 'revocation',
      description: 'Lower year bound 0001 is accepted; no list applies that early.',
      input: q([l1], c.pub, '0001-01-01T00:00:00Z'),
      expected: { revoked: false, list_valid: true },
    },
    {
      case: 'at-year-0000-rejected',
      kind: 'revocation',
      description: 'Year 0000 is outside 0001..9999.',
      input: q([l1], c.pub, '0000-12-31T23:59:59Z'),
      expected: atInvalid,
    },
    {
      case: 'at-year-9999-max',
      kind: 'revocation',
      description: 'Upper year bound 9999 is accepted.',
      input: q([l1], c.pub, '9999-12-31T23:59:59Z'),
      expected: { revoked: true, revoked_at: '2026-08-15T00:00:00Z', list_id: 'rl-0001', reason: 'compromise', list_valid: true },
    },
    {
      case: 'fractional-precision-boundary',
      kind: 'revocation',
      description: 'revoked_at ".5Z" equals at ".500Z"; comparison is on the instant, not the text, and is inclusive.',
      input: q([fractional], c.pub, '2026-08-15T00:00:00.500Z'),
      expected: { revoked: true, revoked_at: '2026-08-15T00:00:00.5Z', list_id: 'rl-fraction', reason: 'manual', list_valid: true },
    },
  ];
}

// ---------------------------------------------------------------------------
// Assembly
// ---------------------------------------------------------------------------

function json(v: unknown): string {
  return `${JSON.stringify(v, null, 2)}\n`;
}

/** Build the full suite as a map of repo-relative path -> file content. */
export function buildVerifierSuite(): Map<string, string> {
  const keys: Record<string, TestKey> = {};
  for (const n of KEY_NAMES) keys[n] = deriveKey(n);

  const files = new Map<string, string>();
  const root = 'vectors/verifier';
  for (const k of Object.values(keys)) {
    files.set(`${root}/keys/${k.name}.pub.txt`, `# ${TEST_KEY_NOTICE}\n${k.pub}\n`);
    const pem = k.privateKey.export({ format: 'pem', type: 'pkcs8' }) as string;
    files.set(`${root}/keys/${k.name}.pkcs8.pem`, `# ${TEST_KEY_NOTICE}\n${pem}`);
  }

  const cases = [...auditCases(), ...signatureCases(keys), ...revocationCases(keys)];
  for (const c of cases) {
    files.set(
      `${root}/${c.kind}/${c.case}.json`,
      json({ case: c.case, kind: c.kind, input: c.input, expected: c.expected }),
    );
  }
  files.set(
    `${root}/_meta.json`,
    json({
      suite: 'verifier',
      description:
        'Reference-verifier conformance suite (SDD §5). Every runtime port runs each case and must produce exactly `expected`.',
      contract_version: '8.8.0',
      generated_by: 'scripts/generate-verifier-vectors.ts',
      generated_at: '2026-10-14',
      keys: Object.values(keys).map((k) => ({ name: k.name, public_key: k.pub })),
      cases: cases.map((c) => ({ kind: c.kind, case: c.case, description: c.description })),
    }),
  );
  return files;
}

function main(): void {
  const repoRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
  const check = process.argv.includes('--check');
  const files = buildVerifierSuite();
  let drift = 0;
  for (const [rel, content] of files) {
    const abs = join(repoRoot, rel);
    if (check) {
      if (!existsSync(abs) || readFileSync(abs, 'utf8') !== content) {
        process.stderr.write(`drift: ${rel}\n`);
        drift += 1;
      }
      continue;
    }
    mkdirSync(dirname(abs), { recursive: true });
    writeFileSync(abs, content);
  }
  if (check && drift > 0) {
    process.stderr.write(`${drift} verifier vector file(s) differ; run npx tsx scripts/generate-verifier-vectors.ts\n`);
    process.exit(1);
  }
  process.stderr.write(`${check ? 'checked' : 'wrote'} ${files.size} files under vectors/verifier/\n`);
}

if (process.argv[1] !== undefined && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
