# ADR-008: Governance Enforcement SDK (Path B)

**Status**: Accepted
**Date**: 2026-02-25
**Deciders**: soju + Claude
**Source**: Bridgebuilder Review — PR #37, Strategic Question Q1

## Context

The Commons Protocol v8.0.0 established `GovernedResource<T>` as a governance substrate with schemas for conservation laws, audit trails, state machines, and dynamic contracts. The Bridgebuilder review identified a key strategic question:

> **Path A** — Schema library: loa-hounfour defines contracts, consumers enforce independently.
> **Path B** — Governance SDK: loa-hounfour provides both contracts AND enforcement utilities.

Three consumer patterns emerged that support Path B:
1. **loa-freeside** enforces `lot_invariant` with its own `validateLotConservation()` — duplicating what the protocol could provide canonically.
2. **loa-dixie** built a full `ResourceGovernor<T>` abstraction — the most advanced local implementation.
3. **loa-finn** uses `evaluateAccessPolicy()` (v7.2.0) — an existing enforcement utility that proves the pattern.

## Decision

Adopt **Path B**: loa-hounfour provides enforcement utilities alongside schemas. The pattern is already proven by `evaluateAccessPolicy()` (v7.2.0), `evaluateConstraint()` (v7.0.0), and `verifyAuditTrailIntegrity()` (v8.0.0).

### v8.1.0 Enforcement Utilities

| Utility | Schema it enforces | Bridgebuilder Finding |
|---------|-------------------|----------------------|
| `evaluateGovernanceMutation()` | GovernanceMutation + AccessPolicy | F6 (HIGH) |
| `createBalanceConservation()` et al. | ConservationLaw factory functions | F7 (MEDIUM) |
| `createCheckpoint()` / `pruneBeforeCheckpoint()` | AuditTrail checkpoint fields | F8 (MEDIUM) |
| `isNegotiationValid()` | ContractNegotiation TTL | F9 (MEDIUM) |
| `verifyMonotonicExpansion()` | DynamicContract surface ordering | F10 (MEDIUM) |

### Design Principles

1. **Utilities, not services** — enforcement functions are pure, side-effect-free, and dependency-free beyond TypeBox types. No database, no network, no clock (explicit clock parameter per F9).
2. **Opt-in enforcement** — consumers call utilities when they want enforcement. The protocol doesn't force a runtime model.
3. **Canonical patterns** — factory functions produce well-known patterns (sum conservation, non-negative, bounded) that consumers would otherwise write ad-hoc.
4. **Composable** — utilities compose with the existing constraint evaluator and access policy system.

## Consequences

### Positive

- Consumers get canonical enforcement without reimplementing governance logic
- The `evaluateAccessPolicy()` pattern (v7.2.0) is proven and well-tested
- Reduces drift between consumer implementations of the same governance check
- Factory functions provide discoverability ("what conservation patterns exist?")

### Negative

- More surface area to maintain in loa-hounfour
- Risk of over-prescribing enforcement patterns that don't fit all consumers
- Consumer upgrades may require updating enforcement utility calls (not just schema validation)

### Mitigations

- Keep utilities pure and composable — consumers can ignore them
- Each utility is independently usable (no "governance framework" all-or-nothing)
- Additive-only exports — existing consumers are never broken

## References

- Bridgebuilder Review, PR #37 — "Schema library vs governance framework (Path A vs B)"
- `src/utilities/access-policy.ts` — existing enforcement utility pattern
- `src/commons/governance-mutation-eval.ts` — v8.1.0 mutation evaluation
- loa-dixie `ResourceGovernor<T>` — most advanced local enforcement pattern
