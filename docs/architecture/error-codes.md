# Error Codes — Cross-Runner Taxonomy

> **Status**: Stable (introduced in v8.4.0). Pinned by the parity-protocol contract.
> **Audience**: Cross-runner implementers; consumer engineers building error-aware integrations.

This document publishes the **normative cross-runner error envelope** and the closed enumeration of `ErrorCode` strings that the four runners — TypeScript / Go / Python / Rust — emit. Free-form prose `message` strings cannot be compared across runners without normalization; this taxonomy fixes the machine-readable surface so cross-runner sweeps gate on string-equal `code`, canonicalized `path`, and structurally-equal `context`.

The TypeScript reference for the `is_valid_dag` subset of these codes lives in [`src/constraints/is-valid-dag.ts`](../../src/constraints/is-valid-dag.ts). The full taxonomy is consumed by the parity-protocol contract in [`docs/architecture/parity-protocol.md`](./parity-protocol.md) §5.

## 1. Error Envelope Shape (NORMATIVE)

```typescript
type ErrorEnvelope = {
  code: ErrorCode;                   // normative, cross-runner stable
  path: string;                      // RFC 9535 JSONPath dot-notation
  context: Record<string, unknown>;  // code-specific structured data
  message?: string;                  // OPTIONAL human-readable; locale-affordant; NOT compared cross-runner
};
```

The library's own envelope-emitting surface is the `is_valid_dag` builtin (`evaluateIsValidDag` in `src/constraints/is-valid-dag.ts`). Constraint-DSL rule failures surface through the validator pipeline as `CONSTRAINT_RULE_FAILED` envelopes carrying the failing `rule_id`. Schema-level structural rejections (TypeBox `additionalProperties: false`, `pattern`, `enum`) currently surface through the runtime's existing TypeBox error reporter; consumers building cross-runner sweeps SHOULD wrap those into `SCHEMA_*` envelopes before comparison.

### Cross-runner parity scope (v8.4.0)

The error codes in this document are partitioned into two scopes for the v8.4.0 parity contract:

| Scope | Codes | Cross-runner parity in v8.4.0? |
|---|---|---|
| **Library-emitted** | `DAG_*` (7 codes), `CONSTRAINT_RULE_FAILED`, `CONSTRAINT_PARSE_ERROR` | **In-scope.** All four runners (TS / Go / Python / Rust) MUST emit byte-equal envelopes (`code`, `path`, `context`) on the corresponding fixtures. |
| **Consumer-wrapped** | `SCHEMA_*` (6 codes), `SIG_*` (4 codes), `CROSS_RECORD_*` (2 codes), `CONFORMANCE_*` (2 codes), `SIGNING_CONTEXT_*` (3 codes) | **Out-of-scope.** The library does not emit these envelopes natively; consumers wrap their language-native error reporters (TypeBox in TS, equivalents in Go/Python/Rust) into the unified envelope shape before downstream comparison. The codes are reserved in the taxonomy so cross-runner streams stay unified. |

A v8.5.0+ release MAY ship a library-emitted TypeBox-to-envelope adapter for the `SCHEMA_*` family, promoting it from consumer-wrapped to library-emitted scope and bringing it into the parity contract. The `SIG_*`, `CROSS_RECORD_*`, `CONFORMANCE_*`, and `SIGNING_CONTEXT_*` families remain consumer-emitted by design (per NF-1 library-not-runtime) and are unlikely to be promoted to library-emitted scope at any point.

Consumers running cross-runner sweeps in v8.4.0 should treat library-emitted divergences as release blockers and consumer-wrapped divergences as integration-side issues that surface in their own conformance suite.

## 2. Path Format

`path` is RFC 9535 JSONPath dot-notation:

| Form | Example | Meaning |
|---|---|---|
| `$` | `$` | Root document. |
| `$.<field>` | `$.bucket` | Top-level field. |
| `$.<field>.<sub>` | `$.signing_context.audience` | Nested field. |
| `$[<n>]` | `$[3]` | Array index (zero-based). |
| `$[<n>].<field>` | `$[3].claim_id` | Field on indexed array element. |
| `$[*].<field>` | `$[*].grounding.claim_id` | Wildcard array elements. Used when the offending source index is not available (rare). |

