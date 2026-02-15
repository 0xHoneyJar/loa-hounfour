# Sprint Plan: v4.6.0 — The Formalization Release (Level 4)

**Cycle:** cycle-009
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**SDD:** [grimoires/loa/sdd.md](grimoires/loa/sdd.md)
**Date:** 2026-02-15
**Baseline:** v4.5.0, 799 tests, 42 test files, 54 source files
**Target:** v4.6.0, 900+ tests, zero breaking changes

---

## Sprint Overview

| Sprint | Theme | FRs | Est. Tests | Global ID |
|--------|-------|-----|-----------|-----------|
| 1 | Foundation — State Machines & Aggregate Boundaries | FR-1, FR-2 | ~25 | 31 |
| 2 | Formalization — Temporal Properties | FR-3 | ~33 | 32 |
| 3 | Portability — Cross-Language Constraints | FR-4 | ~22 | 33 |
| 4 | Integration & Polish — Flow Verification, Residual Gaps, v4.6.0 | FR-5, FR-6 | ~20 | 34 |

**Dependency chain:** Sprint 1 → Sprint 2 (temporal properties reference STATE_MACHINES) → Sprint 3 (constraints reference validators which reference state machines) → Sprint 4 (integration uses all of the above).

---

## Sprint 1: Foundation — Unified State Machines & Aggregate Boundaries

**Goal:** Unify the three scattered state machine definitions into a single declarative vocabulary. Define aggregate consistency boundaries. Refactor ProtocolStateTracker to be data-driven. This is the foundation all other sprints build on.

**FRs:** FR-1 (P0), FR-2 (P0)

### S1-T1: Create unified state machine vocabulary

**File:** `src/vocabulary/state-machines.ts`

**Description:** Create the `STATE_MACHINES` record with `StateMachineDefinition` interface containing declarative definitions for all three economic primitives (escrow, stake, credit). Each definition includes: id, initial state, terminal states, all valid states, transitions array (from/to/event), and derived utility functions (`getValidTransitions`, `isTerminalState`, `isValidTransition`).

**State machine specifications:**
- **escrow**: states=[held, released, disputed, refunded, expired], initial=held, terminal=[released, refunded, expired], 5 transitions
- **stake**: states=[active, vested, slashed, withdrawn], initial=active, terminal=[slashed, withdrawn], 4 transitions (active→vested, active→slashed, active→withdrawn, vested→withdrawn)
- **credit**: states=[extended, settled], initial=extended, terminal=[settled], 1 transition

**Acceptance Criteria:**
- [ ] `STATE_MACHINES` export with 3 machine definitions
- [ ] `StateMachineDefinition` and `StateMachineTransition` interfaces exported
- [ ] `getValidTransitions(machineId, fromState)` returns valid target states
- [ ] `isTerminalState(machineId, state)` returns boolean
- [ ] `isValidTransition(machineId, from, to)` returns boolean
- [ ] All transitions include optional `event` field mapping to `EVENT_TYPES` keys

### S1-T2: Derive ESCROW_TRANSITIONS as re-export

**File:** `src/schemas/escrow-entry.ts`

**Description:** Replace the hardcoded `ESCROW_TRANSITIONS` record and `isValidEscrowTransition` function with re-exports derived from `STATE_MACHINES.escrow`. The existing API signatures must be preserved exactly — consumers must not need to change any imports.

**Acceptance Criteria:**
- [ ] `ESCROW_TRANSITIONS` is derived from `STATE_MACHINES.escrow` (not hardcoded)
- [ ] `isValidEscrowTransition(from, to)` delegates to `isValidTransition('escrow', from, to)`
- [ ] All existing tests pass unchanged (behavioral equivalence)
- [ ] Import from `'../vocabulary/state-machines.js'` added

### S1-T3: Refactor ProtocolStateTracker to data-driven core

**File:** `src/test-infrastructure/protocol-state-tracker.ts`

**Description:** Refactor `applyEconomyEvent()` to use a generic `applyStateMachineEvent()` core method that consults `STATE_MACHINES` for transition validation instead of hardcoded `if` chains. The economy-specific methods (`getOrphanedEscrows()`) and the full public API remain unchanged.

