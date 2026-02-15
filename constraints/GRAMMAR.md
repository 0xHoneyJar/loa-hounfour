# Constraint Expression Grammar v1.0

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
             / NullLit / BoolLit / BigintSumCall / FieldPath

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
| `ident`   | `state`, `payer_id`, `null`, `true`, `false`, `bigint_sum` |
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

## Expression Version

Current version: `1.0`

All constraint files should include `"expression_version": "1.0"` to declare which grammar version their expressions target. This enables forward-compatible grammar evolution.
