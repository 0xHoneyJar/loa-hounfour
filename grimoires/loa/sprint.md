# Sprint Plan: Protocol Resilience & Completeness v2.3.0

**Cycle:** cycle-004 — Protocol Resilience & Completeness
**PRD:** [grimoires/loa/prd.md](prd.md)
**SDD:** [grimoires/loa/sdd.md](sdd.md)
**Source:** [PR #1 Bridgebuilder Post-Flatline Deep Review](https://github.com/0xHoneyJar/loa-hounfour/pull/1)
**Findings:** BB-POST-001 through BB-POST-004 (4 forward-looking findings from post-flatline examination)
**Created:** 2026-02-14

---

## Overview

| Property | Value |
|----------|-------|
| **Total sprints** | 2 |
| **Total tasks** | 9 |
| **Scope** | v2.3.0 — Protocol resilience for Cambrian Phase 3 (external consumer adoption) |
| **Team** | 1 AI agent |
| **Operator** | Single-operator autonomous (via `/run sprint-plan` or `/run-bridge`) |
| **Quality gates** | Review + Audit per sprint |
| **Version bump** | v2.2.0 → v2.3.0 (MINOR — new optional fields, new utility, documentation, no breaking changes) |

### Philosophy

> *"The bridge holds. What crosses it next will determine whether it becomes a thoroughfare or a monument."* — The Bridgebuilder

Cycles 001-003 built a protocol that is correct, well-tested, and internally consistent. Cycle-004 prepares it for Phase 3 of the Cambrian pattern — the moment when external consumers, Go/Python services, and model providers the team doesn't control start building against these schemas.

The Bridgebuilder's post-flatline review identified 4 findings that the convergence loop *couldn't* have found (they require a wider lens than code correctness): schema evolution strategy, saga choreography specification, capability-discovery composition, and lifecycle guard conditions. These are the questions that mature protocols (gRPC, CloudEvents, OpenTelemetry) discovered through years of production exposure. We address them before production.

### Sprint Sequencing

```
Sprint 1: Protocol Resilience — Schema Evolution & Cross-Version Strategy  ── 1 session
  BB-POST-001: Schema evolution migration strategy document
  BB-POST-001: validateBillingEntry() cross-field utility
  BB-POST-004: Lifecycle guard condition documentation
  Forward-looking: Version bump to v2.3.0
    |
Sprint 2: Protocol Completeness — Saga Choreography & Discovery Composition ── 1 session
  BB-POST-002: TransferSagaSpec choreography constants
  BB-POST-002: Saga choreography test vectors (5 scenarios)
  BB-POST-003: capabilities_url on ProtocolDiscovery
  BB-POST-003: Discovery → Capability integration test
  BB-POST-004: Guard condition predicates for lifecycle transitions
```

---

## Sprint 1: Protocol Resilience — Schema Evolution & Cross-Version Strategy

**Global ID:** 12
**Label:** Protocol Resilience — Schema Evolution & Cross-Version Strategy
**Goal:** Harden the protocol for cross-version communication and fill remaining cross-field validation gaps.
**Findings addressed:** BB-POST-001, BB-POST-004 (partial)

### S1-T1: Schema Evolution Migration Strategy Document

**Finding:** BB-POST-001 (Medium — `additionalProperties: false` prevents N/N-1 wire compat)
**Description:** Create `MIGRATION.md` section (or extend existing) documenting the schema evolution strategy for cross-version communication. Address: (1) what happens when a v2.2.0 producer sends to a v2.1.0 consumer with strict validation, (2) recommended consumer patterns for forward-compatible validation, (3) which schemas are "strict" (`additionalProperties: false`) vs "extensible" (`additionalProperties: true`), (4) the relationship between `MIN_SUPPORTED_VERSION` and wire-level compatibility.

**Acceptance Criteria:**
- [ ] Document lists every schema with its `additionalProperties` policy and rationale
- [ ] Document includes "Consumer Upgrade Guide" with version matrix
- [ ] Document addresses the `DomainEventBatch.saga` forward-compat scenario explicitly
- [ ] Document recommends "validate then strip unknown fields" pattern for strict consumers
- [ ] SCHEMA-CHANGELOG updated with v2.3.0 section referencing the strategy

**Effort:** Medium
**Testing:** Documentation review — verify all schema names match actual `$id` values

---

### S1-T2: validateBillingEntry() Cross-Field Utility

**Finding:** BB-POST-001 (derived — Bridgebuilder noted the billing multiplier gap)
**Description:** Create `validateBillingEntry()` utility that checks the cross-field invariant: `total_cost_micro = raw_cost_micro * multiplier_bps / 10000` (using BigInt arithmetic). This completes the defense-in-depth picture alongside `validateBillingRecipients()` and `validateSealingPolicy()`.

**Acceptance Criteria:**
- [ ] Function signature: `validateBillingEntry(entry: BillingEntry): { valid: true } | { valid: false; reason: string }`
- [ ] Validates: `BigInt(total_cost_micro) === BigInt(raw_cost_micro) * BigInt(multiplier_bps) / 10000n`
- [ ] Validates: recipients `share_bps` sums to 10000 (delegates to `validateBillingRecipients`)
- [ ] Validates: recipients `amount_micro` sums to `total_cost_micro`
- [ ] Exported from barrel `src/index.ts`
- [ ] At least 5 test cases: valid entry, mismatched total, mismatched recipients, zero cost, max multiplier boundary

**Effort:** Medium
**Testing:** Unit tests in `tests/vectors/billing-allocation.test.ts`
**Dependencies:** None

---

### S1-T3: Lifecycle Guard Condition Documentation

**Finding:** BB-POST-004 (Low — lifecycle transitions lack guard conditions)
**Description:** Add TSDoc comments to the `AGENT_LIFECYCLE_TRANSITIONS` map documenting the expected guard conditions for each transition. Not runtime enforcement — protocol-level expectations for consumers.

**Acceptance Criteria:**
- [ ] Each transition in `AGENT_LIFECYCLE_TRANSITIONS` has a TSDoc `@remarks` or inline comment documenting the expected guard condition
- [ ] `ACTIVE → TRANSFERRED`: "requires active transfer_id"
- [ ] `ACTIVE → ARCHIVED`: "requires owner_requested or admin_action, must NOT have active transfer"
- [ ] `TRANSFERRED → PROVISIONING`: "requires transfer completed, new owner authenticated"
- [ ] `SUSPENDED → ACTIVE`: "requires suspension reason resolved"
- [ ] Comments reference the Kubernetes pod lifecycle parallel

**Effort:** Low
**Testing:** No code changes beyond comments — verified by schema generation passing

---

### S1-T4: Version Bump to v2.3.0

**Description:** Bump `CONTRACT_VERSION` in `version.ts` from `2.2.0` to `2.3.0`. Update `package.json`. Regenerate all schemas. Run full test suite.

**Acceptance Criteria:**
- [ ] `version.ts` CONTRACT_VERSION = '2.3.0'
- [ ] `package.json` version = '2.3.0'
- [ ] All 22+ schemas regenerated with `scripts/generate-schemas.ts`
- [ ] Schema check passes: `scripts/check-schemas.ts`
- [ ] All tests pass
- [ ] SCHEMA-CHANGELOG v2.3.0 section complete

**Effort:** Low
**Testing:** Full test suite + schema generation + schema check
**Dependencies:** S1-T1, S1-T2, S1-T3 (version bump happens after all changes land)

---

## Sprint 2: Protocol Completeness — Saga Choreography & Discovery Composition

**Global ID:** 13
**Label:** Protocol Completeness — Saga Choreography & Discovery Composition
**Goal:** Specify the transfer saga choreography, connect capability negotiation to protocol discovery, and add guard condition predicates.
**Findings addressed:** BB-POST-002, BB-POST-003, BB-POST-004 (completion)

### S2-T1: Transfer Saga Choreography Constants

**Finding:** BB-POST-002 (Medium — transfer saga choreography unspecified)
**Description:** Create `src/vocabulary/transfer-choreography.ts` defining the expected event sequence for each `TransferScenario`. This is the "state machine documentation" that tells Go/Python consumers what events to expect during a transfer.

**Acceptance Criteria:**
- [ ] `TRANSFER_CHOREOGRAPHY` constant maps each `TransferScenario` to an ordered array of `EventType` values
- [ ] `sale` scenario: `[transfer.saga.initiated, conversation.thread.sealed, agent.lifecycle.transitioned (→TRANSFERRED), billing.entry.created, transfer.saga.completed]`
- [ ] `gift` scenario: `[transfer.saga.initiated, conversation.thread.sealed, agent.lifecycle.transitioned (→TRANSFERRED), transfer.saga.completed]` (no billing)
- [ ] `admin_recovery` scenario: `[transfer.saga.initiated, agent.lifecycle.transitioned (→TRANSFERRED), transfer.saga.completed]` (no sealing — admin override)
- [ ] `custody_change` scenario: `[transfer.saga.initiated, conversation.thread.sealed, agent.lifecycle.transitioned (→TRANSFERRED), transfer.saga.completed]`
- [ ] Compensation (rollback) sequences documented for each scenario
- [ ] Exported from barrel `src/index.ts`
- [ ] TypeScript type `TransferChoreography` for the mapping shape

**Effort:** Medium
**Testing:** Type checks + unit tests verifying choreography arrays contain valid EventType values

---

### S2-T2: Saga Choreography Test Vectors

**Finding:** BB-POST-002 (derived)
**Description:** Create JSON test vectors in `vectors/transfer/choreography.json` that exercise each transfer scenario's expected event sequence. Each vector contains a sequence of `DomainEvent` objects representing a complete saga.

**Acceptance Criteria:**
- [ ] 5 valid vectors: one per TransferScenario (sale, gift, admin_recovery, custody_change) + one compensation/rollback
- [ ] 3 invalid vectors: out-of-order events, missing required events, duplicate saga steps
- [ ] Each vector includes `saga` context with correct `step`, `direction`, `total_steps`
- [ ] Test file validates vectors against DomainEventSchema + SagaContextSchema
- [ ] Vectors include realistic `event_id`, `aggregate_id`, `correlation_id` values

**Effort:** Medium
**Testing:** New test file `tests/vectors/transfer-choreography.test.ts`
**Dependencies:** S2-T1

---

### S2-T3: capabilities_url on ProtocolDiscovery

**Finding:** BB-POST-003 (Low — capability and discovery schemas disconnected)
**Description:** Add `capabilities_url` optional field to `ProtocolDiscoverySchema` — a pointer to the capability negotiation endpoint. This turns the discovery document into a navigable gateway: schemas + aggregates + capabilities.

**Acceptance Criteria:**
- [ ] `capabilities_url` field added: `Type.Optional(Type.String({ format: 'uri', description: 'URL for capability negotiation endpoint' }))`
- [ ] `buildDiscoveryDocument()` updated to accept optional `capabilitiesUrl` parameter
- [ ] JSON Schema regenerated
- [ ] Discovery test vectors updated with `capabilities_url` example
- [ ] SCHEMA-CHANGELOG entry for ProtocolDiscovery v2.3.0

**Effort:** Low
**Testing:** Update existing `tests/vectors/discovery.test.ts`

---

### S2-T4: Discovery-Capability Integration Test

**Finding:** BB-POST-003 (derived)
**Description:** Create an integration test that demonstrates the full discovery → capability flow: build discovery document → extract capabilities_url → build capability query → validate capability response. This proves the schemas compose into a navigable system.

**Acceptance Criteria:**
- [ ] Test demonstrates: `buildDiscoveryDocument()` → extract `capabilities_url` → construct `CapabilityQuery` → validate mock `CapabilityResponse` → verify `contract_version` matches across all three
- [ ] Test validates that `CapabilityResponse.contract_version` matches `ProtocolDiscovery.contract_version`
- [ ] Test verifies `CapabilityResponse.responded_at` is a valid ISO 8601 datetime

**Effort:** Low
**Testing:** New test in `tests/vectors/discovery.test.ts` or `tests/integration/`
**Dependencies:** S2-T3

---

### S2-T5: Lifecycle Guard Condition Predicates

**Finding:** BB-POST-004 (completion)
**Description:** Extend `createTransitionValidator()` in `src/utilities/lifecycle.ts` with optional named guard predicates that document (and optionally enforce) the expected conditions for each transition. This is the code-level companion to the TSDoc comments from S1-T3.

**Acceptance Criteria:**
- [ ] New type: `TransitionGuard = (from: AgentLifecycleState, to: AgentLifecycleState, context?: Record<string, unknown>) => boolean`
- [ ] `DEFAULT_GUARDS` constant with guard predicates for key transitions (ACTIVE→TRANSFERRED requires `context.transfer_id`, ACTIVE→ARCHIVED requires no active transfer)
- [ ] `createTransitionValidator()` accepts optional `guards` parameter
- [ ] When guards provided, transitions are checked against both the transition map AND the guard predicate
- [ ] Exported from barrel `src/index.ts`
- [ ] At least 4 test cases: valid guarded transition, rejected by guard, no guard (permissive), custom guard

**Effort:** Medium
**Testing:** Unit tests in `tests/vectors/agent-lifecycle.test.ts`
**Dependencies:** S1-T3

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Schema evolution doc reveals deeper `additionalProperties` issues | Medium | High | Document the issue honestly; recommend consumer patterns rather than retroactive schema changes |
| Transfer choreography events don't match loa-finn's actual implementation | Low | Medium | Cross-reference with loa-finn event emission code; choreography is *expected* sequence, not enforced |
| `capabilities_url` added to strict schema may break v2.2.0 consumers | Low | Low | Field is Optional — strict consumers with `additionalProperties: false` on ProtocolDiscovery will reject v2.3.0 documents (this is exactly the scenario S1-T1 documents) |
| Guard condition predicates add runtime overhead | Low | Low | Guards are optional — `createTransitionValidator()` without guards behaves identically to current |

## Dependencies

```
S1-T1 (Migration doc)        ──┐
S1-T2 (validateBillingEntry) ──┤── S1-T4 (version bump)
S1-T3 (Guard docs)           ──┘
                                      |
S2-T1 (Choreography)         ── S2-T2 (Choreography vectors)
S2-T3 (capabilities_url)     ── S2-T4 (Integration test)
S1-T3 (Guard docs)           ── S2-T5 (Guard predicates)
```

## Success Metrics

| Metric | Target |
|--------|--------|
| All existing 232 tests still passing | 0 regressions |
| New test count | +15 minimum |
| Schema evolution strategy documented | Complete |
| Transfer choreography specified for all 4 scenarios | Complete |
| Discovery → Capability composition demonstrated | Integration test passing |
| Version bumped to v2.3.0 | Published |
