# Hashing Spec Freeze — v8.5.0

> **Status:** Frozen for v8.5.0
> **Date:** 2026-05-06
> **Hard pre-condition:** must commit before PR-A2.2 implementation work begins.
> **Source:** F5 (canonicalization-mode freeze) + G3 (size cap) + G4 (NFC mandate) + J1 (hash-domain contract)
> **See also:** [ADR-010](../adr/ADR-010-class-vs-policy-boundary.md), `src/utilities/safe-canonicalize.ts`, `vectors/_canonicalization-edge-cases/`

This document freezes the canonical-JSON-hash semantics for the v8.5.0
crypto-bearing surface. Drift in any spec below is a wire-protocol
break: signatures that verified yesterday must verify tomorrow.

## 1. Canonicalization mode

**RFC 8785 (JSON Canonicalization Scheme) is canonical.** Specifically:

- Object keys sorted lexicographically (Unicode code-point order).
- Numbers in shortest IEEE-754 double-precision representation
  (no trailing zeros; no `.0` for integer-valued floats).
- String escapes minimised — only `"`, `\`, and characters in the
  range `U+0000`–`U+001F` are escaped; forward slash is emitted
  literally.
- No whitespace between tokens.
- UTF-8 byte sequence as input to SHA-256.

The reference implementation is the `canonicalize` npm package (2.x),
called only from `src/utilities/safe-canonicalize.ts`. RULE-5 of the
class-vs-policy lint blocks every other call site so the cap and NFC
guarantees below cannot be bypassed.

## 2. Unicode NFC normalization (G4)

**NFC normalization is MANDATORY before RFC 8785 canonicalization.**
Every string field, including object keys, is NFC-normalized as the
first step of the hashing pipeline. RFC 8785 then operates on the
NFC-normalized payload.

The hash domain is the **NFC-canonical form**, not the raw wire byte
sequence. Identical-looking strings produced on different platforms
(varying IME compositions, copy-paste sources, OS-specific Unicode
handling) would otherwise generate different SHA-256 hashes — the
G4 mandate trades a documented contract for cross-platform
determinism.

### Consumer responsibility

When producing or verifying a hash externally:

- Apply NFC to all string fields *before* computing the hash.
- Treat the wire-byte form as irrelevant to hash equality — only
  the NFC-canonical form is the hash domain.
- Wire format SHOULD emit NFC-normalized strings to keep the gap
  small; strict-NFC wire enforcement (rejecting non-NFC inputs) is
  consumer-side policy, not Hounfour's concern.

### Implementation recipe

```typescript
import { safeCanonicalize } from '@0xhoneyjar/loa-hounfour';
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';

// Applies NFC + RFC 8785 internally; respects the 100 KB cap.
const canonical = safeCanonicalize(payload);
const hashHex = bytesToHex(sha256(new TextEncoder().encode(canonical)));
```

`safeCanonicalize` walks the payload tree and NFC-normalizes every
string (values and keys), then RFC-8785-canonicalizes, then enforces
the size cap.

## 3. Per-schema hash-payload field inclusion

The exact field set hashed for each v8.5.0 hash domain:

### `SignatureEnvelope.signed_payload_hash`

SHA-256 over RFC 8785 canonical JSON of:

- All fields of the wire artifact being signed.
- **EXCLUDING** `signatures[]` and any field literally named
  `signed_payload_hash`.
- The wire artifact's `body` field (or equivalent payload field)
  IS included.

### `RecallPack.pack_hash`

SHA-256 over RFC 8785 canonical JSON of:

- All fields of `RecallPack` EXCEPT `pack_hash` itself.
- Includes `items[]`, `redactions`, `exclusions`, `created_at`,
  `recall_request_ref`, etc.

### `RecallReceipt.receipt_hash`

SHA-256 over RFC 8785 canonical JSON of:

- All fields of `RecallReceipt` EXCEPT `receipt_hash` itself.
- Includes `pack_hash` (the reference) but EXCLUDES the recursive
  content of the referenced pack.
- Includes `detail_level`, `signed_at`, `signature_envelope`, etc.

### `CommitmentRoot.subject_hash`

SHA-256 over RFC 8785 canonical JSON of the **subject artifact**
(the thing being committed, not the `CommitmentRoot` envelope itself).
The subject artifact is referenced by `subject_hash`; the consumer is
responsible for retaining the subject artifact for re-verification.

### `Assertion.body_hash`

SHA-256 over RFC 8785 canonical JSON of:

- All fields of `Assertion` EXCEPT `body_hash`, `signatures[]`, and
  any field within `signatures[]`.

## 4. Null and absent-field handling

Hounfour discipline: `additionalProperties: false` means an optional
field that is *absent* MUST NOT be serialized as `null` or any
placeholder before hashing. **Absent ≠ null.**

A consumer wire artifact carrying `field: null` is a different object
than one without `field` at all — the canonicalized JSON for the
former includes `"field":null`, and the resulting hash differs. This
matches Hounfour's existing `additionalProperties: false` +
optional-via-absence discipline (per `SCHEMA-EVOLUTION.md`).

The `vectors/_canonicalization-edge-cases/null-absent/` corpus
locks this in: `null-present` and `absent` carry distinct hashes.

## 5. Performance + DoS guidance (G3)

`safeCanonicalize` enforces a **100 KB default cap** on the
canonical UTF-8 byte length:

```typescript
import { safeCanonicalize } from '@0xhoneyjar/loa-hounfour';

