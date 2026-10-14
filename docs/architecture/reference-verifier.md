# Reference verifier (v8.8.0, FR-C2)

> **Status:** shipped in v8.8.0.
> **Code:** `src/integrity/verify.ts` (TS), `vectors/runners/go/verify/` (Go).
> **Suite:** `vectors/verifier/`. **Parity:** `npm run verifier:parity`.
> **See also:** [ADR-010](../adr/ADR-010-class-vs-policy-boundary.md),
> [hashing-spec-freeze-v8.5.md](hashing-spec-freeze-v8.5.md),
> [revocation-list-protocol.md](../revocation-list-protocol.md).

hounfour ships envelope shapes that carry signatures, hash chains and
revocation lists. Until v8.8.0 every consumer re-derived the byte-level
rules for checking them. The reference verifier pins those rules down
as three pure functions, a language-neutral conformance suite, and two
implementations (TS and Go) that must agree on every case.

## What is verified

| Check | TS | Go | Answers |
|-------|----|----|---------|
| Audit-trail integrity | `verifyAuditTrailIntegrity` (unchanged, `src/commons/audit-trail-hash.ts`) | `VerifyAuditTrailIntegrity` | Does each entry's `entry_hash` match its content, and does `previous_hash` link to the prior entry (entry 0 to `genesis_hash`)? |
| Envelope signature | `verifyEnvelopeSignatureEd25519` | `VerifyEnvelopeSignatureEd25519` | Does this Ed25519 signature verify over the envelope's canonical signing input under this public key? |
| Revocation lookup | `lookupRevocation` | `LookupRevocation` | Was this key revoked at instant T according to these lists? |

All three are facts about bytes. None of them returns "accept" or
"reject" for an envelope.

## Signing-input convention

The signed bytes of an envelope are:

```
UTF-8( safeCanonicalize( envelope minus omitted fields ) )
```

`safeCanonicalize` is the v8.5.0 sanctioned pipeline:

1. NFC-normalise every string value and every object key. Two distinct
   keys that fold to the same NFC form are an error (`canonical_key_collision`).
2. RFC 8785 JCS: keys sorted by UTF-16 code units, ECMAScript number
   formatting, minimal string escaping, no whitespace.
3. Reject canonical output above 100 000 UTF-8 bytes (`canonical_size_cap_exceeded`).

Fields omitted from the signing input, per envelope family:

| Envelope family | Signature field | Omitted fields |
|-----------------|-----------------|----------------|
| `RevocationList` | `signature` | `signature`, `quorum_signatures` |
| `RevocationList` quorum entry | `quorum_signatures[i].signature` | same bytes as the primary signature |
| Single-signature envelopes with a top-level `signature` string (default) | `signature` | `signature`, `quorum_signatures` (absent fields are a no-op) |
| Any other layout | `options.signatureField` | `options.omitFields`, plus the signature field |

The signature field is always omitted, even if `omitFields` forgets it,
because a signature cannot sign itself. Hash domains that are NOT
signatures (`SignatureEnvelope.signed_payload_hash`, `RecallPack.pack_hash`,
and so on) keep their own field-inclusion rules from
`hashing-spec-freeze-v8.5.md` §3.

Audit-entry hashing predates the NFC mandate and stays on raw RFC 8785
with no NFC step and no size cap (`hashing-spec-freeze-v8.5.md` §8).
Ports must not normalise there. The `valid-3-entries` case carries an
NFD string to catch a port that does.

Signature and key encodings are strict unpadded base64url (RFC 4648 §5):
`ed25519:` + 86 chars (64 bytes) and `ed25519-pub:` + 43 chars (32 bytes).
Encodings whose unused trailing bits are non-zero are rejected as
malformed. Go's decoder skips newlines, so the Go port checks the
alphabet explicitly first.

## Result vocabulary

`verifyEnvelopeSignatureEd25519` never throws. Checks run in this order
and the first failing step decides the result:

