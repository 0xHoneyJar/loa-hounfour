# Vision 001: Audit Trail Single-Writer Invariant as Constitutional Provision

## Source
- Bridge: finn PR #110 (bridge-20260227-38f010), Iteration 1 Deep Meditation
- Bridge: finn PR #108 (bridge-20260226), Architectural Review
- Finding Severity: ARCHITECTURAL (cross-repo pattern)

## Insight

The audit hash chain (`computeAuditEntryHash()` → chain-bound hashing) has an implicit but undocumented constitutional requirement: **single-writer exclusivity**. Two simultaneous writers would fork the hash chain, producing undetectable contradictory audit digests.

Finn's staging deployment enforces this via ECS `desired_count = 1` with stop-before-start (`deployment_maximum_percent = 100`, `deployment_minimum_healthy_percent = 0`). Dixie enforces via `FOR UPDATE` serialization and `UNIQUE(resource_type, previous_hash)` constraints. Both are consumer-side implementations of the same invariant.

The 5-second margin between the 25s app shutdown deadline and 30s ECS `stopTimeout` is deliberate — it prevents SIGKILL mid-audit-flush. This "shutdown choreography" is a deployment-level expression of audit trail integrity.

## Pattern

```
INV-AUDIT-SINGLE-WRITER:
  For any resource R with an audit hash chain:
  - At most ONE writer may append to R's chain at any point in time
  - Concurrent append attempts MUST be serialized (database lock, queue, or process exclusivity)
  - Process shutdown MUST flush pending audit entries before exit
  - Deployment strategy MUST prevent dual-writer overlap (stop-before-start, not rolling)
```

## Applicability

- Any consumer maintaining hash-chained audit trails (finn, dixie, freeside)
- Deployment infrastructure (ECS, Kubernetes, Fly.io) must enforce single-writer
- Hounfour should document this as a protocol-level invariant alongside `computeChainBoundHash()`

## Connection

- FR-5 (Audit Trail Domain Separation + Chain-Bound Hash)
- Dixie TOCTOU prevention pattern (cycle-017 PRD §P0-3)
- Finn ECS deployment configuration (PR #110, `loa-finn-ecs.tf`)
- NASA Mars Climate Orbiter ADRs — institutional memory encoded in version control
