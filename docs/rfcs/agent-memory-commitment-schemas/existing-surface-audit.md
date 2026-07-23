# Existing Surface Audit — Agent Memory & Commitment Schemas

**Status:** DRAFT — pending @deep-name verification.
**Date:** 2026-04-27

The product-context report (`agent_memory_decentralized_storage_loa_context_report.md` §24.4) names eleven candidate schemas. This audit checks each against today's Hounfour surface to identify duplication risk before any implementation happens. Per playbook §0.4 and §1.3, this is the most important step: the wrong outcome here is silently re-defining a shape that already exists.

The audit was performed against the working tree of `draft/proposal-agent-memory-commitment-schemas`. @deep-name should re-verify before approval.

## Summary table

| Report candidate | Existing Hounfour schema | Verdict |
|---|---|---|
| `MemoryArtifact` | (none found) | NEW |
| `MemorySummary` | (none found) | NEW — likely a `kind` variant of `MemoryArtifact` |
| `MemoryReflection` | (none found) | NEW — likely a `kind` variant of `MemoryArtifact` |
| `MemoryCommitment` | (none found) | NEW |
| `ChainCommitment` | `ChainBoundHash` (different purpose — intra-audit hash chain, not external chain anchor) | NEW (distinct from `ChainBoundHash`) |
| `AgentIdentity` | `src/schemas/agent-identity.ts` (v6.0.0+) | EXISTS — must reuse |
| `AgentCredential` | `ReputationCredential` (`src/utilities/reputation-credential.ts` + `src/governance/reputation-credential.ts`) | EXISTS — likely subsumed; @deep-name to confirm |
| `AccessPolicy` | `src/schemas/conversation.ts` (referenced from `src/utilities/access-policy.ts`, v7.2.0) | EXISTS — must reuse |
| `StoragePointer` | (none found) | NEW |
| `ReputationEvent` | `src/governance/reputation-event.ts` + sibling `reputation-events.ts` | EXISTS — must reuse |
| `ValidationRecord` | Adjacent: `proposal-outcome-event.ts`, `delegation-outcome.ts`, `delegation-quality.ts`, `quality-observation.ts` | UNCLEAR — open question for @deep-name |

## Detailed findings

### `AgentIdentity` — already exists, mature

**Location:** `src/schemas/agent-identity.ts` (re-exported from `src/core/index.ts`).
**Since:** v5.5.0 (`trust_level`); v6.0.0 BREAKING introduced `trust_scopes` (CapabilityScopedTrust).
**Notes:** Carries `TrustLevelSchema` (`untrusted` < `basic` < `verified` < `trusted` < `sovereign`) and capability scopes including `billing`, `governance`, `inference`, `delegation`, `audit`, `composition`. The v6.0.0 dual-read adapter is documented inline.

**Risk if redefined:** breaks existing trust-scope semantics across Finn/Freeside. Must be reused unchanged.

### `AccessPolicy` — already exists

**Location:** Schema in `src/schemas/conversation.ts`; evaluator in `src/utilities/access-policy.ts`.
**Since:** v7.2.0 (FR-6 + Bridgebuilder F1).
**Notes:** Has `evaluateAccessPolicy(policy, context)` evaluator with `AccessPolicyContext` and `AccessPolicyResult` types; supports nested policy composition (`policy.policies[]`).

**Risk if redefined:** silently incompatible permission rules across consumers. Must be reused. Memory-commitment encryption gating should pass through this evaluator.

### `ReputationEvent` / `ReputationCredential` / `ReputationAggregate` — full suite exists

**Location:**
- `src/governance/reputation-event.ts`, `src/governance/reputation-events.ts`
- `src/governance/reputation-credential.ts`, `src/utilities/reputation-credential.ts`
- `src/governance/reputation-aggregate.ts`
- `src/governance/reputation-commands.ts` (Query/Reset commands)
- `src/governance/reputation-portability.ts`
- `src/governance/reputation-routing.ts`
- `src/commons/governed-reputation.ts`
- `src/economy/reputation-economic-impact.ts`
- `src/vocabulary/reputation.ts`
- 11 matching constraint files in `constraints/Reputation*.constraints.json`

