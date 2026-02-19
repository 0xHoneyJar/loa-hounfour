# Constraint Expression Grammar v2.0

PEG grammar for the constraint mini-language used in `*.constraints.json` files.
The canonical implementation is a recursive descent parser in `src/constraints/evaluator.ts`.

## Grammar (PEG Notation)

```peg
# ── Top-level ──────────────────────────────────────────────────────────────

Expression   ← OrExpr (ARROW OrExpr)?
OrExpr       ← AndExpr (OR AndExpr)*
AndExpr      ← Comparison (AND Comparison)*
Comparison   ← Unary (CompOp Unary)?
Unary        ← NOT Unary / Primary

# ── Primary ────────────────────────────────────────────────────────────────

Primary      ← ParenExpr / BracketArray / NumberLit / StringLit
             / NullLit / BoolLit / BigintSumCall / BigintCmpCall
             / TemporalCall / FieldPath

ParenExpr    ← LPAREN Expression RPAREN
BracketArray ← LBRACKET (FieldPath (COMMA FieldPath)*)? RBRACKET

# ── Literals ───────────────────────────────────────────────────────────────

NumberLit    ← [0-9]+ ('.' [0-9]+)?
StringLit    ← "'" [^']* "'"
NullLit      ← 'null'
BoolLit      ← 'true' / 'false'

# ── Field access ───────────────────────────────────────────────────────────

FieldPath    ← Identifier (DOT Identifier)* (DOT LengthAccess / DOT EveryCall)?
LengthAccess ← 'length'
EveryCall    ← 'every' LPAREN Identifier ARROW Expression RPAREN
Identifier   ← [a-zA-Z_] [a-zA-Z0-9_]*

# ── Function calls ─────────────────────────────────────────────────────────

BigintSumCall ← 'bigint_sum' LPAREN BigintSumArgs RPAREN
BigintSumArgs ← Primary COMMA Primary          # bigint_sum(arrayField, 'field')
              / Primary                          # bigint_sum([a, b, c])

BigintCmpCall ← ('bigint_gte' / 'bigint_gt') LPAREN Expression COMMA Expression RPAREN

# ── Temporal operators (v2.0) ─────────────────────────────────────────────

TemporalCall  ← 'changed' LPAREN FieldPath RPAREN
              / 'previous' LPAREN FieldPath RPAREN
              / 'delta' LPAREN FieldPath RPAREN

# ── Operators ──────────────────────────────────────────────────────────────

CompOp       ← '==' / '!=' / '<=' / '>=' / '<' / '>'
AND          ← '&&'
OR           ← '||'
NOT          ← '!'
ARROW        ← '=>'

# ── Tokens ─────────────────────────────────────────────────────────────────

LPAREN       ← '('
RPAREN       ← ')'
LBRACKET     ← '['
RBRACKET     ← ']'
COMMA        ← ','
DOT          ← '.'
WS           ← [ \t\r\n]+           # Skipped by tokenizer
```

## Operator Precedence (lowest to highest)

| Level | Operator | Associativity | Description |
|-------|----------|---------------|-------------|
| 1     | `=>`     | Right         | Implication (A => B is !A \|\| B) |
| 2     | `\|\|`   | Left          | Logical OR |
| 3     | `&&`     | Left          | Logical AND |
| 4     | `==` `!=` `<` `>` `<=` `>=` | None | Comparison |
| 5     | `!`      | Prefix        | Logical NOT |
| 6     | `.`      | Left          | Dot access / method call |

## Token Types

| Type      | Examples |
|-----------|----------|
| `number`  | `0`, `42`, `3.14`, `1000000` |
| `string`  | `'held'`, `'released'`, `'immediate'` |
| `ident`   | `state`, `payer_id`, `null`, `true`, `false`, `bigint_sum`, `changed`, `previous`, `delta` |
| `op`      | `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `\|\|`, `!` |
| `paren`   | `(`, `)` |
| `bracket` | `[`, `]` |
| `comma`   | `,` |
| `dot`     | `.` |
| `arrow`   | `=>` |

## Semantic Notes

- **Implication**: `A => B` evaluates as `!A || B`. Vacuously true when A is false.
- **Null checks**: `== null` / `!= null` use JavaScript loose equality (`== null` matches both `null` and `undefined`).
- **BigInt arithmetic**: `bigint_sum` returns `BigInt`. Comparisons coerce string/number operands to `BigInt` when one side is already `BigInt`.
- **Field resolution**: Dot-separated paths resolve against the data object. Missing paths return `undefined`.
- **`.every()` quantifier**: `array.every(x => expr)` creates a scoped data context where `x` resolves to each array element.
- **`.length` access**: Works on arrays and strings.
- **Depth limit**: `MAX_EXPRESSION_DEPTH = 32`. Each `parseExpr()` call increments depth; exceeding the limit throws.
- **Error on unknown characters**: The tokenizer throws `Unexpected character` with position info for unrecognized input.
- **BigInt overflow safety**: `bigint_sum` catches `BigInt()` conversion errors and returns `0n` instead of throwing.

## Temporal Operators (v2.0)

Temporal operators compare current data with a `_previous` context key, enabling constraints that express state transitions.

| Function | Returns | Description |
|----------|---------|-------------|
| `changed(field)` | `boolean` | `true` if field value differs between `_previous` and current |
| `previous(field)` | `unknown` | Value of field from `_previous` context |
| `delta(field)` | `BigInt` | `current - previous` as BigInt (returns 0 if `_previous` is null) |

### Context Requirements

Temporal operators read from `data._previous`, which must be provided by the caller (saga orchestrators, workflow engines). If `_previous` is absent, `changed()` returns `false`, `previous()` returns `undefined`, and `delta()` returns `0n`.

### Examples

```
# Step must increase unless compensating
_previous == null || !changed(step) || delta(step) > 0 || direction == 'compensation'