**Key changes:**
- Add private `applyStateMachineEvent(machineId, stateMap, entityId, targetState, notFoundReason, invalidReason)` method
- Refactor escrow event handling: extract `escrow_id` from payload, determine target state from event type, delegate to `applyStateMachineEvent('escrow', ...)`
- Refactor stake event handling: same pattern with `'stake'` machine
- Refactor credit event handling: same pattern with `'credit'` machine
- Map event types to target states using `STATE_MACHINES` transitions' event field
- Preserve creation events (`.created`) as initial state entry, not transitions

**Acceptance Criteria:**
- [ ] `applyStateMachineEvent()` is generic and data-driven from STATE_MACHINES
- [ ] All 799 existing tests pass unchanged
- [ ] `getOrphanedEscrows()` still works correctly
- [ ] No hardcoded state transition `if` chains remain in the economy event section
- [ ] `VALID_REJECTION_REASONS` unchanged (existing rejection reason strings preserved)

### S1-T4: Create aggregate boundary definitions

**File:** `src/vocabulary/aggregate-boundaries.ts`

**Description:** Define `AGGREGATE_BOUNDARIES` array with 5 aggregate boundaries specifying consistency requirements between schemas. Each boundary has: id, root schema $id, member schema $ids, prose invariant, and ordering requirement (causal | read-your-writes | eventual).

**Boundaries:**

| ID | Root | Members | Ordering |
|----|------|---------|----------|
| escrow_settlement | EscrowEntry | BillingEntry, TransferEvent | causal |
| dividend_distribution | CommonsDividend | PerformanceRecord | read-your-writes |
| reputation_computation | ReputationScore | PerformanceRecord, Sanction | eventual |
| dispute_lifecycle | DisputeRecord | EscrowEntry, Sanction | causal |
| governance_enforcement | Sanction | RoutingConstraint | causal |

**Acceptance Criteria:**
- [ ] `AGGREGATE_BOUNDARIES` export with 5 entries
- [ ] `AggregateBoundary` and `ConsistencyModel` types exported
- [ ] Each boundary has id, root, members, invariant (string), ordering
- [ ] TSDoc with design rationale and FAANG parallel (DDD aggregates)

### S1-T5: State machine invariant tests + behavioral equivalence tests

**Files:** `tests/vocabulary/state-machines.test.ts`, `tests/test-infrastructure/state-tracker-equivalence.test.ts`

**Description:** Write comprehensive tests for the state machine vocabulary and verify behavioral equivalence of the refactored ProtocolStateTracker.

**Test categories:**
- **Structural invariants** (~8 tests): all transitions are reachable from initial, all terminal states have no outbound transitions, no orphan states (states not in any transition), each machine has exactly one initial state
- **Utility function tests** (~5 tests): `getValidTransitions` returns correct arrays, `isTerminalState` identifies terminals, `isValidTransition` accepts valid and rejects invalid
- **Behavioral equivalence** (~7 tests): Run the exact same event sequences as existing `state-tracker-economy.test.ts` and verify identical results. This proves the refactoring is behavior-preserving.

**Acceptance Criteria:**
- [ ] All 3 machines pass structural invariant checks
- [ ] Every transition in each machine is reachable from the initial state
- [ ] No terminal state has outbound transitions
- [ ] Behavioral equivalence: refactored tracker produces identical results to previous test expectations

### S1-T6: Aggregate boundary structural tests + barrel exports

**Files:** `tests/vocabulary/aggregate-boundaries.test.ts`, `src/index.ts`

**Description:** Write structural tests for aggregate boundaries (all referenced schemas exist in the registry, no circular membership, ECONOMY_FLOW coverage). Update barrel exports to include all new vocabulary.

**Tests (~5):**
- All root and member schema $ids reference real schemas (by checking against exported schemas)
- No circular membership (a root is never its own member)
- Every ECONOMY_FLOW entry's source/target belongs to at least one boundary
- At least 3 boundaries defined
- Ordering field is a valid ConsistencyModel