**Notes:** This is a substantial pre-existing surface. The report's "AgentCredential" is most plausibly already covered by `ReputationCredential`. The "ValidationRecord" is partially covered by reputation event variants and proposal-outcome events.

**Risk if redefined:** the existing v9.0.0 cross-repo-extraction RFC (`docs/RFC-v9-cross-repo-extraction.md`, §1.1) is already evolving `ReputationEvent.model_performance`. A parallel `ValidationRecord` proposal would conflict.

### `ChainBoundHash` — exists but different purpose

**Location:** `src/commons/chain-bound-hash.ts`.
**Since:** v8.3.0.
**Notes:** Computes `sha256(contentHash + ":" + previousHash)` with a `{repo}:{domain}:{qualifier}` domain tag. This is **intra-audit-trail hash chaining** with domain separation — it is *not* an external blockchain anchor.

**Verdict:** the report's `ChainCommitment` is genuinely new and distinct. Naming should make this distinction obvious. Suggested name disambiguators: `ExternalChainAnchor`, `OnChainAnchor`, `ChainCommitment`. Open question for @deep-name in `open-questions-for-deep-name.md`.

### `AuditTrail` / `AuditTrailEntry` / `AuditTimestamp` — exists

**Location:** `src/commons/audit-trail.ts`, `audit-trail-hash.ts`. Three matching constraint files.
**Notes:** Carries the genesis hash constant `AUDIT_TRAIL_GENESIS_HASH`; `ChainBoundHash` builds on this. Memory-commitment digests should reference but not duplicate this surface.

### `BridgeTransferSaga` — exists, adjacent

**Location:** `src/economy/bridge-transfer-saga.ts`.
**Notes:** Cross-chain asset transfer choreography. Adjacent to but distinct from cross-chain memory-commitment anchoring. Open question: does `ChainCommitment` need to participate in `BridgeTransferSaga` event timelines when memory commitments accompany asset transfers? Flagged for @deep-name.

### `x402-payment` — exists

**Location:** `src/economy/x402-payment.ts`.
**Notes:** Out of scope for v1, but a future paid-memory-access proposal would integrate here. v1 must not couple to it.

### Module placement candidates already in tree

Existing top-level src modules:

```
src/
  core/            agent-identity, personality-assignment
  commons/         dynamic-contract, chain-bound-hash, governed-reputation, audit-trail
  economy/         basket-composition, bridge-transfer-saga, x402-payment, ...
  governance/      reputation-*, delegation-*, governance-proposal, permission-boundary, ...
  integrity/       conservation-properties, consumer-contract, idempotency, liveness-properties, req-hash
  graph/
  composition/
  constraints/
  validators/
  schemas/         (mixed: agent-identity, conversation)
  utilities/       (mixed: access-policy, reputation, governance-utils)
  vocabulary/      reputation, event-types, errors, ...
  test-infrastructure/
```

A new `src/memory/` barrel is plausible. Alternatives: extend `core`, extend `integrity`, or place under `commons`. Module placement is a question for @deep-name (see `open-questions-for-deep-name.md` Q3).

## What this audit does NOT prove

- It does not prove the existing schemas are *sufficient* for memory-commitment use cases — only that they exist and must not be re-defined.
- It does not check Python/Go/Rust mirror schemas in downstream repos.
- It does not check whether existing constraint-evaluator builtins already cover CAIP-2 chain-id syntax. This is flagged as Q5 for @deep-name.
- It does not verify the `BridgeTransferSaga` event timeline composition question. This is flagged as Q6.

@deep-name should treat this audit as a starting point and re-run against the latest `main` before approving any implementation work.
