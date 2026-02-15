# Sprint Plan: loa-hounfour v5.0.0 — The Multi-Model Release

**Cycle:** cycle-010
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**SDD:** [grimoires/loa/sdd.md](grimoires/loa/sdd.md)
**Date:** 2026-02-15
**Team:** 1 AI agent (Claude Code)
**Sprint duration:** Single-session per sprint

---

## Sprint Overview

| Sprint | Theme | FRs | Est. Tests | Global ID | Status |
|--------|-------|-----|-----------|-----------|--------|
| 1 | ModelPort Foundation | FR-1, FR-3 | ~55 | 35 | ✅ |
| 2 | Ensemble & Routing | FR-2, FR-7 | ~40 | 36 | ✅ |
| 3 | Architecture — Barrel + Grammar | FR-4, FR-5 | ~35 | 37 | ✅ |
| 4 | Vectors, Namespace & Polish | FR-6, FR-8 | ~35 | 38 | ✅ |
| 5 | Integration — Constraints + Release | Constraint files, v5.0.0 | ~25 | 39 | ✅ |
| 6 | Quick Fixes + Billing Provenance | BB fixes, billing chain | ~30 | 40 | ✅ |
| 7 | Multi-Model Dialogue Protocol | Dialogue strategies | ~25 | 41 | ✅ |
| 8 | Constraint Evolution + Agent Constraints | Grammar v2.0, proposals | ~35 | 42 | ✅ |
| 9 | Bridge Iteration 2 — Cost + Fuzz + Docs | BB fixes | ~15 | 43 | ✅ |
| 10 | Structural Debt + Protocol Safety | BB deep review | ~35 | 44 | ✅ |
| 11 | Executable Vectors + Consensus Audit | BB deep review | ~30 | 45 | ✅ |
| 12 | Constraint Parity + Tokenizer Escapes | BB iteration 2 | ~55 | 46 | ✅ |
| 13 | Decision Trail + Merge Prep | Documentation, ADR | ~10 | 47 | ⏳ |

**Dependency chain:** Sprint 1 → … → Sprint 12 (✅ complete) → Sprint 13

---

## Sprint 1: ModelPort Foundation (FR-1 + FR-3)

**Goal:** Define the canonical adapter port boundary contracts and resolve open Bridgebuilder findings on existing schemas.

### S1-T1: CompletionRequest + CompletionResult schemas

**Description:** Create `src/schemas/model/completion-request.ts` and `src/schemas/model/completion-result.ts` with full TypeBox schemas per SDD 3.1.1–3.1.2.

**Acceptance Criteria:**
- `CompletionRequestSchema` validates: request_id, agent_id, tenant_id, model, messages (ProviderWireMessage[]), tools, tool_choice, temperature, max_tokens, thinking, budget_limit_micro, metadata, contract_version
- `CompletionResultSchema` validates: request_id, model, provider, content, thinking, tool_calls, finish_reason, usage (with cost_micro), latency_ms, metadata, contract_version
- Both schemas use `additionalProperties: false` and `$id`
- `MicroUSDUnsigned` used for all financial fields
- ≥8 unit tests (valid + invalid for each schema)

**Dependencies:** None
**Testing:** Unit tests for valid/invalid inputs, edge cases (empty messages, missing required fields)

### S1-T2: ProviderWireMessage + ToolDefinition + ToolResult schemas

**Description:** Create `src/schemas/model/provider-wire-message.ts`, `src/schemas/model/tool-definition.ts`, `src/schemas/model/tool-result.ts` per SDD 3.1.4–3.1.5.

**Acceptance Criteria:**
- `ProviderWireMessageSchema` validates: role (system/user/assistant/tool), content (string or content blocks), thinking, tool_calls, tool_call_id
- `ToolDefinitionSchema` validates: type=function, function.name (alphanumeric pattern), function.description, function.parameters
- `ToolResultSchema` validates: role=tool, tool_call_id, content
- ≥6 unit tests

**Dependencies:** None (parallel with S1-T1)
**Testing:** Role-specific validation, tool call structure, content block arrays

### S1-T3: ModelCapabilities schema

**Description:** Create `src/schemas/model/model-capabilities.ts` per SDD 3.1.3.

**Acceptance Criteria:**
- `ModelCapabilitiesSchema` validates: model_id, provider, capabilities (6 boolean fields), limits (max_context_tokens, max_output_tokens, max_thinking_tokens), optional pricing
- Pricing uses `MicroUSDUnsigned` for input/output/thinking per-million rates
- ≥4 unit tests

**Dependencies:** None (parallel with S1-T1, S1-T2)
**Testing:** Full capabilities object, missing optional pricing, invalid limits

### S1-T4: Cross-field validators for ModelPort schemas

**Description:** Register cross-field validators in `src/validators/index.ts` for CompletionRequest, CompletionResult, and ProviderWireMessage per SDD 3.1.

**Acceptance Criteria:**
- `CompletionRequest`: tools present → tool_choice required; execution_mode=native_runtime → provider required
- `CompletionResult`: finish_reason=tool_calls → tool_calls non-empty; usage.total_tokens conservation check
- `ProviderWireMessage`: role=tool → tool_call_id required; role=assistant → content or tool_calls present
- All validators registered with `registerCrossFieldValidator()`
- Schemas marked with `'x-cross-field-validated': true`
- ≥12 cross-field tests

**Dependencies:** S1-T1, S1-T2
**Testing:** Each cross-field rule with passing and failing data

### S1-T5: Open finding resolution — Sybil resistance (BB-V4-DEEP-001)

**Description:** Add `min_unique_validators` and `validation_graph_hash` optional fields to `ReputationScoreSchema`. Update cross-field validator per SDD 3.3.1.

**Acceptance Criteria:**
- Two new `Type.Optional` fields added to `ReputationScoreSchema`
- Cross-field validator: `min_unique_validators` present → `sample_size >= min_unique_validators`
- Existing tests pass unchanged (backward-compatible)
- ≥4 new tests for Sybil resistance validation

**Dependencies:** None (parallel)
**Testing:** Valid with/without new fields, violation scenarios

### S1-T6: Open finding resolution — Escalation linkage (BB-V4-DEEP-004)

**Description:** Add `escalation_rule_applied` optional field to `SanctionSchema`. Update cross-field validator per SDD 3.3.4.

**Acceptance Criteria:**
- New `Type.Optional(Type.String)` field `escalation_rule_applied` on `SanctionSchema`
- Cross-field validator: when present, should match `trigger.violation_type`
- Existing tests pass unchanged
- ≥3 new tests for escalation linkage

**Dependencies:** None (parallel)
**Testing:** With/without field, matching/non-matching violation types

### S1-T7: Barrel exports + JSON Schema generation for Sprint 1 schemas

**Description:** Add all new Sprint 1 schemas to `src/index.ts` barrel exports. Add validators to the `validators` object. Run `schema:generate` and commit generated JSON Schemas.

**Acceptance Criteria:**
- All 6 new schemas exported from `src/index.ts`
- All 6 new schemas added to `validators` object in `src/validators/index.ts`
- `npm run schema:generate` produces valid JSON Schemas for all new schemas
- `npm run build` succeeds with zero errors
- All 1,097 existing tests + new Sprint 1 tests pass

**Dependencies:** S1-T1 through S1-T6
**Testing:** Build verification, JSON Schema validation, full test suite

