# Sprint Plan: cycle-011 — The Protocol Constitution v5.1.0

**Cycle:** cycle-011
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**SDD:** [grimoires/loa/sdd.md](grimoires/loa/sdd.md)
**Source Issue:** [loa/issues/349](https://github.com/0xHoneyJar/loa/issues/349)
**Created:** 2026-02-16

---

## Cross-Sprint Dependencies (IMP-002)

| Producer Task | Consumer Task | Artifact |
|---------------|---------------|----------|
| S1-T1 | S1-T2 | `ConformanceLevelSchema` imported into ModelProviderSpec |
| S1-T2 | S2-T2 | `ModelPricingSchema` sub-type reused in ConformanceVector |
| S1-T2 | S3-T3 | `ModelPricingSchema` imported into BillingEntry provenance |
| S1-T2 | S3-T5 | `ModelPricingSchema` imported into CompletionResult |
| S1-T4 | S1-T5 | `ProviderType` values needed for display name map |
| S2-T2 | S2-T4..S2-T7 | `ConformanceVectorSchema` validates all authored vectors |
| S2-T3 | S2-T8 | `matchConformanceOutput()` called by test harness |
| S3-T1 | S3-T2 | `computeCostMicro()` called by conservation verifier |
| S3-T1 | S3-T8 | `computeCostMicro()` called by integration test |
| S3-T6 | S3-T3 | `ReconciliationModeSchema` imported into BillingEntry |

**Constraint evaluator API** (IMP-010): Tasks referencing "existing evaluator infrastructure" (S1-T6, S2-T8, S3-T7, S4-T3) use the `evaluateConstraints(schema, data, constraintFile)` function from `src/validators/constraint-evaluator.ts`. This function loads a `.constraints.json` file and evaluates its expression rules against a data object, returning `{ passed: boolean, violations: ConstraintViolation[] }`.

**Spec-first vector authoring** (Beads IMP-010): Sprint 2 vectors (S2-T4 through S2-T7) are intentionally authored *before* the matching engine (S2-T3) is fully validated against them. This is a spec-first approach: vectors define the contract, the engine implements it. S2-T8 (test harness) is the integration point that validates both. If vectors need updating after engine implementation reveals edge cases, S2-T8 acceptance criteria includes vector-engine consistency as a DoD gate.

---

## Sprint 1: Provider Identity (FR-1 + FR-6)

**Goal:** Establish the provider registration schema and extend the provider vocabulary.
**Global Sprint ID:** 43

### Tasks

#### S1-T1: Create ConformanceLevel Vocabulary
**File:** `src/schemas/model/conformance-level.ts`
**Acceptance Criteria:**
- `ConformanceLevelSchema` as `Type.Union` of 3 literals: `self_declared`, `community_verified`, `protocol_certified`
- Exported type `ConformanceLevel`
- 5+ tests: valid values, invalid values, type narrowing

#### S1-T2: Create ModelProviderSpec Schema
**File:** `src/schemas/model/model-provider-spec.ts`
**Acceptance Criteria:**
- Full schema as defined in SDD §3.1 with all sub-types (ModelEntry, ProviderEndpoints, ProviderSLA, ConformanceVectorResult)
- `ModelPricingSchema` extracted as reusable sub-type (imported by BillingEntry in sprint 3)
- `additionalProperties: false` on all objects
- `x-cross-field-validated: true` marker
- 30+ tests: valid specs (Anthropic, OpenAI, Google configs), invalid specs (missing models, expired, invalid endpoints), edge cases (empty metadata, max metadata size)

#### S1-T3: Register ModelProviderSpec Cross-Field Validator
**File:** `src/validators/index.ts`
**Acceptance Criteria:**
- Cross-field validator registered per SDD §3.1
- Rules: certified-requires-vectors, active-model-required, metadata-namespace, metadata-size, expires-after-published, HTTPS endpoints
- All rules tested in isolation and combination
- 10+ tests covering each validation rule

#### S1-T4: Extend ProviderType with 3 New Values
**File:** `src/schemas/model/routing/provider-type.ts`
**Acceptance Criteria:**
- `ProviderTypeSchema` extended with `anthropic`, `google`, `custom` (additive only)
- Existing 3 values (`claude-code`, `openai`, `openai-compatible`) unchanged
- `isKnownProviderType(value: string): boolean` utility function
- 10+ tests: all 6 values valid, unknown values rejected, `isKnownProviderType` helper
- MIGRATION.md guidance for exhaustive switches

#### S1-T5: Create PROVIDER_DISPLAY_NAMES Vocabulary
**File:** `src/vocabulary/provider-display-names.ts`
**Acceptance Criteria:**
- `PROVIDER_DISPLAY_NAMES: Record<ProviderType, string>` mapping
- Maps `claude-code` → `"Anthropic (Claude Code)"`, `anthropic` → `"Anthropic"`, etc.
- 5+ tests

#### S1-T6: Create ModelProviderSpec Constraint File
**File:** `constraints/ModelProviderSpec.constraints.json`
**Acceptance Criteria:**
- Expression version: `"2.0"`
- Rules: certified-requires-vectors, active-model-required, metadata-namespace
- Constraint evaluation tests via `evaluateConstraints()` from `src/validators/constraint-evaluator.ts` (IMP-010)
- 15+ tests

#### S1-T7: Generate JSON Schema + Register in Index
**Files:** `schemas/model-provider-spec.schema.json`, `schemas/conformance-level.schema.json`, `schemas/index.json`
**Acceptance Criteria:**
- JSON Schema generated from TypeBox schemas
- Registered in `schemas/index.json` with proper `$id` URIs (v5.1.0 path)
- Schema validation tests (JSON Schema validates same data as TypeBox)

#### S1-T8: Update Model Sub-Package Barrel
**File:** `src/model/index.ts`
**Acceptance Criteria:**
- Re-export all new schemas and vocabularies
- Root barrel (`src/index.ts`) automatically re-exports via model sub-package
- Import verification tests

---

## Sprint 2: Trust Verification (FR-2)

**Goal:** Create the conformance vector suite and matching engine.
**Global Sprint ID:** 44

### Tasks

#### S2-T1: Create ConformanceCategory Vocabulary
**File:** `src/vocabulary/conformance-category.ts`
**Acceptance Criteria:**
- `ConformanceCategorySchema` as `Type.Union` of 5 literals
- 5+ tests

#### S2-T2: Create ConformanceVector Meta-Schema
**File:** `src/schemas/model/conformance-vector.ts`
**Acceptance Criteria:**
- Full schema as defined in SDD §3.3 with `MatchingRulesSchema`
- `vector_id` pattern: `^conformance-[a-z]+-\d{3}$`
- 15+ tests

#### S2-T3: Create Conformance Matching Engine
**File:** `src/utilities/conformance-matcher.ts`
**Acceptance Criteria:**
- `matchConformanceOutput()` function implementing SDD §5.3
- Matching rules: field selection, deep equality, volatile fields, numeric tolerance, canonicalization, null-vs-absent
- Error contracts (IMP-004): returns `{ matched: false, reason: string }` for unsupported JSON types (NaN, Infinity, undefined), mismatched array lengths, circular references; never throws
- 20+ tests including edge cases, plus 5+ negative tests for matcher error paths

#### S2-T4: Author Provider Normalization Vectors (8+)
**Directory:** `vectors/conformance/provider-normalization/`
**Acceptance Criteria:**
- 8+ vectors: anthropic-basic, anthropic-thinking, openai-basic, openai-tool-calls, google-basic, google-thinking, invalid-missing-usage, invalid-wrong-finish
- Each validates against ConformanceVectorSchema
- Each contains `matching_rules` where applicable

#### S2-T5: Author Pricing Calculation Vectors (6+)
**Directory:** `vectors/conformance/pricing-calculation/`
**Acceptance Criteria:**
- 6+ vectors: standard-gpt4, standard-claude, zero-tokens, sub-micro-fraction, max-tokens, asymmetric-pricing
- All financial values as string-encoded BigInt
- Edge cases: 1 token at 30M rate, MAX_SAFE_INTEGER tokens

#### S2-T6: Author Thinking Trace + Tool Call Vectors (10+)
**Directories:** `vectors/conformance/thinking-trace/`, `vectors/conformance/tool-call-roundtrip/`
**Acceptance Criteria:**
- 4+ thinking trace vectors: anthropic-trace, google-trace, no-thinking, truncated-trace
- 6+ tool call vectors: single-tool, parallel-tools, nested-arguments, tool-error, invalid-tool-name, empty-arguments
- Synthetic content only (no real API keys or PII per NFR-6)

#### S2-T7: Author Ensemble Position Vectors (6+)
**Directory:** `vectors/conformance/ensemble-position/`
**Acceptance Criteria:**
- 6+ vectors: consensus-2-models, consensus-3-models, dialogue-2-rounds, position-change, budget-exhausted, timeout
- Position change audit trails verified
- Cost conservation across candidates

#### S2-T8: Create Vector Validation Test Harness
**File:** `tests/vectors/conformance-validation.test.ts`
**Acceptance Criteria:**
- Dynamically loads all vectors from `vectors/conformance/`
- Validates each against ConformanceVectorSchema
- Runs matching engine for expected_valid vectors
- Evaluates cross_field_validations via `evaluateConstraints()` (IMP-010)
- 35+ tests (one per vector + meta-validation)

---

## Sprint 3: Economic Completeness (FR-3 + billing provenance)

**Goal:** Formalize the pricing chain with pure-function computation and conservation invariant.
**Global Sprint ID:** 45

### Tasks

#### S3-T1: Create computeCostMicro() Pure Function
**File:** `src/utilities/pricing.ts`
**Acceptance Criteria:**
- `computeCostMicro()` function as defined in SDD §4.1
- BigInt-only arithmetic, ceil rounding, zero handling
- `computeCostMicroSafe()` validated wrapper (IMP-001)
- Error contracts (IMP-004): `computeCostMicro()` throws `TypeError` for negative values, non-string inputs, non-numeric strings; `computeCostMicroSafe()` returns `{ ok: false, error }` instead
- 30+ tests including property-based tests (monotonicity, zero identity, ceil guarantee), plus 5+ negative tests for each error path

#### S3-T2: Create verifyPricingConservation() Utility
**File:** `src/utilities/pricing.ts`
**Acceptance Criteria:**
- `verifyPricingConservation()` returns `{ conserved, delta, computed }`
- Works with both reconciliation modes
- 10+ tests

#### S3-T3: Add Provenance Fields to BillingEntry
**File:** `src/schemas/billing-entry.ts`
**Acceptance Criteria:**
- 4 new `Type.Optional` fields: `source_completion_id`, `pricing_snapshot`, `reconciliation_mode`, `reconciliation_delta_micro`
- `ModelPricingSchema` imported from sprint 1's shared sub-type
- Existing tests still pass (zero regression)
- Backward compatibility (IMP-007): golden fixture test — v5.0.0 BillingEntry payloads (without new fields) must validate successfully against v5.1.0 schema
- 15+ new tests for field validation

#### S3-T4: Update BillingEntry Cross-Field Validator
**File:** `src/validators/index.ts`
**Acceptance Criteria:**
- New rules: provenance (cost > 0 → source_completion_id warning), pricing snapshot with completion ref, reconciliation delta mode check
- All rules at `warning` severity
- 10+ tests

#### S3-T5: Add pricing_applied to CompletionResult
**File:** `src/schemas/model/completion-result.ts`
**Acceptance Criteria:**
- `pricing_applied: Type.Optional(ModelPricingSchema)`
- Existing tests still pass
- 5+ new tests

#### S3-T6: Create ReconciliationMode Vocabulary
**File:** `src/vocabulary/reconciliation-mode.ts`
**Acceptance Criteria:**
- `ReconciliationModeSchema` as `Type.Union` of 2 literals
- 5+ tests

#### S3-T7: Create PricingConvergence Constraint File
**File:** `constraints/PricingConvergence.constraints.json`
**Acceptance Criteria:**
- Expression version: `"2.0"`
- Rules: billing-pricing-provenance, billing-reconciliation-delta
- Constraint evaluation tests via `evaluateConstraints()` (IMP-010)
- 15+ tests

#### S3-T8: End-to-End Pricing Chain Integration Test
**File:** `tests/integration/pricing-chain.test.ts`
**Acceptance Criteria:**
- ModelProviderSpec → CompletionResult → BillingEntry full chain
- `computeCostMicro()` → `verifyPricingConservation()` → constraint evaluation
- Both reconciliation modes tested
- Property-based: random pricing + usage → compute → billing → verify = conserved
- 20+ tests

#### S3-T9: Update Economy Sub-Package Barrel
**File:** `src/economy/index.ts`
**Acceptance Criteria:**
- Re-export `computeCostMicro`, `computeCostMicroSafe`, `verifyPricingConservation`, `ReconciliationModeSchema`

---

## Sprint 4: Governance & Discovery + v5.1.0 Release (FR-4 + FR-5)

**Goal:** Complete the governance extensions, extend discovery, and ship v5.1.0.
**Global Sprint ID:** 46

### Tasks

#### S4-T1: Create SanctionSeverity Vocabulary
**File:** `src/vocabulary/sanction-severity.ts`
**Acceptance Criteria:**
- `SanctionSeveritySchema` as `Type.Union` of 4 literals
- `SANCTION_SEVERITY_LADDER` with level, default_duration, effect
- Precedence rule documented (severity_level wins over legacy severity)
- 5+ tests

#### S4-T2: Add Graduated Fields to Sanction Schema
**File:** `src/schemas/sanction.ts`
**Acceptance Criteria:**
- 4 new `Type.Optional` fields: `severity_level`, `duration_seconds`, `appeal_dispute_id`, `escalated_from`
- Existing tests still pass
- Backward compatibility (IMP-007): golden fixture test — v5.0.0 Sanction payloads (without new fields) must validate successfully against v5.1.0 schema
- 15+ new tests

#### S4-T3: Update Sanction Cross-Field Validator + Constraints
**Files:** `src/validators/index.ts`, `constraints/Sanction.constraints.json`
**Acceptance Criteria:**
- Rules: revocation-requires-reason, timed-sanctions-require-duration, severity-field-precedence
- Constraint file updated with new rules
- 10+ tests

#### S4-T4: Extend ProtocolDiscovery with Provider Summary
**File:** `src/schemas/discovery.ts`
**Acceptance Criteria:**
- `ProviderSummarySchema` sub-type
- 2 new `Type.Optional` fields: `providers`, `conformance_suite_version`
- `buildDiscoveryDocument()` updated with new parameters
- 15+ tests

#### S4-T5: Update Governance + Core Sub-Package Barrels
**Files:** `src/governance/index.ts`, `src/core/index.ts`
**Acceptance Criteria:**
- Governance re-exports `SanctionSeveritySchema`, `SANCTION_SEVERITY_LADDER`
- Core re-exports updated discovery types

#### S4-T6: Bump CONTRACT_VERSION to 5.1.0
**Files:** `src/version.ts`, `schemas/index.json`, `package.json`
**Acceptance Criteria:**
- `CONTRACT_VERSION = '5.1.0'`
- `schemas/index.json` version = `5.1.0`, new schemas registered
- `package.json` version bumped

#### S4-T7: Generate All JSON Schema Files
**Directory:** `schemas/`
**Acceptance Criteria:**
- All new schemas generated as `.schema.json` files
- All modified schemas regenerated
- Schema validation tests pass for all files

#### S4-T8: Create MIGRATION.md (v5.0.0 → v5.1.0)
**File:** `MIGRATION.md`
**Acceptance Criteria:**
- Consumer upgrade guide per SDD §11
- ProviderType exhaustive switch guidance (IMP-006)
- Safe-fetch policy for provider URLs (SKP-006)
- Pricing convergence adoption guide
- Zero-breaking guarantees documented

#### S4-T9: Update vectors/VERSION
**File:** `vectors/VERSION`
**Acceptance Criteria:**
- Version bumped to `5.1.0`
- `vectors/conformance/README.md` created with matching semantics documentation

---

## Summary

| Sprint | Global ID | Tasks | Est. Tests | Focus |
|--------|-----------|-------|------------|-------|
| 1 | 43 | 8 | ~80 | Provider Identity |
| 2 | 44 | 8 | ~95 | Trust Verification |
| 3 | 45 | 9 | ~110 | Economic Completeness |
| 4 | 46 | 9 | ~50 | Governance & Release |
| **Total** | | **34** | **~335** | |

**Estimated new tests:** ~335 (exceeds PRD target of ≥300)
**Estimated total tests after cycle:** ~1,826
