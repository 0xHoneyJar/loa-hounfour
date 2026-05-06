# Canonicalization Edge-Case Corpus

> Locked-in canonical-form + SHA-256 outputs for `safeCanonicalize()`.
> Drift in either column flags a regression in the helper or its
> dependencies (Unicode tables, RFC 8785 implementation, Node.js
> string handling).

## Layout

```
_canonicalization-edge-cases/
├── _meta.json               # corpus index — category, description, hash-pairing
├── README.md
├── unicode/                 # NFC vs NFD producing identical canonical hash
├── nesting/                 # ≥10-level chains
├── numeric/                 # IEEE-754 edges (0.1+0.2, ±large, ±small, ±zero)
├── null-absent/             # additionalProperties: false discipline
├── key-order/               # input-order independence under lex sort
└── string-escape/           # RFC 8785 minimal-escape rules
```

Each fixture ships three files:

- `<case>.input.json` — the input payload
- `<case>.canonical.txt` — the expected canonical UTF-8 string (no trailing newline)
- `<case>.hash.txt` — SHA-256 hex of the canonical UTF-8 bytes (one line + newline)

The runner (`tests/vectors/canonicalization-edge-cases.test.ts`) loads
each fixture, calls `safeCanonicalize(input)`, and asserts byte-equality
against `.canonical.txt` and `.hash.txt`. Pairs flagged in `_meta.json`
as `hash_equal_with` are additionally verified to produce identical
hashes regardless of input form (NFC vs NFD; reversed key ordering).

## Cross-OS verification

The corpus is locked at authoring time on Linux (Node 22). The same
inputs MUST produce byte-identical canonical/hash outputs on any
platform that ships the same Unicode table version (15.x or newer)
and a conformant RFC 8785 implementation. Sources of risk:

- **macOS:** identical results expected. Node binaries on Darwin link
  the same V8 + ICU as Linux Node distributions.
- **Windows:** identical results expected for the byte content; line
  endings on `.canonical.txt` are LF (no trailing newline) and `.hash.txt`
  is LF-terminated. Git autocrlf settings can corrupt these — verify
  with `git config core.autocrlf=false` for this directory.
- **Older Node (<22):** ICU < 73 lacks newer Unicode tables. The
  corpus targets Unicode 15.x; older ICU may produce different NFC
  results for newly-added codepoints (none currently in the corpus).

Cross-OS verification is documented but not gated in CI. Add a
matrix run if drift becomes a concern.

## Regenerating

The corpus was authored by a one-shot script (not committed). To
regenerate after updating `safeCanonicalize`, write a fresh script
that walks the `_meta.json` catalog and re-emits the canonical/hash
files; reviewers should compare the diff against the existing tree
to catch unintended drift.