**Barrel exports to add:**
```typescript
// FR-1: State Machines
export { STATE_MACHINES, type StateMachineDefinition, type StateMachineTransition,
         getValidTransitions, isTerminalState, isValidTransition } from './vocabulary/state-machines.js';

// FR-2: Aggregate Boundaries
export { AGGREGATE_BOUNDARIES, type AggregateBoundary, type ConsistencyModel }
  from './vocabulary/aggregate-boundaries.js';
```

**Acceptance Criteria:**
- [ ] All structural invariants pass
- [ ] Barrel exports updated with FR-1 + FR-2 exports
- [ ] `npm run build` succeeds with new exports

---

## Sprint 2: Formalization — Temporal Properties

**Goal:** Formally specify safety and liveness properties of the protocol's state machines and economic invariants. Create property-based tests using fast-check that verify these properties hold across random event sequences.

**FRs:** FR-3 (P1)

### S2-T1: Create temporal properties vocabulary

**File:** `src/vocabulary/temporal-properties.ts`

**Description:** Define `TEMPORAL_PROPERTIES` array with 6 safety properties and 3 liveness properties. Each property includes: id, name, type (safety|liveness), scope (which machine or schema), description (prose), formal expression (quasi-formal notation suitable for future TLA+ translation), testable flag, and test_strategy.

**Safety properties:**

| ID | Name | Scope | Formal |
|----|------|-------|--------|
| S1 | Financial conservation | escrow | `always(sum_released + sum_refunded <= sum_held)` |
| S2 | Reputation bounded | reputation | `always(floor <= score <= ceiling)` |
| S3 | Non-negative amounts | economy | `always(amount_micro >= 0)` for all economic schemas |
| S4 | Escalation monotonicity | sanction | `always(severity[n+1] >= severity[n])` for same violation_type |
| S5 | Terminal state absorbing | escrow, stake, credit | `always(terminal_state → no outbound transitions)` |
| S6 | Share conservation | commons-dividend | `always(sum(share_bps) == 10000)` |

**Liveness properties:**

| ID | Name | Scope | Formal |
|----|------|-------|--------|
| L1 | Escrow termination | escrow | `eventually(state ∈ terminal)` when `expires_at` is set |
| L2 | Dispute resolution | dispute | `eventually(state ∈ {resolved, withdrawn})` |
| L3 | Stake maturation | stake | `eventually(state ∈ {vested, slashed, withdrawn})` |

**Acceptance Criteria:**
- [ ] `TEMPORAL_PROPERTIES` export with 9 entries (6 safety + 3 liveness)
- [ ] `TemporalProperty` and `PropertyType` interfaces exported
- [ ] Each property references STATE_MACHINES by id where applicable
- [ ] All properties have `testable: true` with clear `test_strategy`
- [ ] TSDoc with FAANG parallel (Amazon TLA+ for safety/liveness)

### S2-T2: Create fast-check arbitraries for economy events

**File:** `tests/helpers/economy-arbitraries.ts`

**Description:** Create reusable fast-check arbitraries for generating random economy event sequences. These arbitraries will be shared across all property-based tests.

**Arbitraries needed:**
- `escrowLifecycleArbitrary()` — generates a sequence of escrow events (create → held → ... → terminal)
- `stakeLifecycleArbitrary()` — generates a sequence of stake events
- `creditLifecycleArbitrary()` — generates a sequence of credit events
- `mixedEconomyEventSequenceArbitrary()` — generates interleaved events across all three machines
- `validDomainEventArbitrary()` — generates a single valid DomainEvent for economy aggregate
- Helper: `amountMicroArbitrary()` — positive BigInt string

**Acceptance Criteria:**
- [ ] All arbitraries produce valid DomainEvent shapes
- [ ] Lifecycle arbitraries generate paths that traverse the state machine
- [ ] Mixed sequence arbitrary interleaves events from all three machines
- [ ] Shared `tests/helpers/` location for reuse across test files

### S2-T3: Implement safety property tests

**File:** `tests/properties/state-machine-safety.test.ts`

