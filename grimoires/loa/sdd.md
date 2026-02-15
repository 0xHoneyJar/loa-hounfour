# SDD: loa-hounfour v4.6.0 — The Formalization Release

**Status:** Draft
**Author:** Agent (Simstim Phase 3: Architecture)
**Date:** 2026-02-15
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**Cycle:** cycle-009
**Sources:**
- PRD v4.6.0 — The Formalization Release (Level 4)
- Bridgebuilder Level 4 Architectural Review (PR #2 comments 11-12)
- Existing codebase: 54 TypeScript source files, 5,819 lines, 799 tests
- Previous SDD: `context/sdd-v4.4.0-archived.md`

---

## 1. Executive Summary

This SDD defines the architecture for extending `@0xhoneyjar/loa-hounfour` from v4.5.0 (Level 3: Behavioral) to v4.6.0 (Level 4: Civilizational). The package remains a zero-runtime-dependency TypeScript library. All changes are additive — no breaking changes, no new runtime dependencies.

**Architecture philosophy:** Formalize, don't rewrite. The existing module structure (schemas, validators, vocabulary, utilities, integrity, test-infrastructure) is preserved. New vocabulary modules are added alongside existing ones. The ProtocolStateTracker is refactored to be data-driven but retains economy-specific helpers. A new `constraints/` directory is added for cross-language constraint distribution.

**Key architectural decisions:**
1. Constraints distributed alongside JSON Schemas (`constraints/*.constraints.json`)
2. ProtocolStateTracker becomes generic + economy methods (data-driven core, domain-specific helpers)
3. Post-implementation: `/run-bridge --depth 3` for iterative review to flatline

---

## 2. Module Architecture

### Existing Modules (Unchanged)

```
src/
├── schemas/            # 30+ TypeBox schema definitions
├── validators/         # Cross-field validator registry + validate()
├── vocabulary/         # 13 domain vocabulary modules
├── utilities/          # Helpers (nft-id, lifecycle, reputation)
├── integrity/          # Request hashing, idempotency
├── test-infrastructure/# ProtocolStateTracker (refactored in this cycle)
├── version.ts          # CONTRACT_VERSION = '4.6.0'
└── index.ts            # Barrel exports
```

### New Modules (v4.6.0)

```
src/
├── vocabulary/
│   ├── state-machines.ts        # FR-1: Unified state machine declarations
│   ├── aggregate-boundaries.ts  # FR-2: Consistency boundary definitions
│   ├── temporal-properties.ts   # FR-3: Safety + liveness specifications
│   ├── deprecation.ts           # FR-6: Schema deprecation lifecycle
│   └── metadata-namespaces.ts   # FR-6: Namespace conventions
├── constraints/
│   └── generator.ts             # FR-4: Constraint file generator
└── index.ts                     # Updated barrel exports

constraints/                     # FR-4: Generated constraint files (npm-distributed)
├── EscrowEntry.constraints.json
├── StakePosition.constraints.json
├── MutualCredit.constraints.json
├── CommonsDividend.constraints.json
├── DisputeRecord.constraints.json
├── Sanction.constraints.json
├── ReputationScore.constraints.json
├── BillingEntry.constraints.json
├── PerformanceRecord.constraints.json
├── ConversationSealingPolicy.constraints.json
└── AccessPolicy.constraints.json

scripts/
└── generate-constraints.ts      # FR-4: Build-time constraint generation
```

### New Test Modules

```
tests/
├── vocabulary/
│   ├── state-machines.test.ts           # FR-1: State machine invariant tests
│   ├── aggregate-boundaries.test.ts     # FR-2: Boundary invariant tests
│   └── temporal-properties.test.ts      # FR-3: Property specification tests
├── constraints/
│   └── round-trip.test.ts               # FR-4: Constraint ↔ validator equivalence
├── properties/
│   ├── state-machine-safety.test.ts     # FR-3: fast-check safety properties
│   └── state-machine-liveness.test.ts   # FR-3: fast-check liveness properties
└── vocabulary/
    └── economy-flow-verification.test.ts # FR-5: Flow verification tests
```

---

## 3. Component Design

### 3.1 FR-1: Unified State Machine Vocabulary

**File:** `src/vocabulary/state-machines.ts`

```typescript
// Type definitions
export interface StateMachineTransition {
  from: string;
  to: string;
  event?: string; // Optional DomainEvent type that triggers this transition
}

export interface StateMachineDefinition {
  id: string;
  initial: string;
  terminal: readonly string[];
  states: readonly string[];
  transitions: readonly StateMachineTransition[];
}

// Declarations
export const STATE_MACHINES: Record<string, StateMachineDefinition>;

// Derived utilities
export function getValidTransitions(machineId: string, fromState: string): string[];
export function isTerminalState(machineId: string, state: string): boolean;
export function isValidTransition(machineId: string, from: string, to: string): boolean;
```

**State machine definitions:**

| Machine | States | Initial | Terminal | Transitions |
|---------|--------|---------|----------|-------------|
| escrow | held, released, disputed, refunded, expired | held | released, refunded, expired | 5 transitions |
| stake | active, vested, slashed, withdrawn | active | slashed, withdrawn | 4 transitions |
| credit | extended, settled | extended | settled | 1 transition |

**Escrow machine detail:**
```
held → released (economy.escrow.released)
held → disputed (economy.escrow.disputed)
held → expired  (economy.escrow.expired)
disputed → released (economy.escrow.released)
disputed → refunded (economy.escrow.refunded)
```

**Stake machine detail:**
```
active → vested    (economy.stake.vested)
active → slashed   (economy.stake.slashed)
active → withdrawn (economy.stake.withdrawn)
vested → withdrawn (economy.stake.withdrawn)
```

**Credit machine detail:**
```
extended → settled (economy.credit.settled)
```

**Integration with existing code:**

1. `src/schemas/escrow-entry.ts` — `ESCROW_TRANSITIONS` becomes a re-export derived from `STATE_MACHINES.escrow`:
   ```typescript
   import { STATE_MACHINES, getValidTransitions } from '../vocabulary/state-machines.js';

   // Re-export for backward compatibility
   export const ESCROW_TRANSITIONS: Record<string, readonly string[]> =
     Object.fromEntries(
       STATE_MACHINES.escrow.states.map(s => [s, getValidTransitions('escrow', s)])
     );

   export function isValidEscrowTransition(from: string, to: string): boolean {
     return isValidTransition('escrow', from, to);
   }
   ```

2. `src/test-infrastructure/protocol-state-tracker.ts` — `applyEconomyEvent()` refactored to use a generic `applyStateMachineEvent()` core:
   ```typescript
   private applyStateMachineEvent(
     machineId: string,
     stateMap: Map<string, string>,
     entityId: string,
     targetState: string | null, // null = initial state creation
     notFoundReason: RejectionReason,
     invalidReason: RejectionReason,
   ): ApplyResult { /* data-driven transition logic */ }
   ```
   Economy-specific methods (`getOrphanedEscrows()`) are preserved on top of the generic core.

3. `src/vocabulary/economic-choreography.ts` — References `STATE_MACHINES` by id rather than repeating event types.

### 3.2 FR-2: Aggregate Boundary Definitions

**File:** `src/vocabulary/aggregate-boundaries.ts`

```typescript
export type ConsistencyModel = 'causal' | 'read-your-writes' | 'eventual';

export interface AggregateBoundary {
  id: string;
  root: string;           // Root schema $id
  members: readonly string[]; // Member schema $ids
  invariant: string;       // Prose description of consistency requirement
  ordering: ConsistencyModel;
}

export const AGGREGATE_BOUNDARIES: readonly AggregateBoundary[];
```

**Defined boundaries:**

| ID | Root | Members | Ordering | Invariant |
|----|------|---------|----------|-----------|
| escrow_settlement | EscrowEntry | BillingEntry, TransferEvent | causal | Escrow release and billing creation must be causally ordered |
| dividend_distribution | CommonsDividend | PerformanceRecord | read-your-writes | All source_performance_ids must reference finalized records |
| reputation_computation | ReputationScore | PerformanceRecord, Sanction | eventual | Reputation score reflects latest available data |
| dispute_lifecycle | DisputeRecord | EscrowEntry, Sanction | causal | Dispute resolution must precede escrow release |
| governance_enforcement | Sanction | RoutingConstraint | causal | Sanction imposition must precede routing constraint update |

**Integration with ECONOMY_FLOW:** Each flow entry's source/target schemas must belong to at least one defined boundary. This is verified by structural invariant tests.

### 3.3 FR-3: Temporal Properties

**File:** `src/vocabulary/temporal-properties.ts`

```typescript
export type PropertyType = 'safety' | 'liveness';

export interface TemporalProperty {
  id: string;
  name: string;
  type: PropertyType;
  scope: string;           // Which state machine or schema
  description: string;     // Prose
  formal: string;          // Quasi-formal notation
  testable: boolean;
  test_strategy: string;   // How to verify with fast-check
}

export const TEMPORAL_PROPERTIES: readonly TemporalProperty[];
```

**Safety properties (invariants that must always hold):**

| ID | Name | Scope | Formal |
|----|------|-------|--------|
| S1 | Financial conservation | escrow | always(sum_released + sum_refunded <= sum_held) |
| S2 | Reputation bounded | reputation | always(floor <= score <= ceiling) |
| S3 | Non-negative amounts | economy | always(amount_micro >= 0) for all economic schemas |
| S4 | Escalation monotonicity | sanction | always(severity[n+1] >= severity[n]) for same violation_type |
| S5 | Terminal state absorbing | escrow, stake, credit | always(terminal_state has no outbound transitions) |
| S6 | Share conservation | commons-dividend | always(sum(share_bps) == 10000) |

**Liveness properties (things that must eventually happen):**

| ID | Name | Scope | Formal |
|----|------|-------|--------|
| L1 | Escrow termination | escrow | eventually(state in terminal) when expires_at is set |
| L2 | Dispute resolution | dispute | eventually(state in {resolved, withdrawn}) |
| L3 | Stake maturation | stake | eventually(state in {vested, slashed, withdrawn}) |

**Test strategy:** Each property generates at least one `fast-check` arbitrary that produces random event sequences and verifies the property holds. The `ProtocolStateTracker` is the oracle — it applies events and checks invariants.

### 3.4 FR-4: Cross-Language Constraint Format

**File:** `src/constraints/generator.ts` + `scripts/generate-constraints.ts`

**Constraint file format** (`constraints/EscrowEntry.constraints.json`):

```json
{
  "$schema": "https://schemas.0xhoneyjar.com/loa-hounfour/constraint-schema.json",
  "schema_id": "EscrowEntry",
  "contract_version": "4.6.0",
  "constraints": [
    {
      "id": "escrow-self-escrow-prevention",
      "expression": "payer_id != payee_id",
      "severity": "error",
      "message": "payer_id and payee_id must be different agents (self-escrow not allowed)",
      "fields": ["payer_id", "payee_id"]
    },
    {
      "id": "escrow-temporal-ordering",
      "expression": "released_at == null || released_at >= held_at",
      "severity": "error",
      "message": "released_at must be >= held_at",
      "fields": ["released_at", "held_at"]
    },
    {
      "id": "escrow-timeout-warning",
      "expression": "state != 'held' || expires_at != null",
      "severity": "warning",
      "message": "held escrow should have expires_at for TTL enforcement",
      "fields": ["state", "expires_at"]
    }
  ]
}
```

**Expression language (minimal, parseable):**

| Operator | Semantics | Example |
|----------|-----------|---------|
| `==`, `!=` | Equality | `payer_id != payee_id` |
| `<`, `>`, `<=`, `>=` | Comparison (strings compared as ISO dates when format: date-time) | `released_at >= held_at` |
| `&&`, `\|\|`, `!` | Logical | `state == 'held' && expires_at == null` |
| `== null`, `!= null` | Null check | `released_at != null` |
| `'literal'` | String literal | `state == 'held'` |
| `field.nested` | Nested field access | `trigger.occurrence_count` |
| `bigint_sum(array, field)` | BigInt summation | `bigint_sum(distribution.recipients, amount_micro) == total_micro` |
| `array.length` | Array length | `distribution.recipients.length > 0` |
| `array.every(expr)` | Universal quantifier | `distribution.recipients.every(share_bps >= 0)` |

**Design constraint:** The expression language must be parseable by a recursive descent parser with no backtracking. No regex, no eval, no function calls except the built-in operators above. Target: <100 lines of Python to parse and evaluate.

**Generation pipeline:**
1. `scripts/generate-constraints.ts` reads each cross-field validator function from `validators/index.ts`
2. For each registered schema, it maps the TypeScript validation logic to constraint expressions
3. Generates `constraints/{SchemaId}.constraints.json`
4. The generator is manual (not automatic extraction from TS) — each constraint is hand-authored to match the validator logic, then a round-trip test verifies equivalence

**Distribution:** Constraint files are added to `package.json` `"files"`:
```json
{
  "files": ["dist", "schemas", "vectors", "constraints"]
}
```

**Round-trip testing:** For each constraint in each file, a test generates valid and invalid documents, runs both the TypeScript validator and a minimal constraint evaluator, and asserts they agree. This prevents drift.

### 3.5 FR-5: Executable ECONOMY_FLOW Verification

**File:** `src/vocabulary/economy-integration.ts` (extended)

```typescript
export interface EconomyFlowEntry {
  source_schema: string;
  target_schema: string;
  linking_field: string;
  description: string;
  // Level 4 addition
  verify?: (source: Record<string, unknown>, target: Record<string, unknown>) => {
    valid: boolean;
    reason?: string;
  };
}
```

**Verification functions (5 total):**

| Flow | Verification Logic |
|------|-------------------|
| PerformanceRecord → ReputationScore | Target `agent_id` matches source `agent_id` |
| ReputationScore → RoutingConstraint | Target `min_reputation` <= source `score` |
| RoutingConstraint → BillingEntry | Target `pool_id` matches source constraint pool |
| Sanction → RoutingConstraint | Target `trust_level` consistent with source `severity` |
| PerformanceRecord → CommonsDividend | Target `source_performance_ids` includes source record id |

**Utility function:**
```typescript
export function verifyEconomyFlow(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  flowEntry: EconomyFlowEntry,
): { valid: boolean; reason?: string };
```

### 3.6 FR-6: Residual Gap Closure

**3.6.1 Saga Compensation Protocol**

**File:** `src/vocabulary/economic-choreography.ts` (extended)

Add optional `saga_context` to each choreography entry:
```typescript
export interface EconomicScenarioChoreography {
  forward: readonly EventType[];
  compensation: readonly EventType[];
  invariants: readonly { description: string; enforceable: boolean }[];
  saga?: {
    compensation_trigger: string;  // What triggers compensation
    idempotency: string;           // How to ensure compensation is idempotent
  };
}
```

**3.6.2 Schema Deprecation Lifecycle**

**File:** `src/vocabulary/deprecation.ts`

```typescript
export interface DeprecationEntry {
  schema_id: string;
  deprecated_in: string;     // Version where deprecated
  removal_target: string;    // Version where removal planned
  migration_guide: string;   // Prose migration instructions
  replacement?: string;      // Replacement schema $id if applicable
}

export const DEPRECATION_REGISTRY: readonly DeprecationEntry[];
```

Currently empty (no schemas are deprecated). The registry exists as infrastructure for the first deprecation.

**3.6.3 Metadata Namespace Conventions**

**File:** `src/vocabulary/metadata-namespaces.ts`

```typescript
export const METADATA_NAMESPACES = {
  'loa': { description: 'Protocol-level metadata', owner: 'loa-hounfour' },
  'x-': { description: 'Consumer extensions', owner: 'consumer' },
  'trace': { description: 'Observability data', owner: 'infrastructure' },
} as const;

export function isValidMetadataKey(key: string): boolean;
export function getNamespaceOwner(key: string): string | undefined;
```

---

## 4. Data Architecture

### Package Exports (v4.6.0 additions)

```typescript
// New barrel exports in src/index.ts

// FR-1: State Machines
export { STATE_MACHINES, type StateMachineDefinition, type StateMachineTransition,
         getValidTransitions, isTerminalState } from './vocabulary/state-machines.js';

// FR-2: Aggregate Boundaries
export { AGGREGATE_BOUNDARIES, type AggregateBoundary, type ConsistencyModel }
  from './vocabulary/aggregate-boundaries.js';

// FR-3: Temporal Properties
export { TEMPORAL_PROPERTIES, type TemporalProperty, type PropertyType }
  from './vocabulary/temporal-properties.js';

// FR-5: Economy Flow Verification
export { verifyEconomyFlow } from './vocabulary/economy-integration.js';

// FR-6: Deprecation + Metadata
export { DEPRECATION_REGISTRY, type DeprecationEntry } from './vocabulary/deprecation.js';
export { METADATA_NAMESPACES, isValidMetadataKey, getNamespaceOwner }
  from './vocabulary/metadata-namespaces.js';
```

### npm Package Contents

```json
{
  "files": ["dist", "schemas", "vectors", "constraints"]
}
```

New `constraints/` directory ships alongside `schemas/` and `vectors/`. Non-TypeScript consumers access `constraints/` directly from the npm package.

---

## 5. Version & Compatibility

**Version:** `4.6.0` (minor bump, additive only)

**Backward compatibility guarantees:**
- All existing exports preserved (no removals, no renames)
- `ESCROW_TRANSITIONS` and `isValidEscrowTransition` re-exported from `escrow-entry.ts` (unchanged API)
- `ProtocolStateTracker` public API unchanged (`apply()`, `getOrphanedEscrows()`)
- All 799 existing tests must pass unchanged

**New exports:** ~15 new exports added to barrel. No existing export signatures changed.

---

## 6. Testing Strategy

### Test Categories

| Category | Count | Purpose |
|----------|-------|---------|
| State machine invariant tests | ~15 | All transitions reachable, terminals absorbing, no orphan states |
| Aggregate boundary tests | ~10 | Referenced schemas exist, no circular membership, ECONOMY_FLOW coverage |
| Temporal property specification tests | ~10 | Each property well-formed, testable flag correct |
| Property-based safety tests | ~15 | fast-check: financial conservation, bounded reputation, non-negative amounts |
| Property-based liveness tests | ~8 | fast-check: escrow termination, dispute resolution |
| Constraint round-trip tests | ~20 | Each constraint agrees with TypeScript validator |
| Economy flow verification tests | ~10 | Valid/invalid flows, end-to-end pipeline |
| Residual vocabulary tests | ~10 | Deprecation registry, metadata namespaces, saga context |

**Target:** 799 + ~98 = ~900 tests

### Property-Based Testing with fast-check

Safety properties use `fast-check` to generate random event sequences:
```typescript
fc.assert(
  fc.property(
    fc.array(economyEventArbitrary(), { minLength: 1, maxLength: 50 }),
    (events) => {
      const tracker = new ProtocolStateTracker();
      for (const event of events) tracker.apply(event);
      // Safety: all escrow amounts conserved
      return verifyFinancialConservation(tracker);
    }
  )
);
```

Liveness properties verify that random paths eventually terminate:
```typescript
fc.assert(
  fc.property(
    escrowLifecycleArbitrary(), // Generates held → ... → terminal paths
    (lifecycle) => {
      // Every path reaches a terminal state within lifecycle.length steps
      return lifecycle.finalState in STATE_MACHINES.escrow.terminal;
    }
  )
);
```

---

## 7. Sprint Sequence Recommendation

| Sprint | Theme | FRs | New Files | Est. Tests |
|--------|-------|-----|-----------|-----------|
| 1 | Foundation | FR-1 + FR-2 | state-machines.ts, aggregate-boundaries.ts, refactored tracker | ~25 |
| 2 | Formalization | FR-3 | temporal-properties.ts, property-based tests | ~33 |
| 3 | Portability | FR-4 | constraints/generator.ts, generate-constraints.ts, 11 constraint files | ~20 |
| 4 | Integration + Polish | FR-5 + FR-6 + version bump | Extended economy-integration.ts, deprecation.ts, metadata-namespaces.ts | ~20 |

**Dependency chain:** Sprint 1 → Sprint 2 (temporal properties reference state machines) → Sprint 3 (constraints reference validators which reference state machines) → Sprint 4 (integration uses all of the above).

---

## 8. Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| ProtocolStateTracker refactoring breaks existing tests | Write behavioral equivalence tests before refactoring. Run existing 799 tests after each change. |
| Constraint expression language is too limited | Start minimal. Document escape hatch: "for constraints that can't be expressed, use x-requires-native-validator: true flag" |
| fast-check property tests are flaky | Use deterministic seeds. Set `numRuns: 1000` with fixed seed in CI. |
| Constraint files drift from TypeScript validators | Round-trip tests in CI. Generate + check is part of `pnpm run check:all`. |

---

## 9. Architecture Decision Records

**ADR-001: Constraints alongside schemas, not embedded**
- Decision: Separate `constraints/*.constraints.json` files
- Rationale: JSON Schema spec doesn't define `x-constraints` processing. Separate files are independently consumable by any language without JSON Schema library support.
- Alternative rejected: Embedding in JSON Schema `x-` fields (requires JSON Schema parser that preserves extensions)

**ADR-002: ProtocolStateTracker generic core + economy methods**
- Decision: Data-driven transition core with preserved economy-specific helpers
- Rationale: Generic core reduces code duplication and enables future state machines without tracker changes. Economy helpers (getOrphanedEscrows) provide domain value that pure generics can't.
- Alternative rejected: Fully generic (loses domain-specific diagnostics)

**ADR-003: Temporal properties as vocabulary, not executable specs**
- Decision: TypeScript objects with prose + quasi-formal notation, verified by fast-check
- Rationale: Full TLA+ is Level 5 work. Vocabulary + property-based tests provide 80% of the formalization value at 20% of the cost.
- Alternative rejected: TLA+ model (requires toolchain not in devDependencies)
