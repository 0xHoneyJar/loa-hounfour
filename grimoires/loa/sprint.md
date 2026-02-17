# Sprint Plan: The Composition-Aware Protocol — v6.0.0

**Status:** Draft
**Cycle:** cycle-015
**Source:** [PR #14 — Bridgebuilder Reviews III & IV](https://github.com/0xHoneyJar/loa-hounfour/pull/14)
**Branch:** `feature/v5.0.0-multi-model`
**Goal:** Make the conservation kernel composable — liveness proofs, capability-scoped trust, constraint type system, schema graph operations, registry composition, and concurrent delegation trees.

---

## Overview

| Metric | Value |
|--------|-------|
| Sprints | 4 |
| Total Tasks | 32 |
| New Schemas | 9 (LivenessProperty, CapabilityScopedTrust, ConstraintTypeSignature, RegistryBridge, BridgeInvariant, MintingPolicy, ExchangeRateSpec, DelegationTree, DelegationTreeNode) |
| Modified Schemas | 2 (ConservationPropertyRegistry BREAKING, AgentIdentity BREAKING) |
| New Constraint Files | 4 (LivenessProperty, RegistryBridge, MintingPolicy, DelegationTree) |
| Modified Constraint Files | 31 (all existing — add type_signature) |
| New Source Files | 6 |
| New Evaluator Builtins | 4 (type_of, is_bigint_coercible, tree_budget_conserved, tree_authority_narrowing) |
| New Conformance Vectors | 12 (3 per new domain) |
| Estimated New Tests | ~202 |
| Version | 5.5.0 → 6.0.0 (BREAKING) |
| Schema Count | 68 → ~77 |

### FR to Sprint Mapping

| FR | Priority | Description | Sprint |
|----|----------|-------------|--------|
| FR-1 | P0 | Conservation Liveness Properties | Sprint 1 |
| FR-2 | P0 | Capability-Scoped Trust Model (BREAKING) | Sprint 1 |
| FR-3 | P0 | Constraint Type System | Sprint 2 |
| FR-4 | P1 | Schema Graph Operations | Sprint 2 |
| FR-5 | P1 | Registry Composition Protocol | Sprint 3 |
| FR-6 | P1 | DelegationTree for Concurrent Multi-Model | Sprint 3 |
| FR-7 | P0 | Version Bump + Migration + Release | Sprint 4 |

### Inter-Sprint Gates (FL-SPRINT-002)

Each sprint must pass these gates before the next sprint begins:

| Gate | Condition | Rollback If Failed |
|------|-----------|-------------------|
| **Green Suite** | All existing + new tests pass | Revert sprint branch, investigate |
| **Type Check Clean** | No new TypeScript errors | Fix type errors before proceeding |
| **Constraint Validation** | All constraint files pass type checker (from Sprint 2 onward) | Fix signatures before adding more |
| **Schema Count** | schemas/index.json matches expected count for this sprint | Reconcile missing registrations |
| **No Regressions** | No existing PASS vectors become FAIL | Root-cause the regression |

**Rollback criteria:** If a sprint introduces > 5 test failures that cannot be resolved within one `/run-bridge` iteration, revert the sprint branch and decompose the failing task into smaller units.

### Breaking Change Summary

| Change | Impact | Sprint |
|--------|--------|--------|
| `AgentIdentity.trust_level` → `trust_scopes` | All tests using flat trust_level | Sprint 1 |
| `ConservationPropertyRegistry` + liveness fields | All registry test vectors | Sprint 1 |
| Constraint files + `type_signature` | All 31 constraint files | Sprint 2 |

---

## Sprint 1: Foundation — Liveness + Scoped Trust (P0)

**Goal:** Establish the two foundational breaking changes: liveness properties proving forward progress, and capability-scoped trust enabling partial-order authorization. These are prerequisites for everything that follows.

**Global Sprint ID:** 60
**Depends on:** Nothing (foundation sprint)
**Estimated New Tests:** ~54

### S1-T1: LivenessProperty Schema + TimeoutBehavior Vocabulary

**FR:** FR-1
**SDD:** §2.1.1, §2.1.2

**Description:** Create `src/integrity/liveness-properties.ts` with `LivenessPropertySchema`, `TimeoutBehaviorSchema`, and supporting types. Follow the established pattern from `ConservationPropertySchema`.

**Acceptance Criteria:**
- `TimeoutBehaviorSchema` vocabulary with $id: 'TimeoutBehavior' — 4 literals: reaper, escalation, reconciliation, manual
- `LivenessPropertySchema` with all fields per SDD §2.1.2: `liveness_id` (pattern `^L-\d{1,2}$`), `name`, `description`, `ltl_formula`, `companion_safety` (pattern `^I-\d{1,2}$`), `universe` (InvariantUniverseSchema), `timeout_behavior`, `timeout_seconds` (integer, min 1), `error_codes` (array, minItems 1), `severity`, `contract_version`
- Schema has `$id: 'LivenessProperty'`, `additionalProperties: false`
- All types exported: `LivenessProperty`, `TimeoutBehavior`
- All existing tests pass

**Testing:** New `tests/integrity/liveness-properties.test.ts` — schema validation, required fields, pattern matching, vocabulary literals (~12 tests)

---

### S1-T2: CANONICAL_LIVENESS_PROPERTIES Constant (6 Properties)

**FR:** FR-1
**SDD:** §2.1.3

**Description:** Export `CANONICAL_LIVENESS_PROPERTIES` readonly array with the 6 canonical liveness properties that complement existing safety invariants.

**Acceptance Criteria:**
- `CANONICAL_LIVENESS_PROPERTIES: readonly LivenessProperty[]` with exactly 6 entries
- L-1: Reservation resolution liveness (complements I-11, timeout: reaper, 3600s)
- L-2: Expiration reclamation liveness (complements I-12, timeout: reaper, 7200s)
- L-3: Budget replenishment liveness (complements I-5, timeout: escalation, 86400s)
- L-4: Reconciliation completion liveness (complements I-4/I-13, timeout: reconciliation, 14400s)
- L-5: Dispute resolution liveness (new companion, timeout: manual, 604800s)
- L-6: Transfer settlement liveness (complements I-14, timeout: reaper, 3600s)
- Each entry has valid `ltl_formula` containing F or F_t operator
- All entries have `contract_version: '6.0.0'`
- All entries validate against `LivenessPropertySchema`

**Testing:** Extend liveness-properties.test.ts — validate all 6 against schema, unique liveness_ids, companion_safety references valid I-IDs (~5 tests)

---

### S1-T3: ConservationPropertyRegistry Extension (BREAKING)

**FR:** FR-1
**SDD:** §2.1.4

**Description:** Add required `liveness_properties` and `liveness_count` fields to `ConservationPropertyRegistrySchema`. This is a BREAKING change — all existing registry test data must be updated.

**Acceptance Criteria:**
- `liveness_properties: Type.Array(LivenessPropertySchema)` — required field
- `liveness_count: Type.Integer({ minimum: 0 })` — required field, drift guard
- Existing tests updated to include liveness fields (even if empty arrays initially)
- All schema validation tests updated
- `CANONICAL_LIVENESS_PROPERTIES` array re-exported from integrity barrel

**Testing:** New `tests/integrity/conservation-registry-liveness.test.ts` — registry with liveness, registry without liveness fails, count mismatch fails (~8 tests)

---

### S1-T4: Liveness Constraint File + Conformance Vectors

**FR:** FR-1
**SDD:** §2.1.5, §2.1.6

**Description:** Create constraints and conformance vectors for liveness properties and the extended registry.

**Acceptance Criteria:**
- New `constraints/LivenessProperty.constraints.json` with constraint: `liveness-formula-has-eventually`
- Add to `constraints/ConservationPropertyRegistry.constraints.json`:
  - `conservation-registry-liveness-count-matches`: `liveness_count == len(liveness_properties)`
  - `conservation-liveness-unique-ids`: All liveness_id values unique
- Conformance vectors:
  - `vectors/conformance/liveness-properties/complete-safety-liveness-pairs.json` (PASS)
  - `vectors/conformance/liveness-properties/liveness-without-companion.json` (FAIL)
  - `vectors/conformance/liveness-properties/liveness-empty-formula.json` (FAIL)
- All constraints have `type_signature` (forward-compatible with FR-3)

**Testing:** Constraint evaluation tests for liveness constraints (~6 tests)

---

### S1-T5: CapabilityScope Vocabulary + CapabilityScopedTrust Schema

**FR:** FR-2
**SDD:** §2.2.1, §2.2.2

**Description:** Create `CapabilityScopeSchema` vocabulary and `CapabilityScopedTrustSchema` in `src/schemas/agent-identity.ts`. These are the foundation for the trust model replacement.

**Acceptance Criteria:**
- `CapabilityScopeSchema` union with $id: 'CapabilityScope' — 6 literals: billing, governance, inference, delegation, audit, composition
- `CAPABILITY_SCOPES` constant array
- `CapabilityScopedTrustSchema` with: `scopes` (Record<CapabilityScope, TrustLevel>), `default_level` (TrustLevel)
- Schema has `$id: 'CapabilityScopedTrust'`, `additionalProperties: false`
- Types exported: `CapabilityScope`, `CapabilityScopedTrust`
- TrustLevel and TRUST_LEVELS remain unchanged (used as values within scopes)

**Testing:** New `tests/schemas/capability-scoped-trust.test.ts` — schema validation, scope coverage, vocabulary completeness (~8 tests)

---

### S1-T6: AgentIdentity Breaking Change (trust_level → trust_scopes)

**FR:** FR-2
**SDD:** §2.2.3

**Description:** Replace `trust_level: TrustLevel` with `trust_scopes: CapabilityScopedTrustSchema` in `AgentIdentitySchema`. This is the primary BREAKING change of v6.0.0. Includes dual-read adapter for migration safety (FL-SPRINT-001).

**Acceptance Criteria:**
- `trust_level` field REMOVED from AgentIdentitySchema
- `trust_scopes: CapabilityScopedTrustSchema` ADDED as required field
- **Dual-read adapter** (FL-SPRINT-001): `parseAgentIdentity(data)` function that accepts EITHER v5.5.0 format (with `trust_level`) OR v6.0.0 format (with `trust_scopes`), auto-converting v5.5.0 data via `flatTrustToScoped()`. This enables gradual migration of stored data and test fixtures without big-bang rewrite.
- All existing `AgentIdentity` references updated throughout codebase (use adapter where reading persisted data)
- All existing tests using `trust_level` updated to use `trust_scopes`
- DelegationChain constraint tests updated for scoped trust
- InterAgentTransactionAudit tests updated

**Testing:** Update all existing agent identity tests (~10+ existing tests to update, plus ~3 adapter tests)

---

### S1-T7: Trust Helper Functions

**FR:** FR-2
**SDD:** §2.2.4

**Description:** Replace flat trust helpers with scope-aware variants. Keep `trustLevelIndex()` (used internally). Add migration helper `flatTrustToScoped()`.

**Acceptance Criteria:**
- `trustLevelForScope(trust, scope)` — returns TrustLevel for scope, falls back to default_level
- `meetsThresholdForScope(trust, scope, threshold)` — boolean check per scope
- `effectiveTrustLevel(trust)` — minimum trust across all scopes (backward-compatible)
- `flatTrustToScoped(level)` — creates CapabilityScopedTrust with all scopes at same level
- `trustLevelIndex()` remains (used by scope helpers internally)
- Old `meetsThreshold()` removed or deprecated

**Testing:** Trust helper tests — trustLevelForScope, meetsThresholdForScope edge cases, effectiveTrustLevel, flatTrustToScoped roundtrip (~7 tests)

---

### S1-T8: Updated AgentIdentity Constraints + Conformance Vectors

**FR:** FR-2
**SDD:** §2.2.5, §2.2.6

**Description:** Rewrite AgentIdentity constraints for scoped trust and create new conformance vectors.

**Acceptance Criteria:**
- Updated `constraints/AgentIdentity.constraints.json`:
  - `agent-identity-delegation-requires-trust`: delegation_authority non-empty => delegation scope >= verified
  - `agent-identity-scope-coverage`: billing and inference scopes must be specified
  - Remove old trust_level-based constraints
- All constraints have `type_signature`
- Conformance vectors:
  - `vectors/conformance/capability-scoped-trust/multi-scope-agent.json` (PASS)
  - `vectors/conformance/capability-scoped-trust/delegation-scope-untrusted.json` (FAIL)
  - `vectors/conformance/capability-scoped-trust/missing-required-scopes.json` (FAIL)

**Testing:** Constraint evaluation tests for scoped trust constraints (~5 tests)

---

### S1-T9: Property-Based Tests + Compile-Time Type Tests

**FR:** FR-1, FR-2
**SDD:** §3.2, §3.3

**Description:** Add property-based tests for trust model correctness and compile-time type safety tests.

**Acceptance Criteria:**
- Property: `effectiveTrustLevel(flatTrustToScoped(level)) == level` for all TrustLevels
- Property: Random liveness properties with valid companion_safety always pass validation
- Property: Scoped trust roundtrip consistency
- `@ts-expect-error` tests:
  - Cannot assign TrustLevel directly to CapabilityScopedTrust
  - Cannot access removed trust_level field on AgentIdentity
  - Cannot assign CapabilityScopedTrust where TrustLevel expected

**Testing:** ~5 property-based tests + 3 compile-time type tests

---

## Sprint 2: Verification — Type System + Graph Operations (P0/P1)

**Goal:** Add static verification infrastructure: a constraint type system ensuring expression correctness at CI time, and schema graph operations enabling automated impact analysis.

**Global Sprint ID:** 61
**Depends on:** Sprint 1 (liveness + trust model must be stable)
**Estimated New Tests:** ~71

### S2-T1: ConstraintTypeSignature Schema + ConstraintType Vocabulary

**FR:** FR-3
**SDD:** §2.3.1

**Description:** Create `src/constraints/constraint-types.ts` with `ConstraintTypeSchema` and `ConstraintTypeSignatureSchema`.

**Acceptance Criteria:**
- `ConstraintTypeSchema` union with $id: 'ConstraintType' — 8 literals: boolean, bigint, bigint_coercible, string, number, array, object, unknown
- `ConstraintTypeSignatureSchema` with: `input_schema` (string, minLength 1), `output_type` (ConstraintType), `field_types` (Record<string, ConstraintType>)
- Schema has `$id: 'ConstraintTypeSignature'`, `additionalProperties: false`
- Types exported: `ConstraintType`, `ConstraintTypeSignature`
- Barrel export from constraints/index.ts

**Testing:** New `tests/constraints/constraint-types.test.ts` — schema validation, type universe completeness (~8 tests)

---

### S2-T2: Static Type Checker

**FR:** FR-3
**SDD:** §2.3.3

**Description:** Create `src/constraints/type-checker.ts` implementing `typeCheckConstraintFile()` that validates constraint type signatures against the schema registry.

**Acceptance Criteria:**
- `TypeCheckError` interface: constraint_id, expression_fragment, expected_type, actual_type, message
- `TypeCheckWarning` interface: constraint_id, message
- `TypeCheckResult` interface: valid, errors[], warnings[]
- `typeCheckConstraintFile(constraintFile, schemaRegistry)` — TypeCheckResult
- Validates: input_schema exists, field_types paths resolve, output_type matches
- Returns clear errors for: unknown schema, unresolvable field path, type mismatch
- Exported from constraints barrel

**Testing:** New `tests/constraints/type-checker.test.ts` — valid file passes, unknown schema errors, bad field path errors, type mismatch warnings (~20 tests)

---

### S2-T3: New Evaluator Builtins (type_of, is_bigint_coercible)

**FR:** FR-3
**SDD:** §2.3.4

**Description:** Add `type_of` and `is_bigint_coercible` builtins to the constraint evaluator.

**Acceptance Criteria:**
- `type_of(value)` — returns runtime type as string ('boolean', 'bigint', 'string', 'number', 'array', 'object', 'null')
- `is_bigint_coercible(value)` — returns true if value can be converted to BigInt
- Both added to evaluator FUNCTION_REGISTRY
- Both added to EVALUATOR_BUILTINS array (18 → 20)
- Both have entries in EVALUATOR_BUILTIN_SPECS with proper type signatures
- All existing evaluator tests pass unchanged

**Testing:** Evaluator tests for new builtins (~8 tests)

---

### S2-T4: Migrate All 31 Constraint Files (Add type_signature)

**FR:** FR-3
**SDD:** §2.3.2, §2.3.5

**Description:** Add `type_signature` to every constraint in all 31 existing constraint files. This is a mechanical but critical migration.

**Acceptance Criteria:**
- All 31 constraint files updated with `type_signature` on every constraint:
  - `input_schema` set to the file's `schema_id`
  - `output_type` set to `"boolean"` (all existing constraints return boolean)
  - `field_types` populated from the constraint's `fields` array (where present) or inferred from expression
- Files include: AgentIdentity, DelegationChain, InterAgentTransactionAudit, JwtBoundarySpec, ConservationPropertyRegistry (already done in Sprint 1), GovernanceConfig, BudgetScope, EnsembleCapabilityProfile, and 23 others
- All existing constraint evaluation tests pass unchanged
- Type checker validates all migrated files without errors

**Testing:** New `tests/constraints/type-signature-migration.test.ts` — validate every constraint file has type_signature, type checker passes on all (~31 tests, one per file)

---

### S2-T5: Type Checker Integration Tests

**FR:** FR-3
**SDD:** §3.1

**Description:** Comprehensive integration tests verifying the type checker against the real schema registry and all constraint files.

**Acceptance Criteria:**
- Test that runs type checker against ALL constraint files + schema registry
- Validates every constraint file type-checks cleanly (no errors)
- Tests for intentionally bad type signatures (wrong schema, wrong field type)
- Tests for edge cases: nested field paths, array element types, optional fields

**Testing:** Integration test file (~4 tests with comprehensive coverage)

---

### S2-T6: Schema Graph Reachability + Cycle Detection

**FR:** FR-4
**SDD:** §2.4.1, §2.4.2

**Description:** Add `isReachable()`, `reachableFrom()`, and `detectCycles()` to `src/utilities/schema-graph.ts`.

**Acceptance Criteria:**
- `isReachable(graph, from, to)` — boolean, uses BFS
- `reachableFrom(graph, source)` — Set<string>, transitive closure
- `detectCycles(graph)` — `{ has_cycles: boolean, cycles: string[][] }`, DFS with coloring
- All functions handle empty graphs, single-node graphs, disconnected components
- Functions exported from utilities barrel
- Production schema graph returns `has_cycles: false`

**Testing:** New `tests/utilities/schema-graph-operations.test.ts` — reachability tests, cycle detection on clean and cyclic graphs (~10 tests)

---

### S2-T7: Schema Graph Impact Analysis + Topological Sort

**FR:** FR-4
**SDD:** §2.4.3, §2.4.4

**Description:** Add `analyzeImpact()` and `topologicalSort()` to schema graph operations.

**Acceptance Criteria:**
- `analyzeImpact(graph, schemaId, constraintFiles?)` — ImpactReport with directly_affected, transitively_affected, affected_constraints, total_impact_radius
- `topologicalSort(graph)` — string[] | null (null if cycles exist), uses Kahn's algorithm
- Impact analysis follows incoming edges (who references this schema?)
- Topological sort produces valid dependency-first ordering
- AgentIdentity impact radius includes DelegationChain, DelegationTree, InterAgentTransactionAudit

**Testing:** Extend schema-graph-operations.test.ts — impact analysis on AgentIdentity, topological sort ordering validation (~10 tests)

---

### S2-T8: Schema Graph Acyclic Constraint

**FR:** FR-4
**SDD:** §2.4.5

**Description:** Add a constraint that enforces the schema graph is a DAG. Create a test that builds the real schema graph and validates it.

**Acceptance Criteria:**
- `schema-graph-acyclic` check runs against full schema graph
- Test that builds graph from all registered schemas and validates no cycles
- Test with intentionally cyclic test graph that correctly detects the cycle
- ImpactReport interface exported from utilities

**Testing:** Graph constraint tests (~4 tests)

---

## Sprint 3: Composition — Registry Bridge + DelegationTree (P1)

**Goal:** Build the composition layer: registries that can exchange value across economy boundaries, and delegation trees that enable concurrent multi-model orchestration.

**Global Sprint ID:** 62
**Depends on:** Sprint 2 (type system provides validation infrastructure)
**Estimated New Tests:** ~72

### S3-T1: RegistryBridge + BridgeInvariant Schemas

**FR:** FR-5
**SDD:** §2.5.1

**Description:** Create `src/economy/registry-composition.ts` with `RegistryBridgeSchema`, `BridgeInvariantSchema`, `BridgeEnforcementSchema`, and `SettlementPolicySchema`.

**Acceptance Criteria:**
- `BridgeEnforcementSchema` vocabulary: atomic, eventual, manual
- `BridgeInvariantSchema` with: `invariant_id` (pattern `^B-\d{1,2}$`), `name`, `description`, `ltl_formula`, `enforcement`
- `SettlementPolicySchema` vocabulary: immediate, batched, netting
- `RegistryBridgeSchema` with: `bridge_id` (uuid), `source_registry_id` (uuid), `target_registry_id` (uuid), `bridge_invariants` (array, minItems 1), `exchange_rate` (ExchangeRateSpec), `settlement` (SettlementPolicy), `contract_version`
- Schema has `$id: 'RegistryBridge'`, `additionalProperties: false`, `x-cross-field-validated: true`
- All types exported

**Testing:** New `tests/economy/registry-composition.test.ts` — schema validation, required fields (~8 tests)

---

### S3-T2: CANONICAL_BRIDGE_INVARIANTS Constant

**FR:** FR-5
**SDD:** §2.5.2

**Description:** Export the 4 canonical bridge invariants (B-1 through B-4) as a readonly constant.

**Acceptance Criteria:**
- `CANONICAL_BRIDGE_INVARIANTS: readonly BridgeInvariant[]` with 4 entries
- B-1: Cross-registry conservation (atomic)
- B-2: Bridge idempotency (atomic)
- B-3: Settlement completeness (eventual)
- B-4: Exchange rate consistency (atomic)
- All entries validate against BridgeInvariantSchema

**Testing:** Validate all 4 against schema, unique invariant_ids (~4 tests)

---

### S3-T3: ExchangeRateSpec + MintingPolicy Schemas

**FR:** FR-5
**SDD:** §2.5.1, §2.5.3

**Description:** Create `ExchangeRateSpecSchema` (in registry-composition.ts) and `MintingPolicySchema` (in new `src/economy/minting-policy.ts`).

**Acceptance Criteria:**
- `ExchangeRateTypeSchema` vocabulary: fixed, oracle, governance
- `ExchangeRateSpecSchema` with: `rate_type`, `value` (optional), `oracle_endpoint` (optional), `governance_proposal_required`, `staleness_threshold_seconds`
- Schema has `$id: 'ExchangeRateSpec'`, `additionalProperties: false`
- `MintingPolicySchema` with: `policy_id` (uuid), `registry_id` (uuid), `mint_authority`, `mint_constraints` (array), `max_mint_per_epoch` (string, numeric pattern), `epoch_seconds`, `requires_governance_approval`, `contract_version`
- Schema has `$id: 'MintingPolicy'`, `additionalProperties: false`
- Economy barrel updated to export both

**Testing:** New `tests/economy/minting-policy.test.ts` — schema validation (~8 tests)

---

### S3-T4: Bridge + Minting Constraint Files + Conformance Vectors

**FR:** FR-5
**SDD:** §2.5.4

**Description:** Create constraint files and conformance vectors for registry composition schemas.

**Acceptance Criteria:**
- New `constraints/RegistryBridge.constraints.json`:
  - `registry-bridge-distinct-registries`: source != target
  - `registry-bridge-invariant-unique-ids`: unique bridge invariant IDs
- New `constraints/MintingPolicy.constraints.json`:
  - `minting-policy-max-positive`: max_mint_per_epoch > 0
- All constraints have `type_signature`
- Conformance vectors:
  - `vectors/conformance/registry-bridge/valid-bridge.json` (PASS)
  - `vectors/conformance/registry-bridge/same-registry-bridge.json` (FAIL)
  - `vectors/conformance/registry-bridge/duplicate-invariant-ids.json` (FAIL)

**Testing:** Constraint evaluation tests (~6 tests)

---

### S3-T5: DelegationTree + DelegationTreeNode Schemas

**FR:** FR-6
**SDD:** §2.6.1, §2.6.2

**Description:** Create `src/governance/delegation-tree.ts` with `DelegationTreeSchema`, `DelegationTreeNodeSchema`, and supporting vocabularies.

**Acceptance Criteria:**
- `ForkTypeSchema` vocabulary: parallel, sequential, conditional
- `TreeNodeStatusSchema` vocabulary: pending, active, completed, failed, cancelled
- `TreeStrategySchema` vocabulary: first_complete, best_of_n, consensus, pipeline
- `BudgetAllocationSchema` vocabulary: equal_split, weighted, on_demand
- `DelegationTreeNodeSchema` with: `node_id`, `agent_id`, `authority_scope` (array), `budget_allocated_micro` (string, numeric pattern), `children` (array of self-reference), `fork_type`, `join_condition` (optional), `status`, `timestamp`
- `DelegationTreeSchema` with: `tree_id` (uuid), `root` (DelegationTreeNode), `strategy`, `total_budget_micro`, `budget_allocation`, `max_depth` (integer, 1-10, default 10), `max_total_nodes` (integer, 1-1000, default 100), `created_at`, `contract_version`
- **Concurrency semantics** (FL-SPRINT-003): `DelegationTreeNodeSchema` includes `version: Type.Integer({ minimum: 0, default: 0 })` field for optimistic concurrency control. Budget updates use compare-and-swap on version — `TREE_VERSION_CONFLICT` error if version mismatch. Status transitions are atomic per-node.
- Schemas have proper `$id`, `additionalProperties: false`
- Governance barrel updated

**Testing:** New `tests/governance/delegation-tree.test.ts` — schema validation, recursive node structure, vocabulary completeness (~10 tests)

---

### S3-T6: Tree Evaluator Builtins (tree_budget_conserved, tree_authority_narrowing)

**FR:** FR-6
**SDD:** §2.6.3

**Description:** Add two new evaluator builtins for recursive tree validation.

**Acceptance Criteria:**
- `tree_budget_conserved(root)` — **iteratively** validates sum(children.budget) <= parent.budget at every node (uses explicit stack, not recursion — per SDD FL-SDD-002). Enforces `max_depth` and `max_total_nodes` from parent DelegationTree. Cycle detection via visited set.
- `tree_authority_narrowing(root)` — **iteratively** validates child.authority_scope is strict subset of parent.authority_scope
- **authority_scope semantics** (FL-SPRINT-004): `authority_scope` elements are normalized lowercase strings representing capability names (e.g., `["billing", "inference"]`). Subset is strict set inclusion: `child_scopes.every(s => parent_scopes.includes(s))`. Empty scope at leaf is valid (fully delegated). Duplicate elements are deduplicated before comparison. Ordering is irrelevant (set semantics).
- Both added to FUNCTION_REGISTRY (20 → 22 builtins)
- Both added to EVALUATOR_BUILTIN_SPECS with type signatures
- Short-circuit on first violation. Returns `TREE_DEPTH_EXCEEDED` or `TREE_SIZE_EXCEEDED` if limits breached.
- Handle leaf nodes (no children = always valid)

**Testing:** New `tests/constraints/tree-builtins.test.ts` — valid trees, budget overflow at depth 2, authority widening at depth 3, leaf nodes (~10 tests)

---

### S3-T7: chainToTree / treeToChain Conversion Utilities

**FR:** FR-6
**SDD:** §2.6.5

**Description:** Implement bidirectional conversion between DelegationChain and DelegationTree.

**Acceptance Criteria:**
- `chainToTree(chain)` — converts linear chain to single-path tree (strategy: pipeline)
- `treeToChain(tree)` — returns DelegationChain if tree has no branching, null otherwise
- `treeToChain(chainToTree(chain))` produces structurally equivalent chain (roundtrip)
- Handles empty chains and single-node trees

**Testing:** Conversion tests — roundtrip, branching tree returns null, empty chain handling (~5 tests)

---

### S3-T8: DelegationTree Constraint File + Conformance Vectors

**FR:** FR-6
**SDD:** §2.6.4, §2.6.6

**Description:** Create constraint file and conformance vectors for DelegationTree.

**Acceptance Criteria:**
- New `constraints/DelegationTree.constraints.json` with 4 constraints:
  - `delegation-tree-budget-conservation`: tree_budget_conserved(root)
  - `delegation-tree-authority-narrowing`: tree_authority_narrowing(root)
  - `delegation-tree-consensus-minimum`: consensus strategy => >= 3 children
  - `delegation-tree-root-budget-match`: root.budget == total_budget
- All constraints have `type_signature`
- Conformance vectors:
  - `vectors/conformance/delegation-tree/parallel-ensemble.json` (PASS)
  - `vectors/conformance/delegation-tree/budget-overflow.json` (FAIL)
  - `vectors/conformance/delegation-tree/consensus-too-few.json` (FAIL)

**Testing:** Constraint evaluation + vector validation tests (~8 tests)

---

### S3-T9: Property-Based Tests for Composition + Trees

**FR:** FR-5, FR-6
**SDD:** §3.2

**Description:** Property-based tests ensuring structural invariants hold for random inputs.

**Acceptance Criteria:**
- Property: Random tree where children sum <= parent -> tree_budget_conserved returns true
- Property: Random tree where children scope is subset of parent -> tree_authority_narrowing returns true
- Property: Random tree where children sum > parent -> tree_budget_conserved returns false
- Property: source.debit == target.credit * rate holds for random MicroUSD amounts and rates
- Property: Bridge with distinct registries always passes distinct-registries constraint
- Property: chainToTree/treeToChain roundtrip preserves agent_ids

**Testing:** ~13 property-based tests using fast-check

---

## Sprint 4: Release — Version Bump + Migration + Integration (P0)

**Goal:** Bump version to 6.0.0, register all new schemas, update barrel exports, update all conformance vectors for breaking changes, verify full backward compatibility, and create migration documentation.

**Global Sprint ID:** 63
**Depends on:** Sprint 3 (all schemas and operations must be complete)
**Estimated New Tests:** ~5

### S4-T1: Version Bump (6.0.0)

**FR:** FR-7
**SDD:** §2.7

**Description:** Update version constants and package version.

**Acceptance Criteria:**
- `src/version.ts`: `CONTRACT_VERSION = '6.0.0'`
- `src/version.ts`: `MIN_SUPPORTED_VERSION = '6.0.0'` (breaking — old versions not compatible)
- `package.json`: `"version": "6.0.0"`
- Version tests pass

**Testing:** Existing version tests updated (~2 test updates)

---

### S4-T2: Schema Registry Update (schemas/index.json)

**FR:** FR-7
**SDD:** §2.7

**Description:** Register all new schemas in the schema index.

**Acceptance Criteria:**
- `schemas/index.json` updated to include all new schemas:
  - LivenessProperty, TimeoutBehavior
  - CapabilityScope, CapabilityScopedTrust
  - ConstraintType, ConstraintTypeSignature
  - BridgeEnforcement, BridgeInvariant
  - ExchangeRateType, ExchangeRateSpec
  - SettlementPolicy, RegistryBridge
  - MintingPolicy
  - ForkType, TreeNodeStatus, TreeStrategy, BudgetAllocation
  - DelegationTreeNode, DelegationTree
- Schema count ~68 → ~77 (9 new primary + vocabulary types)
- All schema IDs unique

**Testing:** Schema registry validation test — all registered schemas resolvable (~1 test)

---

### S4-T3: Barrel Exports + New Subpaths

**FR:** FR-7
**SDD:** §2.7, §1.3

**Description:** Update all barrel files and add new subpath exports.

**Acceptance Criteria:**
- `src/integrity/index.ts` — export liveness-properties
- `src/economy/index.ts` — export registry-composition, minting-policy
- `src/governance/index.ts` — export delegation-tree
- `src/constraints/index.ts` — export constraint-types, type-checker
- `src/index.ts` — verify top-level barrel re-exports all new domains
- New subpath in `package.json` exports: `"./graph"`, `"./composition"`
- All imports resolve correctly

**Testing:** Import resolution tests (~2 tests)

---

### S4-T4: Update Existing Conformance Vectors for Breaking Changes

**FR:** FR-7
**SDD:** §6

**Description:** Update all existing conformance vectors that contain AgentIdentity or ConservationPropertyRegistry data for the v6.0.0 schema changes.

**Acceptance Criteria:**
- All existing vectors with `trust_level` updated to `trust_scopes` (using flatTrustToScoped equivalent)
- All existing vectors with ConservationPropertyRegistry updated to include `liveness_properties: []` and `liveness_count: 0`
- All existing constraint vectors verified against updated schemas
- No existing PASS vectors become FAIL
- No existing FAIL vectors become PASS (unless the failure reason was the old trust model)

**Testing:** Run full conformance vector suite — all vectors pass/fail as expected

---

### S4-T5: Full Test Suite Verification

**FR:** FR-7
**SDD:** §5.1

**Description:** Comprehensive verification that all 2,824 existing tests + ~202 new tests pass.

**Acceptance Criteria:**
- All existing tests pass (updated for breaking changes in Sprint 1)
- All new tests from Sprints 1-3 pass
- Total test count ~3,026 (2,824 + 202)
- No flaky tests
- TypeScript compilation clean (no errors, no suppressions)
- Constraint type checker runs on all 35 constraint files without errors

**Testing:** Full `npm test` run

---

### S4-T6: Migration Documentation

**FR:** FR-7
**SDD:** §6

**Description:** Ensure migration guidance is clear and complete for all breaking changes.

**Acceptance Criteria:**
- `CHANGELOG.md` entry for v6.0.0 with all breaking changes listed
- Migration paths documented for:
  - AgentIdentity trust_level → trust_scopes (with flatTrustToScoped helper)
  - ConservationPropertyRegistry + liveness fields
  - Constraint files + type_signature
- Contract version compatibility note: MIN_SUPPORTED_VERSION = 6.0.0

**Testing:** No additional tests (documentation task)

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation | Sprint |
|------|-----------|--------|------------|--------|
| Breaking trust model cascades to many tests | High | Medium | flatTrustToScoped helper, update tests systematically | Sprint 1 |
| Constraint type_signature migration is tedious | High | Low | Mechanical — each file follows the same pattern | Sprint 2 |
| Recursive DelegationTree self-reference in TypeBox | Medium | High | **Sprint 2 spike** (FL-SPRINT-B06): Prove Type.Ref recursive pattern works with TypeBox — schema compilation, validation at depth 5+, JSON Schema export. If it fails, fallback to manual validation layer. | Sprint 2 (spike) → Sprint 3 |
| Type checker false positives on complex expressions | Medium | Medium | Start conservative — only check resolvable field paths | Sprint 2 |
| Schema count growth affects index.json maintenance | Low | Low | Already managing 68 schemas; tooling handles it | Sprint 4 |

---

## Success Metrics

| Metric | Target | Measured At |
|--------|--------|-------------|
| New liveness properties | 6 | Sprint 1 complete |
| Capability scopes | 6 | Sprint 1 complete |
| Constraint files with type_signature | 35 (31 migrated + 4 new) | Sprint 2 complete |
| Graph operations | 4 (reach, cycle, impact, topo) | Sprint 2 complete |
| Bridge invariants | 4 | Sprint 3 complete |
| DelegationTree evaluator builtins | 2 | Sprint 3 complete |
| New tests | ~202 | Sprint 4 complete |
| Total tests passing | ~3,026 | Sprint 4 complete |
| CONTRACT_VERSION | 6.0.0 | Sprint 4 complete |
