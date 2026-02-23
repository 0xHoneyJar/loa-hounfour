# Evaluator Determinism and Namespace Safety

**Version:** v7.8.0 | **Finding:** DR-F3, DR-F4 | **Sprint:** 1

## Problem Statement

The constraint evaluator grew from 8 builtins (v4.6.0) to 42 (v7.8.0). Two properties that were trivially true at small scale now require explicit engineering:

1. **Temporal determinism** (DR-F3): The `now()` builtin returns a live clock value. Constraints containing `now()` produce different results when replayed at different times — breaking audit trail reproducibility.

2. **Namespace safety** (DR-F4): With 42+ builtins, the probability of collision between a builtin name and a schema field name grows. If a schema has a field named `now` or `type_of`, the evaluator calls the builtin instead of resolving the field.

## Solution: EvaluationContext

```typescript
export interface EvaluationContext {
  evaluation_timestamp?: string; // ISO 8601 — frozen clock for replay
}
```

When provided, `now()` returns `evaluation_timestamp` instead of the real clock. The parameter is optional — existing callers are unaffected.

### Replay Guarantee

```
evaluateConstraint(data, "is_after(expires_at, now())", {
  evaluation_timestamp: "2026-02-23T16:00:00.000Z"
})
```

This expression will produce the same result regardless of when it is evaluated.

### Context Propagation

`EvaluationContext` is threaded through:
- `evaluateConstraint()` → `Parser` constructor → `parseNow()` (direct use)
- `Parser` constructor → `.every()` inner parser (recursive propagation)

Every nested evaluation sees the same frozen timestamp.

## Solution: RESERVED_EVALUATOR_NAMES

```typescript
export const RESERVED_EVALUATOR_NAMES: ReadonlySet<string> = new Set([
  ...EVALUATOR_BUILTINS,
  'true', 'false', 'null', 'undefined', 'every', 'length',
]);
```

The `detectReservedNameCollisions()` utility checks schema field names against this set:

```typescript
const collisions = detectReservedNameCollisions(
  Object.keys(schemaProperties),
  'MySchema'
);
// collisions: [{ field: 'now', source: 'MySchema' }]
```

## FAANG Parallel

This is the same transition CloudFormation made when they separated "evaluation time" from "real time" — every drift detection failure traced back to non-deterministic evaluation without a frozen reference point.

The namespace collision problem mirrors protobuf's reserved field numbers: as the protocol surface grows, explicit reservation prevents silent correctness bugs.