---

## Sprint 2: Ensemble & Routing (FR-2 + FR-7)

**Goal:** Add ensemble orchestration contracts and routing/budget schemas for multi-model dispatch.

### S2-T1: EnsembleStrategy + EnsembleRequest + EnsembleResult schemas

**Description:** Create `src/schemas/model/ensemble/ensemble-strategy.ts`, `ensemble-request.ts`, `ensemble-result.ts` per SDD 3.2.

**Acceptance Criteria:**
- `EnsembleStrategySchema` vocabulary: first_complete, best_of_n, consensus
- `EnsembleRequestSchema`: ensemble_id, strategy, models (minItems: 2), timeout_ms, task_type, request (CompletionRequest reference), consensus_threshold, contract_version
- `EnsembleResultSchema`: ensemble_id, strategy, selected (CompletionResult), candidates array, consensus_score, total_cost_micro, total_latency_ms
- ≥10 unit tests

**Dependencies:** Sprint 1 (CompletionRequest/Result schemas)
**Testing:** Each strategy with valid/invalid inputs, candidate arrays, cost conservation

### S2-T2: Cross-field validators for ensemble schemas

**Description:** Register cross-field validators for EnsembleRequest and EnsembleResult per SDD 3.2.

**Acceptance Criteria:**
- `EnsembleRequest`: strategy=consensus → consensus_threshold required
- `EnsembleResult`: strategy=consensus → consensus_score required; total_cost_micro >= selected.usage.cost_micro
- ≥8 cross-field tests

**Dependencies:** S2-T1
**Testing:** Strategy-specific validation, cost conservation property

### S2-T3: ExecutionMode + ProviderType + AgentRequirements schemas

**Description:** Create `src/schemas/model/routing/execution-mode.ts`, `provider-type.ts`, `agent-requirements.ts` per SDD 3.7.1–3.7.3.

**Acceptance Criteria:**
- `ExecutionModeSchema` vocabulary: native_runtime, remote_model
- `ProviderTypeSchema` vocabulary: claude-code, openai, openai-compatible
- `AgentRequirementsSchema`: agent_id, requires_native_runtime, requires_tool_calling, requires_thinking_traces, requires_vision, preferred_models, min_context_tokens
- ≥6 unit tests

**Dependencies:** None (parallel with S2-T1)
**Testing:** Valid requirements, empty optionals, invalid constraints

### S2-T4: BudgetScope + RoutingResolution schemas

**Description:** Create `src/schemas/model/routing/budget-scope.ts`, `routing-resolution.ts` per SDD 3.7.4–3.7.5.

**Acceptance Criteria:**
- `BudgetScopeSchema`: scope (project/sprint/phase/conversation), scope_id, limit_micro, spent_micro, action_on_exceed (block/warn/downgrade)
- `RoutingResolutionSchema`: resolved_model, original_request_model, resolution_type (exact/fallback/budget_downgrade/capability_match), reason, latency_ms
- Cross-field validator for BudgetScope: spent_micro vs limit_micro warning
- ≥8 unit tests including cross-field

**Dependencies:** None (parallel with S2-T1)
**Testing:** Each scope type, exceed actions, resolution types

### S2-T5: Barrel exports + JSON Schema generation for Sprint 2 schemas

**Description:** Add all Sprint 2 schemas to barrel, validators, and generate JSON Schemas.

**Acceptance Criteria:**
- All 8 new schemas exported from `src/index.ts`
- All validators registered
- JSON Schemas generated
- Full test suite passes

**Dependencies:** S2-T1 through S2-T4
**Testing:** Build, schema generation, full regression

---

## Sprint 3: Architecture — Barrel Decomposition + Grammar Formalization (FR-4 + FR-5)

**Goal:** Factor the monolithic barrel into sub-packages and formalize the constraint expression grammar.

### S3-T1: Create sub-package barrel files

**Description:** Create `src/core/index.ts`, `src/economy/index.ts`, `src/model/index.ts`, `src/governance/index.ts` per SDD 3.4. Each barrel contains re-exports for its domain.

**Acceptance Criteria:**
- `src/core/index.ts` exports ~120 items (agent, conversation, event, transfer, health, discovery, errors, patterns, lifecycle, deprecation, schema stability)
- `src/economy/index.ts` exports ~80 items (JWT, invoke, billing, escrow, stake, credit, dividend, currency, economy flow, choreography)
- `src/model/index.ts` exports ~60 items (completion, ensemble, routing, stream, pools, thinking, tool call, routing policy/constraint, metadata)
- `src/governance/index.ts` exports ~50 items (reputation, sanctions, disputes, performance, validated outcomes)
- Each barrel ≤150 lines
- ≥4 import verification tests

**Dependencies:** Sprint 1 + Sprint 2 (all schemas exist)
**Testing:** Import from each sub-package, verify types resolve

### S3-T2: Create constraints sub-package barrel

**Description:** Create `src/constraints/index.ts` as the sub-package barrel for constraint-related exports per SDD 3.4.

**Acceptance Criteria:**
- Exports evaluator, types, state machines, aggregate boundaries, temporal properties
- ~40 exports
- ≤80 lines

**Dependencies:** None (parallel with S3-T1)
**Testing:** Import verification

### S3-T3: Refactor root barrel to re-export sub-packages

**Description:** Replace the monolithic `src/index.ts` with thin re-exports from sub-packages per SDD 3.4. Keep cross-cutting concerns (version, validators, integrity) in root.

**Acceptance Criteria:**
- Root barrel uses `export * from './core/index.js'` etc.
- Cross-cutting: version, validators, integrity stay in root barrel
- `src/index.ts` ≤100 lines (down from 486)
- ALL existing tests pass unchanged (backward compatibility)
- `npm run build` succeeds

**Dependencies:** S3-T1, S3-T2
**Testing:** Full regression suite — every existing import path must work

### S3-T4: Update package.json exports map

**Description:** Add sub-package entries to `package.json` `"exports"` map per SDD 3.4.

**Acceptance Criteria:**
- `"./core"`, `"./economy"`, `"./model"`, `"./governance"`, `"./constraints"` entries in exports
- Each maps `types` to `./dist/{domain}/index.d.ts` and `import` to `./dist/{domain}/index.js`
- `npm run build` produces all dist files
- ≥5 tests verifying sub-package imports work at runtime

**Dependencies:** S3-T3
**Testing:** Dynamic import tests for each sub-package path

### S3-T5: PEG grammar specification + grammar validator

**Description:** Write `constraints/GRAMMAR.md` PEG grammar per SDD 3.5.1. Create `src/constraints/grammar.ts` with `validateExpression()` per SDD 3.5.3.

**Acceptance Criteria:**
- `constraints/GRAMMAR.md` documents the full PEG grammar for constraint expressions
- `validateExpression()` returns `{ valid: true }` or `{ valid: false, error, position }`
- `EXPRESSION_VERSION = '1.0'` exported
- All existing constraint expressions pass validation
- ≥6 tests (valid + invalid expressions, position reporting)

**Dependencies:** None (parallel with S3-T1)
**Testing:** Grammar acceptance, rejection with positions, edge cases

### S3-T6: Expression versioning + evaluator error reporting

**Description:** Add `expression_version` field to `ConstraintFile` type. Extend evaluator with `evaluateConstraintDetailed()` per SDD 3.5.2 + 3.5.4.