# Direction can only transition forward → compensation
_previous == null || !changed(direction) || (previous(direction) == 'forward' && direction == 'compensation')
```

## Version Compatibility

| Expression Version | Evaluator Required | Features |
|-------------------|--------------------|----------|
| `1.0` | v1.0+ | Core operators, bigint_sum, .every(), .length |
| `2.0` | v2.0+ | All 1.0 features + changed(), previous(), delta() |

The v2.0 evaluator runs v1.0 expressions unchanged (backward compatible). Only temporal functions require v2.0.

## Expression Version

Current version: `2.0`

All constraint files should include `"expression_version"` to declare which grammar version their expressions target. v1.0 files work with v2.0 evaluators. v2.0 files require a v2.0+ evaluator.

## Version Negotiation

In distributed systems where constraint proposals travel between services, the receiver needs to know before processing whether it can evaluate the expressions. The protocol-discovery document advertises supported expression versions.

### Discovery Endpoint

The `ProtocolDiscovery` schema includes an optional `expression_versions_supported` array:

```json
{
  "contract_version": "5.0.0",
  "min_supported_version": "4.0.0",
  "schemas": ["https://..."],
  "expression_versions_supported": ["1.0", "2.0"]
}
```

### Version Check Utilities

```typescript
import { expressionVersionSupported, EXPRESSION_VERSIONS_SUPPORTED } from './constraints/types.js';

// Check if a specific version is supported by the current evaluator
expressionVersionSupported('1.0'); // true
expressionVersionSupported('2.0'); // true
expressionVersionSupported('3.0'); // false

// All supported versions (for protocol-discovery advertisement)
EXPRESSION_VERSIONS_SUPPORTED; // ['1.0', '2.0']
```

### Consumer Pattern

Before evaluating a constraint file from an external source:

1. Read the file's `expression_version` field
2. Call `expressionVersionSupported(version)` to check compatibility
3. If unsupported, reject the file with a clear error

### Constraint Lifecycle (sunset_version)

The `ConstraintProposal` schema includes an optional `sunset_version` field for constraint lifecycle management. When the grammar evolves beyond `sunset_version`, the constraint should be re-evaluated or retired.

```json
{
  "expression_version": "1.0",
  "sunset_version": "3.0"
}
```

This means the constraint was authored against grammar v1.0 and is valid up to (but not beyond) v3.0. When a v3.0+ evaluator encounters this constraint, it should flag it for review.

---

## Design Decisions

### ADR-001: Temporal Operators via `_previous` Context (v2.0)

**Status:** Accepted
**Date:** 2026-02-15
**Deciders:** Sprint 8 implementation, validated by Bridgebuilder review (bridge-20260215-c011)

**Context:** Temporal operators (`changed()`, `previous()`, `delta()`) need access to prior state to detect field transitions in saga workflows. The SagaContext schema tracks multi-step orchestrations where constraints like "step must increase monotonically" require comparing current and previous values.

**Decision:** Thread previous state through a `_previous` key in the evaluation data context rather than making the evaluator stateful.

**Rationale:**
- **Pure function evaluator**: `f(expression, data) → boolean` — no internal state, no side effects, no initialization sequence. The evaluator is a leaf dependency that composes into any architecture.
- **Separation of concerns**: Saga orchestrators, workflow engines, and test harnesses each populate `_previous` in their own way. The evaluator doesn't need workflow awareness.
- **Cross-language portability**: A Go or Rust implementation of the evaluator can use the same stateless signature. Stateful evaluators require language-specific lifecycle management (constructors, destructors, thread safety).
- **Testability**: Unit tests provide `_previous` directly in fixture data — no mock workflow infrastructure needed. See `tests/constraints/round-trip.test.ts` for examples.

**Alternatives Considered:**
1. **Stateful evaluator with history buffer** — Rejected. Destroys composability (evaluator must be initialized before use, carries hidden state between calls). Complicates cross-language implementation (each language needs its own lifecycle management). Makes concurrent evaluation unsafe without explicit synchronization.
2. **Separate temporal evaluator** — Rejected. Duplicates expression parsing infrastructure, creates grammar divergence risk between the two evaluators, and doubles the conformance surface for cross-language implementations.
3. **Compile-time constraint expansion** — Rejected. Expanding `changed(field)` into `_previous.field != field` at constraint-file load time would work but loses semantic information (tooling can't distinguish temporal constraints from regular comparisons) and prevents future optimization of temporal evaluation.

**Consequences:**
- Consumers MUST populate `data._previous` when using v2.0 temporal operators. Without it, `changed()` returns `false`, `previous()` returns `undefined`, `delta()` returns `0n` — safe defaults, not errors.
- The TypeScript cross-field validators in `src/validators/index.ts` use stateless `validate()` and therefore CANNOT enforce temporal constraints. This is intentional — temporal constraints live in `.constraints.json` files and are evaluated by saga-aware consumers that provide the `_previous` context.
- Grammar version negotiation (see Version Compatibility above) ensures that v1.0 consumers never encounter temporal operators they can't evaluate.

**References:**
- `src/constraints/evaluator.ts:448-514` — Temporal operator implementation (parseChanged, parsePrevious, parseDelta)
- `src/constraints/tokenizer.ts` — Shared tokenizer (temporal keywords: `changed`, `previous`, `delta`)
- `constraints/SagaContext.constraints.json` — Canonical temporal constraint examples
- `tests/constraints/round-trip.test.ts` — Temporal operator test coverage