**Description:** Implement fast-check property-based tests for all 6 safety properties. Each test generates random event sequences using the arbitraries from S2-T2 and verifies the invariant holds.

**Tests:**
- S1: Financial conservation — across random escrow sequences, released + refunded amounts never exceed held amounts
- S2: Reputation bounded — generate reputation scores with random decay, verify always within [0, 1]
- S3: Non-negative amounts — all generated economic events use non-negative amount_micro
- S4: Escalation monotonicity — random sanction sequences for same violation type have non-decreasing severity
- S5: Terminal state absorbing — after reaching a terminal state, no further transitions are accepted by the tracker
- S6: Share conservation — random dividend distributions always sum to 10000 bps

**Acceptance Criteria:**
- [ ] 6 fast-check property tests, one per safety property
- [ ] `numRuns: 200` minimum per property (configurable, 1000 in CI)
- [ ] Each test uses `ProtocolStateTracker` as the oracle
- [ ] Tests are deterministic with fixed seeds for CI reproducibility

### S2-T4: Implement liveness property tests

**File:** `tests/properties/state-machine-liveness.test.ts`

**Description:** Implement fast-check property-based tests for all 3 liveness properties. Liveness tests generate random paths and verify that terminal states are eventually reachable.

**Tests:**
- L1: Escrow termination — for any escrow with `expires_at`, there exists a valid path from current state to a terminal state
- L2: Dispute resolution — for any dispute, there exists a valid path to resolved or withdrawn
- L3: Stake maturation — for any active stake, there exists a valid path to vested, slashed, or withdrawn

**Note:** Liveness in a finite state machine is verified by showing reachability — for every non-terminal state, at least one terminal state is reachable via some sequence of valid transitions.

**Acceptance Criteria:**
- [ ] 3 fast-check property tests, one per liveness property
- [ ] Tests verify reachability (not temporal logic model checking)
- [ ] Use STATE_MACHINES vocabulary for state enumeration
- [ ] All tests pass with `numRuns: 200`

### S2-T5: Temporal property specification tests + barrel exports

**Files:** `tests/vocabulary/temporal-properties.test.ts`, `src/index.ts`

**Description:** Write specification tests for the temporal properties vocabulary (well-formedness checks) and update barrel exports.

**Specification tests (~6):**
- All properties have unique ids
- All safety properties have type 'safety', all liveness have type 'liveness'
- All properties reference valid STATE_MACHINES ids in their scope
- All properties have non-empty formal expression
- All 9 properties are testable
- Count check: at least 6 safety + 3 liveness

**Barrel exports to add:**
```typescript
// FR-3: Temporal Properties
export { TEMPORAL_PROPERTIES, type TemporalProperty, type PropertyType }
  from './vocabulary/temporal-properties.js';
```

**Acceptance Criteria:**
- [ ] All specification tests pass
- [ ] Barrel exports updated
- [ ] `npm run build` succeeds

---

## Sprint 3: Portability — Cross-Language Constraints

**Goal:** Generate portable constraint files for all 11 cross-field-validated schemas, enabling non-TypeScript consumers (cheval.py, Go/Rust adapters) to enforce the same semantic invariants without reimplementing TypeScript logic.

**FRs:** FR-4 (P1)

### S3-T1: Define constraint format + create constraint generator module

**Files:** `src/constraints/generator.ts`, `src/constraints/types.ts`

**Description:** Define the constraint file JSON format and create the generator infrastructure. The constraint format uses a minimal expression language parseable by any language's recursive descent parser.

**Constraint file schema:**
```typescript
interface ConstraintFile {
  $schema: string;
  schema_id: string;
  contract_version: string;
  constraints: Constraint[];
}

interface Constraint {
  id: string;
  expression: string;
  severity: 'error' | 'warning';
  message: string;
  fields: string[];
}
```

**Expression language operators:** `==`, `!=`, `<`, `>`, `<=`, `>=`, `&&`, `||`, `!`, `== null`, `!= null`, `'literal'`, `field.nested`, `bigint_sum(array, field)`, `array.length`, `array.every(expr)`

