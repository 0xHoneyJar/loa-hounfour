# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

## [8.4.0] — 2026-05-06

**Theme:** Synthetic-deliberation protocol + organization-level governance primitives. Strict additive MINOR — no breaking changes.

### Added

- **Deliberation set (4 schemas)** — `PanelDecisionArtifact` (FR-A1), `PanelVerdict` (FR-A2), `DeliberationDissent` (FR-A3), `CrossScoreReport` (FR-A4). Bucket↔verdict normative pairing (PV-1), `[4, 16]` per-juror verdict bounds (PV-2), asymmetric-blocker two-condition consistency (PV-3), signing-context format guard (PV-4). Inline `JurorVerdictSchema`, `AsymmetricBlockerSignalSchema`, `ClaimSchema`, `ClaimGroundingSchema`, `ProposedActionSchema`, `TrustContextSchema`, `PairwiseScoreSchema` sub-records.
- **Org-overseer set (3 schemas)** — `OrgIdentity` (FR-B1), `OrgRepresentativeDelegation` (FR-B2), `SuccessionPolicy` (FR-B3). Cold-storage `org_public_key` model; append-only delegation log chained to the literal genesis sentinel `"genesis:org-public-key"`; constitutional ladder with asymmetric thresholds (SP-1: `amend ≥ rotate ≥ add ≥ remove`) and non-decreasing cooldowns (SP-2). New 4-rule constraint set on `OrgRepresentativeDelegation` (ORD-1..ORD-4).
- **`SigningContextSchema`** — shared audience/scope/contract_version envelope bound under signature on `PanelVerdict`, `CrossScoreReport`, and `OrgRepresentativeDelegation`. Closes the cross-context replay surface.
- **`is_valid_dag` constraint builtin (FR-C1)** — post-order DFS with explicit op-counter (cap: 100,000 ops). Pre-guards at 10,000-item count and 1 MiB serialized payload. Structured diagnostic envelope with 7 error codes (`DAG_OP_CAP_EXCEEDED`, `DAG_CYCLE_DETECTED`, `DAG_DANGLING_REF`, `DAG_MISSING_ID_FIELD`, `DAG_NON_STRING_ID_FIELD`, `DAG_DUPLICATE_ID`, `DAG_INPUT_OVERSIZE`). Reused by `PanelDecisionArtifact.PDA-2` and `OrgRepresentativeDelegation.ORD-3`. Reference: [`src/constraints/is-valid-dag.ts`](./src/constraints/is-valid-dag.ts).
- **7 new constraint files** (PR-A1.4) — `PanelDecisionArtifact.constraints.json` (PDA-1..PDA-5), `PanelVerdict.constraints.json` (PV-1..PV-4), `DeliberationDissent.constraints.json`, `CrossScoreReport.constraints.json` (CSR-1), `OrgIdentity.constraints.json` (OI-1), `OrgRepresentativeDelegation.constraints.json` (ORD-1..ORD-4), `SuccessionPolicy.constraints.json` (SP-1, SP-2). Constraint corpus: 100 files (was 93).
- **Parity-protocol contract (`parity-protocol-version: 1.0.0`)** — published in [`docs/architecture/parity-protocol.md`](./docs/architecture/parity-protocol.md). Pins cross-runner expectations across TypeScript / Go / Python / Rust on schema validation, constraint evaluation, `is_valid_dag` traces, `extract_path` reference behavior, and the error envelope shape. Co-signed handoff record at [`docs/architecture/parity-protocol.handoff.json`](./docs/architecture/parity-protocol.handoff.json).
- **Cross-runner error taxonomy** — closed `ErrorCode` enum + per-code `context` shapes published in [`docs/architecture/error-codes.md`](./docs/architecture/error-codes.md). 6 net-new codes: `DAG_INPUT_OVERSIZE`, `CONFORMANCE_OBLIGATION_UNACK`, `CONFORMANCE_OBLIGATION_FAIL`, `SIGNING_CONTEXT_AUDIENCE_MISMATCH`, `SIGNING_CONTEXT_SCOPE_MISMATCH`, `SIGNING_CONTEXT_VERSION_INCOMPATIBLE`. Cross-runner comparison rule: `code` + `path` + `context` equality; `message` is locale-affordant.
- **`UnverifiedObligationsManifest` emission contract** — `validate(...)` return shape extended additively with an optional `unverified_obligations` field. Library names runtime-deferred rules (ORD-1, ORD-2, ORD-4) so consumers cannot silently miss them. Field is OMITTED when no runtime-deferred rules apply — pre-v8.4.0 byte-equal JSON output guaranteed for any schema without runtime-deferred rules.
- **3 new architecture documents** — [`docs/architecture/panel-protocol.md`](./docs/architecture/panel-protocol.md) (consumer-facing deliberation set), [`docs/architecture/org-overseer.md`](./docs/architecture/org-overseer.md) (org-as-principal model + chain-of-trust + succession policy), [`docs/architecture/parity-protocol.md`](./docs/architecture/parity-protocol.md) (cross-runner conformance contract). Plus [`docs/architecture/error-codes.md`](./docs/architecture/error-codes.md).
- **171 new conformance vectors** — 91 governance fixtures (5 valid + 8 invalid per schema) + `is-valid-dag` corpus with 11 `.trace.json` op-count companions + `extract-path` corpus + 4 signing corpora. New driver at [`scripts/cross-runner.ts`](./scripts/cross-runner.ts) and meta files at `vectors/_meta/{constraint-level-invalids.json,regex-subset.md}`. Test suite: 7,119 tests (was 6,944).

