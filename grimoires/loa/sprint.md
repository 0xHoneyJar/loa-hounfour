# Sprint Plan: The Coordination-Aware Protocol — v7.0.0

**Status:** Draft
**Cycle:** cycle-016
**Source:** [PR #14 — Bridgebuilder Deep Review Parts II–IV + Bridge Iterations 1–3](https://github.com/0xHoneyJar/loa-hounfour/pull/14)
**Branch:** `feature/v5.0.0-multi-model`
**Goal:** Add coordination verbs to the composition kernel — transfer protocols with compensation, conflict resolution with dissent preservation, minting-conservation coupling, MAY permission semantics, and governance proposals.

---

## Overview

| Metric | Value |
|--------|-------|
| Sprints | 4 |
| Total Tasks | 34 |
| New Schemas | 16 (BridgeTransferSaga, BridgeTransferStep, SagaParticipant, SagaError, DelegationOutcome, DelegationVote, DissentRecord, MonetaryPolicy, ReviewTrigger, PermissionBoundary, ReportingRequirement, RevocationPolicy, GovernanceProposal, ProposedChange, VotingRecord, GovernanceVote) |
| Modified Schemas | 2 (RegistryBridge BREAKING: +transfer_protocol, DelegationTreeNode: +last_outcome optional) |
| New Constraint Files | 5 (BridgeTransferSaga, DelegationOutcome, MonetaryPolicy, PermissionBoundary, GovernanceProposal) |
| Modified Constraint Files | 1 (RegistryBridge — add transfer_protocol constraints) |
| New Source Files | 5 (bridge-transfer-saga.ts, delegation-outcome.ts, monetary-policy.ts, permission-boundary.ts, governance-proposal.ts) |
| New Evaluator Builtins | 6 (saga_amount_conserved, saga_steps_sequential, outcome_consensus_valid, monetary_policy_solvent, permission_granted, within_boundary) |
| New Conformance Vectors | 18 (4 saga + 4 outcome + 3 monetary + 3 permission + 4 governance) |
| Estimated New Tests | ~200 |
| Version | 6.0.0 → 7.0.0 (BREAKING) |
| Total Evaluator Builtins | 23 → 29 |

### FR to Sprint Mapping

| FR | Priority | Description | Sprint |
|----|----------|-------------|--------|
| FR-1 | P0 | Deferred Finding Resolution (F-007, F-008, F-020) | Sprint 1 |
| FR-2 | P0 | BridgeTransferSaga — Operation Protocol | Sprint 2 |
| FR-3 | P1 | DelegationOutcome — Conflict Resolution | Sprint 2 |
| FR-4 | P1 | MonetaryPolicy — Minting-Conservation Coupling | Sprint 3 |
| FR-5 | P1 | PermissionBoundary — MAY Semantics | Sprint 3 |
| FR-6 | P1 | GovernanceProposal — Collective Decision | Sprint 3 |
| FR-7 | P0 | Version Bump + Migration + Release | Sprint 4 |

### Inter-Sprint Gates (FL-SPRINT-002)

Each sprint must pass these gates before the next sprint begins:

| Gate | Condition | Rollback If Failed |
|------|-----------|-------------------|
| **Green Suite** | All existing + new tests pass | Revert sprint branch, investigate |
| **Type Check Clean** | No new TypeScript errors | Fix type errors before proceeding |
| **Constraint Validation** | All constraint files pass type checker | Fix signatures before adding more |
| **Schema Count** | schemas/index.json matches expected count for this sprint | Reconcile missing registrations |
| **No Regressions** | No existing PASS vectors become FAIL | Root-cause the regression |

**Rollback criteria:** If a sprint introduces > 5 test failures that cannot be resolved within one `/run-bridge` iteration, revert the sprint branch and decompose the failing task into smaller units.

### Breaking Change Summary

| Change | Impact | Sprint |
|--------|--------|--------|
| `RegistryBridge` gains required `transfer_protocol` field | Existing bridge test vectors, arrakis vendored copy | Sprint 2 |

---

## Sprint 1: Stability — Deferred Findings + AST Typing (P0)

**Goal:** Resolve all three deferred type safety findings from v6.0.0 bridge reviews. Establish ConstraintASTNode as the typed backbone for the evaluator, enabling Sprint 2–3 builtins to be written against a typed AST rather than `any`.

**Global Sprint ID:** 64
**Depends on:** Nothing (stability sprint)
**Estimated New Tests:** ~30

### S1-T1: F-007 — withAnnotation() Utility for TypeBox

**FR:** FR-1
**SDD:** §2.1.1

**Description:** Replace `as any` cast in `registry-composition.ts:140` with a `withAnnotation<T>()` generic utility that adds custom JSON Schema extension properties without suppressing TypeScript type safety.

**Acceptance Criteria:**
- `withAnnotation()` function exported from `src/economy/registry-composition.ts` (or a shared utility)
- All `x-cross-field-validated` annotations use `withAnnotation()` instead of `as any`
- No `as any` casts remain in `registry-composition.ts`
- `x-cross-field-validated` property appears in generated JSON Schema output
- TypeScript compiler accepts the result without `as any`
- Existing schema validation tests continue to pass

### S1-T2: F-008 — BridgeInvariant ID Pattern Expansion

**FR:** FR-1
**SDD:** §2.1.2

**Description:** Expand `BridgeInvariant.invariant_id` pattern from `^B-\d{1,2}$` to `^B-\d{1,4}$` to support future growth beyond B-99.

**Acceptance Criteria:**
- Pattern updated from `^B-\\d{1,2}$` to `^B-\\d{1,4}$`
- Tests: `B-1` valid, `B-99` valid, `B-100` valid (was previously rejected), `B-9999` valid, `B-10000` rejected
- All existing bridge invariant tests continue to pass

### S1-T3: F-020 — ConstraintASTNode Discriminated Union Type

**FR:** FR-1
**SDD:** §2.1.3

**Description:** Define a `ConstraintASTNode` discriminated union type representing all possible AST node shapes in the constraint evaluator. Type `parseExpr()` return as `ConstraintASTNode` instead of implicit `any`.

**Acceptance Criteria:**
- `ConstraintASTNode` type exported from `src/constraints/constraint-types.ts` (or `evaluator.ts`)
- Discriminated union with `kind` field: `literal`, `identifier`, `member_access`, `function_call`, `binary_op`, `unary_op`, `array_literal`, `every`
- `parseExpr()` return type annotated (not `any`)
- All 23 existing builtin evaluation tests continue to pass
- New compile-time type assertion test: `parseExpr()` return is not `any`

### S1-T4: Barrel Export Updates (Sprint 1)

**FR:** FR-1

**Description:** Update `src/constraints/index.ts` and `src/economy/index.ts` barrels to export new types.

**Acceptance Criteria:**
- `ConstraintASTNode` exported from constraints barrel
- `withAnnotation` utility exported from economy barrel (if not in shared utils)
- No circular dependency introduced
- Existing barrel imports continue to resolve

### S1-T5: Sprint 1 Test Harness

**FR:** FR-1

**Description:** Tests for all deferred findings.

**Acceptance Criteria:**
- `tests/economy/registry-composition-annotations.test.ts`: 5+ tests for F-007 (withAnnotation utility, JSON Schema output, no `as any`)
- `tests/economy/bridge-invariant-pattern.test.ts`: 6+ tests for F-008 (pattern validation)
- `tests/constraints/constraint-ast-node.test.ts`: 10+ tests for F-020 (AST node kinds, type narrowing, all builtins still pass)
- All existing 3,504 tests still pass
- Zero TypeScript errors

### S1-T6: Sprint 1 Gate Check

**Description:** Verify all inter-sprint gates pass.

**Acceptance Criteria:**
- `npx vitest run` — all tests green
- `npx tsc --noEmit` — zero errors
- Schema count unchanged (no new schemas this sprint)
- All existing conformance vectors still PASS

---

## Sprint 2: Coordination — Saga + Conflict Resolution (P0/P1)

**Goal:** Implement the two primary coordination primitives: BridgeTransferSaga (the operation protocol for cross-registry transfers) and DelegationOutcome (conflict resolution recording with dissent preservation). These are the "TCP handshake" and "signal handler" of the composition kernel.

**Global Sprint ID:** 65
**Depends on:** Sprint 1 (typed AST enables cleaner builtin implementation)
**Estimated New Tests:** ~70

### S2-T1: BridgeTransferSaga Schema + State Machine

**FR:** FR-2
**SDD:** §2.2.1–§2.2.5

**Description:** Create `src/economy/bridge-transfer-saga.ts` with all saga schemas: SagaStatus vocabulary, BridgeTransferStep, SagaParticipant, SagaError, and BridgeTransferSaga. Include SAGA_TRANSITIONS state machine definition.

**Acceptance Criteria:**
- `SagaStatusSchema` vocabulary with 8 states: initiated, reserving, transferring, settling, settled, compensating, reversed, failed
- `SAGA_TRANSITIONS` map with valid transitions (settled/reversed/failed are terminal)
- `StepTypeSchema`: reserve, validate, transfer, confirm, settle
- `StepStatusSchema`: pending, in_progress, completed, failed, compensated
- `BridgeTransferStepSchema` with step_id, step_type, participant, status, amount_micro (BigInt string), exchange_rate (optional), timestamps
- `SagaParticipantSchema` with agent_id, role (initiator/counterparty/observer/arbiter), registry_id, trust_scopes
- `SagaErrorSchema` with error_code, message, failed_step_id, recoverable
- `BridgeTransferSagaSchema` with saga_id, bridge_id, source/target_registry, saga_type (atomic/choreography), status, steps, compensation_steps, timeout, participants, timestamps, error, contract_version
- All schemas have `$id` and `additionalProperties: false`
- All types exported

### S2-T2: RegistryBridge Extension (BREAKING)

**FR:** FR-2
**SDD:** §2.2.6

**Description:** Add required `transfer_protocol` field to `RegistryBridgeSchema` in `src/economy/registry-composition.ts`.

**Acceptance Criteria:**
- `transfer_protocol` field added to RegistryBridge: `{ saga_type: 'atomic' | 'choreography', timeout_seconds: integer >= 1, max_retries: integer 0–10 }`
- Field is required (breaking change)
- All existing RegistryBridge test instances updated with `transfer_protocol`
- All existing RegistryBridge conformance vectors updated
- Migration note in code comments

### S2-T3: BridgeTransferSaga Constraint File

**FR:** FR-2
**SDD:** §2.2.7

**Description:** Create `constraints/BridgeTransferSaga.constraints.json` with saga-specific constraints.

**Acceptance Criteria:**
- 5 constraints: saga-steps-ordered, saga-amount-conserved, saga-timeout-positive, saga-participants-include-initiator, saga-settled-has-timestamp
- All have type_signature fields
- Constraint file passes type checker validation
- Category assignments: structural (3), economic (1), temporal (1)

### S2-T4: Saga Evaluator Builtins (saga_amount_conserved, saga_steps_sequential)

**FR:** FR-2
**SDD:** §2.2.8

**Description:** Implement 2 new evaluator builtins in `src/constraints/evaluator.ts` and add their specs to `evaluator-spec.ts`.

**Acceptance Criteria:**
- `saga_amount_conserved(saga)`: sums completed step amounts on source vs target side with exchange rate conversion, BigInt comparison, returns boolean
- `saga_steps_sequential(saga)`: verifies step_id uniqueness, returns boolean
- Resource limit: max 100 steps per saga (fail-closed on violation)
- Both registered in `EVALUATOR_BUILTINS` array (now 25 total)
- Both have `EVALUATOR_BUILTIN_SPECS` entries with description, signature, examples
- Spec examples execute correctly

### S2-T5: DelegationOutcome Schema

**FR:** FR-3
**SDD:** §2.3.1–§2.3.4

**Description:** Create `src/governance/delegation-outcome.ts` with outcome schemas: OutcomeType vocabulary, DelegationVote, DissentRecord, and DelegationOutcome.

**Acceptance Criteria:**
- `OutcomeTypeSchema`: unanimous, majority, deadlock, escalation
- `VoteChoiceSchema`: agree, disagree, abstain
- `DelegationVoteSchema`: voter_id, vote, result (Unknown), confidence (0–1), reasoning (optional)
- `DissentTypeSchema`: minority_report, abstention, timeout
- `DissentSeveritySchema`: informational, warning, blocking
- `DissentRecordSchema`: dissenter_id, dissent_type, proposed_alternative (Unknown), reasoning (non-empty), severity, acknowledged
- `DelegationOutcomeSchema`: outcome_id (uuid), tree_node_id, outcome_type, result (Unknown|null), votes (min 1), consensus_achieved, consensus_threshold (0–1), dissent_records, escalated_to/escalation_reason (optional), resolved_at, contract_version
- All schemas have `$id` and `additionalProperties: false`

### S2-T6: DelegationTreeNode Extension + Outcome Constraint File

**FR:** FR-3
**SDD:** §2.3.5–§2.3.6

**Description:** Add optional `last_outcome` to DelegationTreeNode. Create `constraints/DelegationOutcome.constraints.json`.

**Acceptance Criteria:**
- `last_outcome: Type.Optional(DelegationOutcomeSchema)` added to DelegationTreeNode
- Non-breaking: existing trees without `last_outcome` remain valid
- 5 constraints: outcome-votes-match-children, outcome-consensus-consistent, outcome-deadlock-no-result, outcome-escalation-has-target, outcome-dissent-has-reasoning
- Constraint file passes type checker

### S2-T7: Outcome Evaluator Builtin (outcome_consensus_valid)

**FR:** FR-3
**SDD:** §2.3.7

**Description:** Implement `outcome_consensus_valid(outcome)` evaluator builtin.

**Acceptance Criteria:**
- `outcome_consensus_valid(outcome)`: verifies vote counts match outcome_type claim — unanimous requires all agree, majority requires agree count >= ceil(total * consensus_threshold), deadlock requires agree count < ceil(total * threshold)
- Registered in `EVALUATOR_BUILTINS` (now 26 total)
- Spec entry with examples for all 4 outcome types
- Resource limit: max 100 votes

### S2-T8: Barrel Exports + Conformance Vectors (Sprint 2)

**FR:** FR-2, FR-3

**Description:** Update barrel exports for economy and governance. Create conformance vectors.

**Acceptance Criteria:**
- `src/economy/index.ts` exports all saga schemas and types
- `src/governance/index.ts` exports all outcome schemas and types
- 4 saga conformance vectors in `vectors/conformance/bridge-transfer-saga/`: successful-atomic, partial-failure-compensation, timeout-triggered, invalid-compensation-order
- 4 outcome conformance vectors in `vectors/conformance/delegation-outcome/`: unanimous-3of3, majority-2of3-minority, deadlock-escalation, invalid-unanimous-with-dissent
- All vectors have `.json` extension and follow existing vector format

### S2-T9: Sprint 2 Test Harness

**FR:** FR-2, FR-3

**Description:** Comprehensive tests for saga and outcome schemas, state machines, builtins, and constraints.

**Acceptance Criteria:**
- `tests/economy/bridge-transfer-saga.test.ts`: 25+ tests (schema validation, state machine transitions, saga_amount_conserved, saga_steps_sequential, conformance vectors)
- `tests/governance/delegation-outcome.test.ts`: 25+ tests (schema validation, all 4 outcome types, dissent recording, outcome_consensus_valid, conformance vectors)
- `tests/constraints/saga-builtins.test.ts`: 10+ tests for saga evaluator builtins
- `tests/constraints/outcome-builtins.test.ts`: 5+ tests for outcome evaluator builtin
- Updated EVALUATOR_BUILTINS count test (23 → 26) and EVALUATOR_BUILTIN_SPECS count test
- All existing 3,504+ tests still pass

### S2-T10: Sprint 2 Gate Check

**Description:** Verify all inter-sprint gates pass.

**Acceptance Criteria:**
- `npx vitest run` — all tests green
- `npx tsc --noEmit` — zero errors
- Schema count increased by expected amount
- All existing conformance vectors still PASS
- New conformance vectors all PASS

---

## Sprint 3: Governance — Monetary Policy + Permissions + Proposals (P1)

**Goal:** Complete the governance layer with three schemas that address the remaining coordination gaps: MonetaryPolicy (coupling creation to conservation), PermissionBoundary (MAY semantics), and GovernanceProposal (collective voice). These are the "central bank", "capability system", and "constitutional process" of the protocol kernel.

**Global Sprint ID:** 66
**Depends on:** Sprint 2 (governance schemas reference delegation primitives)
**Estimated New Tests:** ~70

### S3-T1: MonetaryPolicy Schema + ReviewTrigger

**FR:** FR-4
**SDD:** §2.4.1–§2.4.2

**Description:** Create `src/economy/monetary-policy.ts` with MonetaryPolicy and ReviewTrigger schemas.

**Acceptance Criteria:**
- `ReviewTriggerSchema`: trigger_type (epoch_boundary/supply_threshold/manual/governance_vote), threshold_pct (optional), epoch_interval (optional)
- `MonetaryPolicySchema`: policy_id (uuid), registry_id (uuid), minting_policy (references MintingPolicyConfig.policy_id), conservation_ceiling (BigInt string), coupling_invariant (constraint expression string), collateral_ratio_bps (integer), review_trigger, last_reviewed_at (datetime|null), contract_version
- `$id: 'MonetaryPolicy'`, `$id: 'ReviewTrigger'`
- `additionalProperties: false` on both

### S3-T2: MonetaryPolicy Constraint File + Builtin

**FR:** FR-4
**SDD:** §2.4.3–§2.4.4

**Description:** Create `constraints/MonetaryPolicy.constraints.json` and implement `monetary_policy_solvent` evaluator builtin.

**Acceptance Criteria:**
- 4 constraints: monetary-policy-ceiling-positive, monetary-policy-collateral-minimum (>= 10000 bps), monetary-policy-coupling-references-both, monetary-policy-has-trigger
- `monetary_policy_solvent(policy, current_supply)`: verifies current_supply <= conservation_ceiling (BigInt comparison)
- Registered in EVALUATOR_BUILTINS (now 27)
- Spec entry with examples
- Constraint file passes type checker

### S3-T3: PermissionBoundary Schema + Supporting Types

**FR:** FR-5
**SDD:** §2.5.1–§2.5.3

**Description:** Create `src/governance/permission-boundary.ts` with PermissionBoundary, ReportingRequirement, and RevocationPolicy schemas.

**Acceptance Criteria:**
- `ReportingRequirementSchema`: required (boolean), report_to (string), frequency (per_action/per_epoch/on_violation), format (audit_trail/summary/detailed)
- `RevocationPolicySchema`: trigger (violation_count/governance_vote/manual/timeout), violation_threshold (optional), timeout_seconds (optional)
- `PermissionBoundarySchema`: boundary_id (uuid), scope (string), permitted_if (constraint expression string), reporting, revocation, severity (advisory/monitored), contract_version
- All schemas have `$id`, `additionalProperties: false`

### S3-T4: PermissionBoundary Constraint File + Builtins

**FR:** FR-5
**SDD:** §2.5.4–§2.5.5

**Description:** Create `constraints/PermissionBoundary.constraints.json` and implement `permission_granted` and `within_boundary` evaluator builtins.

**Acceptance Criteria:**
- 3 constraints: permission-boundary-has-reporting, permission-boundary-has-revocation, permission-scope-unique
- `permission_granted(context, boundary_id)`: evaluates whether the boundary's `permitted_if` expression is satisfied in the given context; returns boolean
- `within_boundary(context, boundary_id)`: checks scope match and reporting requirement satisfaction; returns boolean
- Both registered in EVALUATOR_BUILTINS (now 29)
- Spec entries with examples for both
- Constraint file passes type checker

### S3-T5: GovernanceProposal Schema + Supporting Types

**FR:** FR-6
**SDD:** §2.6.1–§2.6.4

**Description:** Create `src/governance/governance-proposal.ts` with GovernanceProposal, ProposedChange, VotingRecord, and GovernanceVote schemas.

**Acceptance Criteria:**
- `ProposalStatusSchema` vocabulary: proposed, voting, ratified, rejected, withdrawn (with PROPOSAL_STATUS_TRANSITIONS map)
- `ProposedChangeSchema`: change_type (parameter_update/constraint_addition/constraint_removal/policy_change), target (string), current_value (Unknown), proposed_value (Unknown), justification (string)
- `GovernanceVoteSchema`: voter_id, vote (approve/reject/abstain), weight (number 0–1), reasoning (optional)
- `VotingRecordSchema`: quorum_required (number 0–1), votes_cast (array GovernanceVote), voting_opened_at, voting_closed_at (optional)
- `GovernanceProposalSchema`: proposal_id (uuid), registry_id (uuid), proposer_id (string), title, description, changes (array ProposedChange min 1), status (ProposalStatus), voting (VotingRecord), ratified_at (optional), contract_version
- All schemas have `$id`, `additionalProperties: false`

### S3-T6: GovernanceProposal Constraint File

**FR:** FR-6
**SDD:** §2.6.5

**Description:** Create `constraints/GovernanceProposal.constraints.json`.

**Acceptance Criteria:**
- 5 constraints: proposal-has-changes, proposal-ratified-has-timestamp, proposal-voting-has-quorum, proposal-changes-have-justification, proposal-proposer-non-empty
- Constraint file passes type checker
- Category assignments: structural (3), governance (2)

### S3-T7: Barrel Exports + Conformance Vectors (Sprint 3)

**FR:** FR-4, FR-5, FR-6

**Description:** Update barrel exports. Create conformance vectors for all three new domains.

**Acceptance Criteria:**
- `src/economy/index.ts` exports MonetaryPolicy, ReviewTrigger schemas and types
- `src/governance/index.ts` exports PermissionBoundary, ReportingRequirement, RevocationPolicy, GovernanceProposal, ProposedChange, VotingRecord, GovernanceVote schemas and types
- 3 monetary policy vectors in `vectors/conformance/monetary-policy/`: valid-150pct-collateral, invalid-mint-exceeds-ceiling, invalid-undercollateralized
- 3 permission boundary vectors in `vectors/conformance/permission-boundary/`: valid-granted-with-reporting, revocation-triggered, invalid-no-revocation-policy
- 4 governance proposal vectors in `vectors/conformance/governance-proposal/`: valid-ratified, valid-rejected, valid-withdrawn, invalid-no-changes
- All vectors follow existing format

### S3-T8: Sprint 3 Test Harness

**FR:** FR-4, FR-5, FR-6

**Description:** Comprehensive tests for monetary policy, permission boundaries, and governance proposals.

**Acceptance Criteria:**
- `tests/economy/monetary-policy.test.ts`: 20+ tests (schema validation, monetary_policy_solvent, constraint file validation, conformance vectors)
- `tests/governance/permission-boundary.test.ts`: 20+ tests (schema validation, permission_granted, within_boundary, constraint file validation, conformance vectors)
- `tests/governance/governance-proposal.test.ts`: 20+ tests (schema validation, state machine transitions, constraint file validation, conformance vectors)
- `tests/constraints/monetary-builtins.test.ts`: 5+ tests for monetary_policy_solvent
- `tests/constraints/permission-builtins.test.ts`: 10+ tests for permission_granted and within_boundary
- Updated EVALUATOR_BUILTINS count test (26 → 29) and EVALUATOR_BUILTIN_SPECS count test
- All existing tests still pass

### S3-T9: Sprint 3 Gate Check

**Description:** Verify all inter-sprint gates pass.

**Acceptance Criteria:**
- `npx vitest run` — all tests green
- `npx tsc --noEmit` — zero errors
- Schema count increased by expected amount
- All existing conformance vectors still PASS
- New conformance vectors all PASS

---

## Sprint 4: Release — Version Bump + Integration + Conformance (P0)

**Goal:** Bump version to 7.0.0, update schema index, write migration guide, run full conformance suite, and ensure everything is release-ready. This is the integration sprint — no new schemas, just wiring, documentation, and validation.

**Global Sprint ID:** 67
**Depends on:** Sprint 3 (all schemas and builtins complete)
**Estimated New Tests:** ~30

### S4-T1: Version Bump to 7.0.0

**FR:** FR-7

**Description:** Update CONTRACT_VERSION across all files. Update package.json, schemas/index.json, and all new constraint files.

**Acceptance Criteria:**
- `CONTRACT_VERSION` updated to `'7.0.0'` wherever referenced
- `package.json` version updated to `7.0.0`
- `schemas/index.json` updated with all 16 new schemas registered
- All new constraint files have `contract_version: "7.0.0"`
- Version consistency check passes across all files

### S4-T2: Schema Index Update

**FR:** FR-7

**Description:** Register all new schemas in `schemas/index.json`. Verify schema count.

**Acceptance Criteria:**
- All 16 new schemas registered with correct `$id`, file path, and `contract_version`
- Schema count test updated to reflect new total
- Schema graph operations (reachability, cycles, topological sort) produce valid results with new schemas
- No orphan schemas (all referenced types are registered)

### S4-T3: RegistryBridge Migration Support

**FR:** FR-7

**Description:** Update all existing RegistryBridge instances (test fixtures, conformance vectors, examples) to include the required `transfer_protocol` field.

**Acceptance Criteria:**
- All RegistryBridge test fixtures have `transfer_protocol: { saga_type: 'atomic', timeout_seconds: 3600, max_retries: 3 }` (default)
- All RegistryBridge conformance vectors updated
- RegistryBridge constraint file updated with transfer_protocol constraints
- No broken references

### S4-T4: Full Conformance Suite Run

**FR:** FR-7

**Description:** Run all conformance vectors (existing + new) and verify 100% pass rate.

**Acceptance Criteria:**
- All existing conformance vectors pass
- All 18 new conformance vectors pass
- Conformance summary logged

### S4-T5: Cross-Schema Reference Validation

**FR:** FR-7

**Description:** Verify all cross-schema references resolve correctly in the schema graph.

**Acceptance Criteria:**
- `BridgeTransferSaga.bridge_id` → `RegistryBridge.bridge_id` validates
- `DelegationOutcome.tree_node_id` → `DelegationTreeNode.node_id` validates
- `MonetaryPolicy.minting_policy` → `MintingPolicyConfig.policy_id` validates
- `MonetaryPolicy.registry_id` → `ConservationPropertyRegistry.registry_id` validates
- `GovernanceProposal.registry_id` → `ConservationPropertyRegistry.registry_id` validates
- `SagaParticipant.trust_scopes` → `CapabilityScopedTrust` validates
- Schema graph reachability analysis shows all new schemas are connected

### S4-T6: Final Integration Tests

**FR:** FR-7

**Description:** Integration tests that exercise cross-domain coordination scenarios.

**Acceptance Criteria:**
- Integration test: Cross-registry transfer via saga (create bridge → create saga → validate steps → settle)
- Integration test: Delegation decision with dissent (create tree → record outcome → verify dissent preserved)
- Integration test: Monetary policy solvency check (create minting policy → create monetary policy → verify coupling)
- Integration test: Permission boundary evaluation (create boundary → evaluate permission_granted → verify reporting)
- Integration test: Governance proposal lifecycle (propose → vote → ratify/reject → verify status transitions)
- All 3,504 + ~200 new tests pass (target: ~3,700 total)

### S4-T7: Sprint 4 Gate Check + EVALUATOR_BUILTINS Count

**Description:** Final gate check. Verify builtin counts, schema counts, and full test suite.

**Acceptance Criteria:**
- `npx vitest run` — all tests green (target ~3,700)
- `npx tsc --noEmit` — zero errors
- `EVALUATOR_BUILTINS` has exactly 29 entries
- `EVALUATOR_BUILTIN_SPECS` has exactly 29 entries
- Schema count matches expected total
- All conformance vectors PASS
- Version is 7.0.0 across all files
- No remaining `as any` casts in modified files

### S4-T8: Release Notes Draft

**FR:** FR-7

**Description:** Prepare release notes summarizing v7.0.0 changes.

**Acceptance Criteria:**
- Release notes document the 5 coordination gaps addressed
- Breaking change section with migration path for `RegistryBridge.transfer_protocol`
- New schema catalog (16 schemas)
- New evaluator builtin catalog (6 builtins)
- Test count and conformance vector summary
- FAANG parallel: Temporal/Cadence (saga), MakerDAO (monetary policy), Linux capabilities (permission system), Kubernetes RBAC (governance)

---

## Deferred to v8.0.0+

Items identified in Deep Review Parts II–IV that are deliberately out of scope for v7.0.0:

| Item | Source | Reason for Deferral |
|------|--------|-------------------|
| TLA+/Alloy model checking | Deep Review Part IV | Verification infrastructure, not schema definition |
| CompetitionPolicy schema | Deep Review Part III | Requires market simulation framework |
| Emergent Pattern Recognition | Deep Review Part IV | ML/statistical infrastructure |
| Meeting Geometry schemas | loa #247 | Aspirational; needs more design work |
| Event sourcing / CQRS | Deep Review Part IV | Runtime concern, not schema definition |
| Full CEL/Rego policy language | Deep Review Part IV | Major scope expansion |

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| RegistryBridge breaking change causes test cascade | Medium | Medium | Sprint 2 updates all existing instances first (S2-T2) |
| Saga evaluator builtin complexity (exchange rate conversion) | Low | Medium | BigInt arithmetic already established in codebase (branded-types.ts) |
| PermissionBoundary `permitted_if` expression evaluation | Medium | Low | Reuse existing evaluateConstraint() — permission expressions are just constraint expressions |
| GovernanceProposal scope creep (voting logic) | Low | Medium | Schema defines structure only; voting implementation is arrakis's responsibility |
| Sprint 3 has most new schemas (10) — risk of overload | Medium | Medium | Schemas are well-specified in SDD; constraint files follow established patterns |

---

## FAANG Parallel Summary

| v7.0.0 Feature | Industry Parallel | Why It Matters |
|----------------|-------------------|----------------|
| BridgeTransferSaga | Temporal/Uber Cadence, AWS Step Functions | Saga orchestration for distributed transactions across trust boundaries |
| DelegationOutcome | Apache Kafka consumer groups, Raft leader election logs | Recording consensus + dissent enables debugging and audit |
| MonetaryPolicy | MakerDAO collateral ratios, Federal Reserve dual mandate | Coupling creation to preservation prevents hyperinflation |
| PermissionBoundary | Linux capabilities(7), Android permissions model | MAY semantics enable safe experimentation alongside prohibition |
| GovernanceProposal | Kubernetes KEPs, Python PEPs, Ethereum EIPs | Governed agents need voice, not just governance weight |

---

## Cambrian Assessment (v7.0.0)

| Condition | Status | Evidence |
|-----------|--------|----------|
| 1. Sufficient building blocks | **MET (strengthened)** | 87+ schemas including 16 coordination primitives |
| 2. Compositional combinatorics | **MET (strengthened)** | Cross-registry saga + delegation outcome + monetary coupling create new composition axes |
| 3. Selection pressure | **MET** | Constraint evaluator (29 builtins) + conformance vectors |
| 4. Environmental scaffolding | **MET (strengthened)** | Permission boundaries enable safe experimentation zones |
| 5. Protected variation | **MET (strengthened)** | Governance proposals enable change without revolution |
| 6. Community memory | **APPROACHING** | Dissent records preserve minority wisdom; still no formal knowledge base |
