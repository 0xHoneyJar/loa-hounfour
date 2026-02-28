# Vision 005: Five-Repo Conservation Stack

## Source
- Bridge: finn PR #108 (bridge-20260226), Deep Meditation Part 1
- Bridge: finn PR #110 (bridge-20260227-38f010), Deep Meditation Part 5
- Bridge: dixie PR #8, Architectural Meditation
- Finding Severity: ARCHITECTURAL (ecosystem-level)

## Insight

Bridgebuilder independently identified the same conservation principle across multiple reviews: each repo in the ecosystem conserves a distinct quantity, forming a complete protocol stack for autonomous economic systems.

| Repo | Conserves | Mechanism |
|------|-----------|-----------|
| **loa-finn** | Trust | Reputation EMA, graduation thresholds, shadow mode |
| **loa-freeside** | Money | Budget conservation, billing ledger, escrow settlement |
| **loa-dixie** | Governance | GovernedResource<T>, conviction tiers, mutation attribution |
| **loa-hounfour** | Law | Schemas, constraints, invariants, hash chains |
| **loa** | Agency | Orchestration, skill routing, permission scape |

The anti-duplication rule (finn #66 Comment 10) is the practical expression of this conservation: each quantity has exactly one canonical owner. Hounfour's role as "law" means it defines the schemas and invariants that the other four repos implement.

## Pattern

```
CONSERVATION STACK:
  Law (hounfour) defines the protocol
  Trust (finn) implements reputation-based routing under the protocol
  Money (freeside) implements economic settlement under the protocol
  Governance (dixie) implements resource governance under the protocol
  Agency (loa) orchestrates the above according to operator intent

INVARIANT: Each conservation quantity has exactly ONE canonical owner
ANTI-PATTERN: Repo X reimplements what Repo Y owns
```

## Applicability

- Hounfour release notes and documentation: frame the ecosystem architecture
- Onboarding documentation for new repos joining the ecosystem
- When deciding where new patterns belong: ask "what does this conserve?"

## Connection

- Anti-duplication rule (finn #66 Comment 10)
- FR-4 (consumer-driven contracts — codifies the conservation boundaries)
- GovernedResource<T> (FR-8) — governance conservation pattern
- FR-3 (feedback dampening) — trust conservation mechanism
