# Canonicalization Spec — v8.6.0

**Status**: Scaffold authored at PR-A3.0; expanded inline with each schema-shipping PR (A3.4, A3.5, A3.6) and finalized at PR-A3.12.
**Authoring date**: 2026-05-08
**Predecessors**: `docs/architecture/hashing-spec-freeze-v8.5.md` (v8.5.0 G3 hash-domain freeze)
**Reference implementation**: `src/utilities/safe-canonicalize.ts` (re-exported from `@0xhoneyjar/loa-hounfour/integrity` under `@experimental` per ADR-010 carve-out)
**ADR**: [ADR-010 — Class-vs-Policy Boundary](../adr/ADR-010-class-vs-policy-boundary.md)

---

## 1. Why this document exists

cycle-005 ships several v8.6.0 schemas whose contracts depend on cross-language byte-identical canonicalization:

- `PhaseCompletionEnvelopeSchema` (FR-B2) — 4 KB canonical-JSON cap (NFR-4); hash-chain integrity via `prev_envelope_hash`.
- `OracleDigestSchema` (FR-B3) — 4 KB Telegram-variant size cap.
- `PlanSignoffEnvelopeSchema` (FR-B9) — `plan_content_hash` is SHA-256 over the canonicalized concatenation of `{prd_md, sdd_md, sprint_md}`.
- `PlanAmendmentRequestSchema` (FR-B10) — `parent_plan_hash` follows the same rule.
- FR-C builtins (`nonce_unique_per_signer_window`, `sequence_monotonic_per_cluster`, `chain_validator_prev_hash`, `plan_content_hash_unchanged_since_signoff`) — operate on canonical-form inputs.

Cross-language parity (NFR-3, hard pre-major-release gate) requires that TS, Python, Go, and Rust runners produce **byte-identical** output for the same input. RFC 8785 alone is not sufficient: it specifies key sorting, escape-minimal encoding, and Unicode handling at the JSON layer, but says nothing about Unicode normalization, decimal precision normalization beyond IEEE 754 round-tripping, or input pre-processing. This document is the normative complement.

## 2. Algorithm

```
canonicalize(value: any) -> bytes:
  v0 = nfc_normalize_strings_recursive(value)        // §3
  v1 = drop_undefined_and_function_values(v0)        // §4
  v2 = sort_object_keys_recursive(v1)                // §5
  s  = rfc8785_serialize(v2)                         // §6
  b  = utf8_encode(s)                                // §7
  if len(b) > MAX_BYTES_DEFAULT (100_000): error      // §8
  return b
```

`hash(value: any) -> "sha256:<hex>"`:
```
b = canonicalize(value)
h = sha256(b)
return "sha256:" + lowercase_hex(h)
```

## 3. NFC normalization

Every string value (object key OR string value) at every depth is normalized to **Unicode NFC** before any other step. Rationale: an NFD-form string and an NFC-form string with identical visible content produce different UTF-8 byte sequences and therefore different SHA-256 hashes — a class of cross-platform mismatch the v8.5.0 freeze identified and the FR-C/FR-B9 plan-hash builtin would otherwise inherit.

Reference: TR15 NFC. Implementations:
- TypeScript: `String.prototype.normalize('NFC')`
- Python: `unicodedata.normalize('NFC', s)`
- Go: `golang.org/x/text/unicode/norm.NFC.String(s)`
- Rust: `unicode-normalization` crate, `s.nfc().collect::<String>()`

NFC is applied **before** RFC 8785 serialization, not after, so the canonical bytes reflect the normalized form.

## 4. Drop undefined / function values

JavaScript-specific input shapes contain `undefined` and `Function` values that JSON cannot represent. Other runtimes will not produce these inputs, so the normalization is a no-op for non-JS callers. For JS callers:

- Object keys whose value is `undefined` or a `Function` are removed (parallel to `JSON.stringify`).
- Array slots holding `undefined` become `null` (parallel to `JSON.stringify`).
- Array slots holding `Function` become `null`.

This step preserves shape parity with `JSON.stringify` output. The reference TS implementation handles this; non-TS runners producing JSON-clean inputs need no equivalent.

## 5. Object key ordering

