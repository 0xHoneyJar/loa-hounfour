# Sprint Plan: loa-hounfour v4.4.0 — The Agent Economy

**Cycle:** cycle-007
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**SDD:** [grimoires/loa/sdd.md](grimoires/loa/sdd.md)
**Source Mission:** [loa-finn#66 — Launch Readiness](https://github.com/0xHoneyJar/loa-finn/issues/66)
**Sources:** Bridgebuilder Deep Review Parts 1–10, ECSA Postcapitalist Framework, Flatline SDD Review
**Date:** 2026-02-14
**Team:** 1 agent developer (AI-driven)

---

## Overview

6 sprints delivering v3.2.0 → v4.4.0 protocol evolution. Each sprint ships one version (independently publishable). Total estimated effort: ~7.5 days.

**Execution strategy:** Version-aligned sprints. Each sprint bumps `CONTRACT_VERSION`, runs the full test suite, and produces a releasable artifact. Sprints 1–5 deliver schemas + vocabulary + validators + vectors. Sprint 6 delivers L2/L3 test infrastructure + final integration.

**Branch:** `feature/v4-agent-economy`

---

## Sprint 1: The Breaking Foundation (v4.0.0)

**Goal:** Ship the breaking changes that clean up financial semantics for launch. Signed MicroUSD, envelope relaxation, new routing primitive.
**Version:** v4.0.0
**Estimated Effort:** ~1.5 days
**Priority:** P0 — Launch enabler

### S1-T1: Signed MicroUSD as Default

**Description:** Change `MicroUSD` pattern from `^[0-9]+$` to `^-?[0-9]+$` and introduce `MicroUSDUnsigned` type for explicit non-negative enforcement. Update `MicroUSDSigned` to alias `MicroUSD`. Update arithmetic functions to accept signed values.

**Files:** `src/vocabulary/currency.ts`

**Acceptance Criteria:**
- [ ] `MicroUSD` pattern is `^-?[0-9]+$`
- [ ] `MicroUSDUnsigned` exported with pattern `^[0-9]+$`
- [ ] `MicroUSDSigned` is now an alias for `MicroUSD`
- [ ] `assertMicro()` accepts negative values via `SIGNED_MICRO_PATTERN`
- [ ] `addMicro()` accepts signed values
- [ ] `subtractMicro()` still throws on negative result
- [ ] All existing currency tests pass (backward compat)
- [ ] New tests: negative values accepted by `MicroUSD`, rejected by `MicroUSDUnsigned`

**Testing:** L0 golden vectors + L1 property tests for arithmetic

### S1-T2: Selective Envelope Relaxation

**Description:** Set `additionalProperties: true` on DomainEvent, DomainEventBatch, and all StreamEvent variants. Financial and identity schemas remain strict.

**Files:** `src/schemas/domain-event.ts`, `src/schemas/stream-events.ts`

**Acceptance Criteria:**
- [ ] `DomainEventSchema` has `additionalProperties: true`
- [ ] `DomainEventBatchSchema` has `additionalProperties: true`
- [ ] All 6 StreamEvent schemas have `additionalProperties: true`
- [ ] All financial schemas remain `additionalProperties: false`
- [ ] Test: extra properties accepted on DomainEvent
- [ ] Test: extra properties rejected on BillingEntry

**Testing:** Golden vectors for envelope relaxation (valid with extra fields, invalid for strict schemas)

### S1-T3: MIN_SUPPORTED_VERSION Bump + Version Update

**Description:** Bump `CONTRACT_VERSION` to `'4.0.0'` and `MIN_SUPPORTED_VERSION` to `'3.0.0'`. Update compatibility validator.

**Files:** `src/version.ts`, `src/validators/compatibility.ts`

**Acceptance Criteria:**
- [ ] `CONTRACT_VERSION === '4.0.0'`
- [ ] `MIN_SUPPORTED_VERSION === '3.0.0'`
- [ ] Compatibility validator rejects v2.4.0
- [ ] Compatibility validator accepts v3.0.0+
- [ ] Existing compatibility tests updated

**Testing:** Version negotiation golden vectors

### S1-T4: RoutingConstraint Schema

**Description:** Create new `RoutingConstraintSchema` with required_capabilities, max_cost_micro, min_health, allowed_providers, trust_level, min_reputation, and contract_version fields. Per SDD Section 5.4.

**Files:** `src/schemas/routing-constraint.ts` (new)

**Acceptance Criteria:**
- [ ] Schema follows established pattern ($id, additionalProperties: false, TSDoc)
- [ ] `min_reputation` is `Type.Number({ minimum: 0, maximum: 1 })`
- [ ] All fields except `contract_version` are optional
- [ ] Compiled validator registered in `src/validators/index.ts`
- [ ] Golden vectors: `vectors/routing-constraint/valid.json`, `invalid.json`
- [ ] 8+ test vectors (3 valid, 3 invalid, 2 edge)

**Testing:** L0 golden vectors

### S1-T5: Domain Event Aggregate Extension

**Description:** Add 4 new aggregate types (performance, governance, reputation, economy) to `AggregateTypeSchema`. Add typed event wrappers and `is*Event()` type guards for each new aggregate.

**Files:** `src/schemas/domain-event.ts`

**Acceptance Criteria:**
- [ ] `AggregateTypeSchema` includes: performance, governance, reputation, economy
- [ ] `PerformanceEvent`, `GovernanceEvent`, `ReputationEvent`, `EconomyEvent` types exported
- [ ] `isPerformanceEvent()`, `isGovernanceEvent()`, `isReputationEvent()`, `isEconomyEvent()` guards exported
- [ ] Existing type guards still work
- [ ] Golden vectors for new aggregate types

**Testing:** L0 schema validation + type guard tests

### S1-T6: Error Codes + Billing Updates

**Description:** Add v4.0.0 error code `ROUTING_CONSTRAINT_VIOLATED`. Update billing utilities to accept signed MicroUSD amounts. Update `validateBillingEntry()` and `allocateRecipients()`.

**Files:** `src/vocabulary/errors.ts`, `src/utilities/billing.ts`, `src/validators/billing.ts`

**Acceptance Criteria:**
- [ ] `ROUTING_CONSTRAINT_VIOLATED` error code with HTTP 403
- [ ] `validateBillingEntry()` accepts signed `raw_cost_micro` and `total_cost_micro`
- [ ] `allocateRecipients()` uses signed arithmetic internally
- [ ] `validateBillingRecipients()` amount sum check uses signed comparison
- [ ] All existing billing tests pass
- [ ] New tests: negative amounts in BillingEntry

**Testing:** L0 + L1 property tests for allocation

### S1-T7: Barrel Exports + Schema Generation (v4.0.0)

**Description:** Export new types from `src/index.ts`. Add RoutingConstraint to schema generation script. Update `package.json` version to `4.0.0`.

**Files:** `src/index.ts`, `scripts/generate-schemas.ts`, `package.json`

**Acceptance Criteria:**
- [ ] `RoutingConstraintSchema`, `RoutingConstraint` type exported
- [ ] `MicroUSDUnsigned` exported from barrel
- [ ] New aggregate event types and guards exported
- [ ] `package.json` version is `4.0.0`
- [ ] Schema generation includes routing-constraint
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run test` passes (all existing + new)
- [ ] v3.2.0 backward compatibility gate: frozen v3.2.0 golden payload suite replayed across all validators (Flatline IMP-003)
- [ ] Compatibility matrix documented in MIGRATION.md (which v3.x payloads accepted, which rejected, transform scripts for edge cases)

**Testing:** Build + full test suite + v3.2.0 corpus replay

---

## Sprint 2: The Performance Layer (v4.1.0)

**Goal:** Introduce outcome tracking — the core value economy primitive. Track what agents produce AND what value they create.
**Version:** v4.1.0
**Estimated Effort:** ~1 day
**Priority:** P0 — Value economy foundation
**Dependencies:** Sprint 1 complete

### S2-T1: PerformanceRecord Schema

**Description:** Create `PerformanceRecordSchema` with output dimension (billing_entry_id, tokens_consumed, model_used), outcome dimension (user_rating, resolution_signal, amplification_count, outcome_validated, validated_by), and dividend dimension (dividend_target, dividend_split_bps). Per SDD Section 6.1.

**Files:** `src/schemas/performance-record.ts` (new)

**Acceptance Criteria:**
- [ ] Schema follows established pattern with `PerformanceOutcomeSchema` sub-schema
- [ ] `outcome.user_rating` has `minimum: 0, maximum: 5`
- [ ] `outcome.amplification_count` has `minimum: 0` as `Type.Integer`
- [ ] `dividend_target` is union of 'private' | 'commons' | 'mixed'
- [ ] `dividend_split_bps` has `minimum: 0, maximum: 10000`
- [ ] Compiled validator registered
- [ ] Golden vectors: 9 vectors (3 valid, 4 invalid, 2 edge)

**Testing:** L0 golden vectors

### S2-T2: ContributionRecord Schema

**Description:** Create `ContributionRecordSchema` for non-financial contributions (Ostrom P2). Six contribution types: curation, training, validation, moderation, infrastructure, capital. Per SDD Section 6.2.

**Files:** `src/schemas/contribution-record.ts` (new)

**Acceptance Criteria:**
- [ ] 6 contribution types defined
- [ ] `assessed_by` union: self, peer, algorithmic, governance_vote
- [ ] `value_micro` uses `MicroUSD` (signed — contributions can be negative adjustments)
- [ ] Compiled validator registered
- [ ] Golden vectors: 5 vectors (2 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors

### S2-T3: Cross-Field Validator API Contract + PerformanceRecord Validator

**Description:** Formalize the `CrossFieldValidatorResult` interface, `CrossFieldValidatorFn` type, `registerCrossFieldValidator()`, and `runCrossFieldValidation()` functions per SDD Section 11.2 (Flatline IMP-002). Implement PerformanceRecord cross-field validator.

**Files:** `src/validators/index.ts`

**Acceptance Criteria:**
- [ ] `CrossFieldValidatorResult` interface exported with `valid`, `errors`, `warnings`
- [ ] `CrossFieldValidatorFn` type exported
- [ ] `registerCrossFieldValidator()` validates schema name matches validator key
- [ ] `runCrossFieldValidation()` returns `{ valid: true, errors: [], warnings: [] }` when no validator registered
- [ ] PerformanceRecord cross-field: `dividend_split_bps` required when `dividend_target === 'mixed'`
- [ ] PerformanceRecord cross-field: warning when `outcome_validated` true but `validated_by` empty
- [ ] Invariant: `result.valid === (result.errors.length === 0)` always holds
- [ ] Tests for all cross-field validation scenarios

**Testing:** `tests/cross-field/performance-record.test.ts`

### S2-T4: Performance Event Types + Barrel Exports

**Description:** Add performance event types, update barrel exports, bump version to 4.1.0.

**Files:** `src/vocabulary/event-types.ts`, `src/index.ts`, `src/version.ts`, `scripts/generate-schemas.ts`, `package.json`

**Acceptance Criteria:**
- [ ] Event types: `performance.record.created`, `performance.outcome.validated`, `performance.dividend.issued`, `performance.contribution.recorded`
- [ ] `PerformanceRecordSchema`, `ContributionRecordSchema` + types exported from barrel
- [ ] Schema generation includes both new schemas
- [ ] `CONTRACT_VERSION === '4.1.0'`
- [ ] `package.json` version is `4.1.0`
- [ ] Full test suite passes

**Testing:** Build + full test suite

---

## Sprint 3: The Governance Layer (v4.2.0)

**Goal:** Implement Ostrom-aligned governance primitives — graduated sanctions, dispute resolution, validated outcomes.
**Version:** v4.2.0
**Estimated Effort:** ~1.5 days
**Priority:** P1 — Governance layer
**Dependencies:** Sprint 2 complete

### S3-T1: Sanctions Vocabulary

**Description:** Create `src/vocabulary/sanctions.ts` with 5 severity levels, 7 violation types, and escalation rules. Per SDD Section 7.1.

**Files:** `src/vocabulary/sanctions.ts` (new)

**Acceptance Criteria:**
- [ ] `SANCTION_SEVERITY_LEVELS`: warning, rate_limited, pool_restricted, suspended, terminated
- [ ] `SANCTION_SEVERITY_ORDER` record for comparison
- [ ] `VIOLATION_TYPES`: content_policy, rate_abuse, billing_fraud, identity_spoofing, resource_exhaustion, community_guideline, safety_violation
- [ ] `ESCALATION_RULES` with thresholds per violation type
- [ ] All types exported (`SanctionSeverity`, `ViolationType`)

**Testing:** Import validation + type tests

### S3-T2: SanctionSchema

**Description:** Create `SanctionSchema` with graduated severity, trigger (violation_type, occurrence_count, evidence_event_ids with minItems: 1), imposed_by, appeal_available, expiry. Per SDD Section 7.2.

**Files:** `src/schemas/sanction.ts` (new)

**Acceptance Criteria:**
- [ ] 5 severity levels as union literals
- [ ] `trigger.evidence_event_ids` has `minItems: 1`
- [ ] `trigger.occurrence_count` has `minimum: 1`
- [ ] `imposed_by`: automatic, moderator, governance_vote
- [ ] `expires_at` is optional (permanent sanctions)
- [ ] Compiled validator registered
- [ ] Golden vectors: 8 vectors (3 valid, 3 invalid, 2 edge)

**Testing:** L0 golden vectors

### S3-T3: DisputeRecord Schema

**Description:** Create `DisputeRecordSchema` for non-financial conflict resolution. 5 dispute types, evidence array with minItems: 1, optional resolution with outcome + links. Per SDD Section 7.3.

**Files:** `src/schemas/dispute-record.ts` (new)

**Acceptance Criteria:**
- [ ] Dispute types: quality, safety, billing, ownership, personality
- [ ] `evidence` array with `minItems: 1`, each item has event_id + description
- [ ] Resolution sub-schema: outcome (upheld/dismissed/compromised), optional sanction_id, credit_note_id
- [ ] Compiled validator registered
- [ ] Golden vectors: 6 vectors (3 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors

### S3-T4: ValidatedOutcome Schema

**Description:** Create `ValidatedOutcomeSchema` for staked quality validation. Links to PerformanceRecord, includes validator stake, rating, dispute status. Per SDD Section 7.4.

**Files:** `src/schemas/validated-outcome.ts` (new)

**Acceptance Criteria:**
- [ ] `validator_stake_micro` uses `MicroUSD`
- [ ] `rating` has `minimum: 0, maximum: 5`
- [ ] `dispute_outcome`: upheld, overturned, split (optional)
- [ ] Compiled validator registered
- [ ] Golden vectors: 5 vectors (2 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors

### S3-T5: Sanction Lifecycle Guard + Lifecycle Reason Codes

**Description:** Add `requiresSanctionEvidence()` guard to `src/utilities/lifecycle.ts`. Add 6 sanction-related lifecycle reason codes. Per SDD Section 7.2.

**Files:** `src/utilities/lifecycle.ts`, `src/vocabulary/lifecycle-reasons.ts`

**Acceptance Criteria:**
- [ ] `requiresSanctionEvidence()` exported from lifecycle.ts
- [ ] Guard allows transitions to SUSPENDED/ARCHIVED when sanction context provided
- [ ] 6 sanction lifecycle reasons: sanction_warning_issued, sanction_rate_limited, sanction_pool_restricted, sanction_suspended, sanction_terminated, sanction_appealed_successfully
- [ ] Guard tests for all transition scenarios

**Testing:** Unit tests for guard function

### S3-T6: Governance Event Types + Error Codes + Barrel Exports

**Description:** Add governance event types, error codes, update barrel exports, bump version.

**Files:** `src/vocabulary/event-types.ts`, `src/vocabulary/errors.ts`, `src/index.ts`, `src/version.ts`, `scripts/generate-schemas.ts`, `package.json`

**Acceptance Criteria:**
- [ ] Governance events: sanction.imposed, sanction.escalated, sanction.expired, sanction.appealed, dispute.filed, dispute.resolved
- [ ] Error codes: SANCTION_ACTIVE (403), SANCTION_APPEAL_DENIED (403), DISPUTE_NOT_FOUND (404), DISPUTE_ALREADY_RESOLVED (409)
- [ ] All schemas + vocabulary exported from barrel
- [ ] Schema generation includes sanction, dispute-record, validated-outcome
- [ ] `CONTRACT_VERSION === '4.2.0'`
- [ ] `package.json` version is `4.2.0`
- [ ] Full test suite passes

**Testing:** Build + full test suite

---

## Sprint 4: The Reputation Layer (v4.3.0)

**Goal:** Build reputation infrastructure for agent quality signals. Connect reputation to routing constraints.
**Version:** v4.3.0
**Estimated Effort:** ~0.5 day
**Priority:** P1 — Quality signals
**Dependencies:** Sprint 3 complete

### S4-T1: Reputation Vocabulary

**Description:** Create `src/vocabulary/reputation.ts` with reputation component weights, decay parameters, and minimum sample size constant. Per SDD Section 8.1.

**Files:** `src/vocabulary/reputation.ts` (new)

**Acceptance Criteria:**
- [ ] `REPUTATION_WEIGHTS`: outcome_quality (0.4), performance_consistency (0.25), dispute_ratio (0.2), community_standing (0.15)
- [ ] `REPUTATION_DECAY`: half_life_days 30, floor 0.1, ceiling 1.0, neutral 0.5
- [ ] `MIN_REPUTATION_SAMPLE_SIZE` = 5
- [ ] `ReputationComponent` type exported

**Testing:** Import validation + type tests

### S4-T2: ReputationScore Schema

**Description:** Create `ReputationScoreSchema` with normalized 0-1 score, 4 component sub-scores, sample_size, decay status. Per SDD Section 8.2.

**Files:** `src/schemas/reputation-score.ts` (new)

**Acceptance Criteria:**
- [ ] `score` has `minimum: 0, maximum: 1`
- [ ] `components` sub-object: outcome_quality, performance_consistency, dispute_ratio, community_standing (all 0-1)
- [ ] `sample_size` is `Type.Integer({ minimum: 0 })`
- [ ] Compiled validator registered
- [ ] Golden vectors: 5 vectors (2 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors

### S4-T3: Agent-as-BillingRecipient

**Description:** Extend `BillingRecipientSchema.role` union with `agent_performer` and `commons` values. Per SDD Section 8.3.

**Files:** `src/schemas/billing-entry.ts`

**Acceptance Criteria:**
- [ ] `role` union includes: provider, platform, producer, agent_tba, agent_performer, commons
- [ ] Existing billing tests pass (backward compat — new union members are additive)
- [ ] New golden vectors with agent_performer and commons roles
- [ ] Exhaustive match warning documented for consumers

**Testing:** L0 golden vectors + existing billing test suite

### S4-T4: Reputation Event Types + Error Code + Barrel Exports

**Description:** Add reputation events, error code, update exports, bump version.

**Files:** `src/vocabulary/event-types.ts`, `src/vocabulary/errors.ts`, `src/index.ts`, `src/version.ts`, `scripts/generate-schemas.ts`, `package.json`

**Acceptance Criteria:**
- [ ] Reputation events: reputation.score.updated, reputation.decay.applied
- [ ] Error code: REPUTATION_INSUFFICIENT (403)
- [ ] `ReputationScoreSchema`, `REPUTATION_WEIGHTS`, `REPUTATION_DECAY`, `MIN_REPUTATION_SAMPLE_SIZE` exported
- [ ] Schema generation includes reputation-score
- [ ] `CONTRACT_VERSION === '4.3.0'`
- [ ] `package.json` version is `4.3.0`
- [ ] Full test suite passes

**Testing:** Build + full test suite

---

## Sprint 5: The Agent Economy (v4.4.0)

**Goal:** Ship escrow, staking, commons dividends, and mutual credit — completing the Value Economy layer. Experimental schemas marked appropriately.
**Version:** v4.4.0
**Estimated Effort:** ~1.5 days
**Priority:** P1 — Agent economy
**Dependencies:** Sprint 4 complete

### S5-T1: Economic Choreography Vocabulary

**Description:** Create `src/vocabulary/economic-choreography.ts` with stake, escrow, and mutual_credit choreographies following the transfer-choreography pattern. Per SDD Section 9.1.

**Files:** `src/vocabulary/economic-choreography.ts` (new)

**Acceptance Criteria:**
- [ ] `EconomicScenarioChoreography` interface with forward, compensation, invariants
- [ ] `ECONOMIC_CHOREOGRAPHY` constant with stake, escrow, mutual_credit scenarios
- [ ] Each scenario has forward path, compensation path, and invariants with enforceable flag
- [ ] Types exported: `EconomicChoreography`, `EconomicScenarioChoreography`

**Testing:** Import validation + type tests

### S5-T2: EscrowEntry Schema + State Machine

**Description:** Create `EscrowEntrySchema` with hold-and-release lifecycle, UUID v4 pattern, MicroUSDUnsigned amount, dispute_id linkage. Implement escrow state machine with transition rules. Per SDD Sections 9.2 + 9.2.1 (Flatline IMP-001, IMP-003, IMP-006).

**Files:** `src/schemas/escrow-entry.ts` (new)

**Acceptance Criteria:**
- [ ] `escrow_id` has UUID v4 pattern constraint
- [ ] `amount_micro` uses `MicroUSDUnsigned`
- [ ] 5 states: held, released, disputed, refunded, expired
- [ ] `dispute_id` optional field (required when state is 'disputed')
- [ ] `ESCROW_TRANSITIONS` record with valid transitions per state
- [ ] `isValidEscrowTransition()` function exported
- [ ] Terminal states: released, refunded (no valid transitions out)
- [ ] EscrowEntry cross-field validator: `released_at` required when state is 'released'
- [ ] Compiled validator registered
- [ ] Golden vectors: 8 vectors (3 valid, 3 invalid, 2 edge — including state transition tests)

**Testing:** L0 golden vectors + cross-field validation tests + state machine tests

### S5-T3: StakePosition Schema (Experimental)

**Description:** Create `StakePositionSchema` with reciprocal investment primitive, vesting schedule, MicroUSDUnsigned amounts. Marked `x-experimental: true`. Per SDD Section 9.3 (Flatline IMP-001).

**Files:** `src/schemas/stake-position.ts` (new)

**Acceptance Criteria:**
- [ ] `stake_id` has UUID v4 pattern
- [ ] `amount_micro`, `vesting.vested_micro`, `vesting.remaining_micro` all use `MicroUSDUnsigned`
- [ ] `stake_type`: conviction, delegation, validation
- [ ] `vesting.schedule`: immediate, performance_gated, time_gated
- [ ] `x-experimental: true` in schema options
- [ ] Cross-field invariant: `vested_micro + remaining_micro == amount_micro` (fails, not warns)
- [ ] Compiled validator registered
- [ ] Golden vectors: 5 vectors (2 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors + cross-field invariant tests

### S5-T4: CommonsDividend Schema (Experimental)

**Description:** Create `CommonsDividendSchema` for community value pools with governance mechanisms. Per SDD Section 9.4.

**Files:** `src/schemas/commons-dividend.ts` (new)

**Acceptance Criteria:**
- [ ] `governance`: mod_discretion, member_vote, algorithmic, stake_weighted
- [ ] `distribution` optional sub-object with recipients array (uses BillingRecipientSchema)
- [ ] `x-experimental: true`
- [ ] Compiled validator registered
- [ ] Golden vectors: 5 vectors (2 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors

### S5-T5: MutualCredit Schema (Experimental)

**Description:** Create `MutualCreditSchema` for agent-to-agent obligations with settlement methods. Per SDD Section 9.5.

**Files:** `src/schemas/mutual-credit.ts` (new)

**Acceptance Criteria:**
- [ ] `credit_type`: refund, prepayment, obligation, delegation
- [ ] `settlement.settlement_method`: direct_payment, reciprocal_performance, commons_contribution, forgiven
- [ ] `x-experimental: true`
- [ ] MutualCredit cross-field validator: `settled_at` and `settlement_method` required when `settled` is true
- [ ] Compiled validator registered
- [ ] Golden vectors: 5 vectors (2 valid, 2 invalid, 1 edge)

**Testing:** L0 golden vectors + cross-field validation tests

### S5-T6: Economy Event Types + Error Codes + Barrel Exports

**Description:** Add economy event types, error codes, update exports, bump to v4.4.0. Wire up all v4.4.0 exports.

**Files:** `src/vocabulary/event-types.ts`, `src/vocabulary/errors.ts`, `src/index.ts`, `src/version.ts`, `scripts/generate-schemas.ts`, `package.json`

**Acceptance Criteria:**
- [ ] Economy events: escrow.held, escrow.released, escrow.disputed, escrow.refunded, escrow.expired, stake.offered, stake.accepted, stake.returned, dividend.issued, credit.issued, credit.acknowledged, credit.settled, credit.forgiven
- [ ] Error codes: ESCROW_NOT_FOUND (404), ESCROW_ALREADY_RELEASED (409), ESCROW_EXPIRED (410), STAKE_NOT_FOUND (404), CREDIT_NOT_FOUND (404), CREDIT_ALREADY_SETTLED (409)
- [ ] All v4.4.0 schemas, types, vocabulary, choreography exported from barrel
- [ ] Schema generation includes all 4 new schemas
- [ ] `CONTRACT_VERSION === '4.4.0'`
- [ ] `package.json` version is `4.4.0`
- [ ] Full test suite passes

**Testing:** Build + full test suite

---

## Sprint 6: Level 4 Test Epistemology + Final Integration (v4.4.0)

**Goal:** Achieve L4 test epistemology — temporal and economic property testing. Cross-runner format script. Final integration and version validation.
**Version:** v4.4.0 (test infrastructure, same version)
**Estimated Effort:** ~1.5 days
**Priority:** P1 — Test quality gate
**Dependencies:** Sprint 5 complete

### S6-T1: ProtocolStateTracker (L2 — Temporal)

**Description:** Create test infrastructure for temporal property testing. Tracks agent lifecycle state, sanction state, and event deduplication across random event sequences. Per SDD Section 12.2.

**Files:** `src/test-infrastructure/protocol-state-tracker.ts` (new)

**Acceptance Criteria:**
- [ ] `ProtocolStateTracker` class with `apply(event)` and `isConsistent()` methods
- [ ] Tracks agent lifecycle state transitions (rejects invalid transitions)
- [ ] Tracks governance/sanction events
- [ ] Deduplicates by event_id
- [ ] `VALID_REJECTION_REASONS` exported
- [ ] NOT exported from main barrel (test-only)

**Testing:** Unit tests for the tracker itself

### S6-T2: ProtocolLedger (L3 — Economic)

**Description:** Create test infrastructure for economic conservation testing. Tracks billing debits/credits and escrow flows. Verifies trial balance invariant. Per SDD Section 12.3.

**Files:** `src/test-infrastructure/protocol-ledger.ts` (new)

**Acceptance Criteria:**
- [ ] `ProtocolLedger` class with `record(event)`, `trialBalance()`, and `isConserved()` methods
- [ ] Tracks billing.entry.created (debits), billing.entry.voided (credits)
- [ ] Tracks economy.escrow.refunded (credits)
- [ ] Escrow hold/release has no ledger impact (funds already counted)
- [ ] `isConserved()` ensures credits never exceed debits
- [ ] NOT exported from main barrel (test-only)

**Testing:** Unit tests for the ledger itself

### S6-T3: L2 Temporal Property Tests

**Description:** fast-check property tests generating random sequences of domain events and verifying protocol state consistency. Per SDD Section 12.2.

**Files:** `tests/properties/temporal.test.ts` (new)

**Acceptance Criteria:**
- [ ] Random event sequences of 2-20 events generated via fast-check
- [ ] Event arbitraries cover all 10 aggregate types
- [ ] Every event either applies or is rejected with a `VALID_REJECTION_REASONS` reason
- [ ] `state.isConsistent()` always true after full sequence
- [ ] 500 iterations minimum
- [ ] Test runs in <30 seconds

**Testing:** Property-based testing via fast-check

### S6-T4: L3 Economic Property Tests

**Description:** fast-check property tests verifying financial conservation invariants across random billing event sequences. Per SDD Section 12.3.

**Files:** `tests/properties/economic.test.ts` (new)

**Acceptance Criteria:**
- [ ] Random billing event sequences of 1-50 events generated
- [ ] `ledger.isConserved()` always true (credits never exceed debits)
- [ ] Trial balance is always non-negative
- [ ] Escrow refund flows correctly credit the ledger
- [ ] Full escrow lifecycle coverage: generators cover all 5 states and all valid transitions via `ESCROW_TRANSITIONS` (Flatline IMP-006)
- [ ] Conservation invariants asserted per escrow state transition (hold→release, hold→dispute→refund, etc.)
- [ ] 200 iterations minimum

**Testing:** Property-based testing via fast-check

### S6-T5: Cross-Runner Format Script + Migration Guide

**Description:** Create `scripts/cross-runner-format.ts` that normalizes vector results to common JSON for diffing across TS/Go/Python/Rust runners. Write migration guide content for v3.2.0 → v4.0.0 consumers.

**Files:** `scripts/cross-runner-format.ts` (new)

**Acceptance Criteria:**
- [ ] Script reads vector results from any runner format
- [ ] Outputs normalized JSON: `{ schema_name, vector_file, result: "pass"|"fail", errors? }`
- [ ] Documentation in script header for consumer CI integration
- [ ] MIGRATION.md section updated with v4.0.0 breaking changes

**Testing:** Script self-test against TS runner output

### S6-T6: Final Integration + Validation

**Description:** Final integration pass: verify all barrel exports, generated JSON schemas (40+), full test suite (600+ target), bundle size check, version consistency.

**Files:** `src/index.ts` (verification), `package.json` (verification)

**Acceptance Criteria:**
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run test` passes with 600+ tests
- [ ] `pnpm run schema:generate` produces 40+ JSON schemas
- [ ] `pnpm run schema:check` passes
- [ ] All new schemas have golden vectors (69 new vectors minimum)
- [ ] Bundle size <60KB gzipped
- [ ] No TypeScript `any` types
- [ ] All experimental schemas have `x-experimental: true`
- [ ] `CONTRACT_VERSION === '4.4.0'`
- [ ] All 11 new compiled validators registered
- [ ] All 3 cross-field validators registered and tested
- [ ] All 4 new aggregate event types tested with type guards
- [ ] Schema descriptions 100% coverage (SchemaStore requirement)

**Testing:** Full pipeline validation

---

## Summary

| Sprint | Version | Tasks | New Files | Modified Files | Est. Vectors | Est. Effort |
|--------|---------|-------|-----------|----------------|-------------|-------------|
| 1 | v4.0.0 | 7 | 1 schema | 8 | 8+ | ~1.5 days |
| 2 | v4.1.0 | 4 | 2 schemas | 4 | 14+ | ~1 day |
| 3 | v4.2.0 | 6 | 3 schemas + 1 vocabulary | 5 | 19+ | ~1.5 days |
| 4 | v4.3.0 | 4 | 1 schema + 1 vocabulary | 4 | 5+ | ~0.5 day |
| 5 | v4.4.0 | 6 | 4 schemas + 1 vocabulary | 5 | 23+ | ~1.5 days |
| 6 | v4.4.0 | 6 | 2 test infra + 1 script | 2 | — | ~1.5 days |
| **Total** | | **33** | **16 new** | **~15 modified** | **69+** | **~7.5 days** |

## Success Criteria

| Metric | Target | Source |
|--------|--------|--------|
| Test count | 600+ (up from 447) | PRD G6 |
| Schema count | 40+ (up from 27) | PRD Metrics |
| Test epistemology | L4 (temporal + economic) | PRD G6 |
| Golden vector count | 30+ files (up from 19) | PRD Metrics |
| v4.0.0 backward compat | 100% v3.2.0 payloads accepted | PRD G7 |
| Bundle size | <60KB gzipped | NFR |
| Cross-runner format | Script + documentation | TR2 |
| Ostrom compliance | 6/8 principles addressed | PRD Scorecard |
| Bridgebuilder findings | All 11 BB findings integrated | PRD Appendix B |

## Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Signed MicroUSD breaks consumer regex | Low | Medium | All unsigned values valid under signed pattern. Migration guide. |
| Envelope relaxation surprises strict consumers | Low | Medium | Only envelopes relaxed. Strip-then-validate documented. |
| Experimental schemas adopted prematurely | Medium | Medium | `x-experimental: true` + stability warnings. |
| L2/L3 property tests add build time | Low | Low | Run in parallel. fast-check shrinking keeps failures fast. |
| 11 new schemas increase bundle size | Low | Low | ESM tree-shaking. Target <60KB gzipped. |
| Economic choreography is speculative | Medium | Low | Vocabulary only — service-layer implements orchestration. |
| Release regression after sequential breaking changes | Medium | High | Release gating: each sprint publishes only after v3.2.0 corpus replay passes. Revert strategy: `npm unpublish` within 72h or `npm deprecate` + patch release. Feature flags for barrel exports if partial rollback needed. (Flatline IMP-001) |

## Dependencies

```
Sprint 1 (v4.0.0) ─── Sprint 2 (v4.1.0) ─── Sprint 3 (v4.2.0) ─── Sprint 4 (v4.3.0) ─── Sprint 5 (v4.4.0) ─── Sprint 6 (L4 Tests)
     │                      │                      │                      │                      │
     │                      │                      │                      │                      │
 Signed MicroUSD       PerformanceRecord       SanctionSchema        ReputationScore        EscrowEntry
 Envelope relaxation   ContributionRecord      DisputeRecord         Agent-as-Recipient     StakePosition
 RoutingConstraint     Cross-field API         ValidatedOutcome      Reputation vocabulary  CommonsDividend
 Aggregates                                    Sanctions vocabulary                         MutualCredit
                                               Sanction guard                               Economic choreography
```

Each sprint is independently shippable as an npm release. Sprint 6 adds test infrastructure without changing any production schemas.
