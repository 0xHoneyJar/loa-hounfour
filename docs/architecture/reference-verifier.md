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
and the first failing step decides the result. Each reason is produced
identically by both reference runtimes:

| Step | `verified` | `reason` | TS trigger | Go trigger |
|------|-----------|----------|------------|------------|
| 1 | `false` | `envelope_not_object` | envelope is null, an array or a primitive | envelope is not `map[string]any` |
| 1 | `false` | `options_invalid` | `signatureField` not a non-empty string, or `omitFields` not a string array | `SignatureField` points at `""` (type errors are caught when decoding options) |
| 2 | `'unverifiable'` | `signature_missing` | signature field absent, `undefined` or `null` | key absent or value `nil` |
| 3 | `false` | `signature_malformed` | value not `ed25519:` + 86 canonical base64url chars | same, with an explicit alphabet check |
| 4 | `false` | `public_key_malformed` | not 32 bytes or `ed25519-pub:` + 43 canonical chars; WebCrypto `DataError` on import | not 32 bytes or `ed25519-pub:` + 43 canonical chars |
| 5 | `false` | `canonical_nfc_failed` | a string or key holds an unpaired UTF-16 surrogate | a string or key is not valid UTF-8 (`ErrCanonicalNFC`) |
| 5 | `false` | `canonical_key_collision` | `CanonicalizeKeyCollisionError` | `ErrCanonicalKeyCollision` |
| 5 | `false` | `canonical_size_cap_exceeded` | `CanonicalizeSizeError` (over 100 000 bytes) | `ErrCanonicalSizeCap` |
| 5 | `false` | `canonicalization_failed` | any other canonicalisation error, such as BigInt or a cycle | any other error, such as an unencodable Go value |
| 6 | `'unverifiable'` | `webcrypto_ed25519_unavailable` | no `crypto.subtle`, or Ed25519 unsupported | never (Go always has `crypto/ed25519`) |
| 7 | `false` | `signature_mismatch` | WebCrypto verify returns false | `ed25519.Verify` returns false |
| 7 | `true` | (none) | verifies | verifies |
| any | `false` | `verification_error` | unexpected exception, such as a hostile Proxy | never (no equivalent input) |

**Why `canonical_nfc_failed` means "ill-formed string".** NFC normalisation
itself cannot fail on well-formed input in either runtime:
`String.prototype.normalize` never throws, and Go's `norm.NFC` accepts any
valid UTF-8. The only input with no NFC form is a string that is not
well-formed Unicode. In JSON that is an unpaired surrogate escape such as
`"\ud800"`. JavaScript keeps it as a lone UTF-16 code unit, and the JCS
writer would emit it as an escape. `encoding/json` in Go silently
replaces it with U+FFFD, so the two runtimes would sign different bytes.
Both reference runtimes therefore reject such strings before
canonicalisation. The Go parser keeps the code unit, as 3-byte WTF-8, so
the rejection can happen. Raw invalid UTF-8 bytes in a document are a
different case. They are decoded to U+FFFD by the WHATWG maximal-subpart
rule, exactly as Node's UTF-8 decoder does, before parsing in both
runtimes. Vector: `signature/lone-surrogate-nfc-failed`.

`'unverifiable'` is not a pass. A caller that requires a signature
treats it as a failure.

`lookupRevocation(lists, signerKeyId, at)` takes `at` as a `Date` or a strict ISO 8601 UTC string (`YYYY-MM-DDTHH:MM:SS(.f{1,9})?Z`). It returns `{ revoked, revoked_at?, list_id?, reason?, list_valid, list_validity_reason?, error? }`:

- When `at` is not a valid instant, no lookup runs. The result is `{ revoked: false, list_valid: false, list_validity_reason: 'at_invalid', error: 'at_invalid' }`, and callers check `error` before `revoked`. The function never throws for `at`.

- A list is applicable when `valid_from <= at` and (`valid_until` is null or `at < valid_until`).
- The key is revoked when an applicable list has an entry with `key_id == signerKeyId` and `revoked_at <= at`.
- Applicable lists rank by `issued_at` descending, ties in input order. When revoked, `list_id`, `revoked_at` and `reason` come from the highest-ranked list carrying an effective entry. Otherwise `list_id` names the highest-ranked applicable list, or is absent.
- Every timestamp must name a real instant. That means year 0001..9999, month 01..12, a day that exists in that month under proleptic Gregorian leap years, hour 00..23, minute 00..59 and second 00..59. Leap seconds (`:60`) are rejected. RFC 3339 allows them, but the library's other UTC patterns and JavaScript `Date` do not. The schema pattern does not range-check these fields, so a list holding `2026-13-40T99:99:99Z` or `2027-02-29T00:00:00Z` is treated as shape-invalid. An `at` like that returns `at_invalid`.
- Lists failing `RevocationListSchema` shape validation are ignored. They set `list_valid: false` and `list_validity_reason: "shape_invalid: lists[i], ..."`.
- Instants compare at nanosecond resolution on their text, after padding the fractional seconds to nine digits. A `Date` argument carries milliseconds; a string argument keeps its full nanosecond precision. In Go, `LookupRevocationAt` takes the string form and `LookupRevocation` takes a `time.Time`.

## Why the Go runner has its own JSON parser

The Go port parses JSON with a small purpose-built parser,
`ParseJSON` in `vectors/runners/go/verify/jcs.go`, not `encoding/json`.
The goal is parity with what a JavaScript verifier sees after reading
the bytes as UTF-8 and calling `JSON.parse`. Signatures cover exact
bytes, so any silent difference between the runtimes would show up as a
signature that verifies in one runtime and not the other.

- **Unpaired surrogates are preserved.** JavaScript keeps an escape such
  as `"\ud800"` as a lone UTF-16 code unit. `encoding/json` silently
  substitutes U+FFFD. `ParseJSON` keeps the code unit as its 3-byte WTF-8
  form, so the canonicaliser can reject it as `canonical_nfc_failed`, as
  TS does.
- **Duplicate keys are rejected.** `JSON.parse` and `encoding/json` both
  take the last value for a repeated key. RFC 8785 §3.2.3 forbids
  duplicates, and last-key-wins lets two parsers read different values
  from the same bytes, so `ParseJSON` returns `ErrDuplicateKey`.
- **Invalid UTF-8 bytes decode like Node's.** They are replaced with
  U+FFFD per the WHATWG maximal-subpart rule before parsing.

The cost is about 280 lines of parser to maintain in place of a standard
library call. That cost is accepted deliberately: no standard Go API
exposes unpaired surrogates. Tests keep the parser honest. Every
committed `vectors/**/*.json` file must parse to the same tree as
`encoding/json` with `UseNumber` wherever no surrogate edge or duplicate
key is involved, and unit tests cover malformed input, the surrogate
paths and Node-derived decoding cases.

The Go functions also recover from panics caused by hostile dynamic
values, such as a `json.Marshaler` that panics. The signature check
reports those as `verification_error`, like the TS catch-all, and
revocation lookup treats the affected list as shape-invalid. Recursion
over value trees stops at `MaxTreeDepth`, so a cyclic Go map gives
`canonicalization_failed` instead of a fatal stack overflow. Nesting
deep enough to hit a runtime's own stack limit, roughly ten thousand
levels in V8, is outside the conformance contract.

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
   above, using your platform's RFC 8032 Ed25519 verify. Validate options
   inside the core function so typed APIs report `options_invalid` too.
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
