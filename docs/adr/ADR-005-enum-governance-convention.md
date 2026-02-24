# ADR-005: Enum Governance Convention

**Status**: Accepted
**Date**: 2026-02-24
**Source**: Bridgebuilder Second Reading — PR #36, Meditation VI (Protocol Completeness)

## Context

The protocol defines 60+ TypeBox union types that serve as enums. Some are architectural invariants that should never change without a MAJOR version bump (e.g., `SagaStatus` state machine). Others are intentionally extensible as the ecosystem evolves (e.g., `ProviderType` as new model providers emerge). Without explicit classification, contributors must guess whether adding a new literal to a union is a minor extension or a protocol violation.

## Decision

Every protocol-level enum (exported `Type.Union` with `Type.Literal` values) MUST include a governance classification in its JSDoc:

```typescript
/**
 * @governance protocol-fixed
 */
```

### Classifications

| Classification | Meaning | Extension Process |
|----------------|---------|-------------------|
| `protocol-fixed` | Architectural invariant. Values define state machine transitions, security boundaries, or conservation properties. | MAJOR version bump + migration guide |
| `registry-extensible` | Stable core with room for growth. New values represent genuine new capabilities, not arbitrary additions. | MINOR version bump + RFC |
| `community-defined` | Open vocabulary. Communities can define their own values using `namespace:type` format (ADR-003). | No protocol change needed |

### Annotation Scope

Only major exported enums get `@governance` annotations — not inline unions within object schemas. The heuristic: if the type has its own `const ...Schema = Type.Union(...)` export, it gets annotated. If the union is inline within a `Type.Object()`, it inherits the governance of its parent schema.

### Retroactive Classification

| Enum | File | Classification |
|------|------|---------------|
| `TaskType` | `governance/task-type.ts` | registry-extensible |
| `ScoringPath` | `governance/scoring-path-log.ts` | protocol-fixed |
| `ReputationState` | `governance/reputation-aggregate.ts` | protocol-fixed |
| `SagaStatus` | `economy/bridge-transfer-saga.ts` | protocol-fixed |
| `ProposalStatus` | `governance/governance-proposal.ts` | protocol-fixed |
| `ExecutionStatus` | `governance/proposal-execution.ts` | protocol-fixed |
| `ExecutionStrategy` | `governance/proposal-execution.ts` | protocol-fixed |
| `ConstraintOrigin` | `constraints/types.ts` | protocol-fixed |
| `ConservationStatus` | `vocabulary/conservation-status.ts` | protocol-fixed |
| `TrustLevel` | `schemas/agent-identity.ts` | protocol-fixed |
| `CapabilityScope` | `schemas/agent-identity.ts` | registry-extensible |
| `AgentType` | `schemas/agent-identity.ts` | registry-extensible |
| `EnsembleStrategy` | `schemas/model/ensemble/ensemble-strategy.ts` | registry-extensible |
| `ProviderType` | `schemas/model/routing/provider-type.ts` | registry-extensible |
| `PolicyType` | `governance/policy-version.ts` | registry-extensible |
| `EngagementSignalType` | `governance/community-engagement.ts` | registry-extensible |

## Consequences

- Contributors can check the `@governance` tag before proposing new enum values.
- Code review can verify that enum changes match the appropriate governance process.
- Future tooling can extract governance classifications for automated validation.
- The classification is advisory — it guides process, not compilation.

## Industry Precedent

- **gRPC/Protobuf**: `reserved` field numbers prevent accidental reuse of removed values. Governance annotations serve a similar purpose — preventing accidental modification of fixed enums.
- **Kubernetes API Stability Levels**: Alpha/Beta/Stable classifications on API fields. Contributors know which fields are safe to modify and which require a KEP (Kubernetes Enhancement Proposal).
- **Rust `#[non_exhaustive]`**: Attribute that prevents downstream exhaustive matching, signaling that the enum may gain new variants. Our `registry-extensible` classification serves the same purpose semantically.
