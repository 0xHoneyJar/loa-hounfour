# Regex Subset for Cross-Runner Pattern Vectors

The pattern-recognition fixtures under `vectors/signing/ed25519-pattern/`
and the schema-layer patterns referenced by all 7 v8.4.0 governance
schemas are evaluated by four language runtimes (TypeScript, Go,
Python, Rust). Each runtime's regex engine has different semantics; to
preserve byte-identical cross-runner verdicts, every pattern in the
corpus MUST belong to the **portable subset**:

## Allowed

- Anchors: `^`, `$`
- Character classes: `[...]` including ranges (`[A-Za-z0-9_-]`)
- Negated classes: `[^...]`
- Quantifiers: `?`, `*`, `+`, `{n}`, `{n,m}`
- Alternation: `|`
- Grouping: `(...)` — non-capturing form `(?:...)` is allowed and
  preferred when capturing is not required
- Escapes: `\\d`, `\\w`, `\\s`, `\\.`, `\\\\`, `\\^`, `\\$`, `\\(`, `\\)`,
  `\\[`, `\\]`, `\\{`, `\\}`, `\\|`, `\\?`, `\\*`, `\\+`

## Forbidden (cross-runtime divergent)

| Feature | Example | Reason |
|---|---|---|
| Backreferences | `(a)\\1` | RE2 (Go) does not support; would silently mismatch |
| Lookahead / lookbehind | `(?=foo)`, `(?<=bar)` | RE2 (Go) does not support |
| Atomic groups | `(?>...)` | Not in JavaScript or RE2 |
| Possessive quantifiers | `*+`, `?+`, `++` | Not in JavaScript or RE2 |
| Named captures | `(?P<name>...)` (Python) vs `(?<name>...)` (JS) | Syntax differs |
| Unicode property escapes | `\\p{L}`, `\\p{Cf}` | JS requires `u` flag; Python requires `regex` (not `re`); RE2 supports a subset |
| Conditional patterns | `(?(cond)yes\|no)` | Not in JavaScript or RE2 |
| Recursive patterns | `(?R)`, `(?1)` | Not in JavaScript or RE2 |
| Inline flags scoped to a group | `(?i:...)` | JavaScript does not support |
| Character class subtraction / intersection | `[a-z--[aeiou]]` | Not in standard ECMA-262 |

## Validation

The cross-runner reference (TS) uses a length-bounded `safeMatch()`
helper that rejects patterns over 1024 chars and catches compile
errors. Other-language runners SHOULD apply the same bound and emit a
`PATTERN_COMPILE_FAILURE` diagnostic on rejection so the manifest entry
is comparable across runtimes.

## When in doubt

If a fixture needs a feature outside the table above, the right move
is to express the constraint in TypeBox at the schema layer rather
than embedding it in a vector pattern. Schema-layer patterns flow
through to `schemas/*.schema.json` (JSON Schema 2020-12), which all
four runtimes consume via their respective JSON Schema libraries; that
is the correct interop surface.

## Authoring checklist

Before adding a new pattern fixture:

- [ ] Pattern uses only features from the "Allowed" table above
- [ ] Pattern length ≤ 1024 chars
- [ ] Pattern anchored at both ends (`^...$`) when matching whole values
- [ ] Pattern ASCII-only OR fully-escaped Unicode (no property escapes)