No mixed-form: bracket-string (`$['key']`) is **not** part of the v8.4.0 surface. Cross-runner equality is asserted on the exact string form.

## 3. Code Enumeration (closed for v8.4.0)

The complete `ErrorCode` union, grouped by emitting surface:

```typescript
type ErrorCode =
  // Schema validation (TypeBox structural)
  | 'SCHEMA_REQUIRED_FIELD_MISSING'
  | 'SCHEMA_TYPE_MISMATCH'
  | 'SCHEMA_PATTERN_MISMATCH'
  | 'SCHEMA_ADDITIONAL_PROPERTY'
  | 'SCHEMA_ARRAY_BOUNDS'
  | 'SCHEMA_ENUM_INVALID'

  // Constraint DSL violations (library-evaluated rules)
  | 'CONSTRAINT_RULE_FAILED'
  | 'CONSTRAINT_PARSE_ERROR'

  // is_valid_dag-specific (library, FR-C1)
  | 'DAG_OP_CAP_EXCEEDED'
  | 'DAG_CYCLE_DETECTED'
  | 'DAG_DANGLING_REF'
  | 'DAG_MISSING_ID_FIELD'
  | 'DAG_NON_STRING_ID_FIELD'
  | 'DAG_DUPLICATE_ID'
  | 'DAG_INPUT_OVERSIZE'

  // Signing-related (library declares; consumer verifies)
  | 'SIG_PATTERN_INVALID'
  | 'SIG_KEY_PATTERN_INVALID'
  | 'SIG_TIMING_INCONSISTENT'
  | 'CANON_ENCODING_VIOLATION'

  // Cross-record (NOT emitted by library; reserved for consumer-side)
  | 'CROSS_RECORD_REF_DANGLING'
  | 'CROSS_RECORD_REF_INVALID_TYPE'

  // Conformance harness (consumer-emitted; library reserves codes for unified taxonomy)
  | 'CONFORMANCE_OBLIGATION_UNACK'
  | 'CONFORMANCE_OBLIGATION_FAIL'

  // Replay protection (consumer-emitted on signing-context binding failure)
  | 'SIGNING_CONTEXT_AUDIENCE_MISMATCH'
  | 'SIGNING_CONTEXT_SCOPE_MISMATCH'
  | 'SIGNING_CONTEXT_VERSION_INCOMPATIBLE';
```

**Versioning discipline**: the enum is **strict additive**. Adding a new code is MINOR; renaming or removing one is MAJOR. The codes above are the v8.4.0 surface; v8.5.0+ may extend the union but will not redefine existing codes.

**Reserved codes**: `SIG_*` and `CROSS_RECORD_*` are reserved code names but are **NOT** emitted by the library validators directly — per NF-1 (library-not-runtime), the library declares signature shapes and cross-record concerns rather than verifying them. Consumers performing the verification on the runtime side emit these codes so that the cross-runner comparison surface stays unified across library + consumer error streams.

## 4. Per-Code `context` Shapes

For each code, the `context` field carries a code-specific structured payload. The shapes below are NORMATIVE — runners MUST match them exactly (modulo key order, which is ignored in deep equality).

### 4.1 `is_valid_dag` codes (library-emitted)

#### `DAG_OP_CAP_EXCEEDED`

```typescript
context: {
  ops: number;                       // op count at the moment of cap-exceed
  phase: 'indexing' | 'dfs' | 'ref-resolve';
  processed?: number;                // present when phase === 'indexing'
  at_node?: string;                  // present when phase === 'dfs' or 'ref-resolve'
}
```

Example:

```json
{
  "code": "DAG_OP_CAP_EXCEEDED",
  "path": "$",
  "context": { "ops": 100001, "phase": "dfs", "at_node": "claim-742" }
}
```

#### `DAG_CYCLE_DETECTED`

```typescript
context: {
  cycle: string[];                   // ordered list of node ids forming the cycle path
}
```

Example:

```json
{
  "code": "DAG_CYCLE_DETECTED",
  "path": "$",
  "context": { "cycle": ["A", "B", "C", "A"] }
}
```

#### `DAG_DANGLING_REF`

```typescript
context: {
  from: string;                      // id of the source node
  ref: unknown;                      // value of the dangling reference (typically string)
  reason?: 'non-string-ref';         // present when the ref value is not a string
  kind?: 'index-miss';               // defensive trap; should not occur in practice
}
```