Within each object, keys are sorted **lexicographically by UTF-16 code unit of the JSON member name**, exactly as RFC 8785 §3.2.3 prescribes. For Basic Multilingual Plane characters (the vast majority of schema field names — ASCII, Latin-1, CJK ideographs ≤ U+FFFF) this ordering is identical to Unicode-code-point ordering. For characters above U+FFFF (e.g. emoji, ancient scripts, supplementary planes) the UTF-16 surrogate pair encoding governs order, NOT the underlying code point. Two strings whose only difference is a supplementary character may sort differently under UTF-16 code units than under code points; cross-language runners MUST reproduce the UTF-16-code-unit ordering byte-exact.

Empty objects produce `{}`; the order rule is vacuous for them.

Rationale: RFC 8785 chose UTF-16 code units for symmetry with ECMAScript string-comparison semantics (`String.prototype.localeCompare(other, undefined, { sensitivity: 'variant' })` semantics, plus JS array-sort default). Diverging from RFC 8785 here would break cross-language hash parity with any consumer that mirrored the published reference. Schema-author guidance: avoid non-BMP characters in JSON keys — the conformance window for cross-language UTF-16 ordering is hardest to defend at the surrogate boundary.

## 6. RFC 8785 serialization

After NFC + key-ordering, the value is serialized per RFC 8785 (JCS):

- No insignificant whitespace.
- Strings escape per RFC 8259 §7 *minimal* form: `"`, `\`, and `U+0000`..`U+001F` only. Solidus (`/`) is NOT escaped. Non-ASCII Unicode is emitted as raw UTF-8 (no `\uXXXX` escapes).
- Numbers emit per ECMAScript `Number.prototype.toString` (which RFC 8785 §3.2.2.3 prescribes via JS-specific shortest-round-trip rules). Integers below 2^53 emit without exponent; finite non-integers may use `e±N`.
- `true`, `false`, `null` are literals.

Rationale: every runtime has a JCS implementation or a clear porting target.

## 7. UTF-8 encoding

The serialized JSON string is encoded as UTF-8 with no BOM, no leading/trailing whitespace, and no platform-specific line endings (no `\r\n`).

## 8. Size cap

Default `MAX_BYTES_DEFAULT = 100_000` (100 KB) per `SAFE_CANONICALIZE_DEFAULT_MAX_BYTES` (existing v8.5.0 constant, retained unchanged in cycle-005). Rationale: synchronous canonicalization is `O(n log n)`; SHA-256 over the bytes is `O(n)`; combined work at >100 KB blocks the Node.js event loop measurably on commodity hardware.

Callers that genuinely need larger payloads override `maxBytes` and assume the back-pressure responsibility. The NFR-4 4 KB cap on individual envelope schemas (FR-B2, FR-B3) is enforced at the schema-refinement layer and is independent of this 100 KB outer cap.

## 9. Plan-content-hash composition (FR-B9 / FR-C4)

`plan_content_hash` is computed over the **byte-concatenation** of three markdown documents in fixed order. Markdown bodies are **NOT** passed through `canonicalize()` from §2 — that function is RFC 8785 JSON serialization, which would JSON-quote and escape-encode the entire markdown string and produce different bytes than the source file. Markdown is treated as opaque-text-with-NFC, not as a JSON value.

```
nfc_utf8(s)              := utf8_bytes(nfc_normalize(s))                    // §3 + §7 applied to a string
plan_canonical_bytes     := nfc_utf8(prd_md_text)
                          || "\n---\n"
                          || nfc_utf8(sdd_md_text)
                          || "\n---\n"
                          || nfc_utf8(sprint_md_text)
