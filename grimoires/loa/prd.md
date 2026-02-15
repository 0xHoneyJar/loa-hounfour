# PRD: loa-hounfour v4.6.0 — The Formalization Release (Level 4 Protocol Maturity)

**Status:** Draft
**Author:** Agent (from Bridgebuilder Level 4 Architectural Review)
**Date:** 2026-02-15
**Cycle:** cycle-009
**Sources:**
- [Bridgebuilder Level 4 Review — PR #2 Comments 11-12](https://github.com/0xHoneyJar/loa-hounfour/pull/2)
- [Bridgebuilder 4-Part Meditation — PR #2 Comments 4-7](https://github.com/0xHoneyJar/loa-hounfour/pull/2)
- [Bridgebuilder Persona Field Reports — loa-finn#24](https://github.com/0xHoneyJar/loa-finn/issues/24)
- [Hounfour RFC — Multi-Model Provider Abstraction](https://github.com/0xHoneyJar/loa-finn/issues/31)
- [Permission Scape — loa-finn#31](https://github.com/0xHoneyJar/loa-finn/issues/31)
- Previous cycle PRD: `context/prd-v4.4.0-archived.md`
- Previous cycle SDD: `context/sdd-v4.4.0-archived.md`
- NOTES.md learnings from 8 development cycles

---

## 1. Executive Summary

loa-hounfour v4.5.0 (The Hardening Release) achieved zero-finding flatline across two bridge review loops, with 799 tests, 36+ schemas, 11 cross-field validators, and a three-economy architecture (Attention, Transaction, Value). The protocol is solid at **Level 3** — behavioral contracts with state machines, choreography, and temporal property testing.

**v4.6.0** pushes the protocol to **Level 4: Civilizational** — executable contracts across language boundaries, formally specified temporal properties, unified state machine declarations, and self-describing evolution. This is the release that transforms loa-hounfour from a TypeScript schema library into a **multi-language coordination protocol** ready for the Hounfour's multi-model routing layer.

### Why Level 4 Now

The Hounfour RFC ([loa-finn#31](https://github.com/0xHoneyJar/loa-finn/issues/31)) defines a `ModelPort` interface where Claude, Kimi-K2, Qwen3, and GPT-4o produce and consume protocol documents. When Model A produces a `PerformanceRecord` and Model B consumes it for `ReputationScore` computation, the contract must be verifiable at the model boundary — not just in TypeScript, but in Python (`cheval.py`), Go, and any future adapter.

Today, cross-field validation logic is invisible outside TypeScript. State machines are scattered across 3 locations. Temporal properties are implied by tests but never formally specified. These gaps are acceptable for a single-language library. They are unacceptable for a multi-model coordination protocol.

### Version Rationale

v4.6.0 (minor bump): all changes are additive. No breaking changes. New vocabulary files, new constraint format, refactored state machine definitions (existing exports preserved via re-export).

---

## 2. Problem Statement

### The Cross-Model Verification Gap

When the Hounfour routes agent tasks across multiple model providers, each model's output must satisfy loa-hounfour contracts. Today, verification requires:

| Layer | What It Checks | Availability |
|-------|---------------|-------------|
| JSON Schema | Structural types | All languages |
| Cross-field validators | Semantic invariants | TypeScript only |
| State machine transitions | Behavioral correctness | TypeScript only (ProtocolStateTracker) |
| Temporal properties | Safety/liveness guarantees | Implied by tests only |
| Aggregate boundaries | Consistency requirements | Undefined |

The gap between row 1 (available everywhere) and rows 2-5 (TypeScript only or undefined) is the Level 4 gap. `cheval.py` (the Hounfour's Python model adapter) currently has no way to enforce cross-field validation, verify state machine transitions, or check temporal properties without reimplementing 400+ lines of TypeScript logic.

### The State Machine Scatter Problem

State machine knowledge lives in three places that can drift:

1. **Schema files** — `ESCROW_TRANSITIONS` in `src/schemas/escrow-entry.ts:49-58`
2. **State tracker** — Hardcoded `if` chains in `src/test-infrastructure/protocol-state-tracker.ts:202-306`
3. **Choreography** — Event type references in `src/vocabulary/economic-choreography.ts`

Today they agree. Tomorrow, when someone adds a new escrow state, they'll change one and forget the others. (NOTES.md learning: "Cross-field validation is invisible to JSON Schema consumers — Go/Python implementers won't know it exists without reading TypeScript.")

### The Formalization Gap

The protocol enforces temporal ordering (`expires_at > held_at`, `resolved_at >= filed_at`) as point checks. But it doesn't specify the temporal *properties* these checks are trying to enforce:

- **Liveness**: "Every held escrow eventually reaches a terminal state"
- **Safety**: "Total micro-USD is conserved across all escrow transitions"
- **Bounded decay**: "Reputation never drops below the configured floor"

Without explicit properties, consumers implement ad-hoc checks. With explicit properties, consumers implement *the same* checks — and property-based test generators can verify them automatically.

---

## 3. Goals & Success Metrics

### Primary Goal

Advance loa-hounfour from Level 3 (behavioral) to Level 4 (civilizational) protocol maturity, measured by:

| Metric | v4.5.0 Baseline | v4.6.0 Target |
|--------|----------------|---------------|
| Cross-field constraints portable to non-TS | 0 of 11 | 11 of 11 |
| State machine definitions unified | 1 of 3 (escrow only) | 3 of 3 |
| Temporal properties formally specified | 0 | 5+ safety + 3+ liveness |
| ECONOMY_FLOW entries with verification | 0 of 5 | 5 of 5 |
| Aggregate boundaries defined | 0 | 3+ |
| Tests | 799 | 850+ |

### Secondary Goals

- Preserve all existing exports and backward compatibility (zero breaking changes)
- Enable `cheval.py` to consume constraints without TypeScript dependency
- Provide foundation for TLA+ formalization (not implementing TLA+ itself, but structuring properties for future translation)
- Address all residual NOTES.md gaps applicable to the contract layer

### Non-Goals

- Implementing a TLA+ model checker (Level 5 work)
- Rewriting cross-field validators in a new language (we generate constraints alongside them)
- Breaking changes to any existing schema
- Changes to runtime behavior — this is specification and tooling, not new economic primitives

---

## 4. User & Stakeholder Context

### Primary Consumers

| Consumer | Role | Level 4 Need |
|----------|------|-------------|
| **loa-finn** (TypeScript) | Inference engine | Already has full access; benefits from unified state machines |
| **arrakis** (TypeScript/Rust) | Gateway | Benefits from constraint format for Rust validation |
| **cheval.py** (Python) | Hounfour model adapter | **Critical**: needs portable constraints for model output validation |
| **mibera-freeside** (Solidity) | Smart contracts | Benefits from formal temporal properties for on-chain verification |

### Secondary Consumers

| Consumer | Role | Level 4 Need |
|----------|------|-------------|
| **Future Go/Rust adapters** | Model adapters | Constraint format + state machine declarations |
| **Bridgebuilder** | Review persona | Temporal properties for deeper verification |
| **Flatline Protocol** | Multi-model review | Aggregate boundaries for cross-model consistency checking |

---

## 5. Functional Requirements

### FR-1: Unified State Machine Vocabulary

**Priority**: P0 (Foundation for all other advances)

Create `src/vocabulary/state-machines.ts` with declarative state machine definitions for all three economic primitives:

- **Escrow**: initial=held, terminal=[released, refunded, expired], 5 transitions
- **Stake**: initial=active, terminal=[withdrawn, slashed], transitions from active/vested
- **Credit**: initial=extended, terminal=[settled], single transition

Each machine definition includes: initial state, terminal states, valid transitions (from → to[]), and event-to-transition mappings (event type → {from[], to}).

`ESCROW_TRANSITIONS` in `escrow-entry.ts` becomes a derived re-export. `ProtocolStateTracker` consumes the unified vocabulary instead of hardcoded `if` chains. `ECONOMIC_CHOREOGRAPHY` references state machines by name.

**Acceptance Criteria:**
- Single `STATE_MACHINES` export consumed by all three locations
- Existing `ESCROW_TRANSITIONS` and `isValidEscrowTransition` exports preserved (re-export)
- ProtocolStateTracker refactored to be data-driven from STATE_MACHINES
- Structural invariant tests: all transitions are reachable, all terminal states are absorbing, no orphan states
- Tests: state machine declaration tests + ProtocolStateTracker behavioral equivalence tests

### FR-2: Aggregate Boundary Definitions

**Priority**: P0 (Companion to FR-1)

Create `src/vocabulary/aggregate-boundaries.ts` defining consistency boundaries between schemas:

- **escrow_settlement**: root=EscrowEntry, members=[BillingEntry, TransferEvent], causal ordering
- **dividend_distribution**: root=CommonsDividend, members=[PerformanceRecord], read-your-writes consistency
- **reputation_computation**: root=ReputationScore, members=[PerformanceRecord, Sanction], eventual consistency

Each boundary specifies: root schema, member schemas, consistency invariant (prose), and ordering requirement (causal | read-your-writes | eventual).

**Acceptance Criteria:**
- 3+ aggregate boundaries defined with root, members, invariant, ordering
- Structural tests: all referenced schemas exist, no circular membership
- Integration with ECONOMY_FLOW: each flow entry's source/target must belong to a defined boundary

### FR-3: Explicit Temporal Properties

**Priority**: P1 (Formalization)

Create `src/vocabulary/temporal-properties.ts` specifying safety and liveness properties:

**Safety properties** (things that must always be true):
- Financial conservation: sum of all escrow amounts is preserved across transitions
- Reputation bounded: score always within [floor, ceiling] after decay
- Non-negative amounts: no economic primitive creates negative micro-USD
- Escalation monotonicity: sanction severity only increases for the same violation type

**Liveness properties** (things that must eventually happen):
- Escrow termination: held escrow with expires_at reaches terminal state
- Dispute resolution: filed dispute eventually reaches resolved or withdrawn
- Stake maturation: active stake eventually reaches vested or slashed

Each property includes: name, type (safety|liveness), scope (which schemas), formal expression (prose + quasi-formal notation), and a `testable: boolean` flag.

**Acceptance Criteria:**
- 5+ safety properties and 3+ liveness properties specified
- Each property has at least one `fast-check` property-based test
- Properties reference STATE_MACHINES vocabulary for state-related assertions
- New `tests/properties/` test files generated from property definitions

### FR-4: Cross-Language Constraint Format

**Priority**: P1 (Portability — critical for Hounfour)

Generate `constraints/*.constraints.json` files alongside each JSON Schema, containing cross-field validation rules in a simple, language-neutral expression format.

**Expression language** (minimal, parseable by any language):
- Comparison: `==`, `!=`, `<`, `>`, `<=`, `>=`
- Logical: `&&`, `||`, `!`
- Null check: `== null`, `!= null`
- Field access: `field_name`, `nested.field`
- Array: `array.length`, `array.every(...)`, `array.some(...)`
- Arithmetic: `+`, `-` (for BigInt string comparisons: `bigint_sum(field)`)

Each constraint includes: id, expression, severity (error|warning), message, and optional `faang_parallel` for documentation.

**Acceptance Criteria:**
- 11 constraint files generated (one per cross-field-validated schema)
- All existing cross-field validation rules represented in constraint format
- Validation script (`scripts/validate-constraints.ts`) verifies constraint files match TypeScript validators
- Constraint files included in package `"files"` for npm distribution
- Documentation: how to consume constraints in Python/Go/Rust

### FR-5: Executable ECONOMY_FLOW Verification

**Priority**: P2 (Integration)

Extend `EconomyFlowEntry` interface with optional `verify` function and add runtime verification utilities:

- Each of the 5 flow entries gets a verification function that checks whether a source document could produce the linked target document
- Utility function `verifyEconomyFlow(source, target, flowEntry)` invokes the verification
- Integration with ProtocolStateTracker: flow violations are trackable events

**Acceptance Criteria:**
- 5 verification functions (one per ECONOMY_FLOW entry)
- Verification utility exported from barrel (`src/index.ts`)
- Tests: valid flows pass, broken flows (wrong pool_id, missing linking field) fail
- Integration test: full economy pipeline (Performance → Reputation → Routing → Billing) verified end-to-end

### FR-6: Residual Gap Closure

**Priority**: P2 (Polish)

Address remaining NOTES.md observations applicable to the contract layer:

- **Saga compensation protocol**: Add optional `saga_context` enrichment to `ECONOMIC_CHOREOGRAPHY` with forward/compensation distinction
- **Schema deprecation workflow**: Create `src/vocabulary/deprecation.ts` with deprecation tracking and migration guidance per schema
- **Metadata namespace conventions**: Define `src/vocabulary/metadata-namespaces.ts` with `loa.*`, `x-*`, `trace.*` namespace rules

**Acceptance Criteria:**
- Saga context enrichment on ECONOMIC_CHOREOGRAPHY entries
- Deprecation vocabulary with lifecycle tracking
- Metadata namespace vocabulary with validation utility
- Tests for each new vocabulary module

---

## 6. Technical & Non-Functional Requirements

### NFR-1: Zero Breaking Changes

All FR changes must be additive. Existing exports preserved via re-export where refactoring occurs. `npm pack` output must pass semver check against v4.5.0.

### NFR-2: Constraint Format Simplicity

The constraint expression language must be parseable by a simple recursive descent parser (no regex, no eval). Target: a Python consumer can validate constraints with <100 lines of parsing code.

### NFR-3: Test Coverage

Maintain >95% line coverage on new vocabulary files. Every temporal property must have at least one property-based test. Every constraint must have a round-trip test (TypeScript validator agrees with constraint evaluation).

### NFR-4: Documentation

Each new vocabulary file must include TSDoc explaining the design rationale, FAANG parallel, and connection to the Hounfour RFC. Generated constraint files must include human-readable comments.

### NFR-5: Package Distribution

New artifacts (constraints/*.json) must be included in npm package via `"files"` field. No new runtime dependencies.

---

## 7. Scope & Prioritization

### In Scope (v4.6.0)

| Priority | Requirement | Effort |
|----------|-------------|--------|
| P0 | FR-1: Unified STATE_MACHINES | Small (refactoring) |
| P0 | FR-2: Aggregate boundaries | Small (new vocabulary) |
| P1 | FR-3: Temporal properties | Medium (specification + tests) |
| P1 | FR-4: Cross-language constraints | Medium (format design + generation) |
| P2 | FR-5: Executable ECONOMY_FLOW | Small (add verify functions) |
| P2 | FR-6: Residual gap closure | Small (3 vocabulary files) |

### Out of Scope

- TLA+ model checking implementation (Level 5 — future cycle)
- Rewriting validators in Rego or another policy language
- New economic primitives (v4.4 economy is complete)
- Breaking changes to any existing schema or export
- Cross-language vector runners (already exist for JSON Schema; constraint runners are consumer responsibility)
- Changes to loa-finn, arrakis, or cheval.py (those repos consume the output)

---

## 8. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Constraint expression language too complex for simple parsers | Medium | High | Start minimal (comparisons + null checks), extend only if needed |
| ProtocolStateTracker refactoring breaks existing tests | Low | Medium | Behavioral equivalence tests before refactoring |
| Temporal properties can't be meaningfully tested without model checker | Low | Low | fast-check property tests are sufficient for Level 4; TLA+ is Level 5 |
| Aggregate boundaries create false sense of transactional guarantees | Medium | Medium | Clear documentation: boundaries are *specification*, not runtime enforcement |
| Constraint format diverges from TypeScript validators over time | Medium | High | Validation script in CI ensures constraints match validators |

### Dependencies

- **None blocking**: All work is additive to the existing codebase
- **Informational**: cheval.py team should review constraint format design (FR-4) before implementation
- **Tooling**: `fast-check` already in devDependencies for property-based testing

---

## 9. Delivery Strategy

### Version Plan

Single release: **v4.6.0 — The Formalization Release**

All FRs ship together as a coherent Level 4 package. No intermediate releases — the value is in the complete formalization, not individual pieces.

### Sprint Sequence

Recommended sprint ordering follows the dependency chain:

1. **Foundation**: FR-1 (STATE_MACHINES) + FR-2 (AGGREGATE_BOUNDARIES) — foundation for all other work
2. **Formalization**: FR-3 (TEMPORAL_PROPERTIES) — builds on state machine definitions
3. **Portability**: FR-4 (CONSTRAINTS) — the Hounfour integration unlock
4. **Integration + Polish**: FR-5 (ECONOMY_FLOW verification) + FR-6 (residual gaps) + version bump

### Bridge Review

Post-implementation: Run Bridge with Bridgebuilder review. Target: single-iteration flatline (given the specification-heavy nature of this cycle, findings should be predominantly LOW or PRAISE).

---

## 10. Success Criteria

### Ship Gate

- [ ] All 6 FRs implemented with tests
- [ ] 850+ tests passing
- [ ] Zero breaking changes (semver check passes)
- [ ] Constraint files generated for all 11 cross-field-validated schemas
- [ ] STATE_MACHINES consumed by ProtocolStateTracker (no hardcoded transitions)
- [ ] At least 5 safety + 3 liveness temporal properties with fast-check tests
- [ ] Bridge review achieves flatline

### Level 4 Verification

A protocol is Level 4 when a **non-TypeScript consumer** can:
1. Validate structural types via JSON Schema ✅ (already possible)
2. Enforce semantic invariants via constraints.json (FR-4)
3. Verify state machine transitions via STATE_MACHINES declaration (FR-1)
4. Understand temporal safety/liveness guarantees via TEMPORAL_PROPERTIES (FR-3)
5. Know which schemas must be atomically consistent via AGGREGATE_BOUNDARIES (FR-2)

If all five are true, the protocol is self-describing across language boundaries. That's Level 4.