Example:

```json
{
  "code": "DAG_DANGLING_REF",
  "path": "$[2].grounding.claim_id",
  "context": { "from": "claim-3", "ref": "claim-99-missing" }
}
```

#### `DAG_MISSING_ID_FIELD`

```typescript
context: {
  index: number;                     // zero-based index in the items array
}
```

Example:

```json
{
  "code": "DAG_MISSING_ID_FIELD",
  "path": "$[5].claim_id",
  "context": { "index": 5 }
}
```

#### `DAG_NON_STRING_ID_FIELD`

```typescript
context: {
  index: number;
  actual_type: string;               // typeof the offending value
}
```

Example:

```json
{
  "code": "DAG_NON_STRING_ID_FIELD",
  "path": "$[7].claim_id",
  "context": { "index": 7, "actual_type": "number" }
}
```

#### `DAG_DUPLICATE_ID`

```typescript
context: {
  id: string;
  indices: number[];                 // every items-array index where this id appeared
}
```

Example:

```json
{
  "code": "DAG_DUPLICATE_ID",
  "path": "$[4].claim_id",
  "context": { "id": "claim-1", "indices": [1, 4] }
}
```

#### `DAG_INPUT_OVERSIZE`

```typescript
context:
  | { kind: 'items_count'; limit: number; actual: number }
  | { kind: 'bytes';       limit: number; actual: number };
```

Examples:

```json
{
  "code": "DAG_INPUT_OVERSIZE",
  "path": "$",
  "context": { "kind": "items_count", "limit": 10000, "actual": 10001 }
}
```

```json
{
  "code": "DAG_INPUT_OVERSIZE",
  "path": "$",
  "context": { "kind": "bytes", "limit": 1048576, "actual": 1234567 }
}
```

### 4.2 Schema codes (TypeBox-emitted; runners normalize from native errors)

#### `SCHEMA_REQUIRED_FIELD_MISSING`

```typescript
context: { field: string }
```

#### `SCHEMA_TYPE_MISMATCH`

```typescript
context: { expected: string; actual: string }
```

#### `SCHEMA_PATTERN_MISMATCH`

```typescript
context: { pattern: string; value: string }
```

#### `SCHEMA_ADDITIONAL_PROPERTY`

```typescript
context: { property: string }
```

#### `SCHEMA_ARRAY_BOUNDS`

```typescript
context: { min?: number; max?: number; actual: number }
```

#### `SCHEMA_ENUM_INVALID`

```typescript
context: { allowed: string[]; actual: string }
```

### 4.3 Constraint codes

#### `CONSTRAINT_RULE_FAILED`

```typescript
context: {
  rule_id: string;                   // e.g., "PV-1", "ORD-3", "PDA-4"
  evaluator: 'library' | 'runtime-deferred';
}
```

Example (library-evaluated rule):

```json
{
  "code": "CONSTRAINT_RULE_FAILED",
  "path": "$",
  "context": { "rule_id": "PV-1", "evaluator": "library" }
}
```

Note: `runtime-deferred` should not appear from library validators — per NF-1 those rules are skipped and surfaced via the `UnverifiedObligationsManifest` instead. The discriminator is reserved for consumer-side verification code that emits the same envelope.

#### `CONSTRAINT_PARSE_ERROR`

```typescript
context: {
  rule_id: string;
  parse_error: string;               // implementation-defined; runners MAY localize
}
```

### 4.4 Signing codes (declared by library; verified by consumer)

#### `SIG_PATTERN_INVALID` / `SIG_KEY_PATTERN_INVALID`

```typescript
context: { pattern: string; value: string }
```

The library *can* emit these via the underlying `SCHEMA_PATTERN_MISMATCH` path; consumers building cross-runner-aware error streams may map the signature-specific patterns to these dedicated codes.

#### `SIG_TIMING_INCONSISTENT`

```typescript
context: {
  signed_at: string;                 // ISO 8601
  resolved_at?: string;              // ISO 8601
  reason: 'signed_at_after_resolved_at' | string;
}
```

#### `CANON_ENCODING_VIOLATION`

```typescript
context: {
  reason: string;                    // e.g., "non-canonical number format"
}
```

### 4.5 Cross-record codes (consumer-side only)

#### `CROSS_RECORD_REF_DANGLING`

