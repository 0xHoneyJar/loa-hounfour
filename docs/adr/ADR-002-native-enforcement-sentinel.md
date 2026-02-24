# ADR-002: Native Enforcement Sentinel Pattern

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Bridgebuilder Review — PR #36, Finding 2

## Context

The constraint DSL (expression language v1.0) enables cross-language validation by encoding invariants as evaluable string expressions. Every constraint file in the protocol's 77 constraint files uses this pattern — except one.

The `reputation-task-cohort-uniqueness` constraint in `ReputationAggregate.constraints.json` requires that `(model_id, task_type)` pairs be unique within the `task_cohorts` array. This is a composite key uniqueness check that cannot be expressed in DSL v1.0, which lacks:

- Collection aggregation operators (e.g., `unique_by(array, field1, field2)`)
- Set construction (`new Set(...)`)
- String concatenation for composite key generation

The initial implementation used `expression: "true"` as a sentinel with a verbose `message` field explaining the enforcement requirement. This worked but weakened the DSL's integrity promise: every other constraint is machine-verifiable from the expression alone.

## Decision

Introduce an optional `native_enforcement` field on the `Constraint` interface:

```typescript
interface NativeEnforcement {
  strategy: string;       // Named pattern (e.g. 'composite_key_uniqueness')
  fields: string[];       // Fields involved in the check
  scope?: string;         // Collection field the check applies to
  reference_impl: string; // Reference implementation function name
}
```

When a constraint cannot be expressed in the DSL:

1. Set `expression` to `"true"` (sentinel — always passes evaluation).
2. Set `native_enforcement` with structured metadata for runtime consumers.
3. Document the DSL limitation this represents.

The `native_enforcement` field is optional — existing constraints are unaffected.

## Consequences

### Positive

- The sentinel pattern is now machine-readable: tools can distinguish between "always true" constraints (which are guidance-only) and "native enforcement required" constraints (which need runtime checks).
- The `reference_impl` field points consumers to the TypeScript implementation, enabling cross-language ports.
- The pattern is self-documenting: `strategy: "composite_key_uniqueness"` is clearer than a 200-character message string.

### Negative

- Cross-language validators must implement native enforcement handlers. A Python validator that only evaluates expressions will silently pass the `"true"` sentinel without enforcing uniqueness. The `native_enforcement` field provides the metadata to detect and warn about this.

### Proliferation Guard

**If a second `"true"` sentinel constraint appears, that is the signal to prioritize DSL extension.** The sentinel pattern should not proliferate beyond rare edge cases. Potential DSL v1.1 extensions:

- `unique_by(array, field1, field2)` — composite key uniqueness (covers the current case)
- `count_where(array, predicate)` — conditional counting
- `all_distinct(array, field)` — simple field uniqueness

## Current Sentinel Constraints

| Constraint ID | Schema | Strategy | Since |
|---------------|--------|----------|-------|
| `reputation-task-cohort-uniqueness` | ReputationAggregate | `composite_key_uniqueness` | v7.10.0 |

This table MUST be updated when new sentinel constraints are added.
