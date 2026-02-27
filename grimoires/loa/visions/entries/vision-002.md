# Vision 002: Advisory Lock Hash Collision — Birthday Paradox at Scale

## Source
- Bridge: freeside PR #99 (bridge-20260226-6bb222), Iteration 1, medium-1
- Bridge: dixie PR #50 (multi-bridge), Iteration 1
- Finding Severity: MEDIUM (both repos independently flagged)

## Insight

Both dixie and freeside use `hashCode()` (32-bit) to generate advisory lock IDs from domain tags for audit trail serialization. At O(10,000) domain tags, the birthday-paradox collision probability reaches ~1%, creating **phantom contention** — two unrelated audit chains accidentally share a lock, causing unnecessary serialization.

Dixie's `advisory lock ID hardcoded as 42_000_014` (BB-DEEP-04) and freeside's `hashCode()` for domain tags both exhibit this pattern.

## Pattern

```
PROBLEM: 32-bit hash space → birthday paradox at ~77K values (50% collision)
         At 10K values: ~1% collision probability
         Effect: phantom contention, not data corruption — but performance degrades

SOLUTION OPTIONS:
1. FNV-1a 64-bit hash (freeside adopted this after bridge finding)
2. Domain-tag-based deterministic IDs with namespace separation
3. Hounfour exports a canonical `computeAdvisoryLockId(domainTag)` utility
```

## Applicability

- Any consumer using database advisory locks for audit chain serialization
- Hounfour could export a collision-safe `computeAdvisoryLockId()` alongside `computeChainBoundHash()`
- Not urgent for launch (phantom contention is performance, not correctness) but worth standardizing

## Connection

- FR-5 (chain-bound hash already includes domain tags)
- Dixie BB-DEEP-04 (advisory lock ID)
- Freeside bridge-20260226-6bb222 medium-1