### Changed

- **`CONTRACT_VERSION` bumped to `'8.4.0'`** — `src/version.ts:13`. Also resolves prior `'8.3.0'` lag observed in earlier cycles; `src/version.ts` now matches `package.json` exactly.
- **`package.json` `version` bumped to `"8.4.0"`**.
- **`vectors/VERSION` bumped to `8.4.0`**.
- **`RELEASE-INTEGRITY.json`** — regenerated via `npm run integrity:generate`.
- **`MIN_SUPPORTED_VERSION` unchanged at `'6.0.0'`** — N/N-1 compatibility window covers v7.x and v8.x consumers.

### Release notes

- Released under the parity-protocol **deferred-co-sign window** (`signature_basis: 'maintainer-override'`). The sponsoring consumer's release lead was unreachable within the standard 7-business-day window; the maintainer commits the handoff alone with the consumer co-signing retroactively when available. Failure to co-sign within 30 days post-tag triggers a parity-protocol PATCH bump (1.0.0 → 1.0.1) recording the asymmetric ratification. See [`docs/architecture/parity-protocol.handoff.json`](./docs/architecture/parity-protocol.handoff.json) and [`docs/architecture/parity-protocol.md`](./docs/architecture/parity-protocol.md) §8.

### Source

Issue [#61](https://github.com/0xHoneyJar/loa-hounfour/issues/61) — Synthetic-Deliberation Protocol + Governance Primitives RFC. Six PRs (PR-A1.1 through PR-A1.6) merged across the cycle.

---

## [8.3.0] — 2026-02-28

### Added

- **Feedback Dampening** (FR-1) — EMA-based dampening with cold-start Bayesian prior. `dampNext()` smooths noisy reputation signals with configurable `alpha` and `minSamples` parameters. Prevents oscillation during agent warm-up.
- **Chain-Bound Hash** (FR-2) — SHA-256 chain-bound hashing with domain tag validation. `chainBoundHash()` produces deterministic, domain-separated digests for audit trail integrity. Tags must match `^[a-z][a-z0-9_.-]{0,63}$`.
- **Audit Timestamp Validation** (FR-3) — Strict ISO 8601 validation with drift detection. `validateAuditTimestamp()` enforces format, rejects future timestamps beyond configurable tolerance, and validates reasonable temporal bounds.
- **Advisory Lock Hashing** (FR-4) — FNV-1a 32-bit hashing for PostgreSQL advisory locks. `advisoryLockHash()` produces deterministic int32 lock IDs from string keys. No crypto dependency.
- **X402 Payment Schemas** (FR-5) — 5 schemas for HTTP 402-based machine payment: `X402Quote`, `X402PaymentProof`, `X402SettlementStatus`, `X402Settlement`, `X402ErrorCode`. String micro-USD amounts, EIP-55 addresses.
- **Tier-Reputation Mapping** (FR-5) — `mapTierToReputationState()` maps billing tiers to reputation states: free→cold, basic→warming, pro→established, enterprise→authoritative.
- **DenialCode Extension** (FR-5) — 3 new denial codes: `BUDGET_PERIOD_EXPIRED`, `TIER_REPUTATION_MISMATCH`, `BUDGET_SCOPE_MISMATCH`. Extends `EconomicBoundaryEvaluationEvent` coverage.
- **Conditional Constraints** (FR-5) — `ConstraintCondition` interface with `when` expression, `override_text`, `override_rule_type`. `resolveConditionalExpression()` evaluates feature flags against `EvaluationContext`.
- **ConsumerContract** (FR-6) — Consumer-driven contract declaring imported symbols per entrypoint. `validateConsumerContract()` checks against export map. `computeContractChecksum()` produces SHA-256 content hash for drift detection.
- **GovernedResource Runtime** (FR-6) — `GovernedResource<T>` interface and `GovernedResourceBase` abstract class. Single-writer semantics, invariant verification harness, automatic rollback on violation, monotonic versioning, audit trail integration. Schemas: `TransitionResult`, `InvariantResult`, `MutationContext`.
- **10 new JSON schemas** — 201 total (up from 191).
- **13 conformance vectors** — 232 total (up from 219). 3 consumer-contract vectors, 10 governed-resource-runtime vectors.
- **6 constraint files** — 93 total (up from 87). FeedbackDampening, ChainBoundHash, AuditTimestamp, ConsumerContract, GovernedResourceRuntime, MutationContext.
- **~150 new tests** — 6,619 total. Includes property-based tests (fast-check) for dampening convergence and hash determinism.

### Source

PR #39 — v8.3.0 Pre-Launch Protocol Hardening (Bridge iteration 1).

---

## [8.2.0] — 2026-02-25

### Added

- **`ModelPerformanceEvent` variant** — 4th discriminated union variant in `ReputationEvent`. Carries model performance observations (`model_id`, `provider`, `pool_id`) with structured `QualityObservation`. Closes autopoietic feedback loop: Dixie evaluation → cross-model scoring → routing signal adjustment. ([Issue #38](https://github.com/0xHoneyJar/loa-hounfour/issues/38))
- **`QualityObservation` schema** — Standalone quality evaluation output: `score` [0,1], optional `dimensions` (max 20, pattern `^[a-z][a-z0-9_]{0,31}$`), `latency_ms`, `evaluated_by`. Reusable beyond the event pipeline.
- **`'unspecified'` TaskType literal** — Reserved fallback when task metadata is unavailable. Cohort update logic routes to aggregate-only scoring (no task-type cohort entry). (Flatline FR-1)
- **23 conformance vectors** — 6 model-performance variants (minimal, full, with-dimensions, community-task-type, invalid-score, missing-model-id), boundary scores, unspecified-task-type, plus existing vector updates. 217 vectors total.
- **Property-based discrimination tests** — Exactly-one-match, roundtrip, and negative tests for `ReputationEvent` variant exhaustiveness.
- **Integration tests** — Pipeline acceptance, variant marshalling, duplicate detection, forward compatibility.

### Source

[PR #37](https://github.com/0xHoneyJar/loa-hounfour/pull/37) — Flatline integration (cycle-038), [Issue #38](https://github.com/0xHoneyJar/loa-hounfour/issues/38).

---

## [8.1.0] — 2026-02-25

### Breaking Changes

- **`GovernanceMutation.actor_id` now required** — Mutation envelope must include actor identity (`minLength: 1`) for audit trail attribution and access policy evaluation. (Bridgebuilder F6 — HIGH)

### Added

- **Governance Enforcement SDK** — Pure utility functions for mutation and resource validation (ADR-008, Path B):
  - `evaluateGovernanceMutation()` — Evaluate mutation against access policy (F6)
  - Conservation law factories: `buildSumInvariant()`, `buildNonNegativeInvariant()`, `buildBoundedInvariant()` + `create*Conservation()` variants (F7)
  - Audit trail checkpointing: `createCheckpoint()`, `verifyCheckpointContinuity()`, `pruneBeforeCheckpoint()` (F8)
  - Contract negotiation TTL: `isNegotiationValid()`, `computeNegotiationExpiry()` (F9)
  - Dynamic contract verification: `verifyMonotonicExpansion()` (F10)
- **`GOVERNED_RESOURCE_FIELDS` extensions** — `access_policy_ref` (optional), `governance_extensions` (optional), `contract_version` (required).
- **12 property-based tests** — Conservation law symmetry, checkpoint continuity, TTL monotonicity, expansion verification.
- **ADR-008** — Governance Enforcement SDK (Path B, opt-in enforcement).
- **ADR-009** — DynamicContract → Model Routing Integration.

### Source

[PR #37](https://github.com/0xHoneyJar/loa-hounfour/pull/37) — Bridgebuilder findings F6–F10 (5 sprints).

---

## [8.0.0] — 2026-02-25

### Breaking Changes

- **Major version bump** — New `commons` module introduces governance substrate. No existing schemas removed or modified, but the major version signals a new architectural layer.

### Added

- **`commons` module** — 21 schemas for governed resource management:
  - Foundation: `Invariant`, `ConservationLaw`, `AuditEntry`, `AuditTrail`, `State`, `Transition`, `StateMachineConfig`, `GovernanceClass`, `GovernanceMutation`
  - Instantiations: `GovernedCredits`, `GovernedReputation`, `GovernedFreshness`
  - Hash chain (ADR-006): `HashChainDiscontinuity`, `QuarantineStatus`, `QuarantineRecord`
  - Dynamic contracts (FR-4): `ProtocolCapability`, `RateLimitTier`, `ProtocolSurface`, `DynamicContract`, `AssertionMethod`, `ContractNegotiation`
  - Error taxonomy: `GovernanceError` discriminated union (6 variants: `InvariantViolation`, `InvalidTransition`, `GuardFailure`, `EvaluationError`, `HashDiscontinuityError`, `PartialApplication`)
- **`./commons` export** — New sub-package barrel: `import { ... } from '@0xhoneyjar/loa-hounfour/commons'`.
- **ADR-006** — Hash Chain Operational Response (halt-and-reconcile protocol).
- **ADR-007** — Commons Protocol Pattern (Ostrom isomorphism, `GovernedResource<T>` primitive).
- **189 JSON schemas** regenerated with commons additions.

### Source

[PR #37](https://github.com/0xHoneyJar/loa-hounfour/pull/37) — Sprints 1–8, Commons Protocol foundation through release.

---

## [7.11.0] — 2026-02-24

### Added

- **Open `TaskType` enum** — Community `namespace:type` format via regex pattern (e.g., `legal-guild:contract_review`). Governance: `registry-extensible` (MINOR to add, MAJOR to remove/rename).
- **`@governance` annotations** — Constraint-level governance metadata for schema evolution policy.
- **Hash-chain fields** — `previous_hash` and `chain_height` on audit-relevant schemas for tamper-evident logging.
- **ADR-003** — Open TaskType Governance (extensibility without protocol coordination).
- **ADR-004** — Community Namespace Convention.
- **ADR-005** — Hash Chain Audit Fields.
- **7 conformance vectors** — Task-type community format, hash-chain validation, governance annotation coverage.

### Source

[PR #36](https://github.com/0xHoneyJar/loa-hounfour/pull/36) — Protocol hardening, Bridgebuilder second reading.

---

## [7.10.1] — 2026-02-24

### Fixed

- **Root barrel discoverability** — All new v7.10.0 exports re-exported from root `index.ts`.
- **`NativeEnforcement` interface** — Extracted enforcement interface for constraint runtime.
- **`COHORT_BASE_FIELDS` extraction** — Shared fields factored into reusable constant for cohort schemas.
- **ADR-001** — NativeEnforcement Interface Pattern.
- **ADR-002** — Shared Cohort Base Fields.

### Source

[PR #36](https://github.com/0xHoneyJar/loa-hounfour/pull/36) — Bridgebuilder findings.

---

## [7.10.0] — 2026-02-24

### Added

- **`TaskType` schema** — 5 protocol-defined task categories (`code_review`, `creative_writing`, `analysis`, `summarization`, `general`) for task-dimensional reputation scoring.
- **`TaskTypeCohort` schema** — Per-task-type reputation tracking with scoring path log.
- **`ReputationEvent` discriminated union** — 3 initial variants (`quality_signal`, `task_completion`, `peer_review`) for reputation pipeline events.
- **`ScoringPathLog` schema** — Audit trail for scoring algorithm decisions.
- **8 new schemas** — TaskType, TaskTypeCohort, ReputationEvent (3 variants), ScoringPathLog, plus supporting types.
- **22 conformance vectors** — Task-type validation, cohort lifecycle, event discrimination, scoring path coverage.

### Source

[PR #36](https://github.com/0xHoneyJar/loa-hounfour/pull/36) — Task-dimensional reputation, upstream shared vocabulary from Dixie.

---

## [7.9.2] — 2026-02-23

### Removed

- **Loa framework** — Ejected development framework for protocol hygiene. Removed `.loa/` git submodule, `.claude` symlink, `evals/` framework test suite (110 files), 86 `.bats` framework shell tests, Loa-specific docs (`process.md`, `visions/`, `context/`, `ledger.json`), and all `<!-- docs-version -->` markers. Protocol source, schemas, constraints, vectors, and tests are unchanged.

### Changed

- **BUTTERFREEZONE.md** — Rewritten to reflect protocol library (removed Loa skill commands, three-zone model, adapter references).
- **CLAUDE.md** — Stripped Loa framework import and submodule instructions.
- **`.gitignore`** — Removed Loa-specific entries, added `.claude/` for Claude Code session state.

### Source

Eject from Loa framework v1.39.0. No protocol schema, constraint, or API changes.

---

## [7.9.1] — 2026-02-23

### Added

- **`isKnownReputationState()` type guard** — Runtime validation replacing `as ReputationStateName` casts. Narrows type for TypeScript compiler. (`src/vocabulary/reputation.ts`)
- **`DenialCode` union type** — 6 machine-parseable denial codes (`TRUST_SCORE_BELOW_THRESHOLD`, `TRUST_STATE_BELOW_THRESHOLD`, `CAPITAL_BELOW_THRESHOLD`, `UNKNOWN_REPUTATION_STATE`, `INVALID_BUDGET_FORMAT`, `MISSING_QUALIFICATION_CRITERIA`).
- **`EvaluationGap` schema** — Structured gap information for denied evaluations: `trust_score_gap`, `reputation_state_gap`, `budget_gap`. Actionable feedback for agents.
- **`evaluateFromBoundary()` convenience overload** — Extracts `qualification_criteria` from the boundary itself, preventing Confused Deputy Problem.
- **`EconomicBoundaryEvaluationEvent` schema** — Event recording for feedback loop. Consumers can aggregate to inform governance decisions about criteria thresholds.
- **`eval-denied-needs-codes` constraint** — 5th constitutional constraint: denied evaluations must include at least one machine-parseable denial code. Discovered through peer review (Part 9.1).
- **`buildValidationDenial()` partial evaluator** — Replaces `makeDenied()` with symmetry-preserving partial evaluation. Valid layers get accurate `passed` boolean; only invalid layers are marked `false`.
- **`tryEvaluateTrust()` / `tryEvaluateCapital()` helpers** — Independent layer evaluators with `T | null` (Option) return semantics.
- **15 new tests** — 5 constraint tests for `eval-denied-needs-codes`, 8 symmetry fix tests, 2 vector updates.

### Fixed

- **`makeDenied()` symmetry gap** — Both layers were marked `passed: false` on input validation failures even when only one layer had a problem. Now uses partial evaluation: valid layers reflect actual evaluation results.
- **Conformance vectors** — `unknown-state.json` and `invalid-budget.json` updated to match partial evaluation semantics.

### Source

[PR #29](https://github.com/0xHoneyJar/loa-hounfour/pull/29) — Sprints 2–3, Bridgebuilder Deep Review Parts 8.1–10.3.

---

## [7.9.0] — 2026-02-23

### Added

- **`evaluateEconomicBoundary()`** — Pure decision engine function. Total (never throws for valid TypeBox inputs), deterministic (caller-provided `evaluatedAt`), fail-closed (unknown states → denied). Trust × capital → access decision with structured denial reasons.
- **`parseMicroUsd()`** — Strict micro-USD string parser. Grammar: `^[0-9]+$`, no leading zeros, max 30 digits. Returns discriminated union, never throws. BigInt arithmetic prevents floating-point errors.
- **`QualificationCriteria` schema** — Threshold inputs for boundary evaluation: `min_trust_score`, `min_reputation_state`, `min_available_budget`.
- **`TrustEvaluation` / `CapitalEvaluation` schemas** — Sub-results with actual vs required values.
- **`EconomicBoundaryEvaluationResult` schema** — Complete evaluation output with access decision, layer evaluations, criteria used, and evaluated_at.
- **`ConstraintOrigin` type** — `'genesis' | 'enacted' | 'migrated'` provenance for all constraint files. Makes constitutional bootstrapping asymmetry explicit. All 73 existing constraints annotated with `origin: "genesis"`.
- **4 genesis constraints** — `eval-granted-iff-both-pass`, `eval-denied-needs-reason`, `eval-trust-score-bounded`, `eval-criteria-score-bounded`.
- **9 conformance vectors** — Happy path, denied (trust, capital, both), boundary values, unknown state, invalid budget, missing criteria, full boundary.
- **Version bump** 7.8.0 → 7.9.0, 160 JSON schemas regenerated.

### Source

[PR #29](https://github.com/0xHoneyJar/loa-hounfour/pull/29) — Sprint 1, Issues [#24](https://github.com/0xHoneyJar/loa-hounfour/issues/24) and [#28](https://github.com/0xHoneyJar/loa-hounfour/issues/28).

---

## [7.0.0] — 2026-02-17

### Breaking Changes

- **`RegistryBridge`** gains required `transfer_protocol` field — existing bridge instances must add `transfer_protocol: { saga_type: 'atomic' }` (or `'choreography'`). See [MIGRATION.md](./MIGRATION.md).

### Added

- **BridgeTransferSaga** — Garcia-Molina saga pattern for cross-registry value transfer with 8-state machine (`initiated` → `reserving` → `transferring` → `settling` → `settled`), compensation steps, and participant tracking.
- **DelegationOutcome** — Conflict resolution recording with 4 outcome types (`unanimous`, `majority`, `deadlock`, `escalation`) and first-class `DissentRecord` capturing minority opinion.
- **MonetaryPolicy** — Coupling invariant binding `MintingPolicyConfig` to `ConservationPropertyRegistry` with governance review triggers.
- **PermissionBoundary** — MAY permission semantics with `ReportingRequirement` and `RevocationPolicy`, enabling constrained experimentation alongside MUST/MUST_NOT prohibitions.
- **GovernanceProposal** — Collective decision mechanism with weighted voting, proposal status state machine, and `ProposedChange` descriptors (Ostrom Principle 3).
- **8 new evaluator builtins** (23 → 31): `saga_amount_conserved`, `saga_steps_sequential`, `outcome_consensus_valid`, `monetary_policy_solvent`, `permission_boundary_active`, `proposal_quorum_met`, `saga_timeout_valid`, `proposal_weights_normalized`.
- **5 new constraint files**: `BridgeTransferSaga.constraints.json`, `DelegationOutcome.constraints.json`, `MonetaryPolicy.constraints.json`, `PermissionBoundary.constraints.json`, `GovernanceProposal.constraints.json`.
- **18 new conformance vectors** across 5 categories (saga, outcome, monetary, permission, governance).
- **Composition barrel extended** with all v7.0.0 types available via `@0xhoneyjar/loa-hounfour/composition`.

### Fixed

- **F-007** — `as any` cast for `x-cross-field-validated` replaced with `withAnnotation<T>()` utility.
- **F-008** — `BridgeInvariant.invariant_id` pattern expanded from `^B-\d{1,2}$` to `^B-\d{1,4}$`.
- **F-020** — `parseExpr()` return type safety restored with `ConstraintASTNode` discriminated union + `asRecord()` utility eliminating 14 `as any` casts.
- **3 TypeScript errors** in `signature.ts` — `jose.KeyLike` → `CryptoKey | KeyObject`, `canonicalize` CJS interop fix.
- **9 stale test description strings** updated to reflect 31 builtins across 5 test files.
- **Tree builtin fail-closed** — `tree_budget_conserved` and `tree_authority_narrowing` now return `false` (not truthy strings) on depth limit breach.
- **Schema graph deep references** — `extractReferences()` rewritten with recursive `walkSchemaNode()` for depth-limited reference extraction.
- **Conservation registry coverage keys** — New `object_keys_subset` builtin + constraint validates coverage map keys against `InvariantUniverse`.

### Source

All changes from [PR #14](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Bridgebuilder Reviews I–VIII, 2 bridge iterations (flatline achieved).

---

## [6.0.0] — 2026-02-17

### Breaking Changes

- **`AgentIdentity.trust_level`** replaced by `trust_scopes: CapabilityScopedTrust` — 6-dimensional capability-scoped trust replaces flat trust levels. See [MIGRATION.md](./MIGRATION.md).

### Added

- **Liveness properties** — 6 temporal logic properties with bounded LTL formalization (`LivenessProperty` schema).
- **CapabilityScopedTrust** — 6 trust dimensions (`data_access`, `financial`, `delegation`, `model_selection`, `governance`, `external_communication`) replacing flat `trust_level`.
- **Constraint type system** — `type_signature` field on constraints, CI-time validation via `validateConstraintFile()`.
- **Schema graph operations** — `extractReferences()`, `buildSchemaGraph()`, cycle detection, reachability, topological sort.
- **RegistryBridge** — Cross-economy bridge treaty with `BridgeInvariant`, `ExchangeRateSpec`, `SettlementPolicy`.
- **DelegationTree** — Recursive tree structure with `chainToTree()`/`treeToChain()` converters, `tree_budget_conserved` + `tree_authority_narrowing` builtins.
- **Constraint type checker** — Static validation of constraint expressions against declared type signatures.
- **5 new evaluator builtins** (18 → 23): `tree_budget_conserved`, `tree_authority_narrowing`, `trust_scopes_valid`, `object_keys_subset`, `unique_values`.

### Source

[PR #14](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Bridgebuilder Reviews III–IV, 3 bridge iterations.

---

## [5.5.0] — 2026-02-17

### Added

- **ConservationPropertyRegistry** — 14 conservation invariants with LTL formalization for economic safety properties.
- **Branded arithmetic types** — `MicroUSD`, `BasisPoints`, `AccountId` with compile-time unit safety via TypeScript branded types.
- **JWT boundary verification** — `JwtBoundarySpec` with canonical 6-step verification pipeline.
- **Evaluator builtin specifications** — `EVALUATOR_BUILTIN_SPECS` map with signature, description, examples, edge cases for all builtins.
- **AgentIdentity** — Unified agent identity schema with trust levels, capabilities, and registration metadata.
- **Cross-schema reference graph** — `x-references` annotations enabling automated dependency tracking.
- **8 new evaluator builtins** (10 → 18): conservation, bigint, and registry builtins.

### Source

[PR #14](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Bridgebuilder Reviews I–II.

---

## [1.1.0] — 2026-02-12

### Added

- **ERROR_HTTP_STATUS mapping** (Finding 2): Canonical HTTP status codes for all 31 error codes. Ensures loa-finn and arrakis return consistent HTTP statuses for the same error conditions. Exported from `vocabulary/errors.ts`.
- **SSE sequence field** (Finding 3): Optional `sequence: integer` field on all 6 stream event types (`stream_start`, `chunk`, `tool_call`, `usage`, `stream_end`, `error`). Enables SSE reconnection via `Last-Event-ID`.
- **PoolCapabilitiesSchema** (Finding 5): TypeBox schema for pool capability declarations. Shape validation only — actual values remain in consumer config. Exported from `vocabulary/pools.ts`.
- **Versioned $id URIs** (Finding 8): All generated JSON schemas now include `$id: "https://schemas.0xhoneyjar.com/loa-hounfour/{version}/{name}"` and `$comment` with contract version metadata.

### Fixed

- **Idempotency key collision** (Finding 1 — High): `deriveIdempotencyKey()` now uses `JSON.stringify([tenant, reqHash, provider, model])` instead of colon-delimited concatenation. Prevents collision when components contain `:`.
- **Version compatibility patch check** (Finding 4): `validateCompatibility()` now performs full semver comparison (major → minor → patch) instead of only major + minor.

### Improved

- **Decompression order documentation** (Finding 7): Inline documentation on `parseEncodings()` explaining HTTP Content-Encoding unwrap semantics per RFC 9110 §8.4.

### Source

All changes from [BridgeBuilder review of PR #61](https://github.com/0xHoneyJar/loa-finn/pull/61).