**Acceptance Criteria:**
- [ ] `ConstraintFile` and `Constraint` type definitions exported
- [ ] Expression language documented in TSDoc
- [ ] Minimal constraint evaluator function for round-trip testing
- [ ] Format is JSON (no custom DSL, no embedded code)

### S3-T2: Author constraint files for all 11 schemas

**Directory:** `constraints/`

**Description:** Hand-author constraint JSON files for each of the 11 schemas with registered cross-field validators. Each constraint maps directly to a validation rule in `validators/index.ts`.

**Files to create:**

| File | Source Validator | Est. Constraints |
|------|----------------|-----------------|
| `EscrowEntry.constraints.json` | ~7 rules (self-escrow, state co-presence, temporal, timeout) | 7 |
| `StakePosition.constraints.json` | ~2 rules (vesting conservation, immediate schedule) | 2 |
| `MutualCredit.constraints.json` | ~5 rules (self-credit, settled co-presence, temporal) | 5 |
| `CommonsDividend.constraints.json` | ~4 rules (temporal, linkage, share sum, amount conservation) | 4 |
| `DisputeRecord.constraints.json` | ~2 rules (self-dispute, temporal) | 2 |
| `Sanction.constraints.json` | ~4 rules (terminated/expires, temporal, expiry recommendation, escalation) | 4 |
| `ReputationScore.constraints.json` | ~2 rules (sample size, perfect score warning) | 2 |
| `BillingEntry.constraints.json` | ~1 rule (billing entry validation) | 1 |
| `PerformanceRecord.constraints.json` | ~2 rules (dividend split, validated_by) | 2 |
| `ConversationSealingPolicy.constraints.json` | ~1 rule (sealing policy) | 1 |
| `AccessPolicy.constraints.json` | ~1 rule (access policy) | 1 |

**Total:** ~31 constraints across 11 files

**Acceptance Criteria:**
- [ ] 11 constraint files in `constraints/` directory
- [ ] Each constraint has: id, expression, severity, message, fields
- [ ] Constraint ids follow naming convention: `{schema}-{rule-name}`
- [ ] All expressions use only the defined expression language operators
- [ ] Constraints match 1:1 with TypeScript validator rules

### S3-T3: Create constraint generation/validation script

**File:** `scripts/generate-constraints.ts`

**Description:** Create a script that validates constraint files match the TypeScript validator registry. It reads the cross-field validator registry, reads each constraint file, and verifies: (a) every registered schema has a constraint file, (b) every constraint file references a registered schema, (c) constraint count matches expected rules.

**Acceptance Criteria:**
- [ ] Script runs via `npx tsx scripts/generate-constraints.ts --validate`
- [ ] Validates all 11 constraint files exist
- [ ] Reports any constraint files without matching validators (and vice versa)
- [ ] Exit code 0 on success, 1 on mismatch

### S3-T4: Round-trip tests (constraint ↔ validator equivalence)

**File:** `tests/constraints/round-trip.test.ts`

**Description:** For each constraint in each file, generate valid and invalid test documents. Run both the TypeScript cross-field validator and a minimal constraint expression evaluator on each document. Assert they agree (both accept or both reject). This prevents constraint files from drifting.

**Test structure:**
- For each of the 11 schemas:
  - Parse the constraint file
  - For each constraint:
    - Generate a valid document (passes the constraint)
    - Generate an invalid document (violates the constraint)
    - Run TypeScript validator → get result
    - Evaluate constraint expression → get result
    - Assert agreement

**Acceptance Criteria:**
- [ ] Round-trip tests for all 11 schemas
- [ ] Both valid and invalid cases tested per constraint
- [ ] Minimal constraint evaluator handles all expression operators
- [ ] Zero disagreements between TypeScript validators and constraints

### S3-T5: Package distribution + build integration

**Files:** `package.json`, `tsconfig.json` (if needed)

**Description:** Add `constraints/` to the npm package's `"files"` array so constraint files ship with the package. Add validation script to the `check:all` npm script.