plan_content_hash        := "sha256:" + lowercase_hex(sha256(plan_canonical_bytes))
```

Where:
- `||` is byte concatenation.
- `\n---\n` is a fixed 5-byte separator (`0x0A 0x2D 0x2D 0x2D 0x0A`). Three hyphens flanked by line-feeds — no carriage returns, no surrounding whitespace.
- `prd_md_text` / `sdd_md_text` / `sprint_md_text` are the **raw markdown contents** of the three source files. Frontmatter is **not** stripped; trailing whitespace is **not** trimmed; line endings are **not** normalized beyond what step §7 forbids (no `\r\n` permitted in the source files themselves — emit a hard error if found).

The separator prevents the boundary-collapse attack where one document ends with text another document begins with. The fixed order (PRD, SDD, sprint) is normative — alphabetical order would create a different hash and is forbidden.

### 9.1 Worked example

Given:
- `prd_md_text = "# PRD\n"` (6 source bytes; NFC unchanged; UTF-8 `23 20 50 52 44 0A`)
- `sdd_md_text = "# SDD\n"` (6 source bytes; UTF-8 `23 20 53 44 44 0A`)
- `sprint_md_text = "# Sprint\n"` (9 source bytes; UTF-8 `23 20 53 70 72 69 6E 74 0A`)

Then:
```
plan_canonical_bytes (hex):
  23 20 50 52 44 0A                          // "# PRD\n"
  0A 2D 2D 2D 0A                             // separator
  23 20 53 44 44 0A                          // "# SDD\n"
  0A 2D 2D 2D 0A                             // separator
  23 20 53 70 72 69 6E 74 0A                 // "# Sprint\n"
