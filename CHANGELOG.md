# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