**Acceptance Criteria:**
- `ConstraintFile` interface gains `expression_version: string`
- All existing constraint JSON files updated with `"expression_version": "1.0"`
- `evaluateConstraintDetailed()` returns `EvaluationResult` with position info on error
- Existing `evaluateConstraint()` API unchanged
- ≥5 tests for detailed evaluation

**Dependencies:** S3-T5
**Testing:** Error position accuracy, version field presence

### S3-T7: Constraint grammar fuzz tests

**Description:** Write ≥10 property-based fuzz tests using fast-check per SDD 3.5.5.

**Acceptance Criteria:**
- 10+ fast-check properties covering: valid expression acceptance, invalid rejection with position, depth limits, BigInt overflow, null coercion, boolean short-circuit, implication truth table, every-quantifier with empty arrays, bracket arrays, grammar version
- All properties pass with numRuns: 1000
- Tests in `tests/properties/constraint-grammar-fuzz.test.ts`

**Dependencies:** S3-T5, S3-T6
**Testing:** Property-based tests

---

## Sprint 4: Vectors, Namespace & Polish (FR-6 + FR-8)

**Goal:** Create cross-ecosystem shared vectors and extend metadata namespace conventions.

### S4-T1: Completion vectors (valid + invalid)

**Description:** Create `vectors/cross-ecosystem/completion-valid.json` and `completion-invalid.json` per SDD 3.6.

**Acceptance Criteria:**
- ≥4 valid completion vectors: basic text, with tools, with thinking, with budget
- ≥4 invalid vectors: missing tool_choice, usage conservation violation, empty messages, invalid finish_reason+tool_calls
- Each vector has id, description, valid flag, data, expected_cross_field
- Vector validation tests pass

**Dependencies:** Sprint 1 (CompletionRequest/Result schemas)
**Testing:** Each vector validates against schema correctly

### S4-T2: Billing + ensemble vectors

**Description:** Create `vectors/cross-ecosystem/billing-ensemble.json` and `billing-attribution.json` per SDD 3.6.

**Acceptance Criteria:**
- ≥3 ensemble billing vectors: multi-model cost split, consensus billing, failed candidate
- ≥3 attribution vectors: provider-reported, observed-chunks, prompt-only
- Total ≥6 vectors

**Dependencies:** Sprint 2 (Ensemble schemas)
**Testing:** Vector validation tests

### S4-T3: Event flow + saga vectors

**Description:** Create `vectors/cross-ecosystem/event-economy-flow.json` and `event-saga.json` per SDD 3.6.

**Acceptance Criteria:**
- ≥3 economy flow vectors: Performance→Reputation, Escrow→Billing, Sanction→Routing
- ≥3 saga vectors: complete saga, compensated saga, timeout saga
- Total ≥6 vectors

**Dependencies:** None (uses existing schemas)
**Testing:** Vector validation tests

### S4-T4: Extended metadata namespaces (billing.*)

**Description:** Add `billing.*` namespace to `METADATA_NAMESPACES` in `src/vocabulary/metadata.ts` per SDD 3.8.

**Acceptance Criteria:**
- `METADATA_NAMESPACES.BILLING = 'billing.'` added
- `isValidMetadataKey()` recognizes `billing.*` keys
- `getNamespaceOwner()` returns `'economy'` for `billing.*`
- ≥5 tests for new namespace

**Dependencies:** None (parallel)
**Testing:** Key validation, namespace ownership, edge cases

### S4-T5: MIGRATION.md + VERSION bump preparation

**Description:** Create `MIGRATION.md` with v4.6.0 → v5.0.0 consumer upgrade matrix. Update `vectors/VERSION` to `5.0.0`.

**Acceptance Criteria:**
- `MIGRATION.md` covers: loa-finn migration path, arrakis migration path, mibera-freeside migration path, sub-package import guide
- `vectors/VERSION` updated to `5.0.0`
- Clear "What's breaking" vs "What's additive" sections
- No code changes in this task

**Dependencies:** S4-T1 through S4-T4
**Testing:** Documentation review

### S4-T6: Cross-ecosystem vector test harness

**Description:** Create `tests/vectors/cross-ecosystem.test.ts` that validates all cross-ecosystem vectors against their schemas.

**Acceptance Criteria:**
- Reads all JSON files from `vectors/cross-ecosystem/`
- For each vector: validates against schema, checks cross-field expectations
- ≥20 test cases (one per vector)
- Vectors with `valid: false` correctly fail schema validation

**Dependencies:** S4-T1, S4-T2, S4-T3
**Testing:** The test harness IS the test

---

## Sprint 5: Integration — Constraint Files + v5.0.0 Release

**Goal:** Generate constraint files for all new schemas, run full integration, bump to v5.0.0.

### S5-T1: Constraint files for ModelPort schemas

**Description:** Create `constraints/CompletionRequest.constraints.json`, `CompletionResult.constraints.json`, `ProviderWireMessage.constraints.json` per SDD 4.3.

**Acceptance Criteria:**
- CompletionRequest: tools→tool_choice, execution_mode→provider constraints
- CompletionResult: finish_reason→tool_calls, usage conservation constraints
- ProviderWireMessage: role→tool_call_id, content presence constraints
- All expressions pass `validateExpression()`
- All use `"expression_version": "1.0"`

**Dependencies:** Sprint 1 (schemas), Sprint 3 (grammar)
**Testing:** Round-trip tests against TypeScript validators

### S5-T2: Constraint files for ensemble + routing schemas

**Description:** Create `constraints/EnsembleRequest.constraints.json`, `EnsembleResult.constraints.json`, `BudgetScope.constraints.json`.

**Acceptance Criteria:**
- EnsembleRequest: strategy→threshold constraint
- EnsembleResult: strategy→score, cost conservation constraints
- BudgetScope: spent vs limit constraint
- All expressions valid
- All use `"expression_version": "1.0"`

**Dependencies:** Sprint 2 (schemas), Sprint 3 (grammar)
**Testing:** Round-trip tests

### S5-T3: Update existing constraint files with expression_version

**Description:** Add `"expression_version": "1.0"` to all 11 existing constraint files.

**Acceptance Criteria:**
- All files in `constraints/` have `expression_version` field
- `contract_version` updated to `5.0.0`
- All existing round-trip tests pass unchanged

**Dependencies:** Sprint 3 (grammar/version)
**Testing:** Existing constraint tests

### S5-T4: Constraint round-trip tests for new schemas

**Description:** Create round-trip tests verifying constraint file expressions agree with TypeScript cross-field validators for all new schemas.

**Acceptance Criteria:**
- Each constraint in new files tested against both evaluator and TypeScript validator
- Valid and invalid data for each constraint
- ≥15 round-trip tests

**Dependencies:** S5-T1, S5-T2
**Testing:** Round-trip equivalence

### S5-T5: Version bump to v5.0.0 + final integration

**Description:** Bump `CONTRACT_VERSION` to `5.0.0`, `MIN_SUPPORTED_VERSION` to `4.0.0`, `package.json` version to `5.0.0`. Run all checks.

**Acceptance Criteria:**
- `src/version.ts`: `CONTRACT_VERSION = '5.0.0'`, `MIN_SUPPORTED_VERSION = '4.0.0'`
- `package.json` version: `5.0.0`
- `npm run build` succeeds
- `npm run test` — ALL tests pass (1,097 existing + ~300 new)
- `npm run schema:generate` succeeds for all schemas
- `npm run check:all` passes (schemas, vectors, migration, constraints)
- `npm run typecheck` clean