plan_canonical_bytes length: 31 bytes
plan_content_hash: "sha256:" + lowercase_hex(sha256(<the 31 bytes above>))
```

A conformance vector under `vectors/plan-content-hash/v8.6.0/` will lock the resulting hash byte-exact at PR-A3.6 (FR-C4 builtin lands).

## 10. Cross-runner verification

Cross-runner harness (FR-A2, ships in PR-A3.9) exercises this spec across TS + Python + Go + Rust runners against every v8.5.0 + v8.6.0 conformance vector. A divergence on any vector fails CI. Reference golden corpus is the TS `safeCanonicalize` output; non-TS runners reproduce it byte-exact.

## 11. Versioning + drift

This document is **frozen at v8.6.0 GA**. Future amendments require:
- New ADR (or amendment to ADR-010) capturing the algorithm change
- v9.0.0 MAJOR cycle (canonicalization changes are semver-non-additive — every v8.6.x consumer's stored hashes become invalid under any spec change)
- A migration table mapping pre-change hashes to post-change hashes

Pre-cycle-005 hash domains (v8.4.0 `signature.ts`, v7.11.0 `scoring-path-hash.ts`, v8.0.0 `audit-trail-hash.ts`) are explicitly **NOT** governed by this spec — they retain their original canonicalization for stored-hash stability per ADR-010 §exception. The class-vs-policy lint allowlist at `scripts/check-class-policy-boundary.allowlist.json` documents each.

## 11.1 PhaseCompletion canonicalization profile (FR-B2, PR-A3.4)

The `PhaseCompletionEnvelopeSchema` (Tier-2) declares a 4 KB canonical-
JSON cap via the `'x-canonical-size-cap-bytes': 4096` TypeBox metadata.
The profile pins the wire-form invariants for the fields participating
in the cap measurement and in the FR-C1/C2/C3 cross-record builtins.

### Field-level canonicalization

| Field | Canonical form | Notes |
|---|---|---|
| `signer_cluster_id` | UTF-8 bytes (NFC-normalized at the canonicalize layer) | Consumer-shaped; hounfour does not freeze the namespace. The CT-08 builtin compares this field byte-exact across the (Tier-2 record, supplied state) pair — producers MUST NFC-normalize before emission. |
| `signer_key_version` | Decimal string with `^[1-9][0-9]*$` (no leading zero; never `"0"` — key versions are 1-indexed by convention). Consumer parses to BigInt at the comparison boundary (CT-03). | Stable across cross-runner: the wire form is the canonical form. |
| `signer_key_id` | Lowercase 64-hex SHA-256 of `NFC(signer_cluster_id) || ':' || NFC(signer_key_version)`. **Both inputs are NFC-normalized BEFORE hashing** per iter-1 review e0c46b14 (homograph-attack mitigation). | The `signer_key_id_matches_derivation` LOCAL builtin enforces this invariant; case-insensitive comparison admits uppercase hex on the wire. **Cross-runner authors MUST NFC-normalize before equivalent sha256 update calls** — Go `golang.org/x/text/unicode/norm.NFC.String`, Python `unicodedata.normalize('NFC', ...)`, Rust `unicode_normalization::UnicodeNormalization::nfc()`. |
| `cluster_signature` | `ed25519:` prefix + 86-char unpadded base64url (RFC 4648 §5). | Mirrors `SignatureEnvelope.signature_value`; produced from a 64-byte Ed25519 signature. |
| `prev_envelope_hash` | `sha256:` prefix + 64-hex digest. Genesis-position envelopes use `"sha256:0000000000000000000000000000000000000000000000000000000000000000"` (64 zeros) as the chain anchor. | FR-C3 `chain_validator_prev_hash` cross-checks the chain. |
| `ingested_emission.nonce` | 22-char unpadded base64url. 16-byte / 128-bit nonce → exactly 22 chars (`ceil(16 * 8 / 6) = 22`). | FR-C1 `nonce_unique_per_signer_window` operates on the wire string directly — no decoding to bytes; the comparison is byte-stable across runners. |
| `ingested_emission.sequence` | Decimal string, `^[0-9]+$` (admits `"0"` as canonical zero). Consumer parses to BigInt at CT-03 boundary. | FR-C2 `sequence_monotonic_per_cluster` uses BigInt comparison; arbitrarily-large sequences are supported (no JS Number precision loss). |
| `ingested_emission.timestamp`, `ingest_timestamp` | ISO 8601 UTC with `Z` suffix and optional 1-9 digit fractional seconds. Non-UTC offsets (`+05:30`, `-08:00`) NOT accepted. | Removes the cross-language serialization variance (Java `Instant.toString` vs. Python `isoformat()`) by pinning to UTC + literal `Z`. |

### NFR-4 4 KB cap measurement

The `canonical_size_cap` LOCAL builtin (PR-A3.4) computes
`Buffer.byteLength(safeCanonicalize(envelope), 'utf8')` and asserts
the result is ≤ 4096. The measurement is over the **entire Tier-2
envelope** including the `ingested_emission` Tier-1 sub-record.
Producers wishing to fit within the cap have these levers:

1. **`payload` size** — the largest variable-shape field. A ~3.5 KB
   payload + the fixed-shape envelope wrapper typically fits within
   the cap; larger payloads need to split across multiple envelopes.
2. **`signer_cluster_id` length** — short stable identifiers preferred
   (the field appears verbatim in the canonical form; a 100-char
   cluster_id consumes 100 bytes of the cap).
3. **`agent_key_pubkey`** — fixed at 56 chars (12 prefix + 43 base64url
   for the 32-byte Ed25519 public key). Not a lever.

The cap is structural-layer enforcement: a payload that exceeds the
cap is REJECTED at validate() time (when the constraint file is
evaluated). Consumers wishing to bypass the cap during transport
(e.g., for diagnostic dumps) MUST NOT use the FR-B2 envelope shape —
they need a custom envelope with a wider cap declared via the same
`'x-canonical-size-cap-bytes'` metadata pattern.

### Cross-runner conformance

For PR-A3.4, the TS reference is the source of truth. The 35 fixtures
under `vectors/PhaseCompletionEnvelope/v8.6.0/{valid,invalid,boundary}`
serve as the byte-exact corpus that PR-A3.9's cross-runner harness
will exercise against Python/Go/Rust runners.

## 12. Open items (filled in by later PRs)

- [x] PR-A3.4: "PhaseCompletion canonicalization profile" — see §11.1.
- [ ] PR-A3.5: Add "OracleDigest canonicalization profile" subsection covering Markdown body byte-counting (NOT canonicalization — the markdown stays raw; the field's NFR-4 cap measures UTF-8 bytes of the field value, not canonicalized form).
- [ ] PR-A3.6: Add "PlanSignoff/Amendment canonicalization profile" subsection nailing down the `\n---\n` separator and the FR-C4 ledger-snapshot canonical form.
- [ ] PR-A3.9: Add "Cross-runner conformance" appendix listing per-language NFC + JCS library bindings.
- [ ] PR-A3.12: Lock-and-freeze; remove "scaffold" status; update `Status:` line to "Frozen at v8.6.0".