```typescript
context: {
  field: string;                     // e.g., "artifact_id"
  ref: string;                       // the reference value that did not resolve
  expected_kind: string;             // e.g., "PanelDecisionArtifact"
}
```

#### `CROSS_RECORD_REF_INVALID_TYPE`

```typescript
context: {
  field: string;
  ref: string;
  expected_kind: string;
  actual_kind: string;
}
```

### 4.6 Conformance-harness codes (consumer-emitted)

#### `CONFORMANCE_OBLIGATION_UNACK`

```typescript
context: {
  rule_id: string;                   // e.g., "ORD-1"
  schema_id: string;                 // e.g., "OrgRepresentativeDelegation"
}
```

Emitted by the consumer's CI when the `UnverifiedObligationsManifest` carries a rule_id that has neither an `impl_status: passing` test nor a recorded waiver in the consumer's obligations registry.

#### `CONFORMANCE_OBLIGATION_FAIL`

```typescript
context: {
  rule_id: string;
  schema_id: string;
  impl_test: string;                 // path to the consumer's test that asserts the obligation
}
```

### 4.7 Replay-protection codes (consumer-emitted)

These codes are emitted by the consumer when the bound `signing_context` does not match the local environment.

#### `SIGNING_CONTEXT_AUDIENCE_MISMATCH`

```typescript
context: {
  expected: string;                  // local audience (e.g., the consumer's org_id)
  actual: string;                    // the audience bound under signature
}
```

#### `SIGNING_CONTEXT_SCOPE_MISMATCH`

```typescript
context: {
  expected: string;                  // local lifecycle scope
  actual: string;                    // scope bound under signature
}
```

#### `SIGNING_CONTEXT_VERSION_INCOMPATIBLE`

```typescript
context: {
  min_supported: string;             // consumer's MIN_SUPPORTED_VERSION
  actual: string;                    // contract_version bound under signature
}
```

## 5. Cross-Runner Comparison Rule

Two error envelopes E1 and E2 produced by different runners on the same fixture are equivalent ⟺

```text
E1.code    == E2.code                  (string equality)
AND E1.path == E2.path                 (string equality after canonicalization)
AND E1.context == E2.context           (deep structural equality, ignoring key order)
```

`E1.message` and `E2.message` are excluded from the comparison.

## 6. Examples (full envelopes)

### A `PanelVerdict` rejected by PV-1

Input (abbreviated):

```jsonc
{
  "bucket": "HIGH_CONSENSUS",
  "verdict": "reject",        // ← PV-1 violation: HIGH_CONSENSUS pairs only with 'proceed'
  // ...
}
```

Envelope:

```json
{
  "code": "CONSTRAINT_RULE_FAILED",
  "path": "$",
  "context": { "rule_id": "PV-1", "evaluator": "library" }
}
```

### An `OrgRepresentativeDelegation` chain with a cycle

Envelope from `is_valid_dag` (via ORD-3):

```json
{
  "code": "DAG_CYCLE_DETECTED",
  "path": "$",
  "context": { "cycle": ["delegation-A", "delegation-B", "delegation-A"] }
}
```

### A consumer rejecting a stale signature scope

Envelope (consumer-side):

```json
{
  "code": "SIGNING_CONTEXT_SCOPE_MISMATCH",
  "path": "$.signing_context.scope",
  "context": { "expected": "panel-v1/security-review", "actual": "panel-v1/finance-review" }
}
```

### An oversize input rejected by `is_valid_dag`

Envelope:

```json
{
  "code": "DAG_INPUT_OVERSIZE",
  "path": "$",
  "context": { "kind": "items_count", "limit": 10000, "actual": 50000 }
}
```

## 7. Adding New Codes

A future MINOR release MAY add new codes to the enumeration. The discipline:

1. The new code is appended to the union; existing codes are not renamed or removed.
2. A `context` shape is published in this document under the relevant subsection (or a new subsection).
3. At least one conformance vector exercising the new code lands alongside the schema or builtin that emits it.
4. The parity-protocol version is bumped per [`docs/architecture/parity-protocol.md`](./parity-protocol.md) §1.
5. Cross-runner ports update before the parity-check warn-only window closes.

A MAJOR release MAY rename or remove codes; renaming or removal is a breaking change for any consumer that pattern-matches on string equality.