**Dependencies:** S5-T1 through S5-T4
**Testing:** Full suite integration

### S5-T6: JSON Schema generation + schema index update

**Description:** Run `schema:generate` for all 14 new schemas. Update `schemas/index.json` manifest.

**Acceptance Criteria:**
- 14 new `.schema.json` files in `schemas/`
- `schemas/index.json` includes all new schemas
- Each JSON Schema is valid and matches TypeBox source
- `schemastore-catalog.json` updated if applicable

**Dependencies:** S5-T5
**Testing:** Schema validation script

---

## Sprint 6: Quick Fixes + Billing Provenance Chain (Bridgebuilder Enhancement)

**Goal:** Address Bridgebuilder medium/low findings and add billing provenance chain metadata.

### S6-T1: Add `session_id` to CompletionRequest

**Description:** Add `session_id: Type.Optional(Type.String({ minLength: 1 }))` to CompletionRequest schema. Add constraint: `execution_mode == 'native_runtime' => session_id != null`. Update round-trip tests.

**Acceptance Criteria:**
- `session_id` field added after `trace_id` in `src/schemas/model/completion-request.ts`
- New constraint in `constraints/CompletionRequest.constraints.json`
- Round-trip test for session_id constraint
- JSON Schema regenerated

**Dependencies:** None
**Testing:** Schema validation, constraint round-trip

### S6-T2: EnsembleResult cost conservation completeness

**Description:** Add `ensemble-result-total-cost-equals-sum` constraint using `bigint_sum(candidates, 'usage.cost_micro') == total_cost_micro`. Extend `bigint_sum` form 2 to resolve dot-paths via existing `resolve()` function.

**Acceptance Criteria:**
- `bigint_sum` evaluator extended: replace flat key lookup with `resolve()` for nested paths
- Grammar `parseBigintSumCall` accepts dot-path string args
- New constraint in `constraints/EnsembleResult.constraints.json`
- TypeScript cross-field validator updated in `src/validators/index.ts`
- Round-trip test for cost conservation

**Dependencies:** None
**Testing:** Evaluator dot-path tests, constraint round-trip, cross-field validator

### S6-T3: Billing provenance chain metadata keys

**Description:** Add `PAYMENT_TX` and `CREDIT_LOT_ID` to `BILLING_METADATA_KEYS`. Export from model barrel. Create billing provenance cross-ecosystem vector.

**Acceptance Criteria:**
- `PAYMENT_TX: 'billing.payment_tx'` and `CREDIT_LOT_ID: 'billing.credit_lot_id'` added
- `BILLING_METADATA_KEYS` and `BillingMetadataKey` exported from `src/model/index.ts`
- New vector: `vectors/cross-ecosystem/billing-provenance.json`
- Metadata tests for new keys

**Dependencies:** None
**Testing:** Metadata key validation, vector validation

### S6-T4: Decision trail $comment annotations

**Description:** Add `$comment` linking to RFC #31 on `EnsembleStrategySchema` and `ProviderTypeSchema`. Propagates to JSON Schema output via TypeBox.

**Acceptance Criteria:**
- `$comment` on `ensemble-strategy.ts` and `provider-type.ts`
- Comments visible in generated JSON Schema
- No functional changes

**Dependencies:** None
**Testing:** JSON Schema output inspection

---

## Sprint 7: Multi-Model Dialogue Protocol (Bridgebuilder Enhancement)

**Goal:** Extend ensemble orchestration with sequential and dialogue strategies for multi-model debate.

### S7-T1: Extend EnsembleStrategy with `sequential` and `dialogue`

**Description:** Add `Type.Literal('sequential')` and `Type.Literal('dialogue')` to the EnsembleStrategy union. Sequential = chain (output→input). Dialogue = chain + thinking traces + multi-round termination.

**Acceptance Criteria:**
- Two new strategy literals in union
- Existing strategies unchanged (backward compatible)
- Unit tests for new strategy values

**Dependencies:** None
**Testing:** Schema validation for new strategies

### S7-T2: Add dialogue-specific fields to EnsembleRequest

**Description:** Add `dialogue_config` optional object with `max_rounds`, `pass_thinking_traces`, `termination`, `seed_prompt`. Add cross-field constraint: `strategy === 'dialogue' => dialogue_config != null`.

**Acceptance Criteria:**
- `dialogue_config` field on EnsembleRequest schema
- Cross-field validator registered
- Constraint in `constraints/EnsembleRequest.constraints.json`
- Unit + cross-field tests

**Dependencies:** S7-T1
**Testing:** Valid/invalid dialogue configs, constraint round-trip

### S7-T3: Add dialogue-specific fields to EnsembleResult

**Description:** Add `rounds` array (round number, model, response, thinking_trace) and `termination_reason` enum. Cross-field: `strategy === 'dialogue' => rounds != null && rounds.length > 0`.

**Acceptance Criteria:**
- `rounds` and `termination_reason` fields on EnsembleResult schema
- Cross-field validator registered
- Constraint for rounds cost conservation
- Unit + cross-field tests

**Dependencies:** S7-T1
**Testing:** Valid/invalid round arrays, termination reasons, cost conservation

### S7-T4: Dialogue cross-ecosystem vectors

**Description:** Create `vectors/cross-ecosystem/ensemble-dialogue.json` with 3 test vectors: 2-round dialogue with thinking traces, 3-round consensus termination, budget-exhausted early termination.

**Acceptance Criteria:**
- 3 vectors covering different dialogue scenarios
- Each vector validates against schema
- Cross-field expectations included

**Dependencies:** S7-T2, S7-T3
**Testing:** Vector validation tests

### S7-T5: Round-trip tests for dialogue constraints

**Description:** Add round-trip tests for EnsembleRequest dialogue_config constraint and EnsembleResult rounds constraint. Existing ensemble tests remain unchanged.

**Acceptance Criteria:**
- Round-trip tests for dialogue-specific constraints
- No regressions in existing ensemble tests

**Dependencies:** S7-T2, S7-T3
**Testing:** Constraint round-trip equivalence

---

## Sprint 8: Constraint Evolution + Agent-Authored Constraints (Bridgebuilder Enhancement)

**Goal:** Evolve the constraint grammar to v2.0 with temporal operators and introduce the agent-authored constraint proposal schema.

### S8-T1: Grammar v2.0 — Temporal operators

**Description:** Bump `EXPRESSION_VERSION` to `'2.0'`. Add `changed()`, `previous()`, `delta()` built-in functions. These read from `_previous` key in data context. Update grammar PEG spec.

**Acceptance Criteria:**
- `EXPRESSION_VERSION = '2.0'` in grammar.ts
- `changed(path)`, `previous(path)`, `delta(path)` parseable and evaluatable
- Evaluator: `changed()` compares current vs `_previous`, `previous()` resolves from `_previous`, `delta()` computes BigInt difference
- `constraints/GRAMMAR.md` updated with v2.0 PEG spec

**Dependencies:** None
**Testing:** Grammar parsing, evaluator function tests

### S8-T2: Temporal constraint files

**Description:** Create `constraints/SagaContext.constraints.json` with temporal constraints demonstrating the new grammar: `saga-step-monotonic` and `saga-direction-valid-transition`.

