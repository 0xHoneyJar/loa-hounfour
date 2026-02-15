# Sprint Plan: loa-hounfour v5.0.0 — The Multi-Model Release

**Cycle:** cycle-010
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**SDD:** [grimoires/loa/sdd.md](grimoires/loa/sdd.md)
**Date:** 2026-02-15
**Team:** 1 AI agent (Claude Code)
**Sprint duration:** Single-session per sprint

---

## Sprint Overview

| Sprint | Theme | FRs | Est. Tests | Global ID |
|--------|-------|-----|-----------|-----------|
| 1 | ModelPort Foundation | FR-1, FR-3 | ~55 | 35 |
| 2 | Ensemble & Routing | FR-2, FR-7 | ~40 | 36 |
| 3 | Architecture — Barrel + Grammar | FR-4, FR-5 | ~35 | 37 |
| 4 | Vectors, Namespace & Polish | FR-6, FR-8 | ~35 | 38 |
| 5 | Integration — Constraints + Release | Constraint files, v5.0.0 | ~25 | 39 |

**Dependency chain:** Sprint 1 → Sprint 2 → Sprint 3 → Sprint 4 → Sprint 5

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

## Risk Assessment

| Risk | Sprint | Mitigation |
|------|--------|-----------|
| Barrel decomposition breaks imports | Sprint 3 | Test every existing import path. Root barrel re-exports everything. |
| CompletionRequest shape mismatch with loa-finn | Sprint 1 | All fields Optional where uncertain. Cross-reference RFC #31. |
| Grammar fuzz tests reveal evaluator bugs | Sprint 3 | Fix evaluator bugs first, grammar fuzz tests validate fix. |
| Vector format creates tight coupling | Sprint 4 | Vectors are read-only fixtures. Consumers pin to version. |
| Sub-package exports break bundlers | Sprint 3 | Test with NodeNext resolution. Standard exports map pattern. |

---

## Success Metrics

| Metric | Target | How Measured |
|--------|--------|-------------|
| Existing test regression | 0 | All 1,097 tests pass |
| New tests | ≥300 | `vitest run` count |
| TypeScript errors | 0 | `npm run typecheck` |
| JSON Schema coverage | 100% of new schemas | `npm run schema:generate` |
| Constraint coverage | All new cross-field rules | Round-trip tests |
| Build success | Clean | `npm run build` |
| Check suite | Pass | `npm run check:all` |