| Step | `verified` | `reason` |
|------|-----------|----------|
| envelope not a plain object | `false` | `envelope_not_object` |
| options not usable | `false` | `options_invalid` |
| signature field absent | `'unverifiable'` | `signature_missing` |
| signature not `ed25519:` + 64 canonical bytes | `false` | `signature_malformed` |
| public key not 32 bytes / `ed25519-pub:` + 32 canonical bytes | `false` | `public_key_malformed` |
| canonicalisation failed | `false` | `canonical_size_cap_exceeded`, `canonical_key_collision`, `canonical_nfc_failed`, `canonicalization_failed` |
| runtime lacks WebCrypto Ed25519 | `'unverifiable'` | `webcrypto_ed25519_unavailable` |
| signature does not verify | `false` | `signature_mismatch` |
| verifies | `true` | (none) |

`'unverifiable'` is not a pass. A caller that requires a signature
treats it as a failure.

`lookupRevocation` returns `{ revoked, revoked_at?, list_id?, reason?, list_valid, list_validity_reason? }`:

- A list is applicable when `valid_from <= at` and (`valid_until` is null or `at < valid_until`).
- The key is revoked when an applicable list has an entry with `key_id == signerKeyId` and `revoked_at <= at`.
- Applicable lists rank by `issued_at` descending, ties in input order. When revoked, `list_id`, `revoked_at` and `reason` come from the highest-ranked list carrying an effective entry. Otherwise `list_id` names the highest-ranked applicable list, or is absent.
- Lists failing `RevocationListSchema` shape validation are ignored. They set `list_valid: false` and `list_validity_reason: "shape_invalid: lists[i], ..."`.
- Instants compare at nanosecond resolution on their text, after padding the fractional seconds to nine digits. The TS `at` argument is a `Date`, so it carries milliseconds.

## What is NOT verified

These are deliberate non-constraints (ADR-010: hounfour ships shape, not authority):

- **Key resolution.** The verifier does not map `signer_key_id` or any
  other identifier to key material. The caller passes the public key from
  its own keyring, and decides whether `signer_key_id` must equal it.
- **Signer competence.** `SignerCompetenceRule` is not evaluated. Whether
  this signer may sign this envelope is consumer policy.
- **Quorum policy.** The verifier checks one signature per call. m-of-n
  thresholds, distinctness and membership are consumer policy (RL-12
  covers the shape-level part).
- **Revocation-list trust.** `lookupRevocation` does not verify list
  signatures, cross-field invariants RL-1..RL-12, chain linkage, nonce
  monotonicity or freshness (`max_staleness_seconds`). Verify each list's
  signature with `verifyEnvelopeSignatureEd25519` and run
  `validate(RevocationListSchema, ...)` before trusting it.
- **Envelope validity.** Neither function validates the envelope against
  its schema. Run `validate()` separately.

## Porting to another language

1. Implement `ParseJSON` that rejects duplicate object keys. Last-key-wins
   parsers let two runtimes read different values from the same bytes.
2. Implement `safeCanonicalize`: NFC with collision detection, RFC 8785,
   and the 100 KB cap. Run it against `vectors/_canonicalization-edge-cases/`
   (input, canonical text and SHA-256 per fixture) and the shared files in
   `vectors/runners/_shared/`. Use NFC tables for the same Unicode version
   as your TS runtime's ICU if you handle recently assigned code points.
3. Implement the audit-entry hash with raw RFC 8785, no NFC, and the
   domain-tag sanitisation grammar from `src/commons/audit-trail-hash.ts`.
4. Implement the signature check with the step order and reason codes
   above, using your platform's RFC 8032 Ed25519 verify.
5. Implement revocation lookup, validating list shape with the generated
   `schemas/revocation-list.schema.json`.
6. Run every `vectors/verifier/<kind>/<case>.json` file. Each holds
   `{ case, kind, input, expected }`, and your result must equal `expected`
   exactly, with absent fields absent. `vectors/verifier/_meta.json` lists
   the cases. The Go port (`vectors/runners/go/verify/`) is a compact
   worked example.

Known edge outside the suite: Ed25519 libraries differ on public keys
that are not valid curve points. WebCrypto may reject them at import,
which gives `public_key_malformed`, while Go's `ed25519.Verify` returns
false, which gives `signature_mismatch`. Both are `verified: false`.

## Regenerating the suite

`npx tsx scripts/generate-verifier-vectors.ts` rewrites `vectors/verifier/`
from fixed seeds and literal timestamps. Ed25519 signing is deterministic,
so the output is byte-identical on every run. `--check` exits 1 on drift,
and `tests/integrity/verifier-vectors.test.ts` asserts the same. The keys
under `vectors/verifier/keys/` are test keys only.