**Acceptance Criteria:**
- 2 temporal constraints using `changed()`, `previous()`, `delta()`
- All expressions pass `validateExpression()` at v2.0
- Connected to existing saga vectors

**Dependencies:** S8-T1
**Testing:** Constraint expression validation

### S8-T3: Expression version compatibility in constraint loading

**Description:** Add `expressionVersionSupported(version: string): boolean` utility. v1.x works in v2.0 evaluator. v2.x requires v2.0+ evaluator. Add version check to `evaluateConstraintDetailed()`.

**Acceptance Criteria:**
- Version check utility in `src/constraints/types.ts`
- `evaluateConstraintDetailed()` validates expression version before evaluation
- Backward compatible: v1.0 expressions still work

**Dependencies:** S8-T1
**Testing:** Version compatibility matrix tests

### S8-T4: Agent-authored constraint proposal schema

**Description:** Create `src/schemas/model/constraint-proposal.ts` with `ConstraintProposalSchema`. Register cross-field validator: `review_status === 'accepted' => consensus_category == 'HIGH_CONSENSUS'`. Create constraint file. Add to barrel, validator registry, schema generation.

**Acceptance Criteria:**
- Full schema with proposal_id, agent_id, target_schema_id, proposed_constraints, rationale, expression_version, review_status, review_scores, consensus_category, contract_version
- Cross-field validator registered
- Constraint file: `constraints/ConstraintProposal.constraints.json`
- Exported from model barrel and validator registry
- JSON Schema generated

**Dependencies:** S8-T1 (expression_version reference)
**Testing:** Schema validation, cross-field validator, round-trip

### S8-T5: Temporal operator round-trip tests

**Description:** Add round-trip tests for SagaContext temporal constraints. Test `changed()`, `previous()`, `delta()` with `_previous` data context. Update grammar fuzz tests for v2.0 tokens.

**Acceptance Criteria:**
- SagaContext constraint round-trip tests with `_previous` data
- Grammar fuzz tests cover v2.0 temporal function tokens
- All existing fuzz tests pass (v1.0 backward compatible)

**Dependencies:** S8-T1, S8-T2
**Testing:** Round-trip + property-based fuzz

### S8-T6: ConstraintProposal tests and vectors

**Description:** Unit tests for ConstraintProposal schema and cross-field validator. Cross-ecosystem vector: `vectors/cross-ecosystem/constraint-proposal.json`. Round-trip test for proposal constraints.

**Acceptance Criteria:**
- Schema validation tests (valid + invalid proposals)
- Cross-field validator tests (accepted requires HIGH_CONSENSUS)
- Cross-ecosystem vector with 2+ test cases
- Constraint round-trip test

**Dependencies:** S8-T4
**Testing:** Unit + vector + round-trip

### S8-T7: Regenerate all JSON schemas and update README

**Description:** Run `scripts/generate-schemas.ts` to produce 48+ schemas (new: constraint-proposal). Update `schemas/README.md`.

**Acceptance Criteria:**
- 48+ schema files in `schemas/`
- ConstraintProposal schema included
- `npm run build` succeeds
- Full test suite passes
- `npm run check:all` passes

**Dependencies:** S8-T1 through S8-T6
**Testing:** Build, schema generation, full regression

---

## Sprint 9: Bridgebuilder Iteration 2 — Cost Conservation + Fuzz Expansion (Bridge Fix)

**Goal:** Address 3 MEDIUM and 3 LOW findings from Bridgebuilder iteration 1 review. Tighten cost conservation for dialogue rounds, expand fuzz test coverage to v2.0 grammar, and close documentation gaps.

### S9-T1: Dialogue cost conservation in EnsembleResult

**Description:** Add dialogue-specific cost conservation to both the TypeScript validator and constraint file. When strategy is 'dialogue' and rounds is populated, verify `total_cost_micro >= sum(rounds[].response.usage.cost_micro)`.

**Acceptance Criteria:**
- TypeScript validator in `src/validators/index.ts` adds dialogue rounds cost check
- New constraint in `constraints/EnsembleResult.constraints.json`: `strategy != 'dialogue' || rounds == null || bigint_gte(total_cost_micro, bigint_sum(rounds, 'response.usage.cost_micro'))`
- Round-trip test for dialogue cost conservation
- Existing candidate cost conservation unchanged

**Dependencies:** None
**Testing:** Round-trip + cross-field validator tests

### S9-T2: Grammar fuzz tests for temporal operators

**Description:** Add `temporalCallArb` arbitrary to property-based fuzz tests that generates `changed(field)`, `previous(field)`, `delta(field)` expressions. Compose into existing arbitraries. Add temporal-specific property: `changed(x) => delta(x) != 0` is always syntactically valid.

**Acceptance Criteria:**
- `temporalCallArb` generates valid temporal expressions
- Property test: temporal calls always validate syntactically
- Property test: temporal + boolean compositions validate
- Property test: implication with temporal antecedent validates
- numRuns >= 100 for each property

**Dependencies:** None
**Testing:** Property-based fuzz

### S9-T3: Discoverability test — add ConstraintProposal to annotatedSchemas

**Description:** Add `ConstraintProposal` to the `annotatedSchemas` array in `tests/cross-field/discoverability.test.ts` to verify the `x-cross-field-validated: true` annotation is present.

**Acceptance Criteria:**
- Import `ConstraintProposalSchema` added to test
- `{ name: 'ConstraintProposal', schema: ConstraintProposalSchema }` added to `annotatedSchemas`
- Test passes

**Dependencies:** None
**Testing:** Annotation verification

### S9-T4: Documentation — changed() identity note + $comment on ConstraintProposal

**Description:** Add JSDoc note on `parseChanged()` documenting strict identity comparison semantics. Add `$comment` referencing RFC #31 to `ConstraintProposalSchema`.

**Acceptance Criteria:**
- JSDoc comment on `parseChanged()` in evaluator.ts
- `$comment` on ConstraintProposalSchema options
- Regenerate JSON Schema to verify $comment propagates

**Dependencies:** None
**Testing:** JSON Schema output inspection

### S9-T5: Regenerate schemas + final verification

**Description:** Regenerate all JSON schemas after changes. Run full test suite. Verify schema count stable at 48.

**Acceptance Criteria:**
- 48 schemas generated
- All tests pass (1,371+ tests)
- No regressions

**Dependencies:** S9-T1 through S9-T4
**Testing:** Full regression

---

## Sprint 10: Structural Debt + Protocol Safety (Bridgebuilder Deep Review)

**Goal:** Address all structural concerns and protocol safety observations from the Bridgebuilder deep architectural review of PR #6. Eliminate dual-parser debt, improve delta() billing safety, add session binding for dialogue, improve protocol version negotiation, and add constraint lifecycle support.

