# Sprint Plan: loa-hounfour v4.5.0 — The Hardening Release

**Cycle:** cycle-008
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**SDD:** [grimoires/loa/sdd.md](grimoires/loa/sdd.md)
**Source:** All suggestions from [PR #2](https://github.com/0xHoneyJar/loa-hounfour/pull/2) — Bridgebuilder Deep Review (Parts 1–4), Bridge Iterations 1–2, PR #1 cross-cutting findings
**Date:** 2026-02-14
**Team:** 1 agent developer (AI-driven)

---

## Overview

4 sprints addressing every finding from the Bridgebuilder reviews on PR #2. This is a hardening release — no new schemas, but significant improvements to safety, discoverability, traceability, and test coverage. All changes are backward-compatible (minor version bump).

**Execution strategy:** Themed sprints. Each sprint addresses a cluster of related findings. Sprint 4 bumps `CONTRACT_VERSION` to `4.5.0` and wires everything together. Total estimated effort: ~3 days.

**Branch:** `feature/v4.5-hardening`

### Findings Addressed

| ID | Severity | Source | Sprint |
|----|----------|--------|--------|
| BB-V4-DEEP-001 | **HIGH** | Bridgebuilder Part 3 | Sprint 1 |
| BB-POST-MERGE-001 | **HIGH** | Bridgebuilder PR #1 Part 3 | Sprint 3 |
| BB-V4-DEEP-002 | **MEDIUM** | Bridgebuilder Part 3 | Sprint 2 |
| BB-V4-DEEP-003 | **MEDIUM** | Bridgebuilder Part 3 | Sprint 2 |
| BB-V4-DEEP-004 | **MEDIUM** | Bridgebuilder Part 3 | Sprint 2 |
| BB-POST-MERGE-002 | **MEDIUM** | Bridgebuilder PR #1 Part 3 | Sprint 3 |
| BB-POST-MERGE-004 | **MEDIUM** | Bridgebuilder PR #1 Part 3 | Sprint 4 |
| BB-V4-DEEP-005 | **LOW** | Bridgebuilder Part 3 | Sprint 4 |
| BB-C7-TEST-003 | **LOW** | Bridge Iter 2 (accepted) | Sprint 4 |
| BB-C7-TEST-004 | **LOW** | Bridge Iter 2 (accepted) | Sprint 2 |
| BB-C7-NAMING-001 | **LOW** | Bridge Iter 2 (accepted) | Sprint 3 |
| BB-C7-NAMING-002 | **LOW** | Bridge Iter 2 (accepted) | Sprint 3 |
| BB-C7-SCHEMA-005 | **LOW** | Bridge Iter 2 (accepted) | Sprint 3 |
| BB-POST-MERGE-003 | **LOW** | Bridgebuilder PR #1 Part 3 | Sprint 3 |

---

## Sprint 1: Sybil Resistance & Reputation Hardening

**Goal:** Address the highest-severity finding: ReputationScore has no Sybil resistance. Add sample-size guards, identity anchoring, and reliability utility.
**Estimated Effort:** ~0.5 day
**Priority:** P0 — Security gap (BB-V4-DEEP-001)

### S1-T1: ReputationScore Identity Anchor

**Description:** Add optional `identity_anchor` field to `ReputationScoreSchema` — a typed reference to the identity verification source (e.g., NFT ownership, OAuth linkage, on-chain proof). This doesn't implement verification, but provides the schema slot for consumers to link reputation to verified identity, making Sybil attacks detectable.

**Files:** `src/schemas/reputation-score.ts`

**Acceptance Criteria:**
- [ ] `identity_anchor` field added as `Type.Optional(Type.Object({ provider: Type.String({ minLength: 1 }), verified_at: Type.String({ format: 'date-time' }) }, { additionalProperties: false }))`
- [ ] Schema description updated to mention identity anchoring
- [ ] Existing tests pass (backward compat — field is optional)
- [ ] New golden vectors: valid with identity_anchor, valid without (backward compat), invalid with malformed anchor

**Testing:** L0 golden vectors

### S1-T2: ReputationScore Cross-Field Validator Hardening

**Description:** Enhance the ReputationScore cross-field validator with Sybil resistance guards. Add minimum sample threshold validation, suspicious-perfection detection, and component weight consistency check.

**Files:** `src/validators/index.ts`

**Acceptance Criteria:**
- [ ] Cross-field validator registered for `ReputationScore`
- [ ] Warning when `sample_size < MIN_REPUTATION_SAMPLE_SIZE` (5) — "insufficient sample for reliable reputation"
- [ ] Warning when `score === 1.0 && sample_size < 10` — "perfect score with low sample is suspicious"
- [ ] Error when any component > 1.0 or < 0.0 (defense in depth beyond schema validation)
- [ ] Error when `decay_applied === true && score > REPUTATION_DECAY.ceiling` — "decayed score cannot exceed ceiling"
- [ ] All validators return proper `{ valid, errors, warnings }` structure
- [ ] Tests for each validation scenario

**Testing:** `tests/cross-field/reputation-score.test.ts`

### S1-T3: Reputation Reliability Utility

**Description:** Export `isReliableReputation()` utility function that consumers can use to gate routing decisions. Encapsulates sample-size threshold, decay status, and freshness checks.

**Files:** `src/utilities/reputation.ts` (new)

**Acceptance Criteria:**
- [ ] `isReliableReputation(score: ReputationScore): { reliable: boolean; reasons: string[] }` exported
- [ ] Returns unreliable when `sample_size < MIN_REPUTATION_SAMPLE_SIZE`
- [ ] Returns unreliable when `last_updated` is older than `2 * REPUTATION_DECAY.half_life_days`
- [ ] Returns unreliable when `decay_applied === false && last_updated > half_life_days` (stale without decay)
- [ ] `reasons` array provides human-readable explanations
- [ ] Barrel export from `src/index.ts`
- [ ] Unit tests covering all combinations

**Testing:** Unit tests in `tests/utilities/reputation.test.ts`

### S1-T4: Barrel Exports + Golden Vectors (Sprint 1)

**Description:** Export new utilities, update golden vectors for reputation schema changes.

**Files:** `src/index.ts`, `vectors/reputation-score/`

**Acceptance Criteria:**
- [ ] `isReliableReputation`, `ReputationScore` type updated in barrel
- [ ] `vectors/reputation-score/valid.json` includes identity_anchor variant
- [ ] `vectors/reputation-score/edge.json` includes low-sample and perfect-score edge cases
- [ ] Full test suite passes
- [ ] No breaking changes to existing API

**Testing:** Build + full test suite

---

## Sprint 2: Financial Lifecycle Completeness

**Goal:** Harden escrow timeout mechanism, connect ESCALATION_RULES to sanctions, link dividends to source performances. Address the three MEDIUM financial findings.
**Estimated Effort:** ~1 day
**Priority:** P1 — Financial safety
**Dependencies:** Sprint 1 complete

### S2-T1: Escrow Timeout Mechanism

**Description:** Add `expires_at` field to `EscrowEntrySchema` for TTL enforcement. Add cross-field validation that `expires_at` is required when state is `held` (escrows must have a deadline), and that `expires_at > held_at`. This addresses BB-V4-DEEP-002: the escrow state machine has an `expired` state but no mechanism to trigger it.

**Files:** `src/schemas/escrow-entry.ts`, `src/validators/index.ts`

**Acceptance Criteria:**
- [ ] `expires_at` field added as `Type.Optional(Type.String({ format: 'date-time' }))` to EscrowEntry
- [ ] Cross-field validator updated: warning when `state === 'held' && !expires_at` — "held escrow should have expires_at for TTL enforcement"
- [ ] Cross-field validator: error when `expires_at && held_at && new Date(expires_at) <= new Date(held_at)` — "expires_at must be after held_at"
- [ ] Cross-field validator: error when `state === 'expired' && !expires_at` — "expired state requires expires_at"
- [ ] Existing escrow tests pass (backward compat — field is optional, warning not error for `held` state)
- [ ] New golden vectors for escrow with expires_at
- [ ] New cross-field test scenarios

**Testing:** L0 golden vectors + cross-field tests

### S2-T2: Sanction Escalation Rules Wiring

**Description:** Wire `ESCALATION_RULES` from `vocabulary/sanctions.ts` into the Sanction cross-field validator. Validate that severity level is consistent with violation_type and occurrence_count based on the escalation thresholds. This addresses BB-V4-DEEP-004: ESCALATION_RULES exist as a vocabulary but are disconnected from the Sanction schema validation.

**Files:** `src/validators/index.ts`

**Acceptance Criteria:**
- [ ] Import `ESCALATION_RULES` in validators/index.ts
- [ ] Sanction cross-field validator: warning when `severity` does not match the expected level from `ESCALATION_RULES[trigger.violation_type]` given `trigger.occurrence_count`
- [ ] Specifically: look up the violation_type in ESCALATION_RULES, find which threshold bracket the occurrence_count falls into, and warn if severity doesn't match the corresponding severity_progression entry
- [ ] Uses warning (not error) — operators may override escalation rules for specific cases
- [ ] Test: billing_fraud with occurrence_count=1 should expect 'terminated'
- [ ] Test: community_guideline with occurrence_count=2 should expect 'warning' (below threshold 3)
- [ ] Test: community_guideline with occurrence_count=7 should expect 'suspended'
- [ ] Test: custom severity accepted with warning (override case)

**Testing:** `tests/cross-field/sanction.test.ts`

### S2-T3: ESCALATION_RULES Structural Invariant Tests

**Description:** Add tests verifying the structural correctness of ESCALATION_RULES. This addresses BB-C7-TEST-004: the static lookup table has no tests ensuring its invariants hold.

**Files:** `tests/vocabulary/escalation-rules.test.ts` (new)

**Acceptance Criteria:**
- [ ] Test: every violation type in VIOLATION_TYPES has an ESCALATION_RULES entry
- [ ] Test: every ESCALATION_RULES entry has `thresholds.length === severity_progression.length`
- [ ] Test: thresholds are monotonically increasing within each entry
- [ ] Test: severity_progression entries are monotonically increasing (per SANCTION_SEVERITY_ORDER)
- [ ] Test: every severity in severity_progression is a valid SANCTION_SEVERITY_LEVELS member
- [ ] Test: billing_fraud and identity_spoofing are immediate termination (thresholds: [1])

**Testing:** Unit tests

### S2-T4: CommonsDividend Source Performance Linkage

**Description:** Add `source_performance_ids` field to `CommonsDividendSchema` — an array of performance_id strings linking the dividend to the PerformanceRecords that generated it. This addresses BB-V4-DEEP-003: dividends are disconnected from their source performances, creating an audit gap.

**Files:** `src/schemas/commons-dividend.ts`, `src/validators/index.ts`

**Acceptance Criteria:**
- [ ] `source_performance_ids` field added as `Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }))` — optional for backward compat, but recommended
- [ ] Cross-field validator updated: warning when `source_performance_ids` is missing — "dividend should link to source performance records for audit trail"
- [ ] Cross-field validator: warning when `distribution` is present but `source_performance_ids` is missing — "distributed dividend without provenance"
- [ ] Existing tests pass (backward compat)
- [ ] New golden vectors with source_performance_ids

**Testing:** L0 golden vectors + cross-field tests

### S2-T5: Barrel Exports + Vectors (Sprint 2)

**Description:** Update golden vectors for all modified schemas. Verify test count increase.

**Files:** `vectors/escrow-entry/`, `vectors/sanction/`, `vectors/commons-dividend/`

**Acceptance Criteria:**
- [ ] All modified schemas have updated golden vectors
- [ ] Full test suite passes
- [ ] Test count increased by 15+ from new scenarios
- [ ] No breaking changes

**Testing:** Build + full test suite

---

## Sprint 3: Schema Discoverability, Naming & Standards

**Goal:** Make cross-field validators discoverable from schemas, align naming conventions, standardize UUID patterns, define the x-experimental lifecycle contract. Address consistency findings.
**Estimated Effort:** ~1 day
**Priority:** P1 — Developer experience
**Dependencies:** Sprint 2 complete

### S3-T1: Shared UUID_V4_PATTERN Constant

**Description:** Extract the `UUID_V4_PATTERN` regex to a shared vocabulary file instead of duplicating it in `escrow-entry.ts` and `stake-position.ts`. This addresses BB-C7-NAMING-002.

**Files:** `src/vocabulary/patterns.ts` (new), `src/schemas/escrow-entry.ts`, `src/schemas/stake-position.ts`

**Acceptance Criteria:**
- [ ] `src/vocabulary/patterns.ts` created with `UUID_V4_PATTERN` constant exported
- [ ] `escrow-entry.ts` and `stake-position.ts` import from `../vocabulary/patterns.js` instead of defining inline
- [ ] Pattern value unchanged: `^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$`
- [ ] Barrel export from `src/index.ts`
- [ ] All existing tests pass
- [ ] Any other schemas using UUID patterns updated to import shared constant

**Testing:** Build + existing tests

### S3-T2: Cross-Field Validator Discoverability

**Description:** Add `x-cross-field-validated: true` extension property to all schemas that have registered cross-field validators. Export `getCrossFieldValidatorSchemas()` function that returns the list of schema $ids with registered validators. This addresses BB-POST-MERGE-001: consumers cannot discover which schemas have cross-field validation from the schema alone.

**Files:** `src/validators/index.ts`, `src/schemas/escrow-entry.ts`, `src/schemas/stake-position.ts`, `src/schemas/mutual-credit.ts`, `src/schemas/commons-dividend.ts`, `src/schemas/performance-record.ts`, `src/schemas/conversation.ts`, `src/schemas/billing-entry.ts`, `src/schemas/sanction.ts`, `src/schemas/dispute-record.ts`, `src/schemas/reputation-score.ts`

**Acceptance Criteria:**
- [ ] All 10+ schemas with cross-field validators have `'x-cross-field-validated': true` in their TypeBox options
- [ ] `getCrossFieldValidatorSchemas(): string[]` exported from `src/validators/index.ts` — returns array of schema $ids with registered validators
- [ ] Generated JSON schemas include `x-cross-field-validated: true` property
- [ ] Test: `getCrossFieldValidatorSchemas()` returns expected set of schema IDs
- [ ] Test: every schema $id in the registry appears in the return value
- [ ] All existing tests pass

**Testing:** Unit test + schema generation verification

### S3-T3: Economic Choreography Naming Alignment

**Description:** Align `ECONOMIC_CHOREOGRAPHY` step names with the canonical `EVENT_TYPES` from `event-types.ts`. Currently the choreography uses shorthand names (`stake.offered`) while EVENT_TYPES uses full aggregate-prefixed names (`economy.stake.created`). This addresses BB-POST-MERGE-002.

**Files:** `src/vocabulary/economic-choreography.ts`

**Acceptance Criteria:**
- [ ] Stake forward path uses EVENT_TYPES keys: `['economy.stake.created', 'economy.stake.vested']`
- [ ] Stake compensation uses: `['economy.stake.withdrawn', 'economy.stake.slashed']`
- [ ] Escrow forward path uses: `['economy.escrow.created', 'economy.escrow.funded', 'economy.escrow.released']`
- [ ] Escrow compensation uses: `['economy.escrow.refunded', 'economy.escrow.expired']`
- [ ] MutualCredit forward uses: `['economy.credit.extended', 'economy.credit.settled']`
- [ ] MutualCredit compensation uses: `['economy.credit.settled']` (forgiven is a settlement method, not a separate event)
- [ ] All step names are valid EVENT_TYPES keys (compile-time check via `satisfies` type)
- [ ] Add type constraint: `forward` and `compensation` arrays contain only `EventType` values
- [ ] Import `EventType` from event-types.ts for type safety
- [ ] Existing choreography tests updated
- [ ] Invariant descriptions unchanged

**Testing:** Compile-time type check + existing tests

### S3-T4: Dispute Type Rename — 'personality' to 'behavioral'

**Description:** Rename the `'personality'` dispute type to `'behavioral'` in `DisputeRecordSchema`. The original name was flagged as a misnomer (BB-C7-SCHEMA-005) — disputes about agent personality changes are more accurately described as behavioral disputes (an agent acting outside its expected behavior profile).

**Files:** `src/schemas/dispute-record.ts`, relevant test files, golden vectors

**Acceptance Criteria:**
- [ ] `Type.Literal('personality')` changed to `Type.Literal('behavioral')` in DisputeRecordSchema
- [ ] `DisputeRecord` TypeScript type updated automatically via `Static<typeof>`
- [ ] Golden vectors updated: 'personality' → 'behavioral' in valid vectors
- [ ] Golden vectors: old 'personality' value in invalid vectors (breaking change, documented)
- [ ] Schema description unchanged
- [ ] Test that 'behavioral' is accepted, 'personality' is rejected
- [ ] Cross-field validator for DisputeRecord unchanged (filed_by !== filed_against)

**Testing:** L0 golden vectors + existing tests updated

### S3-T5: x-experimental Lifecycle Contract

**Description:** Define and document the `x-experimental` lifecycle contract. Create a vocabulary constant describing the lifecycle stages (experimental → stable → deprecated → removed) and the guarantees at each stage. This addresses BB-POST-MERGE-003.

**Files:** `src/vocabulary/schema-stability.ts` (new)

**Acceptance Criteria:**
- [ ] `SCHEMA_STABILITY_LEVELS` constant exported: `{ experimental: {...}, stable: {...}, deprecated: {...} }`
- [ ] Each level has: `label`, `description`, `breaking_change_policy`, `removal_timeline`
- [ ] `experimental`: "No stability guarantees. Schema may change or be removed in any minor version."
- [ ] `stable`: "Follows semver. Breaking changes require major version bump."
- [ ] `deprecated`: "Scheduled for removal. Will be removed in next major version."
- [ ] `isExperimentalSchema(schema: TSchema): boolean` utility exported
- [ ] Barrel export from `src/index.ts`
- [ ] Tests for utility function against known experimental schemas (StakePosition, CommonsDividend, MutualCredit)

**Testing:** Unit tests

### S3-T6: ID Field Format Standardization

**Description:** Document the ID field naming conventions and add TSDoc comments explaining the two patterns used in the codebase. This addresses BB-C7-NAMING-001 (UUID v4 pattern vs opaque minLength:1 strings).

**Files:** `src/vocabulary/patterns.ts` (extend from S3-T1)

**Acceptance Criteria:**
- [ ] `UUID_V4_PATTERN` constant has TSDoc explaining when to use UUID format (financial records, escrow, stakes — entities requiring global uniqueness)
- [ ] `OPAQUE_ID_CONSTRAINTS` constant exported: `{ minLength: 1 }` with TSDoc explaining when to use opaque strings (agent_id, pool_id, community_id — entities where the format is consumer-defined)
- [ ] Decision documented: UUID for protocol-generated IDs, opaque for consumer-provided IDs
- [ ] No schema changes needed — just documentation of the existing convention
- [ ] Barrel export

**Testing:** Import validation

### S3-T7: Barrel Exports + Vectors (Sprint 3)

**Description:** Export all new vocabulary, update golden vectors for modified schemas, bump test count.

**Files:** `src/index.ts`, various vector files

**Acceptance Criteria:**
- [ ] All new exports registered in barrel: `UUID_V4_PATTERN`, `OPAQUE_ID_CONSTRAINTS`, `SCHEMA_STABILITY_LEVELS`, `isExperimentalSchema`, `getCrossFieldValidatorSchemas`
- [ ] All modified schemas have updated golden vectors
- [ ] Full test suite passes
- [ ] Test count increased by 20+ from new scenarios

**Testing:** Build + full test suite

---

## Sprint 4: Integration Schema, Test Hardening & Final Release (v4.5.0)

**Goal:** Create the three-economy integration vocabulary, harden test infrastructure for economy events, extract architectural decisions into code, and ship v4.5.0.
**Estimated Effort:** ~0.5 day
**Priority:** P1 — Integration + release
**Dependencies:** Sprint 3 complete

### S4-T1: Three Economies Integration Vocabulary

**Description:** Create a vocabulary file that defines the typed connection between the three economies (Reputation → Routing → Billing). This is the "integration schema" that BB-V4-DEEP-005 identified as missing — a vocabulary that describes how reputation scores flow into routing constraints which flow into billing decisions.

**Files:** `src/vocabulary/economy-integration.ts` (new)

**Acceptance Criteria:**
- [ ] `ECONOMY_FLOW` constant exported describing the three-economy pipeline:
  ```
  reputation (ReputationScore) → routing (RoutingConstraint.min_reputation) → billing (BillingEntry)
  performance (PerformanceRecord) → reputation (ReputationScore.components) → routing
  governance (Sanction) → routing (RoutingConstraint.trust_level) → billing
  ```
- [ ] Each flow entry has: `source_schema`, `target_schema`, `linking_field`, `description`
- [ ] `EconomyFlowEntry` interface exported
- [ ] TSDoc comments explaining each flow with architectural rationale
- [ ] Not a runtime enforcer — a vocabulary describing the intended data flow for consumers
- [ ] Barrel export

**Testing:** Import validation + type tests

### S4-T2: ProtocolStateTracker Economy Event Handling

**Description:** Enhance `ProtocolStateTracker` to properly track economy aggregate events instead of pass-through. This addresses BB-C7-TEST-003: economy events currently pass through without state tracking.

**Files:** `src/test-infrastructure/protocol-state-tracker.ts`

**Acceptance Criteria:**
- [ ] StateTracker tracks escrow state per `escrow_id` (held → released/disputed/expired)
- [ ] StateTracker validates escrow transitions using `ESCROW_TRANSITIONS`
- [ ] StateTracker tracks stake lifecycle per `stake_id` (created → vested/slashed/withdrawn)
- [ ] StateTracker tracks credit lifecycle per `credit_id` (extended → settled)
- [ ] Invalid economy state transitions are rejected with reason
- [ ] `isConsistent()` checks economy state (no orphaned escrows, no double-settlements)
- [ ] Existing temporal property tests still pass
- [ ] NOT exported from main barrel (test-only)

**Testing:** Unit tests for StateTracker + property tests exercise new paths

### S4-T3: Architectural Decision Comments

**Description:** Add concise architectural decision comments to key files where PR comment discussions captured important design rationale. This addresses BB-POST-MERGE-004: architectural insights trapped in PR comments. Extract the most critical decisions as TSDoc comments.

**Files:** `src/schemas/escrow-entry.ts`, `src/schemas/stake-position.ts`, `src/vocabulary/economic-choreography.ts`, `src/validators/index.ts`, `src/vocabulary/currency.ts`

**Acceptance Criteria:**
- [ ] `escrow-entry.ts`: TSDoc comment explaining why escrow is a separate entity (not billing lifecycle state) — can outlive conversations, multiple billing entries per escrow
- [ ] `stake-position.ts`: TSDoc comment explaining three stake types and their ECSA parallels (conviction=belief, delegation=authority, validation=skin-in-the-game)
- [ ] `economic-choreography.ts`: TSDoc comment explaining forward/compensation pattern from transfer-choreography and Ostrom design principles
- [ ] `validators/index.ts`: TSDoc comment on cross-field validator registry pattern explaining the `crossFieldRegistry` Map and why schemas reference it by $id
- [ ] `currency.ts`: TSDoc comment on the v4.0.0 signed-by-default decision and Stripe parallel
- [ ] Comments are concise (2-4 lines max) and cite the source (BB finding ID or PR # where discussed)
- [ ] No logic changes — documentation only

**Testing:** Build succeeds

### S4-T4: Version Bump + Final Integration (v4.5.0)

**Description:** Bump CONTRACT_VERSION to 4.5.0, update package.json, verify all barrel exports, run full test suite, verify generated JSON schemas.

**Files:** `src/version.ts`, `package.json`, `src/index.ts`

**Acceptance Criteria:**
- [ ] `CONTRACT_VERSION === '4.5.0'`
- [ ] `package.json` version is `4.5.0`
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run test` passes with 700+ tests (up from 670)
- [ ] `pnpm run schema:generate` produces 36+ JSON schemas
- [ ] All new exports present in barrel
- [ ] All `x-cross-field-validated: true` markers present in generated schemas
- [ ] All `x-experimental: true` markers unchanged on experimental schemas
- [ ] No TypeScript `any` types
- [ ] All 14 Bridgebuilder findings addressed

**Testing:** Full pipeline validation

---

## Summary

| Sprint | Theme | Tasks | Findings Addressed | Est. Effort |
|--------|-------|-------|-------------------|-------------|
| 1 | Sybil Resistance & Reputation | 4 | BB-V4-DEEP-001 (HIGH) | ~0.5 day |
| 2 | Financial Lifecycle Completeness | 5 | BB-V4-DEEP-002, 003, 004 (MEDIUM) + BB-C7-TEST-004 (LOW) | ~1 day |
| 3 | Discoverability, Naming & Standards | 7 | BB-POST-MERGE-001 (HIGH), 002, 003 (MEDIUM/LOW) + BB-C7-NAMING-001, 002, SCHEMA-005 (LOW) | ~1 day |
| 4 | Integration, Tests & Release | 4 | BB-V4-DEEP-005 (LOW) + BB-C7-TEST-003 (LOW) + BB-POST-MERGE-004 (MEDIUM) | ~0.5 day |
| **Total** | | **20** | **14 findings** | **~3 days** |

## Success Criteria

| Metric | Target | Source |
|--------|--------|--------|
| Test count | 700+ (up from 670) | Sprint 4 gate |
| Bridgebuilder findings addressed | 14/14 | All findings from PR #2 |
| New golden vectors | 10+ | Escrow, reputation, sanction, dividend |
| Cross-field validators discoverable | 10+ schemas marked | BB-POST-MERGE-001 |
| Economy integration documented | 3 flow paths typed | BB-V4-DEEP-005 |
| Sybil resistance guards | 3 validator checks | BB-V4-DEEP-001 |
| Escrow timeout coverage | expires_at field + validation | BB-V4-DEEP-002 |
| Escalation rules wired | Cross-field warnings | BB-V4-DEEP-004 |
| Breaking changes | 1 (DisputeRecord personality→behavioral) | BB-C7-SCHEMA-005 |
| Backward compat | All other changes additive | Design constraint |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| DisputeRecord type rename breaks consumers | Low | Medium | Only 1 consumer exists (arrakis), and the type was experimental |
| Cross-field validator warnings generate noise | Medium | Low | Warnings are advisory, not errors — consumers can filter |
| Economy StateTracker adds test complexity | Low | Low | Test-only infrastructure, doesn't affect production |
| x-cross-field-validated changes JSON schema output | Low | Low | Extension properties are ignored by standard validators |

## Dependencies

```
Sprint 1 (Reputation) ─── Sprint 2 (Financial) ─── Sprint 3 (Naming) ─── Sprint 4 (Integration + v4.5.0)
     │                        │                        │                        │
     │                        │                        │                        │
 Sybil resistance         Escrow timeout           UUID shared            3-economy integration
 Identity anchor          Escalation wiring        Choreography names     StateTracker economy
 Reliability utility      Dividend audit trail     Cross-field discovery  Architecture comments
                          Escalation tests         Dispute type rename    Version bump
                                                   x-experimental contract
                                                   ID format docs
```

Each sprint builds on the previous but the dependency chain is lightweight — Sprint 3 could technically run in parallel with Sprint 2 if needed.
