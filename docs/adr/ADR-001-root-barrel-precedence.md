# ADR-001: Root Barrel Export Precedence Policy

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Bridgebuilder Review — PR #36, Finding 1 and Finding 4

## Context

The `@0xhoneyjar/loa-hounfour` package exposes a root barrel (`src/index.ts`) that re-exports from multiple sub-packages: `core`, `economy`, `model`, `governance`, `constraints`, and `integrity`. When two sub-packages export the same symbol name, TypeScript raises a TS2308 error ("Module has already exported a member named '...'").

As of v7.10.0, two name collisions exist:

| Symbol | Core (routing-policy) | Governance (v7.10.0) |
|--------|----------------------|---------------------|
| `TaskType` | `'chat' \| 'analysis' \| 'architecture' \| 'code' \| 'default'` | `'code_review' \| 'creative_writing' \| 'analysis' \| 'summarization' \| 'general'` |
| `ReputationEvent` | `DomainEvent<{ agent_id: string }>` type alias | Discriminated union of `quality_signal \| task_completed \| credential_update` |

These are semantically distinct types that happen to share a name.

## Decision

When two sub-packages export the same symbol name in the root barrel:

1. **Core types take precedence** in the root barrel (unaliased names).
2. **Governance types get `Governance*` aliased re-exports** in the root barrel (e.g., `GovernanceTaskTypeSchema`, `GovernanceReputationEventSchema`).
3. **Both versions are always available** via their sub-package path (`@0xhoneyjar/loa-hounfour/governance`).
4. **The collision MUST be documented** in the root barrel with a comment referencing this ADR.
5. **Future collisions SHOULD be avoided** by choosing distinct names at authoring time.

## Consequences

### Positive

- Core types form the foundational vocabulary; most consumers import from the root barrel first and expect core semantics.
- Governance types are discoverable from the root barrel via the `Governance*` prefix without requiring knowledge of the sub-package path.
- No `$id` values are renamed, preserving JSON Schema compatibility.

### Negative

- Consumers who want the governance `TaskType` must use either the aliased name (`GovernanceTaskType`) or the sub-package import. This is a discoverability friction for users who don't read the docs.
- The `Governance*` prefix convention may not scale if more sub-packages introduce collisions (e.g., `economy` types). In that case, consider package-qualified naming at the source level.

### Neutral

- Existing consumers of the `/governance` sub-package import are unaffected.

## Industry Precedent

- **Go protobuf**: Package-qualified names (`google.protobuf.Timestamp` vs `google.type.TimeOfDay`) prevent ambiguity. The style guide warns against reusing message names across packages.
- **Kubernetes**: API group versioning (`v1.Pod` vs `apps/v1.Pod`) with explicit default group resolution.
- **Stripe API**: Webhook event types use fully-qualified names (`invoice.paid`, not just `paid`) to avoid namespace collisions.