**Changes:**
- `package.json`: add `"constraints"` to `"files"` array
- `package.json`: add `"check:constraints": "npx tsx scripts/generate-constraints.ts --validate"` to scripts
- Verify `npm pack` includes constraint files

**Acceptance Criteria:**
- [ ] `constraints/` directory included in `npm pack` output
- [ ] `pnpm run check:constraints` passes
- [ ] No new runtime dependencies added
- [ ] Constraint files accessible at `node_modules/@0xhoneyjar/loa-hounfour/constraints/`

---

## Sprint 4: Integration & Polish — Flow Verification, Residual Gaps, v4.6.0

**Goal:** Make ECONOMY_FLOW executable with verification functions. Close residual NOTES.md gaps (saga compensation, deprecation lifecycle, metadata namespace validation). Bump to v4.6.0.

**FRs:** FR-5 (P2), FR-6 (P2)

### S4-T1: Add verification functions to ECONOMY_FLOW

**File:** `src/vocabulary/economy-integration.ts`

**Description:** Extend the `EconomyFlowEntry` interface with an optional `verify` function. Add verification functions to each of the 5 flow entries that check whether a source document could produce the linked target document.

**Verification logic per flow:**

| Flow | Check |
|------|-------|
| PerformanceRecord → ReputationScore | `target.agent_id === source.agent_id` |
| ReputationScore → RoutingConstraint | `target.min_reputation <= source.score` |
| RoutingConstraint → BillingEntry | `target.pool_id` exists and is a valid pool |
| Sanction → RoutingConstraint | `target.trust_level` consistent with source severity level |
| PerformanceRecord → CommonsDividend | `target.source_performance_ids.includes(source.record_id)` |

**Acceptance Criteria:**
- [ ] `EconomyFlowEntry` interface extended with optional `verify` function
- [ ] 5 verification functions (one per flow entry)
- [ ] `verifyEconomyFlow(source, target, flowEntry)` utility exported
- [ ] Existing ECONOMY_FLOW export shape unchanged (verify is optional)

### S4-T2: Economy flow verification tests

**File:** `tests/vocabulary/economy-flow-verification.test.ts`

**Description:** Write tests for each verification function: valid flows pass, broken flows (wrong agent_id, missing linking field, incorrect pool_id) fail. Include an end-to-end integration test that verifies the full economy pipeline.

**Tests:**
- Per-flow tests (5 flows × 2 cases = 10 tests): valid pair passes, invalid pair fails with reason
- End-to-end pipeline test: PerformanceRecord → ReputationScore → RoutingConstraint → BillingEntry
- Null verify function handling: flow entries without verify are skipped gracefully

**Acceptance Criteria:**
- [ ] 10+ flow verification tests
- [ ] End-to-end pipeline test
- [ ] Both valid and invalid cases covered for each flow

### S4-T3: Add saga_context to ECONOMIC_CHOREOGRAPHY

**File:** `src/vocabulary/economic-choreography.ts`

**Description:** Extend `EconomicScenarioChoreography` with an optional `saga` field containing `compensation_trigger` and `idempotency` descriptions. Add saga context to each of the 3 choreography entries.

**Saga context per scenario:**

| Scenario | Compensation Trigger | Idempotency |
|----------|---------------------|-------------|
| escrow | Release fails, bilateral disagreement | Escrow state is terminal — re-release is no-op |
| stake | Slashing dispute, vesting invalidation | Stake state machine prevents double-slash |
| mutual_credit | Settlement failure, credit default | Settled flag is idempotent boolean transition |

**Acceptance Criteria:**
- [ ] `EconomicScenarioChoreography` interface extended with optional `saga` field
- [ ] All 3 choreography entries have saga context
- [ ] Existing choreography shape unchanged (saga is optional addition)
- [ ] Tests verify saga context is present and well-formed

### S4-T4: Create deprecation registry

**File:** `src/vocabulary/deprecation.ts`

**Description:** Create `DEPRECATION_REGISTRY` as an empty-by-design registry with the `DeprecationEntry` interface. This is infrastructure for the first deprecation — currently no schemas are deprecated.