**Source:** [Bridgebuilder Deep Review](https://github.com/0xHoneyJar/loa-hounfour/pull/6#issuecomment-3903352725)

### S10-T1: Extract shared Tokenizer between evaluator.ts and grammar.ts

**Description:** The evaluator and grammar validator independently implement the same tokenizer. Token types are defined twice — as a type alias in `evaluator.ts:28` and as an interface in `grammar.ts:20`. Extract a shared `src/constraints/tokenizer.ts` module with a `Tokenizer` class and `Token`/`TokenType` types. Both `evaluator.ts` and `grammar.ts` import from the shared module.

**Rationale:** Bridgebuilder finding #1 (MEDIUM) — "If you add a new operator to the grammar, you must update both parsers independently." The protobuf parallel: one parser, one source of truth. Currently round-trip tests are the safety net, but the structural debt compounds with each grammar extension.

**Acceptance Criteria:**
- New file `src/constraints/tokenizer.ts` exporting `Token`, `TokenType`, `tokenize()`
- `Token` interface includes `pos` field (grammar.ts style) — evaluator.ts benefits from position tracking too
- `evaluator.ts` imports `Token`, `tokenize` from `tokenizer.ts` (remove local tokenizer)
- `grammar.ts` imports `Token`, `TokenType`, `tokenize` from `tokenizer.ts` (remove local tokenizer)
- Both `MAX_DEPTH` constants remain local to their respective files (parser behavior differs)
- `src/constraints/index.ts` barrel exports `Token`, `TokenType`, `tokenize`
- All 1,379 existing tests pass unchanged
- No functional change — purely structural refactoring

**Dependencies:** None
**Testing:** Full regression — zero test changes expected

### S10-T2: delta() explicit error for non-integer decimal fields

**Description:** Currently `delta()` silently falls back to `BigInt(0)` when field values are non-integer decimals (e.g., price `"1.50"`). For a billing protocol, silent fallback on financial field computations is dangerous. Instead, when both current and previous values are present but cannot be converted to BigInt, attempt `Number()` conversion and return the numeric delta. Only fall back to `BigInt(0)` when values are truly unresolvable.

**Rationale:** Bridgebuilder critical observation #3 — `delta(price) > 0` where price changes from `"1.50"` to `"2.00"` should return `0.5` via number arithmetic, not `BigInt(0)` via silent catch. The fix in Sprint 9 (try/catch for `BigInt(0.1)`) prevents crashes but masks real deltas.

**Acceptance Criteria:**
- `parseDelta()` in `evaluator.ts`: after BigInt conversion fails, attempt `Number(String(val))` fallback
- If both values are valid numbers (not NaN), return `Number(current) - Number(previous)`
- If either value is NaN or unresolvable, return `BigInt(0)` (existing behavior)
- JSDoc on `parseDelta()` documenting the coercion hierarchy: BigInt → Number → 0n
- ≥4 new tests: decimal delta, mixed BigInt/decimal, NaN fallback, string-number delta
- Existing temporal fuzz tests pass (property P18 still holds)

**Dependencies:** None
**Testing:** Unit tests for delta coercion, fuzz regression

### S10-T3: session_id cross-field constraint for dialogue strategy

**Description:** Add cross-field constraint binding `session_id` to dialogue ensemble requests. When `EnsembleRequest.strategy == 'dialogue'`, the underlying `CompletionRequest` should have `session_id` set for round correlation. Add this as a warning-level constraint (not blocking) since the orchestrator may inject session_id at runtime.

**Rationale:** Bridgebuilder critical observation #1 — "For ensemble strategies (especially dialogue), session continuity is essential — models in a dialogue need to know they're in the same conversation."

**Acceptance Criteria:**
- New constraint in `constraints/EnsembleRequest.constraints.json`: `strategy != 'dialogue' || request.session_id != null` with severity `warning`
- Grammar validator passes for the new expression
- Round-trip test verifying the constraint evaluates correctly
- Cross-field validator in `src/validators/index.ts` adds warning when dialogue + no session_id
- No changes to `CompletionRequest` schema itself (session_id already exists and is optional)

**Dependencies:** None
**Testing:** Constraint round-trip, cross-field validator warning path

### S10-T4: Add rounds_completed / rounds_requested to EnsembleResult

**Description:** When `termination_reason` is `budget_exhausted` or `timeout`, consumers need to know how much of the dialogue completed. Add `rounds_completed` and `rounds_requested` optional integer fields to EnsembleResult. Add cross-field constraint: `rounds != null => rounds_completed == rounds.length`.

**Rationale:** Bridgebuilder critical observation #2 — "Should there also be a rounds_completed vs rounds_requested pair so the consumer can assess completion percentage?"

**Acceptance Criteria:**
- `rounds_completed: Type.Optional(Type.Integer({ minimum: 0 }))` added to EnsembleResult
- `rounds_requested: Type.Optional(Type.Integer({ minimum: 1 }))` added to EnsembleResult
- Cross-field validator: `rounds != null => rounds_completed == rounds.length`
- Cross-field validator: `rounds_requested != null && rounds_completed != null => rounds_completed <= rounds_requested`
- New constraint in `constraints/EnsembleResult.constraints.json`
- ≥3 tests: complete dialogue, incomplete (budget_exhausted), no rounds (non-dialogue)
- Update dialogue cross-ecosystem vectors with new fields

**Dependencies:** None
**Testing:** Schema validation, cross-field, constraint round-trip, vector updates

### S10-T5: Add sunset_version to ConstraintProposal

**Description:** Add `sunset_version` optional field to `ConstraintProposalSchema` for constraint lifecycle management. When the grammar evolves, accepted constraints authored against older grammar versions need a deprecation path.

**Rationale:** Bridgebuilder critical observation #4 — "If an agent proposes a v2.0 constraint that uses changed(), and a future v3.0 grammar removes changed(), the accepted constraint becomes invalid."

**Acceptance Criteria:**
- `sunset_version: Type.Optional(Type.String({ pattern: '^\\d+\\.\\d+$' }))` added after `expression_version`
- JSDoc: "Maximum expression grammar version this constraint is valid for. When the grammar evolves beyond this version, the constraint should be re-evaluated or retired."
- Cross-field validator: if `sunset_version` present, `sunset_version >= expression_version`
- Constraint file updated in `constraints/ConstraintProposal.constraints.json`
- ≥2 tests: valid sunset_version, sunset < expression_version violation
- Update constraint-proposal cross-ecosystem vector with sunset_version example

**Dependencies:** None
**Testing:** Schema validation, cross-field, constraint round-trip

### S10-T6: Expression version negotiation in protocol-discovery

**Description:** Add `expression_versions_supported` array field to `ProtocolDiscoverySchema` so consumers can negotiate expression version compatibility at connection time. Add `EXPRESSION_VERSIONS_SUPPORTED` constant to `src/constraints/types.ts`. Update `buildDiscoveryDocument()` to include expression versions.

**Rationale:** Bridgebuilder structural concern #4 — "In a distributed system where constraint proposals travel between services, the receiver needs to know before processing whether it can handle the expression."

**Acceptance Criteria:**
- `EXPRESSION_VERSIONS_SUPPORTED = ['1.0', '2.0']` constant in `src/constraints/types.ts`
- Exported from `src/constraints/index.ts` barrel
- `expression_versions_supported: Type.Optional(Type.Array(Type.String({ pattern: '^\\d+\\.\\d+$' })))` added to `ProtocolDiscoverySchema`
- `buildDiscoveryDocument()` signature extended with optional `expressionVersions?: string[]` param
- Discovery unit tests updated
- ≥2 new tests: discovery with expression versions, version negotiation check

**Dependencies:** None
**Testing:** Schema validation, builder function tests

### S10-T7: Regenerate JSON schemas + full verification

**Description:** Regenerate all JSON schemas after Sprint 10 changes. Run full test suite. Verify schema count stable at 48.

**Acceptance Criteria:**
- All 48 schemas regenerated with updated fields
- `npm run build` succeeds
- All tests pass (1,379+ existing + Sprint 10 new tests)
- `schemas/README.md` regenerated
- No regressions

**Dependencies:** S10-T1 through S10-T6
**Testing:** Full regression + schema validation

---

## Sprint 11: Executable Vectors + Consensus Audit Trail (Bridgebuilder Deep Review)

**Goal:** Transform cross-ecosystem vectors from descriptive fixtures into executable conformance tests. Add consensus audit trail to the dialogue protocol for auditability. Final polish pass.

**Source:** [Bridgebuilder Deep Review](https://github.com/0xHoneyJar/loa-hounfour/pull/6#issuecomment-3903352725) findings #2 and #3

### S11-T1: Add expected_evaluation results to cross-ecosystem vectors

**Description:** Extend all 9 cross-ecosystem vector files with an `expected_evaluation` field per vector entry. This field records what the constraint evaluator should produce for each applicable constraint: pass/fail status and any expected error messages. This transforms vectors from "does the schema accept this?" to "does the system behave correctly with this input?"

**Rationale:** Bridgebuilder structural concern #2 — "The cross-ecosystem vectors are descriptive, not executable. The Kubernetes conformance test suite doesn't just validate schemas — it runs scenarios against a real cluster."

**Acceptance Criteria:**
- Each vector entry gains `expected_evaluation` object: `{ constraint_file: string, results: Array<{ constraint_id: string, expected: 'pass' | 'fail', expected_message?: string }> }`
- All 9 vector files updated (completion-valid, completion-invalid, billing-ensemble, billing-attribution, event-economy-flow, event-saga, billing-provenance, ensemble-dialogue, constraint-proposal)
- Only vectors that have corresponding constraint files get `expected_evaluation`
- Vector JSON remains valid and backward-compatible (new field is additive)

**Dependencies:** None
**Testing:** JSON parsing validation

### S11-T2: Conformance test harness

**Description:** Create `tests/vectors/conformance.test.ts` that runs each cross-ecosystem vector through the full validation pipeline: (1) schema validation, (2) cross-field validator, (3) constraint evaluator — and asserts against `expected_evaluation` results.

**Rationale:** Bridgebuilder structural concern #2 — making vectors executable. This is the conformance test layer that validates end-to-end system behavior, not just schema acceptance.

**Acceptance Criteria:**
- `tests/vectors/conformance.test.ts` reads all vectors from `vectors/cross-ecosystem/`
- For each vector with `expected_evaluation`:
  - Loads the corresponding constraint file
  - Runs `evaluateConstraint()` for each constraint with the vector data
  - Asserts pass/fail matches `expected_evaluation`
- For vectors without `expected_evaluation`: validates schema only (existing behavior)
- ≥20 conformance assertions across all vector files
- Test imports constraint evaluator + grammar validator + cross-field registry
- Existing `tests/vectors/cross-ecosystem.test.ts` remains unchanged

**Dependencies:** S11-T1
**Testing:** The conformance harness IS the test

### S11-T3: Consensus audit trail on EnsembleResult

**Description:** Add optional `consensus_method` and `position_changes` fields to `EnsembleResult` for dialogue audit trail. `consensus_method` records HOW consensus was determined. `position_changes` records which models changed position during the dialogue.

**Rationale:** Bridgebuilder structural concern #3 — "When termination is consensus_reached, there's no schema for how consensus was determined." The BFT parallel: Lamport's paper describes the protocol for reaching consensus, not just the outcome.

**Acceptance Criteria:**
- `consensus_method: Type.Optional(Type.Union([Type.Literal('majority_vote'), Type.Literal('unanimous'), Type.Literal('arbiter_decision'), Type.Literal('score_threshold')]))` added to EnsembleResult
- `position_changes: Type.Optional(Type.Array(Type.Object({ round: Type.Integer({ minimum: 1 }), model: Type.String({ minLength: 1 }), from_position: Type.String({ minLength: 1 }), to_position: Type.String({ minLength: 1 }), reason: Type.Optional(Type.String()) })))` added to EnsembleResult
- Cross-field validator: `termination_reason == 'consensus_reached' => consensus_method != null` (warning-level)
- Constraint file updated in `constraints/EnsembleResult.constraints.json`
- ≥3 tests: consensus with audit trail, majority vote, no audit trail (non-dialogue)
- Update ensemble-dialogue cross-ecosystem vectors with consensus fields

**Dependencies:** None
**Testing:** Schema validation, cross-field, constraint round-trip, vector updates

### S11-T4: Update GRAMMAR.md with expression version negotiation docs

**Description:** Update `constraints/GRAMMAR.md` to document expression version negotiation pattern. Add a "Version Negotiation" section explaining how `EXPRESSION_VERSIONS_SUPPORTED` in protocol-discovery enables consumers to check compatibility before evaluating expressions.

**Acceptance Criteria:**
- New section in GRAMMAR.md: "## Version Negotiation"
- Documents the `EXPRESSION_VERSIONS_SUPPORTED` constant
- Documents the backward compatibility model (v1.x works in v2.0+)
- Documents the `expressionVersionSupported()` utility
- Documents the `sunset_version` field on ConstraintProposal
- Clear examples of version check patterns for consumers

**Dependencies:** S10-T5, S10-T6
**Testing:** Documentation review

### S11-T5: Regenerate JSON schemas + final verification

**Description:** Regenerate all JSON schemas after Sprint 11 changes. Run full test suite. Verify all conformance tests pass.

**Acceptance Criteria:**
- All 48 schemas regenerated with updated fields
- `npm run build` succeeds
- All tests pass (1,379+ existing + Sprint 10 + Sprint 11 new tests)
- Conformance test harness passes all assertions
- `schemas/README.md` regenerated
- No regressions

**Dependencies:** S11-T1 through S11-T4
**Testing:** Full regression + conformance suite

---

## Risk Assessment

| Risk | Sprint | Mitigation |
|------|--------|-----------|
| Barrel decomposition breaks imports | Sprint 3 | Test every existing import path. Root barrel re-exports everything. |
| CompletionRequest shape mismatch with loa-finn | Sprint 1 | All fields Optional where uncertain. Cross-reference RFC #31. |
| Grammar fuzz tests reveal evaluator bugs | Sprint 3 | Fix evaluator bugs first, grammar fuzz tests validate fix. |
| Vector format creates tight coupling | Sprint 4 | Vectors are read-only fixtures. Consumers pin to version. |
| Sub-package exports break bundlers | Sprint 3 | Test with NodeNext resolution. Standard exports map pattern. |
| Shared tokenizer extraction changes hash | Sprint 10 | Zero functional change — purely structural. Full regression suite validates. |
| delta() Number fallback introduces precision bugs | Sprint 10 | Only triggers when BigInt fails. Existing billing fields use integer strings. |
| Conformance test harness false positives | Sprint 11 | expected_evaluation is explicitly authored per vector, not auto-generated. |
| Consensus audit fields over-specify runtime behavior | Sprint 11 | All new fields are Type.Optional — consumers adopt incrementally. |

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Existing test regression | 0 | All 1,379 tests pass |
| New tests (Sprint 10) | ≥20 | `vitest run` count |
| New tests (Sprint 11) | ≥25 | `vitest run` count |
| TypeScript errors | 0 | `npm run typecheck` |
| JSON Schema coverage | 100% of schemas | `npm run schema:generate` |
| Constraint coverage | All new cross-field rules | Round-trip tests |
| Conformance coverage | ≥20 executable vector assertions | Conformance test harness |
| Shared tokenizer | 1 tokenizer module | `evaluator.ts` and `grammar.ts` both import from `tokenizer.ts` |
| Build success | Clean | `npm run build` |
| Check suite | Pass | `npm run check:all` |

---

## Sprint 13: Decision Trail Completeness + Merge Preparation

**Goal:** Add `$comment` annotations to high-traffic schemas for MicroUSD rationale, add ADR-style note for temporal operator design decision, add `additionalProperties: false` rationale reference, regenerate JSON schemas, and prepare for merge.

**Origin:** Bridgebuilder Deep Review — [DOCUMENTATION] Decision Trail Completeness (Medium severity observation).

### S13-T1: Add MicroUSD `$comment` annotations to financial schemas

**Description:** Add `$comment` linking to `vocabulary/currency.ts` rationale on all schemas that use `MicroUSD` or `MicroUSDUnsigned` types but lack the annotation. The comment explains why financial amounts are string-encoded BigInt values.

**Files to modify (high-traffic schemas — targeted, not all 13):**
- `src/schemas/model/completion-result.ts` — `cost_micro` field
- `src/schemas/model/completion-request.ts` — `budget_limit_micro` field
- `src/schemas/model/ensemble/ensemble-result.ts` — `total_cost_micro` field
- `src/schemas/model/routing/budget-scope.ts` — `limit_micro`, `spent_micro` fields
- `src/schemas/model/model-capabilities.ts` — pricing fields
- `src/schemas/billing-entry.ts` — `raw_cost_micro`, `total_cost_micro` fields (BillingEntrySchema)
- `src/schemas/escrow-entry.ts` — `amount_micro` field
- `src/schemas/stake-position.ts` — `amount_micro`, `vested_micro`, `remaining_micro` fields

**Comment template:** `$comment: 'Financial amounts use string-encoded BigInt (MicroUSD) to prevent floating-point precision loss. 1 USD = 1,000,000 micro-USD. See vocabulary/currency.ts for arithmetic utilities.'`

**Acceptance Criteria:**
- All 8 high-traffic financial schemas carry `$comment` annotation
- Comment propagates to generated JSON Schema output
- No behavioral changes — annotation only
- All existing tests pass

**Dependencies:** None
**Testing:** Existing test suite (no new tests needed — annotations don't change behavior)

### S13-T2: Add `additionalProperties: false` rationale reference

**Description:** Add a brief `$comment` to SCHEMA-EVOLUTION.md's existing documentation and add a one-line reference comment to one representative schema that other schemas can point to. Since SCHEMA-EVOLUTION.md already comprehensively documents the decision, we add a canonical reference in the base schema pattern.

**Approach:** Add a brief `$comment` to two representative schemas (one financial, one model) that references SCHEMA-EVOLUTION.md. This creates the breadcrumb trail without bloating every schema:
- `src/schemas/billing-entry.ts` (BillingEntrySchema) — financial representative
- `src/schemas/model/completion-request.ts` — model representative

**Comment:** Append to existing `$comment` or add: `'Strict schema (additionalProperties: false) prevents silent field injection. See SCHEMA-EVOLUTION.md for version-skew patterns.'`

**Acceptance Criteria:**
- Two representative schemas carry the `additionalProperties` rationale
- SCHEMA-EVOLUTION.md referenced by name in schema metadata
- No behavioral changes
- All existing tests pass

**Dependencies:** None (parallel with S13-T1)
**Testing:** Existing test suite

### S13-T3: Add temporal operator ADR to GRAMMAR.md

**Description:** Add a "Design Decisions" section to `constraints/GRAMMAR.md` with an ADR-style note explaining why temporal operators use `_previous` context key instead of making the evaluator stateful.

**Content outline:**
```markdown
## Design Decisions

### ADR-001: Temporal Operators via `_previous` Context (v2.0)

**Status:** Accepted
**Context:** Temporal operators (`changed()`, `previous()`, `delta()`) need access to prior state to detect field transitions in saga workflows.
**Decision:** Thread previous state through a `_previous` key in the data context rather than making the evaluator stateful.
**Rationale:**
- Evaluator remains a pure function: `f(expression, data) → boolean`
- Saga orchestrators populate `_previous` — evaluator doesn't need workflow awareness
- Same pattern works across languages (Go, Rust, Python implementations)
- Testable without workflow infrastructure — just provide `_previous` in test data
**Alternatives considered:**
- Stateful evaluator with internal history buffer — rejected (destroys composability, complicates cross-language implementation)
- Separate temporal evaluator — rejected (duplicates expression parsing, grammar divergence risk)
**Consequences:** Consumers must populate `_previous` when using v2.0 temporal operators. Constraints using temporal operators without `_previous` data evaluate to their fallback values (see Temporal Operators section).
```

**Acceptance Criteria:**
- GRAMMAR.md contains "Design Decisions" section with ADR-001
- ADR follows standard format (Status, Context, Decision, Rationale, Alternatives, Consequences)
- References specific code files (evaluator.ts, tokenizer.ts)
- No behavioral changes
- All existing tests pass

**Dependencies:** None (parallel with S13-T1, S13-T2)
**Testing:** Existing test suite

### S13-T4: Regenerate JSON schemas and verify

**Description:** Run schema generation to propagate new `$comment` annotations into the JSON Schema output files in `schemas/`. Verify that the generated schemas contain the new comments.

**Acceptance Criteria:**
- `npm run schema:generate` (or `npx tsx scripts/generate-schemas.ts`) runs cleanly
- Generated JSON schema files contain new `$comment` fields
- Schema count unchanged (48 schemas)
- All tests pass including schema stability tests

**Dependencies:** S13-T1, S13-T2 (must complete before regeneration)
**Testing:** `npm test` — full suite including schema stability tests

### S13-T5: Final merge preparation

**Description:** Run full test suite, verify clean build, update sprint overview status, confirm PR is ready for review.

**Acceptance Criteria:**
- All 1,491+ tests pass
- TypeScript compilation clean
- JSON schemas regenerated and up-to-date
- Sprint overview updated (all sprints marked ✅)
- Commit message: `docs(sprint-13): decision trail annotations + merge preparation`
- PR #6 updated with final status

**Dependencies:** S13-T1, S13-T2, S13-T3, S13-T4
**Testing:** Full test suite, build verification

---

### Sprint 13 Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| $comment breaks schema stability tests | Low | Low | Schema stability tests check structural shape, not metadata. If they do check $comment, update expected output. |
| $comment propagation to JSON Schema | None | None | TypeBox propagates all schema metadata to JSON Schema output by design. |
| GRAMMAR.md formatting issues | None | None | ADR section appended, no existing content modified. |

---

### Sprint 13 Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Existing test regression | 0 | All 1,491 tests pass |
| New $comment annotations | 8+ schemas | Grep for `$comment.*MicroUSD` |
| ADR documentation | 1 ADR in GRAMMAR.md | File inspection |
| JSON Schema propagation | $comment visible in *.schema.json | Grep generated schemas |
| Build success | Clean | `npm run build` |
