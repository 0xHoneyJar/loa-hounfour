# Sprint Plan: Cycle-006 — Hounfour Readiness & Protocol Maturity

> **Cycle**: cycle-006
> **Version Target**: v3.1.0 (Sprints 1-2), v3.2.0 (Sprint 3), v4.0.0-prep (Sprint 4)
> **Source**: All outstanding Bridgebuilder findings (BB-HFR, BB-ADV, BB-V3, BB-C4-ADV, BB-POST, Parts 5-6), product mission [loa-finn#66](https://github.com/0xHoneyJar/loa-finn/issues/66)
> **Sprint count**: 4 sprints, 23 tasks
> **Team**: 1 AI agent (Claude Opus)
> **Branch**: `feature/protocol-types-v2` (continuing from cycle-005)

## Context

Cycle-005 delivered v3.0.0 (The Sovereignty Release) with 370 tests across 20 suites. Two bridge iterations achieved 93.3% severity reduction. The Bridgebuilder's deep review (Parts 5-6) identified 5 forward-looking findings (BB-HFR-001 through 005) plus several inline suggestions. Cross-referencing ALL Bridgebuilder feedback across 16 PR comments yields 21 genuinely open items — findings that were suggested but never implemented in subsequent cycles.

This sprint plan addresses every one of them, aligned with the product mission from [loa-finn#66](https://github.com/0xHoneyJar/loa-finn/issues/66): enabling finnNFT agents with multi-model routing, production billing, and ecosystem adoption.

## Finding Cross-Reference

| Finding ID | Sprint | Task | Status Before |
|------------|--------|------|--------------|
| BB-HFR-001 | 1 | S1-T1 | Suggested |
| BB-HFR-002 | 1 | S1-T2 | Suggested |
| BB-HFR-003 | 1 | S1-T3 | Suggested |
| BB-HFR-004 | 1 | S1-T4 | Suggested |
| BB-HFR-005 | 1 | S1-T5 | Suggested |
| BB-C4-ADV-003 | 2 | S2-T1 | Suggested |
| BB-V3-008 | 2 | S2-T2 | Suggested |
| BB-V3-003 | 2 | S2-T3 | Suggested |
| BB-V3-007 | 2 | S2-T4 | Suggested |
| Part 5 §2 | 2 | S2-T5 | Suggested |
| Part 5 §4 | 2 | S2-T6 | Suggested |
| Part 5 §3 | 3 | S3-T1 | Suggested |
| BB-ADV-003 | 3 | S3-T2 | Suggested |
| BB-ADV-008 | 3 | S3-T3 | Suggested |
| BB-ADV-009 | 3 | S3-T4 | Suggested |
| BB-C4-ADV-007 | 3 | S3-T5 | Suggested |
| BB-C4-ADV-008 | 3 | S3-T6 | Suggested |
| BB-POST-001 | 4 | S4-T1 | Suggested |
| Part 5 §6 | 4 | S4-T2 | Suggested |
| Part 5 §5 | 4 | S4-T3 | Suggested |
| BB-ADV-008 ext | 4 | S4-T4 | Suggested |
| Comprehensive | 4 | S4-T5 | New |

---

## Sprint 1: Hounfour Protocol Types (v3.1.0-rc)

**Goal**: New protocol types enabling the multi-model architecture from [Hounfour RFC #31](https://github.com/0xHoneyJar/loa-finn/issues/31).
**Product alignment**: P0 NativeRuntimeAdapter, multi-model routing, per-model billing ([#66 §6](https://github.com/0xHoneyJar/loa-finn/issues/66)).
**Estimated tasks**: 6

### S1-T1: HealthStatus Protocol Schema (BB-HFR-001)

**Description**: Create `src/schemas/health-status.ts` with a `HealthStatusSchema` for circuit breaker state reporting. The Hounfour router needs a shared health type for provider availability, fallback chain activation, and Arrakis admin dashboards.

**Acceptance Criteria**:
- [ ] `HealthStatusSchema` with fields: `healthy: boolean`, `latency_ms: integer`, `provider: string`, `model_id: string`, `checked_at: date-time`, `error: optional string`, `circuit_state: 'closed' | 'open' | 'half_open'`
- [ ] `additionalProperties: false`, `$id: 'HealthStatus'`
- [ ] Exported from `src/index.ts`
- [ ] 4+ golden vectors (healthy, unhealthy with error, half_open, invalid)

**Finding**: BB-HFR-001 (Medium, Architecture)
**FAANG Parallel**: Kubernetes PodStatus as protocol-level health type.

### S1-T2: ThinkingTrace Schema (BB-HFR-002)

**Description**: Create `src/schemas/thinking-trace.ts` with a canonical schema for normalized thinking/reasoning traces across model providers (Claude `thinking` blocks, Kimi-K2 `reasoning_content`, OpenAI hidden).

**Acceptance Criteria**:
- [ ] `ThinkingTraceSchema` with fields: `content: string`, `model_id: string`, `provider: string`, `tokens: optional integer (min 0)`, `redacted: boolean`, `trace_id: optional string`
- [ ] `additionalProperties: false`, `$id: 'ThinkingTrace'`
- [ ] Exported from `src/index.ts`
- [ ] 4+ golden vectors (Claude trace, Kimi trace, redacted trace, no-trace model)

**Finding**: BB-HFR-002 (Medium, Architecture)
**FAANG Parallel**: OpenTelemetry Span status normalization across tracing backends.

### S1-T3: Extract ToolCall Canonical Schema (BB-HFR-003)

**Description**: Extract the inline tool_call object from `MessageSchema.tool_calls` (conversation.ts:209-216) into a named `ToolCallSchema`. Reference from both `MessageSchema` and `StreamToolCallSchema` where applicable.

**Acceptance Criteria**:
- [ ] `ToolCallSchema` in `src/schemas/tool-call.ts` with `id`, `name`, `arguments` (string), `model_source` (optional)
- [ ] `MessageSchema.tool_calls` references `ToolCallSchema` instead of inline object
- [ ] Exported from `src/index.ts`
- [ ] No breaking changes — same wire format
- [ ] Existing conversation tests still pass

**Finding**: BB-HFR-003 (Low, Architecture)
**FAANG Parallel**: RFC #31 §5.3 — tool calling contract normalization across OpenAI/Anthropic/Qwen formats.

### S1-T4: Per-Model Cost Attribution on BillingEntry (BB-HFR-004)

**Description**: Add optional `model_id`, `provider`, and `pricing_model` fields to `BillingEntrySchema` for per-model cost attribution. This enables budget dashboards ([#66 P1](https://github.com/0xHoneyJar/loa-finn/issues/66)) to break down costs by model and pricing type.

**Acceptance Criteria**:
- [ ] `model_id: Optional(String)` — model that generated this cost
- [ ] `provider: Optional(String)` — provider name (maps to Hounfour config key)
- [ ] `pricing_model: Optional(Union('per_token', 'gpu_hourly', 'flat_rate'))` — cost structure
- [ ] All optional (backward compatible with v3.0.0 entries)
- [ ] Update billing pipeline test to exercise new fields
- [ ] Update SCHEMA-CHANGELOG.md

**Finding**: BB-HFR-004 (Medium, Billing)
**FAANG Parallel**: AWS Cost Explorer instance-level attribution (on-demand vs spot vs reserved).

### S1-T5: Execution Mode in StreamStart (BB-HFR-005)

**Description**: Add optional `execution_mode: 'native' | 'remote'` to `StreamStartSchema`. This distinguishes Claude Code native runtime sessions from remote model API calls, enabling consumers to understand the response's provenance.

**Acceptance Criteria**:
- [ ] `execution_mode: Optional(Union(Literal('native'), Literal('remote')))` in `StreamStartSchema`
- [ ] Optional (backward compatible)
- [ ] Update stream event golden vectors
- [ ] Update SCHEMA-CHANGELOG.md

**Finding**: BB-HFR-005 (Low, Metadata)
**FAANG Parallel**: Hounfour RFC §5.2 — native_runtime vs remote_model execution mode distinction.

### S1-T6: Golden Vectors & Changelog for New Schemas

**Description**: Create golden test vector files for HealthStatus, ThinkingTrace, and ToolCall. Update SCHEMA-CHANGELOG.md with v3.1.0 section documenting all new types.

**Acceptance Criteria**:
- [ ] `vectors/health/health-status.json` — valid + invalid vectors
- [ ] `vectors/thinking/thinking-traces.json` — valid + invalid vectors
- [ ] Update `vectors/conversation/conversations.json` with tool_call schema reference test
- [ ] Update `vectors/billing/billing-entries.json` with model attribution test
- [ ] SCHEMA-CHANGELOG.md v3.1.0 section
- [ ] All new tests passing, total test count > 380

---

## Sprint 2: Validation Pipeline Hardening (v3.1.0)

**Goal**: Production-ready validation for Arrakis adoption and deployment.
**Product alignment**: P0 production deployment, Arrakis adopts loa-hounfour ([#66 §6](https://github.com/0xHoneyJar/loa-finn/issues/66)).
**Estimated tasks**: 6

### S2-T1: Wire Cross-Field Validators into Main Pipeline (BB-C4-ADV-003)

**Description**: The `validate()` function in `src/validators/index.ts` currently performs schema-only validation. Cross-field validators (`validateSealingPolicy`, `validateAccessPolicy`, `validateBillingEntryFull`) exist but must be called separately. Wire them into the main pipeline so that `validate(ConversationSealingPolicySchema, data)` automatically runs cross-field checks.

**Acceptance Criteria**:
- [ ] `validate()` optionally accepts a `crossFieldValidators` registry
- [ ] Pre-registered validators for: `ConversationSealingPolicySchema`, `AccessPolicySchema`, `BillingEntrySchema`
- [ ] Returns cross-field errors alongside schema errors
- [ ] Backward compatible — existing callers without the registry get schema-only behavior
- [ ] Tests verify combined validation catches cross-field violations

**Finding**: BB-C4-ADV-003 (Medium, DX)

### S2-T2: Cross-Field Validation Discoverability (BB-V3-008)

**Description**: JSON Schema consumers (Go, Python) cannot discover that `ConversationSealingPolicy` has cross-field invariants. Add `$comment` annotations to generated JSON Schema pointing to the validator function names. Update MIGRATION.md with cross-language validation guidance.

**Acceptance Criteria**:
- [ ] All schemas with cross-field validators have `$comment` documenting the validator function name and invariants
- [ ] MIGRATION.md section: "Cross-Field Validation for Non-TypeScript Consumers"
- [ ] Go and Python code examples showing equivalent validation logic

**Finding**: BB-V3-008 (Medium, Interop)

### S2-T3: Constrain Validator Cache (BB-V3-003)

**Description**: The validator cache in `src/validators/index.ts` accepts arbitrary TypeBox schemas via the `validate()` public API. Constrain it to only cache protocol-defined schemas (those with `$id`), preventing unbounded cache growth from consumer-supplied schemas.

**Acceptance Criteria**:
- [ ] Validator cache only stores schemas with `$id` field
- [ ] Schemas without `$id` are compiled per-call (no caching)
- [ ] Log warning when non-$id schema is validated (dev mode)
- [ ] Test verifying cache size doesn't grow with arbitrary schemas

**Finding**: BB-V3-003 (Low, Architecture)

### S2-T4: Fix req-hash Comment Drift (BB-V3-007)

**Description**: In `src/integrity/req-hash.ts`, the `parseEncodings` function's comments describe the wrong decompression order. The code is correct (innermost-first), but comments say outermost-first. Fix the comments.

**Acceptance Criteria**:
- [ ] Comments in `parseEncodings` accurately describe innermost-first decompression
- [ ] Add a code example in the TSDoc showing `Content-Encoding: gzip, br` → decompress br first, then gzip

**Finding**: BB-V3-007 (Medium, Correctness)

### S2-T5: GuardResult Severity Field (Parts 5-6 §2)

**Description**: Add an optional `severity` field to the invalid branch of `GuardResult` to distinguish recoverable failures (caller can fix) from policy violations (requires admin intervention). Inspired by Kubernetes admission controller response codes.

**Acceptance Criteria**:
- [ ] `GuardResult` invalid branch gains `severity?: 'client_error' | 'policy_violation'`
- [ ] `requiresTransferId` → `client_error` (caller forgot to provide context)
- [ ] `requiresNoActiveTransfer` → `policy_violation` (structural impossibility)
- [ ] `isValidGuardResult` still works unchanged (backward compatible)
- [ ] Update guard function tests

**Finding**: Bridgebuilder Part 5 §2 forward-looking suggestion

### S2-T6: validateAccessPolicyStrict Mode (Parts 5-6 §4)

**Description**: Add a `strict` option to `validateAccessPolicy()` that promotes warnings to errors. In production deployment, Arrakis may want "no extraneous fields" as a hard constraint.

**Acceptance Criteria**:
- [ ] `validateAccessPolicy(policy, { strict: true })` — warnings become errors
- [ ] Default behavior unchanged (`strict: false`)
- [ ] Tests for strict mode: extraneous `duration_hours` on `type: 'none'` → error
- [ ] TSDoc documents when to use strict mode

**Finding**: Bridgebuilder Part 5 §4 forward-looking suggestion

---

## Sprint 3: Ecosystem & Financial Maturity (v3.2.0)

**Goal**: Ecosystem readiness for multi-repo adoption, developer tooling, and financial type completeness.
**Product alignment**: P0 Arrakis adopts loa-hounfour, budget dashboard preparation ([#66 §6-7](https://github.com/0xHoneyJar/loa-finn/issues/66)).
**Estimated tasks**: 6

### S3-T1: CreditMicro Signed Amount Type (Parts 5-6 §3)

**Description**: Add a `MicroUSDSigned` type and `CreditMicro` arithmetic helpers for negative amounts (refunds, credits). Currently `subtractMicro` throws on negative results, but financial systems need negative amounts for credit notes and refund flows.

**Acceptance Criteria**:
- [ ] `MicroUSDSigned` schema: `Type.String({ pattern: '^-?[0-9]+$' })` — allows negative
- [ ] `subtractMicroSigned(a, b)` → allows negative results
- [ ] `negateMicro(a)` → flips sign
- [ ] `isNegativeMicro(a)` → boolean helper
- [ ] Original `MicroUSD` and `subtractMicro` unchanged (backward compatible)
- [ ] 8+ tests for signed arithmetic edge cases (zero, negative-negative, overflow)

**Finding**: Bridgebuilder Part 5 §3 — Stripe's negative_amount_cents precedent

### S3-T2: CreditNote Invariant Documentation (BB-ADV-003)

**Description**: The `CreditNoteSchema` in `billing-entry.ts` lacks documented invariants: no over-credit (credit cannot exceed original charge), referential integrity (must reference valid billing_entry_id), and timing (credit_at must be after original charge).

**Acceptance Criteria**:
- [ ] TSDoc on `CreditNoteSchema` documenting 3 invariants
- [ ] `$comment` on schema with invariant summary
- [ ] `validateCreditNote()` utility function checking invariants
- [ ] 4+ tests for invariant violations

**Finding**: BB-ADV-003 (Low, Billing)

### S3-T3: Resolvable $id URLs (BB-ADV-008)

**Description**: JSON Schema `$id` fields currently use bare identifiers (e.g., `'BillingEntry'`). For ecosystem adoption and JSON Schema tooling compatibility, they should be resolvable URIs (e.g., `https://schemas.honeyjar.xyz/v3/BillingEntry`).

**Acceptance Criteria**:
- [ ] All schema `$id` fields updated to `https://schemas.honeyjar.xyz/v{major}/{SchemaName}` format
- [ ] `SCHEMA_BASE_URL` constant exported from `version.ts`
- [ ] Generated JSON Schema files have resolvable `$id` URIs
- [ ] MIGRATION.md note: `$id` format change is non-breaking (URIs are identifiers, not locators)

**Finding**: BB-ADV-008 (Medium, Distribution)

### S3-T4: AsyncAPI Spec Generation (BB-ADV-009)

**Description**: Generate an AsyncAPI 3.0 specification from the stream event schemas for developer tooling and documentation. The spec describes the SSE streaming contract for consumers building WebSocket/SSE clients.

**Acceptance Criteria**:
- [ ] `scripts/generate-asyncapi.ts` script
- [ ] Generates `dist/asyncapi.yaml` from `StreamEventSchema` + `DomainEventSchema`
- [ ] `npm run asyncapi` script in package.json
- [ ] Spec validates against AsyncAPI 3.0 schema
- [ ] Documents 6 stream event types + ordering invariants

**Finding**: BB-ADV-009 (Medium, Interop)

### S3-T5: check-migration.ts CI Integration (BB-C4-ADV-007)

**Description**: The `check-migration.ts` script validates that MIGRATION.md stays in sync with schema changes. Wire it into the CI pipeline as a package.json script and GitHub Action check.

**Acceptance Criteria**:
- [ ] `npm run check:migration` script in package.json
- [ ] Script exits 0 when MIGRATION.md covers all schemas with `additionalProperties: false`
- [ ] Script exits 1 with clear message when new schemas are missing from migration guide
- [ ] Added to `npm test` or as separate CI check

**Finding**: BB-C4-ADV-007 (Low, Tooling)

### S3-T6: Mermaid Diagram Generation from Choreography (BB-C4-ADV-008)

**Description**: The `TRANSFER_CHOREOGRAPHY` and `TRANSFER_INVARIANTS` constants are structured enough to auto-generate Mermaid sequence diagrams for each transfer scenario. Create a generation script.

**Acceptance Criteria**:
- [ ] `scripts/generate-mermaid.ts` reads `TRANSFER_CHOREOGRAPHY` and produces Mermaid sequence diagram markdown
- [ ] Generates 4 diagrams (sale, gift, admin_recovery, custody_change) with both forward and compensation paths
- [ ] Output includes invariant annotations as notes
- [ ] `npm run diagrams` script in package.json
- [ ] Generated diagrams added to docs/ directory

**Finding**: BB-C4-ADV-008 (Low, Documentation)

---

## Sprint 4: Protocol Maturity & v4.0.0 Preparation

**Goal**: Long-term protocol sustainability, testing rigor, and planning for the next major version.
**Product alignment**: Post-launch evolution — soul memory, personality evolution, advanced billing ([#66 P3](https://github.com/0xHoneyJar/loa-finn/issues/66)).
**Estimated tasks**: 5

### S4-T1: Schema Evolution Strategy Document (BB-POST-001)

**Description**: Document the trade-offs of `additionalProperties: false` for N/N-1 wire compatibility. Currently, strict schemas reject unknown fields, which means a v3.1.0 producer's new optional fields are rejected by a v3.0.0 consumer. Write a strategy document with recommended patterns for both strict and permissive modes.

**Acceptance Criteria**:
- [ ] `SCHEMA-EVOLUTION.md` document covering: strict vs permissive trade-offs, recommended consumer patterns (strip-then-validate), versioned schema resolution, compatibility window policy
- [ ] Code examples in TypeScript, Go, Python showing how consumers handle unknown fields
- [ ] Decision: whether v4.0.0 should relax `additionalProperties` on selected envelope schemas
- [ ] Document the `Type.Intersect` metadata escape hatch pattern

**Finding**: BB-POST-001 (Medium, Protocol Design)

### S4-T2: Property Testing with fast-check (Parts 5-6 §6)

**Description**: Add property-based testing using `fast-check` for transfer choreography invariants and billing arithmetic. Random event orderings should verify that safety properties hold regardless of sequence.

**Acceptance Criteria**:
- [ ] `fast-check` dev dependency added
- [ ] Property tests for: `addMicro` commutativity, `subtractMicro` underflow, `multiplyBps` scaling, allocation sum invariant
- [ ] Property tests for: transfer choreography invariant verification against random event orderings
- [ ] Minimum 1000 iterations per property
- [ ] Integrated into `npm test`

**Finding**: Bridgebuilder Part 5 §6 — Amazon's TLA+ formal methods precedent

### S4-T3: Rust Golden Vector Runner (Parts 5-6 §5)

**Description**: Complete the cross-language vector runner set (Go and Python exist) with a Rust runner. Validates protocol interoperability for Rust consumers.

**Acceptance Criteria**:
- [ ] `vectors/runners/rust/` directory with Cargo project
- [ ] Uses `jsonschema` crate for JSON Schema validation
- [ ] Runs all golden vectors from `vectors/` directory
- [ ] CI-runnable (or documented manual execution)
- [ ] README with usage instructions

**Finding**: Bridgebuilder Part 5 §5 — completing the h2spec cross-language pattern

### S4-T4: SchemaStore.org Registration Preparation (BB-ADV-008 extended)

**Description**: Prepare for SchemaStore.org registration by ensuring all generated JSON Schema files meet the registry's requirements: resolvable `$id` URLs, proper `$schema` declarations, and a catalog entry.

**Acceptance Criteria**:
- [ ] All generated JSON Schema files include `$schema: "https://json-schema.org/draft/2020-12/schema"`
- [ ] Draft SchemaStore catalog entry (JSON) for loa-hounfour schemas
- [ ] Validation against SchemaStore requirements documented
- [ ] `npm run schemas:validate` verifies all generated schemas

**Finding**: BB-ADV-008 extended (Medium, Distribution)

### S4-T5: v4.0.0 Planning Document

**Description**: Based on all work in cycles 001-006, write a planning document for v4.0.0 that catalogs potential breaking changes, assesses their impact on consumers, and proposes a migration timeline aligned with [#66 launch sequence](https://github.com/0xHoneyJar/loa-finn/issues/66).

**Acceptance Criteria**:
- [ ] `V4-PLANNING.md` document covering:
  - Signed micro-USD as default (replace unsigned `MicroUSD`)
  - Schema evolution policy decision (`additionalProperties` relaxation on envelopes)
  - New aggregates: SoulMemory, InboxPrivacy, PersonalityEvolution (from [#66 P3](https://github.com/0xHoneyJar/loa-finn/issues/66))
  - `MIN_SUPPORTED_VERSION` bump strategy (drop v2.x support?)
  - Consumer upgrade matrix (loa-finn, arrakis, mibera-freeside)
- [ ] Timeline proposal relative to product launch sequence ([#66 §7](https://github.com/0xHoneyJar/loa-finn/issues/66))

**Finding**: Comprehensive — synthesizes all forward-looking suggestions into a roadmap

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| New schemas require consumer updates | Medium | Low | All new fields are optional (backward compatible) |
| AsyncAPI generation complexity | Low | Low | Template approach proven in cycle-002 |
| fast-check integration conflicts | Low | Medium | Isolate in separate test file |
| Resolvable $id URL domain not registered | Medium | Medium | Use placeholder domain, document as pre-launch task |
| v4.0.0 planning scope creep | Medium | Medium | Document scope is read-only analysis, not implementation |

## Success Metrics

- [ ] All 21 outstanding Bridgebuilder findings addressed (BB-HFR, BB-ADV, BB-V3, BB-C4-ADV, BB-POST, Parts 5-6)
- [ ] Test count > 400 (currently 370)
- [ ] Zero breaking changes in v3.1.0 and v3.2.0 (all additive)
- [ ] Cross-language validation coverage: TypeScript + Go + Python + Rust
- [ ] v4.0.0 planning document ready for product team review
- [ ] Product mission alignment: all P0 protocol types ready for Arrakis adoption
