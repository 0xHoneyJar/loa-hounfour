<!-- docs-version: 7.0.0 -->

# Changelog

All notable changes to this project will be documented in this file.
Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/).

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