**Interface:**
```typescript
interface DeprecationEntry {
  schema_id: string;
  deprecated_in: string;
  removal_target: string;
  migration_guide: string;
  replacement?: string;
}
```

**Acceptance Criteria:**
- [ ] `DEPRECATION_REGISTRY` exported (currently empty array)
- [ ] `DeprecationEntry` type exported
- [ ] `getDeprecatedSchemas()` utility returns list of deprecated schema ids
- [ ] `isDeprecated(schemaId)` utility returns boolean
- [ ] Tests verify empty registry works, and a synthetic entry is correctly queryable

### S4-T5: Extend metadata namespace with validation utilities

**File:** `src/vocabulary/metadata.ts` (extend existing)

**Description:** Add `isValidMetadataKey(key)` and `getNamespaceOwner(key)` utility functions to the existing metadata vocabulary module. These functions validate that metadata keys follow namespace conventions and return the owning system.

**Note:** This extends the existing `src/vocabulary/metadata.ts` which already exports `METADATA_NAMESPACES` and `MODEL_METADATA_KEYS`. Do NOT create a new `metadata-namespaces.ts` file — extend the existing module to avoid duplicate exports.

**Acceptance Criteria:**
- [ ] `isValidMetadataKey(key)` returns true if key starts with any known namespace prefix
- [ ] `getNamespaceOwner(key)` returns 'loa-hounfour', 'infrastructure', 'model', or 'consumer'
- [ ] Unknown namespace keys return false / undefined
- [ ] Tests for each namespace prefix validation
- [ ] Existing barrel exports of `METADATA_NAMESPACES` and `MODEL_METADATA_KEYS` unchanged

### S4-T6: Version bump to 4.6.0 + final integration

**Files:** `src/version.ts`, `package.json`, `src/index.ts`

**Description:** Bump `CONTRACT_VERSION` to `'4.6.0'`, update `package.json` version, ensure all barrel exports are complete, and run the full test suite. Verify all 900+ tests pass and zero existing tests are broken.

**Barrel exports to add (cumulative from all sprints):**
```typescript
// FR-5: Economy Flow Verification
export { verifyEconomyFlow } from './vocabulary/economy-integration.js';

// FR-6: Deprecation
export { DEPRECATION_REGISTRY, type DeprecationEntry, getDeprecatedSchemas, isDeprecated }
  from './vocabulary/deprecation.js';

// FR-6: Metadata validation (added to existing export)
export { isValidMetadataKey, getNamespaceOwner } from './vocabulary/metadata.js';
```

**Acceptance Criteria:**
- [ ] `CONTRACT_VERSION` = `'4.6.0'`
- [ ] `package.json` version = `'4.6.0'`
- [ ] All barrel exports present for FR-1 through FR-6
- [ ] All 900+ tests pass (including all 799 existing tests)
- [ ] `pnpm run build` succeeds
- [ ] `pnpm run check:all` passes (including constraint validation)
- [ ] Zero breaking changes to existing exports

---

## Risk Mitigation

| Risk | Mitigation | Sprint |
|------|-----------|--------|
| ProtocolStateTracker refactoring breaks tests | Behavioral equivalence tests (S1-T5) before and after refactoring | 1 |
| Constraint expression language too complex | Start with comparisons + null checks + boolean logic only. `bigint_sum` and `array.every` added only for schemas that need them | 3 |
| fast-check property tests flaky | Deterministic seeds, `numRuns: 200` locally / `1000` in CI | 2 |
| Constraint files drift from validators | Round-trip tests in CI (S3-T4), validation script in `check:all` (S3-T5) | 3 |
| Metadata namespace collision with existing module | Extend `metadata.ts` instead of creating new file (S4-T5) | 4 |

## Success Metrics

| Metric | Target |
|--------|--------|
| Total tests | 900+ (799 baseline + ~100 new) |
| Constraint files | 11 of 11 |
| State machines unified | 3 of 3 |
| Temporal properties | 6 safety + 3 liveness = 9 |
| Aggregate boundaries | 5 |
| ECONOMY_FLOW verifications | 5 of 5 |
| Breaking changes | 0 |
