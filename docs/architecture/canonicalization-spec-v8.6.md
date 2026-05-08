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

Within each object, keys are sorted **lexicographically by Unicode code point** (NOT by UTF-16 code unit; NOT by collation). RFC 8785 §3.2.3 specifies this explicitly. Surrogates participate as their code-point value.

Empty objects produce `{}`; the order rule is vacuous for them.

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

For `plan_content_hash` the canonical input is the **concatenation** of three documents in fixed order:

```
plan_canonical_bytes = canonicalize(prd_md_text) || "\n---\n" || canonicalize(sdd_md_text) || "\n---\n" || canonicalize(sprint_md_text)
plan_content_hash = "sha256:" + lowercase_hex(sha256(plan_canonical_bytes))
```

Where `||` is byte concatenation, `\n---\n` is a fixed 5-byte separator (newline, three hyphens, newline), and `prd_md_text`/`sdd_md_text`/`sprint_md_text` are the **raw markdown contents** of the three files (NOT stripped of frontmatter; NOT normalized except by step §3 / §7).

The separator prevents the boundary-collapse attack where one document ends with text another document begins with. The fixed order (PRD, SDD, sprint) is normative — alphabetical order would create a different hash and is forbidden.

## 10. Cross-runner verification

Cross-runner harness (FR-A2, ships in PR-A3.9) exercises this spec across TS + Python + Go + Rust runners against every v8.5.0 + v8.6.0 conformance vector. A divergence on any vector fails CI. Reference golden corpus is the TS `safeCanonicalize` output; non-TS runners reproduce it byte-exact.

## 11. Versioning + drift

This document is **frozen at v8.6.0 GA**. Future amendments require:
- New ADR (or amendment to ADR-010) capturing the algorithm change
- v9.0.0 MAJOR cycle (canonicalization changes are semver-non-additive — every v8.6.x consumer's stored hashes become invalid under any spec change)
- A migration table mapping pre-change hashes to post-change hashes

Pre-cycle-005 hash domains (v8.4.0 `signature.ts`, v7.11.0 `scoring-path-hash.ts`, v8.0.0 `audit-trail-hash.ts`) are explicitly **NOT** governed by this spec — they retain their original canonicalization for stored-hash stability per ADR-010 §exception. The class-vs-policy lint allowlist at `scripts/check-class-policy-boundary.allowlist.json` documents each.

## 12. Open items (filled in by later PRs)

- [ ] PR-A3.4: Add "PhaseCompletion canonicalization profile" subsection covering `nonce` base64url normalization + `sequence`/`signer_key_version` string-encoded integer canonical form.
- [ ] PR-A3.5: Add "OracleDigest canonicalization profile" subsection covering Markdown body byte-counting (NOT canonicalization — the markdown stays raw; the field's NFR-4 cap measures UTF-8 bytes of the field value, not canonicalized form).
- [ ] PR-A3.6: Add "PlanSignoff/Amendment canonicalization profile" subsection nailing down the `\n---\n` separator and the FR-C4 ledger-snapshot canonical form.
- [ ] PR-A3.9: Add "Cross-runner conformance" appendix listing per-language NFC + JCS library bindings.
- [ ] PR-A3.12: Lock-and-freeze; remove "scaffold" status; update `Status:` line to "Frozen at v8.6.0".