// Normative path — 100 KB cap.
const canonical = safeCanonicalize(payload);

// Explicit override — consumer assumes responsibility for the
// event-loop impact of synchronous canonicalization at this size.
const canonical = safeCanonicalize(payload, { maxBytes: 1_000_000 });
```

Rationale (run-2 SKP-001/gpt 910 CRITICAL + SKP-003/gpt 780 HIGH):
canonical-JSON-hash for >100 KB blocks the Node.js event loop long
enough to be a practical sync-DoS surface. The cap is the structural
defence. The override exists for consumers with their own
back-pressure mechanism.

Lint enforcement (RULE-5): direct `canonicalize` package imports
outside `src/utilities/safe-canonicalize.ts` are blocked. Bypassing
the cap requires editing the helper itself + getting CI past the
lint, surfacing the bypass in code review.

Async wrappers can be added if 100 KB still blocks event loops in
some context (cycle-005+ concern).

## 6. DSL builtin (R2 mitigation)

If PR-A2.2's first sub-task (DSL expressiveness audit against §3
hash-payload semantics) determines a `canonical_json_hash` builtin is
needed, it ships strict-additive in PR-A2.2 — mirroring the v8.4.0
`is_valid_dag` pattern. The builtin would call `safeCanonicalize`
internally; the cap and NFC guarantees apply uniformly.

If the audit determines no builtin is needed, no change.

## 7. Hash domain contract (J1) — round-trip vectors

The canonical hash-form contract is best demonstrated by round-trip
vectors: identical semantic content in different *input* forms
produces identical SHA-256 output. The `_canonicalization-edge-cases/`
corpus locks ≥5 such pairs.

| # | Pair | Demonstrates |
|---|------|--------------|
| 1 | `unicode/nfc-cafe` ↔ `unicode/nfd-cafe` | `é` (U+00E9) vs `e` + combining acute (U+0301) → identical hash |
| 2 | `unicode/nfc-korean` ↔ `unicode/nfd-korean` | precomposed Hangul syllable vs jamo decomposition → identical hash |
| 3 | `unicode/nfc-vietnamese` ↔ `unicode/nfd-vietnamese` | `ế` vs e + circumflex + acute → identical hash |
| 4 | `key-order/forward-alpha` ↔ `key-order/reverse-alpha` | `{w,x,y,z}` and `{z,y,x,w}` → identical hash after lex sort |
| 5 | `null-absent/null-present` vs `null-absent/absent` | distinct hashes — `field:null` differs from missing field |

Each fixture in the table ships three companion files:

- `<case>.input.json` — the input payload
- `<case>.canonical.txt` — the locked-in canonical UTF-8 string
- `<case>.hash.txt` — locked-in SHA-256 hex of the canonical bytes

Run the corpus from
`tests/vectors/canonicalization-edge-cases.test.ts`; it re-derives
canonical + hash for every fixture and asserts byte-equality with the
locked-in expectations. Pairs flagged `hash_equal_with` in the
catalog's `_meta.json` get an additional cross-check that both inputs
land at the same SHA-256 output.

## 8. Versioning + migration

This spec is **frozen** for v8.5.0. Changes (e.g. moving to RFC 8785
v2 if/when ICU updates Unicode tables) require a MAJOR version bump
because they alter every shipped `*_hash` field's value.

Pre-v8.5.0 hash domains (`AuditEntry.hash`, scoring-path hashes,
reputation-replay hashes, signature.ts) **do NOT use NFC
normalization** — they are kept on direct `canonicalize` per
SDD R15 to preserve hash equality with already-shipped consumer
data. The lint allowlist documents each legacy caller with its
rationale.

## 9. Implementation checklist

- [x] `src/utilities/safe-canonicalize.ts` shipped (PR-A2.1 prior commit)
- [x] 100 KB cap default; override accepted; both behaviours tested
- [x] NFC normalization applied to values + keys
- [x] `vectors/_canonicalization-edge-cases/` corpus committed (≥30 fixtures)
- [x] Round-trip pairs verified by `tests/vectors/canonicalization-edge-cases.test.ts`
- [x] RULE-5 lint blocks bypass via direct `canonicalize` import
- [ ] Per-schema hash-payload field set encoded in PR-A2.2 schemas
- [ ] DSL builtin decision made in PR-A2.2 sub-task 1
