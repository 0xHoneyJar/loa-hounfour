# PRD: loa-hounfour v5.0.0 — The Multi-Model Release

**Status:** Draft
**Author:** Agent (from Bridgebuilder Synthesis + Cross-Ecosystem Intelligence)
**Date:** 2026-02-15
**Sources:**
- All Bridgebuilder findings across PR #1 (cycles 001–006) and PR #2 (cycles 007–009)
- [Product Mission — Launch Readiness RFC](https://github.com/0xHoneyJar/loa-finn/issues/66)
- [Hounfour RFC — Multi-Model Provider Abstraction](https://github.com/0xHoneyJar/loa-finn/issues/31)
- [Bridgebuilder Persona](https://github.com/0xHoneyJar/loa-finn/issues/24)
- [Arrakis Billing RFC — Path to Revenue](https://github.com/0xHoneyJar/arrakis/issues/62)
- [Arrakis Revenue Rules PR](https://github.com/0xHoneyJar/arrakis/pull/63)
- Bridgebuilder Horizon Voice Review (PR #2 final comments)
- Cross-Ecosystem Pattern Analysis (loa-finn, arrakis, loa-hounfour)

---

## 1. Executive Summary

loa-hounfour is the shared protocol contract package (`@0xhoneyjar/loa-hounfour`) defining canonical type schemas, validators, vocabulary, and integrity primitives consumed by loa-finn (inference engine), arrakis (gateway), and mibera-freeside (smart contracts).

**v4.6.0** (current) provides a formally verified protocol for the agent economy: 36+ schemas, 1097 tests, unified state machines, temporal properties (6 safety + 3 liveness), cross-language constraints (11 files, 31 rules), aggregate boundaries, economy flow verification, and deprecation/metadata governance. The protocol maturity level reached Level 4 (Formalization) across 9 development cycles and 13+ bridge iterations.

**v5.0.0** extends the protocol from an **Economic Grammar** (how agents transact) to a **Multi-Model Lingua Franca** (how agents communicate across model boundaries). This is the release that makes loa-hounfour the canonical adapter port contract for the five-layer provider abstraction defined in Hounfour RFC #31.

### Why v5.0.0 (Breaking)

The ModelPort adapter boundary introduces new schemas (`CompletionRequest`, `CompletionResult`, `ModelCapabilities`) that redefine how completion results flow between loa-finn's cheval adapters and arrakis billing. This is a breaking change in how consumers structure model interactions — the protocol now owns the wire format, not individual implementations.

### Version Journey: v4.6.0 → v5.0.0

| Dimension | v4.6.0 (Current) | v5.0.0 (Target) |
|-----------|------------------|------------------|
| **Schemas** | 36+ (economy-complete) | ~48+ (multi-model complete) |
| **Tests** | 1,097 | ~1,400+ |
| **Vocabulary** | 17 files | ~22+ files |
| **Constraints** | 11 files, 31 rules | ~16+ files, ~45+ rules |
| **Cross-Ecosystem** | Types consumed by 2 repos | Shared test vectors consumed by 3 repos |
| **Barrel** | 486 lines (monolithic) | Sub-packages (core, economy, model, governance) |
| **Protocol Level** | Level 4 (Formalization) | Level 4+ (Multi-Model Formalization) |

### Three Pillars of v5.0.0

1. **ModelPort Contracts** — The adapter port boundary that makes all models speak the same language
2. **Open Finding Resolution** — 15+ open Bridgebuilder findings addressed before launch
3. **Protocol Architecture** — Barrel decomposition, constraint formalization, cross-ecosystem vectors

---

## 2. Problem Statement

### 2.1 The Multi-Model Gap

loa-finn RFC #31 defines a five-layer provider abstraction (Agent → Routing → Adapter → Infrastructure → Distribution). The adapter layer (`cheval.py`) normalizes heterogeneous model APIs into a common wire format. Today, that wire format is defined ad-hoc in loa-finn. This means:

- arrakis cannot validate or construct completion requests against a shared schema
- Model billing attribution depends on implementation-specific response shapes
- Ensemble orchestration (first_complete, best_of_n, consensus) has no protocol-level contract
- Tool calling negotiation varies between providers with no canonical type

**Impact:** Every consumer reimplements the model wire format independently. The protocol defines how to bill for model interactions but not how to structure them.

### 2.2 The Open Findings Debt

Across 9 development cycles and 13+ bridge iterations, the Bridgebuilder identified 15+ open findings that represent forward-looking architectural gaps:

| Priority | Finding | ID |
|----------|---------|-----|
| HIGH | ReputationScore lacks Sybil resistance (no minimum unique validators, no validation graph hash) | BB-V4-DEEP-001 |
| MEDIUM | Escrow timeout gap — liveness property L1 without enforcement mechanism | BB-V4-DEEP-002 / CF-4 |
| MEDIUM | CommonsDividend disconnected from source PerformanceRecords (no audit trail) | BB-V4-DEEP-003 |
| MEDIUM | ESCALATION_RULES not referenced by Sanction schema (policy/enforcement gap) | BB-V4-DEEP-004 |
| MEDIUM | Constraint language needs formal grammar (BNF/PEG) for non-TS consumers | CF-2 |
| MEDIUM | Aggregate boundaries declared but not enforced at runtime | CF-3 |
| MEDIUM | No cross-ecosystem shared test vectors consumed by arrakis/loa-finn | CF-6 |
| MEDIUM | Barrel complexity (486 lines) approaching threshold — needs sub-packages | CF-1 |

These are not bugs — they are design questions that will surface as the consumer base grows. Addressing them pre-launch prevents the "Stripe-Connect-style rewrite" pattern.

### 2.3 The Cross-Ecosystem Integration Gap

Three repositories consume loa-hounfour but share no test vectors:

| Repository | Consumption Pattern | Gap |
|-----------|---------------------|-----|
| loa-finn | TypeScript import, runtime validation | No shared golden vectors |
| arrakis | TypeScript import, billing/JWT construction | Redis spending pattern duplicates BigInt logic |
| mibera-freeside | JSON Schema validation (Solidity boundary) | No cross-language constraint evaluation |

---

## 3. Goals & Success Metrics

### 3.1 Goals

| # | Goal | Measurable Outcome |
|---|------|-------------------|
| G1 | Define the ModelPort adapter boundary as protocol-level contracts | `CompletionRequest`, `CompletionResult`, `ModelCapabilities` schemas with full validation |
| G2 | Resolve all HIGH and MEDIUM Bridgebuilder open findings | 0 open HIGH findings, ≤2 open MEDIUM findings (deferred-with-rationale) |
| G3 | Decompose the barrel into domain-aligned sub-packages | 4 sub-packages: core, economy, model, governance — each ≤150 lines |
| G4 | Formalize the constraint language with a grammar specification | BNF/PEG grammar, expression versioning, ≥10 fuzz test cases |
| G5 | Create cross-ecosystem golden vectors consumed by arrakis and loa-finn | ≥20 shared vectors covering completion, billing, and event schemas |
| G6 | Add ensemble orchestration contracts for multi-model dispatch | `EnsembleStrategy`, `EnsembleRequest`, `EnsembleResult` schemas |
| G7 | Introduce budget scope and agent requirements schemas | Budget envelope and per-agent model requirements for routing validation |

### 3.2 Success Criteria

- All existing 1,097 tests continue passing (zero regression)
- ≥300 new tests covering multi-model contracts and open finding resolution
- TypeScript compilation clean with zero errors
- JSON Schema generation for all new schemas
- Cross-language constraint files for all new cross-field validations
- MIGRATION.md updated with v4.6.0 → v5.0.0 consumer upgrade matrix

---

## 4. Functional Requirements

### FR-1: ModelPort Adapter Boundary Contracts

Define the canonical wire-format types for model interaction. These are the types that `cheval.py` (loa-finn) normalizes to and that arrakis constructs billing from.

| Schema | Description | Priority |
|--------|-------------|----------|
| `CompletionRequest` | Messages, tools, options, metadata (agent, tenant, nft, trace) | P0 |
| `CompletionResult` | Content, thinking, tool_calls, usage, metadata | P0 |
| `ModelCapabilities` | Capabilities declared by providers (thinking_traces, vision, tool_calling, max_context, max_output) | P0 |
| `ProviderWireMessage` | Lean wire-format message (role, content, thinking, tool_calls, tool_call_id) — distinct from persisted conversation `Message` | P0 |
| `ToolDefinition` | Canonical tool definition shape (type, function, description, parameters JSON Schema) | P0 |
| `ToolResult` | Tool execution response (role: tool, tool_call_id, content) | P0 |

**Cross-field validation:** `CompletionRequest` with `tools` array requires `tool_choice` field. When `execution_mode` is `native_runtime`, `provider` must support native execution.

**Source:** loa-finn RFC #31 Sections 5.1–5.3

### FR-2: Ensemble Orchestration Contracts

Define structured contracts for multi-model dispatch and response aggregation.

| Schema | Description | Priority |
|--------|-------------|----------|
| `EnsembleStrategy` | Vocabulary: `'first_complete' \| 'best_of_n' \| 'consensus'` | P0 |
| `EnsembleRequest` | Models to dispatch, strategy, timeout, task_type | P1 |
| `EnsembleResult` | Selected result, all candidates, consensus score, duration | P1 |

**Source:** loa-finn RFC #66 ensemble orchestration, RFC #31 multi-model routing

### FR-3: Open Finding Resolution — Financial Safety

| Finding | Resolution | Schema Impact |
|---------|-----------|---------------|
| BB-V4-DEEP-002 / CF-4: Escrow timeout | Add `expires_at` field to `EscrowEntrySchema` | `EscrowEntry` schema change |
| BB-V4-DEEP-003: Dividend audit trail | Add `source_performance_ids` to `CommonsDividend` | `CommonsDividend` schema change |
| BB-V4-DEEP-004: Escalation linkage | Add `escalation_rule_applied` to `Sanction` | `Sanction` schema change |
| BB-V4-DEEP-001: Sybil resistance | Add `min_unique_validators`, `validation_graph_hash` to `ReputationScore` | `ReputationScore` schema change |

**Constraint:** All changes must be backward-compatible (new fields are `Type.Optional`).

### FR-4: Barrel Decomposition

Factor `src/index.ts` (486 lines) into domain-aligned sub-packages with a root barrel re-exporting for backward compatibility.

| Sub-Package | Contents | Estimated Exports |
|------------|----------|-------------------|
| `core` | Agent, Conversation, DomainEvent, Transfer, Discovery, Health, Errors, Version | ~120 exports |
| `economy` | Billing, Escrow, Stake, Credit, Dividend, Currency, Economy Flow | ~80 exports |
| `model` | Completion, Ensemble, Thinking Trace, Tool Call, Stream Events, Pools | ~60 exports |
| `governance` | Reputation, Sanction, Dispute, Routing, Escalation Rules | ~50 exports |
| `constraints` | Evaluator, Types, Temporal Properties, State Machines, Aggregate Boundaries | ~40 exports |

**Constraint:** Root `src/index.ts` MUST re-export everything from all sub-packages for backward compatibility. Consumers can use `@0xhoneyjar/loa-hounfour/core` or `@0xhoneyjar/loa-hounfour` interchangeably.

### FR-5: Constraint Language Formalization

Upgrade the constraint expression language from an implicit grammar (recursive descent parser in `evaluator.ts`) to a formal specification.

| Deliverable | Description |
|------------|-------------|
| `constraints/GRAMMAR.md` | BNF/PEG grammar specification for the expression language |
| Expression versioning | `expression_version: "1.0"` field in constraint files |
| Fuzz test suite | ≥10 property-based fuzz tests using fast-check against the grammar |
| Error reporting | Line/column position in constraint evaluation errors |

**Source:** CF-2, Bridgebuilder Cycle-009

### FR-6: Cross-Ecosystem Shared Vectors

Create canonical golden vectors that arrakis and loa-finn import and validate against.

| Vector Category | Count | Consumers |
|----------------|-------|-----------|
| Completion vectors (valid/invalid `CompletionRequest`/`CompletionResult`) | 8+ | loa-finn, arrakis |
| Billing vectors (multi-party attribution with ensemble billing) | 6+ | arrakis |
| Event batch vectors (economy flow events with saga context) | 6+ | loa-finn, arrakis |

**Distribution:** Published as part of `vectors/` directory in the package.

### FR-7: Routing & Budget Contracts

| Schema | Description | Priority |
|--------|-------------|----------|
| `ExecutionMode` | Vocabulary: `'native_runtime' \| 'remote_model'` | P1 |
| `ProviderType` | Vocabulary: `'claude-code' \| 'openai' \| 'openai-compatible'` | P1 |
| `AgentRequirements` | Per-agent model requirements (native_runtime, tool_calling, thinking_traces) | P1 |
| `BudgetScope` | Budget envelope: project/sprint/phase with limits and actions | P1 |
| `RoutingResolution` | Result of routing: resolved_model, original, resolution_type, reason | P2 |

**Source:** loa-finn RFC #31 Sections 5.4, 6.3, 6.4

### FR-8: Metadata Namespace Convention

Establish the metadata namespace standard before consumers create shadow schemas.

| Namespace | Owner | Purpose |
|-----------|-------|---------|
| `loa.*` | Protocol | Reserved for protocol-level metadata |
| `x-*` | Consumer | Consumer-extension metadata |
| `trace.*` | Observability | Distributed tracing context |
| `billing.*` | Economy | Billing attribution metadata |

**Validation:** `isValidMetadataKey()` updated to enforce namespace rules. New `METADATA_NAMESPACES` vocabulary.

**Source:** BB-V3-001

---

## 5. Non-Functional Requirements

### NFR-1: Backward Compatibility

All new fields on existing schemas MUST be `Type.Optional`. The root barrel MUST re-export all sub-packages. Consumers on v4.6.0 MUST be able to upgrade without code changes.

### NFR-2: Cross-Language Portability

All new cross-field validations MUST have corresponding `constraints/*.json` files for Go/Python/Rust consumers. New schemas MUST generate valid JSON Schema via the existing pipeline.

### NFR-3: Test Coverage

≥300 new tests. Property-based tests for all financial arithmetic. Temporal property tests for new state machine transitions. Fuzz tests for constraint grammar.

### NFR-4: Performance

Barrel decomposition MUST NOT increase cold import time by more than 10%. Constraint evaluation MUST handle ≥100 rules in <10ms.

---

## 6. Out of Scope

| Item | Reason | When |
|------|--------|------|
| `SoulMemory` / agent memory persistence | Post-launch P3 feature (RFC #66 Phase 3) | v6.0.0+ |
| On-chain schema anchoring | Requires mibera-freeside integration | v6.0.0+ |
| Native type generation (Go/Python/Rust) | JSON Schema validation sufficient for launch | v5.2.0 |
| Resolvable `$id` URLs at schemas.0xhoneyjar.com | Infrastructure dependency | v5.1.0 |
| Rust vector runner | Python/Go runners sufficient for launch | v5.1.0 |
| `CapabilityAttestation` / `DelegatedCapability` | Requires multi-agent orchestration | v6.0.0+ |
| Aggregate boundary runtime enforcement | Requires service-layer integration | v5.1.0 |
| `PersonalityEvolution` schema | Post-launch Phase 3 | v6.0.0+ |

---

## 7. Technical Constraints

- TypeScript 5.x with `moduleResolution: "NodeNext"` — all imports require `.js` extension
- TypeBox + TypeCompiler for lazy-compiled validation — extend for all new schemas
- `@noble/hashes` for Keccak-256 — EIP-55 checksumming in NftId
- String-encoded micro-USD (`^[0-9]+$`) — continue pattern for all new financial fields
- BigInt arithmetic for all financial conservation checks
- `additionalProperties: false` on all schemas (with MIGRATION.md evolution strategy)
- Injectable `now` parameter pattern for all time-dependent validators

---

## 8. Risks & Mitigations

| Risk | Impact | Probability | Mitigation |
|------|--------|-------------|------------|
| ModelPort contracts diverge from loa-finn's actual adapter implementation | Consumers build against wrong shape | Medium | Cross-reference RFC #31 implementation in loa-finn before finalizing schemas |
| Barrel decomposition breaks existing imports | Consumer build failures | Low | Root barrel re-exports everything; sub-packages are additive |
| Constraint grammar formalization reveals edge cases in existing evaluator | Constraint evaluation regression | Medium | Property-based fuzz testing with fast-check |
| Cross-ecosystem vectors create tight coupling between repos | Update friction | Low | Vectors are published as read-only fixtures; consumers validate against them |
| v5.0.0 version bump signals instability to consumers | Adoption hesitation | Low | Clear MIGRATION.md with zero-breaking-change upgrade path for Optional fields |

---

## 9. Dependencies

| Dependency | Type | Status |
|-----------|------|--------|
| loa-finn RFC #31 (Hounfour Multi-Model) | Design input | Published (37 comments) |
| loa-finn RFC #66 (Launch Readiness) | Design input | Published (12 comments) |
| arrakis PR #63 (Revenue Rules) | Validation | Merged |
| Bridgebuilder findings (PR #1 + PR #2) | Input | Complete (120+ findings cataloged) |
| TypeBox v0.32+ | Runtime | Installed |
| fast-check | Test dependency | Installed |

---

## 10. Acceptance Criteria

1. All 1,097 existing tests pass (zero regression)
2. ≥300 new tests covering all functional requirements
3. `CompletionRequest` and `CompletionResult` schemas validate against loa-finn RFC #31 examples
4. Barrel decomposition: sub-packages created, root barrel backward-compatible
5. Constraint grammar: BNF/PEG spec with ≥10 fuzz tests
6. Cross-ecosystem vectors: ≥20 vectors published under `vectors/` directory
7. All open HIGH Bridgebuilder findings resolved
8. MIGRATION.md updated with v4.6.0 → v5.0.0 consumer upgrade matrix
9. JSON Schema generation for all new schemas
10. Cross-language constraint files for all new cross-field validations
