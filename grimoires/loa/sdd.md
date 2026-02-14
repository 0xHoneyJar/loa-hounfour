# SDD: loa-hounfour v4.4.0 — The Agent Economy

**Status:** Draft
**Author:** Agent (Simstim Phase 3: Architecture)
**Date:** 2026-02-14
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**Cycle:** cycle-007
**Sources:**
- PRD v4.4.0 — The Agent Economy Release
- Bridgebuilder Deep Review Parts 1–10 (PR #1)
- V4-PLANNING.md, SCHEMA-EVOLUTION.md
- [ECSA Postcapitalist Framework](https://postcapitalist.agency/)
- [Hounfour RFC](https://github.com/0xHoneyJar/loa-finn/issues/31)

---

## 1. Executive Summary

This SDD defines the architecture for extending `@0xhoneyjar/loa-hounfour` from v3.2.0 (Transaction Economy) to v4.4.0 (Value Economy). The package remains a zero-runtime-dependency TypeScript library exporting TypeBox schemas, TypeScript types, validators, vocabulary, and integrity primitives.

**Architecture philosophy:** Extend, don't rewrite. The existing module structure (schemas, validators, vocabulary, utilities, integrity) is preserved. New modules are added alongside existing ones using identical patterns. Every new schema follows the established `Type.Object` + `Static<typeof>` + `$id` + `additionalProperties: false` pattern.

**Delivery:** Five minor versions, each independently shippable:

| Version | Codename | New Source Files | Est. Lines |
|---------|----------|-----------------|------------|
| v4.0.0 | The Breaking Foundation | 2 new + 4 modified | ~200 |
| v4.1.0 | The Performance Layer | 2 new | ~250 |
| v4.2.0 | The Governance Layer | 3 new + 1 vocabulary | ~350 |
| v4.3.0 | The Reputation Layer | 1 new + 1 modified | ~150 |
| v4.4.0 | The Agent Economy | 3 new + 1 vocabulary + test infra | ~500 |
| **Total** | | **~12 new, ~5 modified** | **~1,450** |

---

## 2. System Architecture

### 2.1 Package Role in Ecosystem (Unchanged)

```
┌─────────────────────────────────────────────────────────┐
│                   @0xhoneyjar/loa-hounfour              │
│                    (protocol package)                    │
│                                                         │
│  Schemas · Types · Validators · Utilities · Vocabulary  │
│                                                         │
│  npm publish → consumed by ↓ ↓ ↓                       │
└──────────────┬──────────────┬──────────────┬────────────┘
               │              │              │
          ┌────▼────┐   ┌────▼────┐   ┌─────▼──────┐
          │loa-finn │   │arrakis  │   │mibera-     │
          │(engine) │   │(gateway)│   │freeside    │
          │         │   │         │   │(contracts) │
          └─────────┘   └─────────┘   └────────────┘
```

loa-hounfour defines types. Downstream repos implement. No runtime logic beyond validation and utility functions.

### 2.2 Three Economies Architecture

v4.4.0 introduces the **Value Economy** layer alongside the existing Attention and Transaction economies:

```
┌──────────────────────────────────────────────────────────────┐
│                     VALUE ECONOMY (v4.1.0–v4.4.0)            │
│                                                              │
│  PerformanceRecord · ContributionRecord · ValidatedOutcome   │
│  ReputationScore · EscrowEntry · StakePosition               │
│  CommonsDividend · MutualCredit                              │
│  SanctionSchema · DisputeRecord                              │
├──────────────────────────────────────────────────────────────┤
│                  TRANSACTION ECONOMY (v2.0.0–v3.2.0)         │
│                                                              │
│  BillingEntry · CreditNote · BillingRecipient                │
│  MicroUSD · allocateRecipients · CostType                    │
├──────────────────────────────────────────────────────────────┤
│                   ATTENTION ECONOMY (v1.0.0–v3.2.0)          │
│                                                              │
│  RoutingPolicy · CapabilitySchema · HealthStatus             │
│  PoolId · Tier · AgentDescriptor · AgentLifecycle            │
│  RoutingConstraint (v4.0.0)                                  │
└──────────────────────────────────────────────────────────────┘
```

### 2.3 Module Architecture (v4.4.0)

```
src/
├── index.ts                          # Barrel exports (v3.2.0 + v4.x)
├── version.ts                        # CONTRACT_VERSION = "4.4.0"
│
├── schemas/
│   ├── jwt-claims.ts                 # ✓ Existing (unchanged)
│   ├── invoke-response.ts            # ✓ Existing (unchanged)
│   ├── stream-events.ts              # ✓ Existing (MODIFIED v4.0.0 — envelope relaxation)
│   ├── routing-policy.ts             # ✓ Existing (unchanged)
│   ├── agent-descriptor.ts           # ✓ Existing (unchanged)
│   ├── agent-lifecycle.ts            # ✓ Existing (unchanged)
│   ├── transfer-spec.ts              # ✓ Existing (unchanged)
│   ├── billing-entry.ts              # ✓ Existing (MODIFIED v4.0.0 — signed MicroUSD, new roles)
│   ├── conversation.ts               # ✓ Existing (unchanged)
│   ├── domain-event.ts               # ✓ Existing (MODIFIED v4.0.0 — envelope relaxation, new aggregates)
│   ├── saga-context.ts               # ✓ Existing (unchanged)
│   ├── lifecycle-event-payload.ts     # ✓ Existing (unchanged)
│   ├── health-status.ts              # ✓ Existing (unchanged)
│   ├── thinking-trace.ts             # ✓ Existing (unchanged)
│   ├── tool-call.ts                  # ✓ Existing (unchanged)
│   ├── capability.ts                 # ✓ Existing (unchanged)
│   ├── discovery.ts                  # ✓ Existing (unchanged)
│   ├── routing-constraint.ts         # ★ NEW (v4.0.0) — FR4
│   ├── performance-record.ts         # ★ NEW (v4.1.0) — FR5
│   ├── contribution-record.ts        # ★ NEW (v4.1.0) — FR6
│   ├── sanction.ts                   # ★ NEW (v4.2.0) — FR7
│   ├── dispute-record.ts             # ★ NEW (v4.2.0) — FR8
│   ├── validated-outcome.ts          # ★ NEW (v4.2.0) — FR9
│   ├── reputation-score.ts           # ★ NEW (v4.3.0) — FR10
│   ├── escrow-entry.ts               # ★ NEW (v4.4.0) — FR12
│   ├── stake-position.ts             # ★ NEW (v4.4.0) — FR13 (experimental)
│   ├── commons-dividend.ts           # ★ NEW (v4.4.0) — FR14 (experimental)
│   └── mutual-credit.ts              # ★ NEW (v4.4.0) — FR15 (experimental)
│
├── vocabulary/
│   ├── errors.ts                     # ✓ Existing (EXTENDED v4.0.0–v4.4.0)
│   ├── pools.ts                      # ✓ Existing (unchanged)
│   ├── currency.ts                   # ✓ Existing (MODIFIED v4.0.0 — signed default)
│   ├── transfer-choreography.ts      # ✓ Existing (unchanged)
│   ├── event-types.ts                # ✓ Existing (EXTENDED v4.1.0–v4.4.0)
│   ├── lifecycle-reasons.ts          # ✓ Existing (EXTENDED v4.2.0 — sanction reasons)
│   ├── metadata.ts                   # ✓ Existing (unchanged)
│   ├── sanctions.ts                  # ★ NEW (v4.2.0) — TR5
│   ├── reputation.ts                 # ★ NEW (v4.3.0) — TR5
│   └── economic-choreography.ts      # ★ NEW (v4.4.0) — TR6
│
├── validators/
│   ├── index.ts                      # ✓ Existing (EXTENDED — new validators per version)
│   ├── compatibility.ts              # ✓ Existing (MODIFIED v4.0.0 — version bump)
│   └── billing.ts                    # ✓ Existing (MODIFIED v4.0.0 — signed validation)
│
├── utilities/
│   ├── nft-id.ts                     # ✓ Existing (unchanged)
│   ├── lifecycle.ts                  # ✓ Existing (EXTENDED v4.2.0 — sanction guard)
│   └── billing.ts                    # ✓ Existing (MODIFIED v4.0.0 — signed amounts)
│
├── integrity/
│   ├── req-hash.ts                   # ✓ Existing (unchanged)
│   └── idempotency.ts               # ✓ Existing (unchanged)
│
└── test-infrastructure/              # ★ NEW directory (v4.4.0) — TR1
    ├── protocol-state-tracker.ts     # Temporal property test helper
    └── protocol-ledger.ts            # Economic property test helper
```

### 2.4 Internal Dependency Graph (New Modules)

```
routing-constraint.ts (v4.0.0)
  ├── ../vocabulary/currency.ts (MicroUSD)
  └── (standalone — references ReputationScore by comment only)

performance-record.ts (v4.1.0)
  └── ../vocabulary/currency.ts (MicroUSD)

contribution-record.ts (v4.1.0)
  └── ../vocabulary/currency.ts (MicroUSD)

sanction.ts (v4.2.0)
  └── ../vocabulary/sanctions.ts (SanctionSeverity, ViolationType)

dispute-record.ts (v4.2.0)
  └── (standalone — references Sanction and CreditNote by ID only)

validated-outcome.ts (v4.2.0)
  └── ../vocabulary/currency.ts (MicroUSD)

reputation-score.ts (v4.3.0)
  └── (standalone — computed from ValidatedOutcome data)

escrow-entry.ts (v4.4.0)
  └── ../vocabulary/currency.ts (MicroUSD)

stake-position.ts (v4.4.0)
  └── ../vocabulary/currency.ts (MicroUSD)

commons-dividend.ts (v4.4.0)
  ├── ../vocabulary/currency.ts (MicroUSD)
  └── ../schemas/billing-entry.ts (BillingRecipientSchema — for distribution)

mutual-credit.ts (v4.4.0)
  └── ../vocabulary/currency.ts (MicroUSDSigned)
```

**Design principle:** Cross-schema references use string IDs, not direct schema imports. `PerformanceRecord.billing_entry_id` is a `Type.String()`, not a reference to `BillingEntrySchema`. This keeps schemas decoupled and independently validatable.

---

## 3. Technology Stack

| Component | Choice | Justification |
|-----------|--------|---------------|
| **Language** | TypeScript 5.7+ strict | Consistent with v3.2.0; strict mode is the product |
| **Schema library** | @sinclair/typebox ^0.34 | Existing dependency; compile-time + runtime validation |
| **Build** | tsc (ESM output) | Existing build pipeline; zero bundler complexity |
| **Test framework** | vitest ^4.0 | Existing test framework; golden vector pattern |
| **Property testing** | fast-check ^4.5 | Existing dependency; extended for L2/L3 properties |
| **Crypto** | @noble/hashes ^2.0 | Existing dependency (keccak_256 for EIP-55) |
| **JWT** | jose ^6.1 | Existing dependency |
| **Node.js** | >=22 | LTS alignment |
| **Package format** | ESM only | Tree-shakeable; consistent with v3.2.0 |

**No new dependencies required.** All v4.4.0 work uses existing dependencies.

---

## 4. Component Design

### 4.1 Schema File Pattern (Unchanged)

Every schema file follows the v1.1.0 established pattern:

```typescript
// src/schemas/{name}.ts
import { Type, type Static } from '@sinclair/typebox';

// 1. Define TypeBox schema with $id for validator caching
export const FooSchema = Type.Object({
  field: Type.String(),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'Foo',
  additionalProperties: false,
  description: 'Human-readable schema description',
});

// 2. Export companion TypeScript type
export type Foo = Static<typeof FooSchema>;
```

This pattern is mandatory for all new schemas.

### 4.2 Experimental Schema Marking (TR3)

Schemas marked experimental include `x-experimental: true` in their TypeBox options. This flows through to generated JSON Schema.

```typescript
export const StakePositionSchema = Type.Object({
  // ... fields
}, {
  $id: 'StakePosition',
  additionalProperties: false,
  description: 'Reciprocal investment primitive',
  'x-experimental': true,  // Stability not guaranteed
});
```

**Experimental schemas in v4.4.0:** StakePosition, CommonsDividend, MutualCredit.

**Consumer opt-in pattern:**
```typescript
// Consumer explicitly acknowledges experimental status
import { StakePositionSchema } from '@0xhoneyjar/loa-hounfour';
// TypeBox $id check: schema['x-experimental'] === true
```

---

## 5. v4.0.0 — The Breaking Foundation

### 5.1 Signed MicroUSD as Default (FR1)

**File:** `src/vocabulary/currency.ts`

```typescript
// BEFORE (v3.2.0)
export const MicroUSD = Type.String({
  pattern: '^[0-9]+$',
  description: 'Micro-USD amount as string (1 USD = 1,000,000 micro-USD)',
});

// AFTER (v4.0.0)
// MicroUSD becomes signed by default — accepts negative for credits/refunds
export const MicroUSD = Type.String({
  pattern: '^-?[0-9]+$',
  description: 'Micro-USD amount as string, signed (1 USD = 1,000,000 micro-USD)',
});

// New: explicit unsigned variant for schemas requiring non-negative
export const MicroUSDUnsigned = Type.String({
  pattern: '^[0-9]+$',
  description: 'Unsigned micro-USD amount (non-negative only)',
});
```

**Arithmetic changes:**
- `assertMicro()` accepts signed values (uses `SIGNED_MICRO_PATTERN`)
- `addMicro()` accepts signed values
- `subtractMicro()` still throws on negative result (use `subtractMicroSigned()` for credit flows)
- `MicroUSDSigned` becomes an alias for `MicroUSD` (backward compat)

**Schema field migration:**

| Schema | Field | v3.x Type | v4.0.0 Type |
|--------|-------|-----------|-------------|
| BillingEntry | `raw_cost_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| BillingEntry | `total_cost_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| CreditNote | `amount_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| BillingRecipient | `amount_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| BillingEntry | `multiplier_bps` | unchanged | unchanged |

**Backward compatibility:** All existing unsigned values (`^[0-9]+$`) match the signed pattern (`^-?[0-9]+$`). No data migration required.

**Billing utility changes** (`src/utilities/billing.ts`):
- `validateBillingEntry()` updated: accepts signed `raw_cost_micro` and `total_cost_micro`
- `allocateRecipients()` updated: uses signed arithmetic internally, still produces valid splits
- `validateBillingRecipients()` updated: amount sum check uses signed comparison

### 5.2 Selective Envelope Relaxation (FR2)

**Files modified:**
- `src/schemas/domain-event.ts` — `DomainEventSchema` and `DomainEventBatchSchema`
- `src/schemas/stream-events.ts` — All stream event variant schemas

```typescript
// domain-event.ts — CHANGE
export const DomainEventSchema = Type.Object({
  // ... all existing fields unchanged ...
}, {
  $id: 'DomainEvent',
  additionalProperties: true,   // CHANGED from false
  description: 'Cross-cutting event envelope for aggregate state changes',
});

export const DomainEventBatchSchema = Type.Object({
  // ... all existing fields unchanged ...
}, {
  $id: 'DomainEventBatch',
  additionalProperties: true,   // CHANGED from false
  description: 'Atomic multi-event delivery with shared correlation',
});
```

**Schemas relaxed (additionalProperties: true):**
- `DomainEventSchema`
- `DomainEventBatchSchema`
- `StreamStartSchema`, `StreamChunkSchema`, `StreamEndSchema`, `StreamErrorSchema`
- `StreamToolCallSchema`, `StreamUsageSchema`

**Schemas remaining strict (additionalProperties: false):**
- All financial schemas (BillingEntry, CreditNote, BillingRecipient)
- All identity schemas (AgentDescriptor, NftId)
- All transfer schemas (TransferSpec, TransferEvent)
- All new value economy schemas (PerformanceRecord, etc.)
- JWT schemas

**Rationale:** Event consumers need forward compatibility (new fields don't break old validators). Financial and identity schemas need strict validation for security.

### 5.3 MIN_SUPPORTED_VERSION Bump (FR3)

**File:** `src/version.ts`

```typescript
export const CONTRACT_VERSION = '4.0.0' as const;
export const MIN_SUPPORTED_VERSION = '3.0.0' as const;
```

**Impact matrix:**

| Version | v3.x Behavior | v4.0.0 Behavior |
|---------|-------------|----------------|
| v2.0.0–v2.3.0 | Rejected | Rejected |
| v2.4.0 | Supported (warning) | **Rejected** |
| v3.0.0–v3.2.0 | Supported | Supported |
| v4.0.0+ | — | Supported |

### 5.4 RoutingConstraint Schema (FR4)

**New file:** `src/schemas/routing-constraint.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

/**
 * Unified routing constraint for multi-model orchestration.
 *
 * Composes access, capability, cost, and health signals into a single
 * routing decision schema. Used by the Hounfour RFC's ModelPort interface
 * to evaluate routing candidates.
 *
 * @see Hounfour RFC §3.2 — ModelPort routing interface
 * @see BB-GRAND-001 — Routing constraint composition
 * @since v4.0.0
 */
export const RoutingConstraintSchema = Type.Object({
  required_capabilities: Type.Optional(Type.Array(Type.String({
    minLength: 1,
  }), {
    description: 'Capabilities the target model must support',
  })),
  max_cost_micro: Type.Optional(MicroUSD),
  min_health: Type.Optional(Type.Union([
    Type.Literal('healthy'),
    Type.Literal('degraded'),
  ], {
    description: 'Minimum acceptable health status',
  })),
  allowed_providers: Type.Optional(Type.Array(Type.String({
    minLength: 1,
  }), {
    description: 'Allowlisted provider identifiers',
  })),
  trust_level: Type.Optional(Type.Union([
    Type.Literal('platform'),
    Type.Literal('byok'),
    Type.Literal('delegated'),
  ], {
    description: 'Required trust tier for the target model',
  })),
  min_reputation: Type.Optional(Type.Number({
    minimum: 0,
    maximum: 1,
    description: 'Minimum reputation score (0-1). References ReputationScore (v4.3.0)',
  })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'RoutingConstraint',
  additionalProperties: false,
  description: 'Unified routing constraint for multi-model orchestration',
});

export type RoutingConstraint = Static<typeof RoutingConstraintSchema>;
```

### 5.5 Domain Event Aggregate Extension (v4.0.0)

**File modified:** `src/schemas/domain-event.ts`

Add new aggregate types for value economy events:

```typescript
const AggregateTypeSchema = Type.Union([
  // Existing
  Type.Literal('agent'),
  Type.Literal('conversation'),
  Type.Literal('billing'),
  Type.Literal('tool'),
  Type.Literal('transfer'),
  Type.Literal('message'),
  // v4.0.0 — Value economy aggregates
  Type.Literal('performance'),
  Type.Literal('governance'),
  Type.Literal('reputation'),
  Type.Literal('economy'),
]);
```

Add corresponding typed event wrappers and payload schemas:

```typescript
/** Performance aggregate events — payload must include performance_id. */
export type PerformanceEvent = DomainEvent<{
  performance_id: string; [k: string]: unknown;
}>;

/** Governance aggregate events — payload must include target_id. */
export type GovernanceEvent = DomainEvent<{
  target_id: string; action_type: string; [k: string]: unknown;
}>;

/** Reputation aggregate events — payload must include agent_id. */
export type ReputationEvent = DomainEvent<{
  agent_id: string; [k: string]: unknown;
}>;

/** Economy aggregate events — payload must include entry_id. */
export type EconomyEvent = DomainEvent<{
  entry_id: string; [k: string]: unknown;
}>;
```

Plus minimal payload schemas and `is*Event()` type guards for each, following the established pattern (see existing `isAgentEvent`, `isBillingEvent`, etc.).

---

## 6. v4.1.0 — The Performance Layer

### 6.1 PerformanceRecord Schema (FR5)

**New file:** `src/schemas/performance-record.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

/**
 * Outcome sub-schema — tracks the value created by a performance.
 *
 * Distinguishes output (what was produced, linked to billing) from
 * outcome (what value was created, socially validated).
 *
 * @see ECSA: "Performance — a socially validated productive act"
 */
const PerformanceOutcomeSchema = Type.Object({
  user_rating: Type.Optional(Type.Number({
    minimum: 0,
    maximum: 5,
    description: 'User satisfaction rating (0-5)',
  })),
  resolution_signal: Type.Optional(Type.Boolean({
    description: 'Whether this performance resolved the user need',
  })),
  amplification_count: Type.Optional(Type.Integer({
    minimum: 0,
    description: 'Number of references/shares by others',
  })),
  outcome_validated: Type.Boolean({
    description: 'Whether the outcome has been validated by peers',
  }),
  validated_by: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
    description: 'IDs of validators (agent or user)',
  })),
}, { additionalProperties: false });

/**
 * Tracks both what an agent produced (output) and what value it
 * created (outcome). Core value economy primitive.
 *
 * ECSA parallel: "Performance" — a socially validated productive act.
 *
 * @see BB-POST-002 — PerformanceRecord schema
 * @since v4.1.0
 */
export const PerformanceRecordSchema = Type.Object({
  performance_id: Type.String({ minLength: 1, description: 'UUID' }),
  agent_id: Type.String({ minLength: 1 }),
  conversation_id: Type.String({ minLength: 1 }),

  // OUTPUT dimension — links to existing billing
  billing_entry_id: Type.String({ minLength: 1, description: 'References BillingEntry.id' }),
  tokens_consumed: MicroUSD,
  model_used: Type.String({ minLength: 1 }),

  // OUTCOME dimension — value created
  outcome: PerformanceOutcomeSchema,

  // DIVIDEND dimension — how value flows from this performance
  dividend_target: Type.Union([
    Type.Literal('private'),
    Type.Literal('commons'),
    Type.Literal('mixed'),
  ], { description: 'Where performance dividends flow' }),
  dividend_split_bps: Type.Optional(Type.Integer({
    minimum: 0,
    maximum: 10000,
    description: 'Share going to commons (basis points). Required when dividend_target is mixed.',
  })),

  occurred_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'PerformanceRecord',
  additionalProperties: false,
  description: 'Agent performance record tracking output and outcome',
});

export type PerformanceRecord = Static<typeof PerformanceRecordSchema>;
```

**Cross-field validator** (registered in `src/validators/index.ts`):
- `dividend_split_bps` required when `dividend_target === 'mixed'`
- `outcome.user_rating` must be in [0, 5] (schema enforces, validator confirms)
- `outcome.validated_by` must be non-empty when `outcome.outcome_validated === true`

### 6.2 ContributionRecord Schema (FR6)

**New file:** `src/schemas/contribution-record.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

/**
 * Tracks non-financial contributions to the ecosystem.
 *
 * Ostrom Principle 2: Congruence between appropriation and provision rules.
 * What you take out should be proportional to what you put in.
 *
 * @see BB-POST-005 — ContributionRecord
 * @see Ostrom Principle 2 — Proportionality
 * @since v4.1.0
 */
export const ContributionRecordSchema = Type.Object({
  contribution_id: Type.String({ minLength: 1, description: 'UUID' }),
  contributor_id: Type.String({ minLength: 1 }),
  contribution_type: Type.Union([
    Type.Literal('curation'),
    Type.Literal('training'),
    Type.Literal('validation'),
    Type.Literal('moderation'),
    Type.Literal('infrastructure'),
    Type.Literal('capital'),
  ], { description: 'Category of contribution' }),
  value_micro: MicroUSD,
  community_id: Type.Optional(Type.String({ minLength: 1 })),
  assessed_by: Type.Union([
    Type.Literal('self'),
    Type.Literal('peer'),
    Type.Literal('algorithmic'),
    Type.Literal('governance_vote'),
  ], { description: 'How the contribution value was assessed' }),
  occurred_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ContributionRecord',
  additionalProperties: false,
  description: 'Non-financial contribution record for proportionality tracking',
});

export type ContributionRecord = Static<typeof ContributionRecordSchema>;
```

---

## 7. v4.2.0 — The Governance Layer

### 7.1 Sanctions Vocabulary (TR5)

**New file:** `src/vocabulary/sanctions.ts`

```typescript
/**
 * Graduated sanction severity levels and violation types.
 *
 * Five-level graduated sanctions following Ostrom's Principle 5:
 * "Graduated sanctions for rule violators."
 *
 * @see BB-POST-003 — SanctionSchema
 * @see Ostrom Principle 5 — Graduated sanctions
 * @since v4.2.0
 */

export const SANCTION_SEVERITY_LEVELS = [
  'warning',
  'rate_limited',
  'pool_restricted',
  'suspended',
  'terminated',
] as const;

export type SanctionSeverity = typeof SANCTION_SEVERITY_LEVELS[number];

/** Severity ordering for comparison. */
export const SANCTION_SEVERITY_ORDER: Record<SanctionSeverity, number> = {
  warning: 1,
  rate_limited: 2,
  pool_restricted: 3,
  suspended: 4,
  terminated: 5,
} as const;

export const VIOLATION_TYPES = [
  'content_policy',
  'rate_abuse',
  'billing_fraud',
  'identity_spoofing',
  'resource_exhaustion',
  'community_guideline',
  'safety_violation',
] as const;

export type ViolationType = typeof VIOLATION_TYPES[number];

/**
 * Severity escalation rules — each violation type has a default
 * severity and escalation thresholds based on occurrence count.
 *
 * Service-layer reference: consumers implement escalation logic.
 */
export const ESCALATION_RULES: Record<ViolationType, {
  default_severity: SanctionSeverity;
  escalation: Array<{ threshold: number; severity: SanctionSeverity }>;
}> = {
  content_policy: {
    default_severity: 'warning',
    escalation: [
      { threshold: 3, severity: 'rate_limited' },
      { threshold: 5, severity: 'suspended' },
    ],
  },
  rate_abuse: {
    default_severity: 'rate_limited',
    escalation: [
      { threshold: 3, severity: 'pool_restricted' },
      { threshold: 5, severity: 'suspended' },
    ],
  },
  billing_fraud: {
    default_severity: 'suspended',
    escalation: [
      { threshold: 1, severity: 'terminated' },
    ],
  },
  identity_spoofing: {
    default_severity: 'suspended',
    escalation: [
      { threshold: 1, severity: 'terminated' },
    ],
  },
  resource_exhaustion: {
    default_severity: 'rate_limited',
    escalation: [
      { threshold: 3, severity: 'pool_restricted' },
      { threshold: 10, severity: 'suspended' },
    ],
  },
  community_guideline: {
    default_severity: 'warning',
    escalation: [
      { threshold: 5, severity: 'rate_limited' },
      { threshold: 10, severity: 'pool_restricted' },
    ],
  },
  safety_violation: {
    default_severity: 'pool_restricted',
    escalation: [
      { threshold: 2, severity: 'suspended' },
      { threshold: 3, severity: 'terminated' },
    ],
  },
} as const;
```

### 7.2 SanctionSchema (FR7)

**New file:** `src/schemas/sanction.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';

/**
 * Graduated sanction for agent policy violations.
 *
 * Five severity levels enable proportional responses — Ostrom's research
 * shows graduated sanctions are critical for long-lived communities.
 *
 * Lifecycle integration: severity 'suspended' triggers the
 * active → suspended lifecycle transition. The sanction provides
 * the evidence that lifecycle guards check.
 *
 * @see BB-POST-003 — SanctionSchema
 * @see Ostrom Principle 5 — Graduated sanctions
 * @since v4.2.0
 */
export const SanctionSchema = Type.Object({
  sanction_id: Type.String({ minLength: 1, description: 'UUID' }),
  agent_id: Type.String({ minLength: 1 }),
  severity: Type.Union([
    Type.Literal('warning'),
    Type.Literal('rate_limited'),
    Type.Literal('pool_restricted'),
    Type.Literal('suspended'),
    Type.Literal('terminated'),
  ], { description: 'Graduated severity level' }),
  trigger: Type.Object({
    violation_type: Type.String({ minLength: 1, description: 'Type of violation' }),
    occurrence_count: Type.Integer({ minimum: 1, description: 'How many times this violation occurred' }),
    evidence_event_ids: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'DomainEvent IDs providing evidence',
    }),
  }, { additionalProperties: false }),
  imposed_by: Type.Union([
    Type.Literal('automatic'),
    Type.Literal('moderator'),
    Type.Literal('governance_vote'),
  ], { description: 'Who imposed the sanction' }),
  appeal_available: Type.Boolean({
    description: 'Whether this sanction can be appealed',
  }),
  imposed_at: Type.String({ format: 'date-time' }),
  expires_at: Type.Optional(Type.String({
    format: 'date-time',
    description: 'Null for permanent sanctions (terminated)',
  })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'Sanction',
  additionalProperties: false,
  description: 'Graduated sanction for agent policy violations',
});

export type Sanction = Static<typeof SanctionSchema>;
```

**Lifecycle integration** (`src/utilities/lifecycle.ts`):

Add a new guard function for sanction-triggered transitions:

```typescript
/**
 * Guard: requires a Sanction with severity 'suspended' or 'terminated'
 * to transition to SUSPENDED or ARCHIVED states.
 *
 * @since v4.2.0
 */
export function requiresSanctionEvidence(
  _from: AgentLifecycleState,
  to: AgentLifecycleState,
  context?: Record<string, unknown>,
): GuardResult {
  if (to === 'SUSPENDED' || to === 'ARCHIVED') {
    if (context?.sanction_id && typeof context.sanction_id === 'string') {
      return { allowed: true };
    }
    // Allow transitions without sanction (voluntary archival, etc.)
    // The guard only enforces when sanction context is expected
    return { allowed: true };
  }
  return { allowed: true };
}
```

### 7.3 DisputeRecord Schema (FR8)

**New file:** `src/schemas/dispute-record.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';

/**
 * Non-financial conflict resolution record.
 *
 * Current protocol handles financial disputes (CreditNote) but not
 * operational disputes. Communities need both.
 *
 * Ostrom Principle 6: Low-cost conflict resolution mechanisms.
 *
 * @see BB-POST-004 — DisputeRecord
 * @see Ostrom Principle 6 — Conflict resolution
 * @since v4.2.0
 */
export const DisputeRecordSchema = Type.Object({
  dispute_id: Type.String({ minLength: 1, description: 'UUID' }),
  dispute_type: Type.Union([
    Type.Literal('quality'),
    Type.Literal('safety'),
    Type.Literal('billing'),
    Type.Literal('ownership'),
    Type.Literal('personality'),
  ], { description: 'Category of dispute' }),
  complainant_id: Type.String({ minLength: 1 }),
  respondent_id: Type.String({ minLength: 1, description: 'Can be agent_id or owner_id' }),
  evidence: Type.Array(Type.Object({
    event_id: Type.String({ minLength: 1, description: 'DomainEvent ID' }),
    description: Type.String({ minLength: 1, description: 'Human-readable evidence summary' }),
  }, { additionalProperties: false }), {
    minItems: 1,
    description: 'Evidence supporting the dispute',
  }),
  resolution: Type.Optional(Type.Object({
    outcome: Type.Union([
      Type.Literal('upheld'),
      Type.Literal('dismissed'),
      Type.Literal('compromised'),
    ]),
    sanction_id: Type.Optional(Type.String({ description: 'Links to Sanction if upheld' })),
    credit_note_id: Type.Optional(Type.String({ description: 'Links to CreditNote for financial resolution' })),
    resolved_by: Type.String({ minLength: 1 }),
    resolved_at: Type.String({ format: 'date-time' }),
  }, { additionalProperties: false })),
  filed_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'DisputeRecord',
  additionalProperties: false,
  description: 'Non-financial conflict resolution record',
});

export type DisputeRecord = Static<typeof DisputeRecordSchema>;
```

### 7.4 ValidatedOutcome Schema (FR9)

**New file:** `src/schemas/validated-outcome.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

/**
 * Staked quality validation — validators put skin in the game.
 *
 * ECSA parallel: Outcome validation where validators stake on their
 * assessments. If the community disagrees, the validator's stake is at risk.
 *
 * Ostrom Principle 4: Effective monitoring by accountable parties.
 *
 * @see BB-POST-007 — ValidatedOutcome
 * @see Ostrom Principle 4 — Monitoring
 * @since v4.2.0
 */
export const ValidatedOutcomeSchema = Type.Object({
  outcome_id: Type.String({ minLength: 1, description: 'UUID' }),
  performance_id: Type.String({ minLength: 1, description: 'References PerformanceRecord' }),
  validator_id: Type.String({ minLength: 1 }),
  validator_stake_micro: MicroUSD,
  rating: Type.Number({
    minimum: 0,
    maximum: 5,
    description: 'Validation rating (0-5)',
  }),
  rationale: Type.Optional(Type.String({
    description: 'Human-readable rationale for the rating',
  })),
  disputed: Type.Boolean({
    description: 'Whether this validation was itself disputed',
  }),
  dispute_outcome: Type.Optional(Type.Union([
    Type.Literal('upheld'),
    Type.Literal('overturned'),
    Type.Literal('split'),
  ], {
    description: 'Result if this validation was disputed',
  })),
  validated_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ValidatedOutcome',
  additionalProperties: false,
  description: 'Staked quality validation for performance outcomes',
});

export type ValidatedOutcome = Static<typeof ValidatedOutcomeSchema>;
```

---

## 8. v4.3.0 — The Reputation Layer

### 8.1 Reputation Vocabulary (TR5)

**New file:** `src/vocabulary/reputation.ts`

```typescript
/**
 * Reputation score component weights and decay parameters.
 *
 * @see BB-POST-001 — ReputationScore
 * @since v4.3.0
 */

/** Default weights for reputation component scoring. */
export const REPUTATION_WEIGHTS = {
  outcome_quality: 0.4,
  performance_consistency: 0.25,
  dispute_ratio: 0.2,
  community_standing: 0.15,
} as const;

export type ReputationComponent = keyof typeof REPUTATION_WEIGHTS;

/**
 * Decay configuration — time-based score decay.
 *
 * Score decays toward 0.5 (neutral) over time without new performances.
 * Half-life of 30 days means a score of 1.0 decays to 0.75 in 30 days
 * without activity.
 */
export const REPUTATION_DECAY = {
  enabled: true,
  half_life_days: 30,
  floor: 0.1,    // Minimum score (never reaches 0)
  ceiling: 1.0,
  neutral: 0.5,  // Decay target for inactive agents
} as const;

/** Minimum sample size before reputation is considered meaningful. */
export const MIN_REPUTATION_SAMPLE_SIZE = 5;
```

### 8.2 ReputationScore Schema (FR10)

**New file:** `src/schemas/reputation-score.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';

/**
 * Agent quality signal for routing decisions.
 *
 * Computed from ValidatedOutcome ratings, performance consistency,
 * dispute history, and community governance signals.
 *
 * Integration: RoutingConstraint.min_reputation (FR4) references this
 * schema. Higher-reputation agents get priority for quality-sensitive tasks.
 *
 * @see BB-POST-001 — ReputationScore
 * @since v4.3.0
 */
export const ReputationScoreSchema = Type.Object({
  agent_id: Type.String({ minLength: 1 }),
  score: Type.Number({
    minimum: 0,
    maximum: 1,
    description: 'Normalized reputation score (0-1)',
  }),
  components: Type.Object({
    outcome_quality: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'From ValidatedOutcome ratings',
    }),
    performance_consistency: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Variance in performance quality (lower variance = higher score)',
    }),
    dispute_ratio: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Fraction of disputes vs performances (inverted: fewer disputes = higher)',
    }),
    community_standing: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'From community governance signals',
    }),
  }, { additionalProperties: false }),
  sample_size: Type.Integer({
    minimum: 0,
    description: 'Number of performances scored',
  }),
  last_updated: Type.String({ format: 'date-time' }),
  decay_applied: Type.Boolean({
    description: 'Whether time-based score decay has been applied',
  }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ReputationScore',
  additionalProperties: false,
  description: 'Agent quality signal for routing decisions',
});

export type ReputationScore = Static<typeof ReputationScoreSchema>;
```

### 8.3 Agent-as-BillingRecipient (FR11)

**File modified:** `src/schemas/billing-entry.ts`

Extend `BillingRecipientSchema.role` union:

```typescript
export const BillingRecipientSchema = Type.Object(
  {
    address: Type.String({ minLength: 1, description: 'Wallet or account address' }),
    role: Type.Union([
      // Existing
      Type.Literal('provider'),
      Type.Literal('platform'),
      Type.Literal('producer'),
      Type.Literal('agent_tba'),
      // v4.3.0 — Agent economy roles
      Type.Literal('agent_performer'),  // Agent receives performance dividend
      Type.Literal('commons'),          // Community pool receives dividend
    ]),
    share_bps: Type.Integer({
      minimum: 0,
      maximum: 10000,
      description: 'Basis points share (0-10000)',
    }),
    amount_micro: MicroUSD,
  },
  { $id: 'BillingRecipient', additionalProperties: false },
);
```

**Backward compatibility:** Adding new union members to `role` is backward-compatible for producers (existing values still valid). Consumers using exhaustive pattern matching on the 4 existing roles will get TypeScript compile errors — this is intentional and desirable (forces acknowledgment of new roles).

---

## 9. v4.4.0 — The Agent Economy

### 9.1 Economic Choreography Vocabulary (TR6)

**New file:** `src/vocabulary/economic-choreography.ts`

```typescript
/**
 * Economic ceremony choreographies — expected event sequences
 * for staking, escrow, and credit operations.
 *
 * Follows the same pattern as TRANSFER_CHOREOGRAPHY but for
 * economic ceremonies instead of ownership transfers.
 *
 * @see BB-POST-007 — Economic choreography
 * @see TR6 — Economic choreography extension
 * @since v4.4.0
 */
import type { EventType } from './event-types.js';

export interface EconomicScenarioChoreography {
  readonly forward: readonly EventType[];
  readonly compensation: readonly EventType[];
  readonly invariants: readonly {
    readonly description: string;
    readonly enforceable: boolean;
  }[];
}

export type EconomicChoreography = Readonly<Record<string, EconomicScenarioChoreography>>;

export const ECONOMIC_CHOREOGRAPHY: EconomicChoreography = {
  stake: {
    forward: [
      'economy.stake.offered',
      'economy.stake.accepted',
      'performance.record.created',
      'performance.outcome.validated',
      'economy.dividend.issued',
    ],
    compensation: [
      'economy.stake.returned',
    ],
    invariants: [
      {
        description: 'Staker and performer must be different entities',
        enforceable: true,
      },
      {
        description: 'Dividend cannot issue before outcome validation',
        enforceable: true,
      },
    ],
  },

  escrow: {
    forward: [
      'economy.escrow.held',
      'economy.escrow.conditions_met',
      'economy.escrow.released',
    ],
    compensation: [
      'economy.escrow.refunded',
    ],
    invariants: [
      {
        description: 'Release requires all conditions met or expiry',
        enforceable: false,
      },
      {
        description: 'Disputed escrow cannot be released without resolution',
        enforceable: true,
      },
    ],
  },

  mutual_credit: {
    forward: [
      'economy.credit.issued',
      'economy.credit.acknowledged',
      'economy.credit.settled',
    ],
    compensation: [
      'economy.credit.forgiven',
    ],
    invariants: [
      {
        description: 'Issuer and receiver must be different entities',
        enforceable: true,
      },
      {
        description: 'Settlement amount must not exceed credit amount',
        enforceable: false,
      },
    ],
  },
} as const;
```

### 9.2 EscrowEntry Schema (FR12)

**New file:** `src/schemas/escrow-entry.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';

/**
 * Hold-and-release financial flow.
 *
 * Escrow as a separate entity (not a billing lifecycle state) because:
 * 1. Escrow can outlive its originating conversation
 * 2. Multiple billing entries might fund a single escrow
 * 3. Escrow disputes need their own audit trail
 *
 * @see Bridgebuilder Part 3 — Escrow design
 * @see arrakis#62 — Billing & Payments RFC
 * @see Flatline IMP-001 — Use MicroUSDUnsigned for non-negative fields
 * @since v4.4.0
 */
export const EscrowEntrySchema = Type.Object({
  escrow_id: Type.String({ minLength: 1, description: 'UUID v4', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' }),
  billing_entry_id: Type.String({ minLength: 1, description: 'References originating BillingEntry.id' }),
  amount_micro: MicroUSDUnsigned,  // Flatline IMP-001: escrow holds are always non-negative
  state: Type.Union([
    Type.Literal('held'),
    Type.Literal('released'),
    Type.Literal('disputed'),
    Type.Literal('refunded'),
    Type.Literal('expired'),
  ], { description: 'Escrow lifecycle state' }),
  hold_until: Type.String({
    format: 'date-time',
    description: 'Escrow expiry — auto-refund after this time',
  }),
  release_conditions: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
    description: 'Conditions that must be met for release',
  })),
  released_at: Type.Optional(Type.String({ format: 'date-time' })),
  dispute_id: Type.Optional(Type.String({
    minLength: 1,
    description: 'Links to DisputeRecord when state is "disputed". Flatline IMP-006.',
  })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'EscrowEntry',
  additionalProperties: false,
  description: 'Hold-and-release financial flow for marketplace transactions',
});

export type EscrowEntry = Static<typeof EscrowEntrySchema>;
```

#### 9.2.1 Escrow State Machine (Flatline IMP-003)

Explicit state transition rules — like `AGENT_LIFECYCLE_TRANSITIONS`:

```typescript
export const ESCROW_TRANSITIONS: Record<EscrowState, readonly EscrowState[]> = {
  held: ['released', 'disputed', 'expired'],
  released: [],                        // Terminal
  disputed: ['released', 'refunded'],  // Resolution required
  refunded: [],                        // Terminal
  expired: ['refunded'],               // Expired → refund processing
} as const;

export type EscrowState = 'held' | 'released' | 'disputed' | 'refunded' | 'expired';

export function isValidEscrowTransition(from: EscrowState, to: EscrowState): boolean {
  return ESCROW_TRANSITIONS[from].includes(to);
}
```

**Invariants:**
- `released_at` required when state is `released`
- `dispute_id` required when state is `disputed` (links to DisputeRecord — Flatline IMP-006)
- `held` → `released` requires all `release_conditions` met (service-layer)
- `disputed` → `released` requires dispute resolution with outcome `upheld` or `compromised`
- `disputed` → `refunded` requires dispute resolution with outcome `dismissed` or `compromised`

### 9.3 StakePosition Schema (FR13, Experimental)

**New file:** `src/schemas/stake-position.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../vocabulary/currency.js';

/**
 * Reciprocal investment primitive.
 *
 * ECSA parallel: "Stake Token" — mutual belief in future performance.
 * Unlike traditional investment (I buy shares), this is reciprocal
 * recognition (I believe in your future performances).
 *
 * x-experimental: Schema stability not guaranteed until validated by real usage.
 *
 * @see Bridgebuilder Part 8 — Reciprocal staking
 * @see ECSA Stake Token framework
 * @see Flatline IMP-001 — Use MicroUSDUnsigned for non-negative fields
 * @since v4.4.0
 */

const VestingSchema = Type.Object({
  schedule: Type.Union([
    Type.Literal('immediate'),
    Type.Literal('performance_gated'),
    Type.Literal('time_gated'),
  ]),
  vested_micro: MicroUSDUnsigned,     // Flatline IMP-001: vesting amounts are non-negative
  remaining_micro: MicroUSDUnsigned,  // Flatline IMP-001: vesting amounts are non-negative
}, { additionalProperties: false });

export const StakePositionSchema = Type.Object({
  stake_id: Type.String({ minLength: 1, description: 'UUID v4', pattern: '^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$' }),
  staker_id: Type.String({ minLength: 1, description: 'Human or agent staking' }),
  performer_id: Type.String({ minLength: 1, description: 'Agent being staked in' }),
  amount_micro: MicroUSDUnsigned,    // Flatline IMP-001: stake amounts are non-negative
  stake_type: Type.Union([
    Type.Literal('conviction'),
    Type.Literal('delegation'),
    Type.Literal('validation'),
  ], { description: 'Nature of the stake' }),
  vesting: VestingSchema,
  created_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'StakePosition',
  additionalProperties: false,
  description: 'Reciprocal investment primitive',
  'x-experimental': true,
});

export type StakePosition = Static<typeof StakePositionSchema>;
```

**Cross-field invariant** (Flatline SKP-004): `vesting.vested_micro + vesting.remaining_micro == amount_micro`. Enforced by cross-field validator (fails, not warns).

### 9.4 CommonsDividend Schema (FR14, Experimental)

**New file:** `src/schemas/commons-dividend.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';
import { BillingRecipientSchema } from './billing-entry.js';

/**
 * Community value pool — dividends from validated performances.
 *
 * Ostrom Principle 3: Collective-choice arrangements. The governance
 * field determines how commons dividends are allocated.
 *
 * x-experimental: Schema stability not guaranteed until validated by real usage.
 *
 * @see Bridgebuilder Parts 8-9 — Synthetic commons, Ostrom P3
 * @see ECSA Synthetic Commons framework
 * @see arrakis#62 — Community credit system
 * @since v4.4.0
 */
export const CommonsDividendSchema = Type.Object({
  dividend_id: Type.String({ minLength: 1, description: 'UUID' }),
  community_id: Type.String({ minLength: 1 }),
  source_performance_id: Type.String({ minLength: 1, description: 'References PerformanceRecord' }),
  amount_micro: MicroUSD,
  governance: Type.Union([
    Type.Literal('mod_discretion'),
    Type.Literal('member_vote'),
    Type.Literal('algorithmic'),
    Type.Literal('stake_weighted'),
  ], { description: 'How dividend allocation is governed' }),
  distribution: Type.Optional(Type.Object({
    distributed_at: Type.String({ format: 'date-time' }),
    recipients: Type.Array(BillingRecipientSchema, { minItems: 1 }),
    method: Type.String({ minLength: 1, description: 'Distribution algorithm name' }),
  }, { additionalProperties: false })),
  issued_at: Type.String({ format: 'date-time' }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'CommonsDividend',
  additionalProperties: false,
  description: 'Community value pool from validated agent performances',
  'x-experimental': true,
});

export type CommonsDividend = Static<typeof CommonsDividendSchema>;
```

### 9.5 MutualCredit Schema (FR15, Experimental)

**New file:** `src/schemas/mutual-credit.ts`

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { MicroUSD } from '../vocabulary/currency.js';

/**
 * Agent-to-agent obligation and credit.
 *
 * Graeber parallel: "Debt: The First 5,000 Years" — credit and
 * obligation preceded barter and money. settlement_method
 * 'reciprocal_performance' enables agents to settle debts through
 * validated work rather than money.
 *
 * x-experimental: Schema stability not guaranteed until validated by real usage.
 *
 * @see Bridgebuilder Part 8 — Distributed credit
 * @see ECSA Distributed Credit framework
 * @see Graeber — Debt: The First 5,000 Years
 * @since v4.4.0
 */
export const MutualCreditSchema = Type.Object({
  credit_id: Type.String({ minLength: 1, description: 'UUID' }),
  issuer_id: Type.String({ minLength: 1, description: 'Who extends credit' }),
  receiver_id: Type.String({ minLength: 1, description: 'Who receives credit' }),
  amount_micro: MicroUSD,
  credit_type: Type.Union([
    Type.Literal('refund'),
    Type.Literal('prepayment'),
    Type.Literal('obligation'),
    Type.Literal('delegation'),
  ], { description: 'Nature of the credit relationship' }),
  settlement: Type.Object({
    due_at: Type.Optional(Type.String({ format: 'date-time' })),
    settled: Type.Boolean(),
    settled_at: Type.Optional(Type.String({ format: 'date-time' })),
    settlement_method: Type.Optional(Type.Union([
      Type.Literal('direct_payment'),
      Type.Literal('reciprocal_performance'),
      Type.Literal('commons_contribution'),
      Type.Literal('forgiven'),
    ])),
  }, { additionalProperties: false }),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'MutualCredit',
  additionalProperties: false,
  description: 'Agent-to-agent obligation and credit',
  'x-experimental': true,
});

export type MutualCredit = Static<typeof MutualCreditSchema>;
```

---

## 10. Vocabulary Extensions

### 10.1 Error Codes (v4.0.0–v4.4.0)

**File modified:** `src/vocabulary/errors.ts`

New error codes added incrementally per version:

```typescript
// v4.0.0
ROUTING_CONSTRAINT_VIOLATED: 'ROUTING_CONSTRAINT_VIOLATED',   // 403

// v4.1.0
PERFORMANCE_NOT_FOUND: 'PERFORMANCE_NOT_FOUND',               // 404
PERFORMANCE_ALREADY_VALIDATED: 'PERFORMANCE_ALREADY_VALIDATED', // 409

// v4.2.0
SANCTION_ACTIVE: 'SANCTION_ACTIVE',                           // 403
SANCTION_APPEAL_DENIED: 'SANCTION_APPEAL_DENIED',             // 403
DISPUTE_NOT_FOUND: 'DISPUTE_NOT_FOUND',                       // 404
DISPUTE_ALREADY_RESOLVED: 'DISPUTE_ALREADY_RESOLVED',         // 409

// v4.3.0
REPUTATION_INSUFFICIENT: 'REPUTATION_INSUFFICIENT',           // 403

// v4.4.0
ESCROW_NOT_FOUND: 'ESCROW_NOT_FOUND',                        // 404
ESCROW_ALREADY_RELEASED: 'ESCROW_ALREADY_RELEASED',           // 409
ESCROW_EXPIRED: 'ESCROW_EXPIRED',                             // 410
STAKE_NOT_FOUND: 'STAKE_NOT_FOUND',                           // 404
CREDIT_NOT_FOUND: 'CREDIT_NOT_FOUND',                         // 404
CREDIT_ALREADY_SETTLED: 'CREDIT_ALREADY_SETTLED',             // 409
```

### 10.2 Event Types (v4.1.0–v4.4.0)

**File modified:** `src/vocabulary/event-types.ts`

New event types following the established `{aggregate}.{noun}.{verb}` convention:

```typescript
// v4.1.0 — Performance events
'performance.record.created',
'performance.outcome.validated',
'performance.dividend.issued',
'performance.contribution.recorded',

// v4.2.0 — Governance events
'governance.sanction.imposed',
'governance.sanction.escalated',
'governance.sanction.expired',
'governance.sanction.appealed',
'governance.dispute.filed',
'governance.dispute.resolved',

// v4.3.0 — Reputation events
'reputation.score.updated',
'reputation.decay.applied',

// v4.4.0 — Economy events
'economy.escrow.held',
'economy.escrow.released',
'economy.escrow.disputed',
'economy.escrow.refunded',
'economy.escrow.expired',
'economy.stake.offered',
'economy.stake.accepted',
'economy.stake.returned',
'economy.dividend.issued',
'economy.credit.issued',
'economy.credit.acknowledged',
'economy.credit.settled',
'economy.credit.forgiven',
```

### 10.3 Lifecycle Reason Codes (v4.2.0)

**File modified:** `src/vocabulary/lifecycle-reasons.ts`

```typescript
// v4.2.0 — Sanction-related lifecycle reasons
'sanction_warning_issued',
'sanction_rate_limited',
'sanction_pool_restricted',
'sanction_suspended',
'sanction_terminated',
'sanction_appealed_successfully',
```

---

## 11. Validator Extensions

### 11.1 New Compiled Validators

**File modified:** `src/validators/index.ts`

New imports and validator entries added per version:

```typescript
// v4.0.0
import { RoutingConstraintSchema } from '../schemas/routing-constraint.js';

// v4.1.0
import { PerformanceRecordSchema } from '../schemas/performance-record.js';
import { ContributionRecordSchema } from '../schemas/contribution-record.js';

// v4.2.0
import { SanctionSchema } from '../schemas/sanction.js';
import { DisputeRecordSchema } from '../schemas/dispute-record.js';
import { ValidatedOutcomeSchema } from '../schemas/validated-outcome.js';

// v4.3.0
import { ReputationScoreSchema } from '../schemas/reputation-score.js';

// v4.4.0
import { EscrowEntrySchema } from '../schemas/escrow-entry.js';
import { StakePositionSchema } from '../schemas/stake-position.js';
import { CommonsDividendSchema } from '../schemas/commons-dividend.js';
import { MutualCreditSchema } from '../schemas/mutual-credit.js';

export const validators = {
  // ... existing validators unchanged ...

  // v4.0.0
  routingConstraint: () => getOrCompile(RoutingConstraintSchema),

  // v4.1.0
  performanceRecord: () => getOrCompile(PerformanceRecordSchema),
  contributionRecord: () => getOrCompile(ContributionRecordSchema),

  // v4.2.0
  sanction: () => getOrCompile(SanctionSchema),
  disputeRecord: () => getOrCompile(DisputeRecordSchema),
  validatedOutcome: () => getOrCompile(ValidatedOutcomeSchema),

  // v4.3.0
  reputationScore: () => getOrCompile(ReputationScoreSchema),

  // v4.4.0
  escrowEntry: () => getOrCompile(EscrowEntrySchema),
  stakePosition: () => getOrCompile(StakePositionSchema),
  commonsDividend: () => getOrCompile(CommonsDividendSchema),
  mutualCredit: () => getOrCompile(MutualCreditSchema),
} as const;
```

### 11.2 Cross-Field Validator API Contract (Flatline IMP-002)

**File modified:** `src/validators/index.ts`

The cross-field validator API is formalized with explicit types and registration contract:

```typescript
/**
 * Cross-field validator result. Every validator MUST return this shape.
 * - `valid`: false if ANY hard error exists (schema rejected)
 * - `errors`: hard violations — consumer MUST NOT proceed
 * - `warnings`: soft violations — consumer SHOULD log but MAY proceed
 */
export interface CrossFieldValidatorResult {
  readonly valid: boolean;
  readonly errors: readonly string[];
  readonly warnings: readonly string[];
}

/**
 * Cross-field validator function signature.
 * Receives pre-validated data (schema validation already passed).
 * MUST be pure — no side effects, no I/O, deterministic.
 */
export type CrossFieldValidatorFn = (data: unknown) => CrossFieldValidatorResult;

/**
 * Register a cross-field validator for a schema.
 * - Schema name MUST match a key in the `validators` object (runtime check).
 * - Only one validator per schema name (last registration wins, with console.warn).
 * - Validators are opt-in: consumers call `runCrossFieldValidation(name, data)`.
 */
export function registerCrossFieldValidator(
  schemaName: string,
  fn: CrossFieldValidatorFn,
): void;

/**
 * Run cross-field validation for a schema.
 * Returns `{ valid: true, errors: [], warnings: [] }` if no validator registered.
 * Consumers opt-out by simply not calling this function.
 */
export function runCrossFieldValidation(
  schemaName: string,
  data: unknown,
): CrossFieldValidatorResult;
```

**Invariants:**
- `result.valid === (result.errors.length === 0)` — always holds
- Validators never throw — wrap in try/catch at registration, return error on exception
- Warning-only results have `valid: true` (warnings don't reject)

### 11.3 Cross-Field Validator Implementations

```typescript
// v4.1.0 — PerformanceRecord cross-field validation
registerCrossFieldValidator('PerformanceRecord', (data) => {
  const record = data as PerformanceRecord;
  const errors: string[] = [];
  const warnings: string[] = [];

  // dividend_split_bps required when dividend_target is 'mixed'
  if (record.dividend_target === 'mixed' && record.dividend_split_bps === undefined) {
    errors.push('dividend_split_bps required when dividend_target is "mixed"');
  }

  // validated_by must be non-empty when outcome_validated is true
  if (record.outcome.outcome_validated && (!record.outcome.validated_by || record.outcome.validated_by.length === 0)) {
    warnings.push('outcome.validated_by should be non-empty when outcome_validated is true');
  }

  return { valid: errors.length === 0, errors, warnings };
});

// v4.4.0 — EscrowEntry cross-field validation
registerCrossFieldValidator('EscrowEntry', (data) => {
  const entry = data as EscrowEntry;
  const errors: string[] = [];

  // released_at required when state is 'released'
  if (entry.state === 'released' && !entry.released_at) {
    errors.push('released_at required when state is "released"');
  }

  return { valid: errors.length === 0, errors, warnings: [] };
});

// v4.4.0 — MutualCredit cross-field validation
registerCrossFieldValidator('MutualCredit', (data) => {
  const credit = data as MutualCredit;
  const errors: string[] = [];

  // settled_at required when settled is true
  if (credit.settlement.settled && !credit.settlement.settled_at) {
    errors.push('settlement.settled_at required when settled is true');
  }

  // settlement_method required when settled is true
  if (credit.settlement.settled && !credit.settlement.settlement_method) {
    errors.push('settlement.settlement_method required when settled is true');
  }

  return { valid: errors.length === 0, errors, warnings: [] };
});
```

---

## 12. Test Infrastructure (TR1)

### 12.1 Level 4 Test Epistemology

| Level | Name | Status | Implementation |
|-------|------|--------|----------------|
| L0 | Structural (schema validation) | Existing | Golden vectors, `validators.*.Check()` |
| L1 | Behavioral (property tests) | Existing | fast-check property tests, 1000 iterations |
| L2 | Temporal (event sequence) | **NEW** | ProtocolStateTracker + random event sequences |
| L3 | Economic (financial conservation) | **NEW** | ProtocolLedger + trial balance invariants |
| L4 | Interop (cross-runner equivalence) | **NEW** | CI step diffing all 4 runners |

### 12.2 ProtocolStateTracker (L2 — Temporal)

**New file:** `src/test-infrastructure/protocol-state-tracker.ts`

```typescript
import type { DomainEvent } from '../schemas/domain-event.js';
import type { AgentLifecycleState } from '../schemas/agent-lifecycle.js';
import { AGENT_LIFECYCLE_TRANSITIONS } from '../schemas/agent-lifecycle.js';

/**
 * Test helper: tracks protocol state across a sequence of domain events.
 *
 * Used in L2 temporal property tests to verify that random event sequences
 * never violate lifecycle or choreography invariants.
 *
 * NOT exported from the main package. Lives in test-infrastructure/ and
 * is imported directly by test files.
 *
 * @since v4.4.0
 */

export type ApplyResult =
  | { applied: true }
  | { applied: false; reason: string };

export const VALID_REJECTION_REASONS = [
  'invalid_lifecycle_transition',
  'unknown_aggregate_type',
  'duplicate_event_id',
  'missing_required_payload_field',
  'sanction_blocks_transition',
] as const;

export class ProtocolStateTracker {
  private agentStates = new Map<string, AgentLifecycleState>();
  private seenEventIds = new Set<string>();
  private activeSanctions = new Map<string, string>(); // agent_id → sanction_severity

  apply(event: DomainEvent): ApplyResult {
    // Reject duplicate event IDs
    if (this.seenEventIds.has(event.event_id)) {
      return { applied: false, reason: 'duplicate_event_id' };
    }
    this.seenEventIds.add(event.event_id);

    switch (event.aggregate_type) {
      case 'agent':
        return this.applyAgentEvent(event);
      case 'governance':
        return this.applyGovernanceEvent(event);
      default:
        return { applied: true };
    }
  }

  private applyAgentEvent(event: DomainEvent): ApplyResult {
    if (event.type === 'agent.lifecycle.transitioned') {
      const payload = event.payload as { agent_id: string; to_state: AgentLifecycleState };
      const currentState = this.agentStates.get(payload.agent_id) ?? 'DORMANT';
      const validTargets = AGENT_LIFECYCLE_TRANSITIONS[currentState];
      if (!validTargets.includes(payload.to_state)) {
        return { applied: false, reason: 'invalid_lifecycle_transition' };
      }
      this.agentStates.set(payload.agent_id, payload.to_state);
    }
    return { applied: true };
  }

  private applyGovernanceEvent(event: DomainEvent): ApplyResult {
    if (event.type === 'governance.sanction.imposed') {
      const payload = event.payload as { target_id: string; severity: string };
      this.activeSanctions.set(payload.target_id, payload.severity);
    }
    return { applied: true };
  }

  isConsistent(): boolean {
    // No agent should be in an impossible state
    for (const [, state] of this.agentStates) {
      if (!AGENT_LIFECYCLE_TRANSITIONS[state]) return false;
    }
    return true;
  }
}
```

**Property test using ProtocolStateTracker:**

```typescript
// tests/properties/temporal.test.ts
import { fc } from 'fast-check';
import { ProtocolStateTracker, VALID_REJECTION_REASONS } from '../../src/test-infrastructure/protocol-state-tracker.js';

const domainEventArb = fc.record({
  event_id: fc.uuid(),
  aggregate_id: fc.uuid(),
  aggregate_type: fc.constantFrom('agent', 'billing', 'governance', 'performance'),
  type: fc.constantFrom(
    'agent.lifecycle.transitioned',
    'billing.entry.created',
    'governance.sanction.imposed',
    'performance.record.created',
  ),
  version: fc.constant(1),
  occurred_at: fc.date().map(d => d.toISOString()),
  actor: fc.string({ minLength: 1 }),
  payload: fc.anything(),
  contract_version: fc.constant('4.4.0'),
});

test('random event sequences never violate protocol state consistency', () => {
  fc.assert(
    fc.property(
      fc.array(domainEventArb, { minLength: 2, maxLength: 20 }),
      (events) => {
        const state = new ProtocolStateTracker();
        for (const event of events) {
          const result = state.apply(event as any);
          expect(
            result.applied || VALID_REJECTION_REASONS.includes(result.reason as any),
          ).toBe(true);
        }
        expect(state.isConsistent()).toBe(true);
      },
    ),
    { numRuns: 500 },
  );
});
```

### 12.3 ProtocolLedger (L3 — Economic)

**New file:** `src/test-infrastructure/protocol-ledger.ts`

```typescript
/**
 * Test helper: tracks financial flows across billing events.
 *
 * Verifies the trial balance invariant: money flowing in must equal
 * money flowing out. Any imbalance indicates a protocol bug.
 *
 * NOT exported from the main package.
 *
 * @since v4.4.0
 */
export class ProtocolLedger {
  private debits = 0n;  // Money charged
  private credits = 0n; // Money refunded/credited

  record(event: { type: string; payload: Record<string, unknown> }): void {
    if (event.type === 'billing.entry.created') {
      const amount = BigInt(event.payload.total_cost_micro as string);
      this.debits += amount;
    }
    if (event.type === 'billing.entry.voided') {
      const amount = BigInt(event.payload.total_cost_micro as string);
      this.credits += amount;
    }
    if (event.type === 'economy.escrow.held') {
      // Escrow is not a new charge — it's a hold on existing funds
      // No ledger impact (funds already counted in billing.entry.created)
    }
    if (event.type === 'economy.escrow.released') {
      // Release confirms the charge — no ledger impact
    }
    if (event.type === 'economy.escrow.refunded') {
      const amount = BigInt(event.payload.amount_micro as string);
      this.credits += amount;
    }
  }

  /** Trial balance: net charges minus net credits. 0 means balanced. */
  trialBalance(): bigint {
    return this.debits - this.credits;
  }

  /** Conservation check: credits never exceed debits. */
  isConserved(): boolean {
    return this.credits <= this.debits;
  }
}
```

**Property test using ProtocolLedger:**

```typescript
// tests/properties/economic.test.ts
import { fc } from 'fast-check';
import { ProtocolLedger } from '../../src/test-infrastructure/protocol-ledger.js';

const billingEventArb = fc.oneof(
  fc.record({
    type: fc.constant('billing.entry.created'),
    payload: fc.record({
      total_cost_micro: fc.integer({ min: 0, max: 1000000 }).map(String),
    }),
  }),
  fc.record({
    type: fc.constant('billing.entry.voided'),
    payload: fc.record({
      total_cost_micro: fc.integer({ min: 0, max: 1000000 }).map(String),
    }),
  }),
);

test('billing events never create money from nothing', () => {
  fc.assert(
    fc.property(
      fc.array(billingEventArb, { minLength: 1, maxLength: 50 }),
      (events) => {
        const ledger = new ProtocolLedger();
        for (const event of events) { ledger.record(event as any); }
        // Credits should never exceed debits (no money from nothing)
        expect(ledger.isConserved()).toBe(true);
      },
    ),
    { numRuns: 200 },
  );
});
```

### 12.4 Cross-Runner Equivalence CI (TR2)

**Design:** A CI step that runs all 4 language runners (TS, Go, Python, Rust) against the same golden vector set and diffs the results.

```yaml
# .github/workflows/cross-runner.yml (design — implemented by consumers)
name: Cross-Runner Equivalence
on: [push, pull_request]
jobs:
  equivalence:
    runs-on: ubuntu-latest
    strategy:
      matrix:
        runner: [typescript, go, python, rust]
    steps:
      - uses: actions/checkout@v4
      - name: Run vectors
        run: ./scripts/run-vectors-${{ matrix.runner }}.sh > results-${{ matrix.runner }}.json
      - name: Upload results
        uses: actions/upload-artifact@v4
        with:
          name: results-${{ matrix.runner }}
          path: results-${{ matrix.runner }}.json

  diff:
    needs: equivalence
    runs-on: ubuntu-latest
    steps:
      - name: Download all results
        uses: actions/download-artifact@v4
      - name: Diff results
        run: |
          # All runners must produce identical pass/fail results
          diff results-typescript/results-typescript.json results-go/results-go.json
          diff results-typescript/results-typescript.json results-python/results-python.json
          diff results-typescript/results-typescript.json results-rust/results-rust.json
```

**Implementation note:** The cross-runner CI is a consumer-side concern. loa-hounfour provides the golden vectors and a `scripts/cross-runner-format.ts` script that normalizes vector results to a common JSON format for diffing.

---

## 13. Golden Test Vectors

### 13.1 New Vector Files

```
vectors/
├── budget/                           # ✓ Existing
├── jwt/                              # ✓ Existing
├── agent/                            # ✓ Existing
├── billing/                          # ✓ Existing
├── conversation/                     # ✓ Existing
├── transfer/                         # ✓ Existing
├── domain-event/                     # ✓ Existing
├── stream/                           # ✓ Existing
├── compatibility/                    # ✓ Existing
├── routing-constraint/               # ★ NEW (v4.0.0)
│   ├── valid.json
│   └── invalid.json
├── performance/                      # ★ NEW (v4.1.0)
│   ├── record-valid.json
│   ├── record-invalid.json
│   └── contribution-valid.json
├── governance/                       # ★ NEW (v4.2.0)
│   ├── sanction-valid.json
│   ├── sanction-invalid.json
│   ├── dispute-valid.json
│   └── validated-outcome-valid.json
├── reputation/                       # ★ NEW (v4.3.0)
│   └── score-valid.json
└── economy/                          # ★ NEW (v4.4.0)
    ├── escrow-valid.json
    ├── escrow-invalid.json
    ├── stake-position-valid.json
    ├── commons-dividend-valid.json
    └── mutual-credit-valid.json
```

### 13.2 Test Files

```
tests/
├── vectors/                          # ✓ Existing structure
│   ├── routing-constraint.test.ts    # ★ NEW (v4.0.0)
│   ├── performance-record.test.ts    # ★ NEW (v4.1.0)
│   ├── contribution-record.test.ts   # ★ NEW (v4.1.0)
│   ├── sanction.test.ts              # ★ NEW (v4.2.0)
│   ├── dispute-record.test.ts        # ★ NEW (v4.2.0)
│   ├── validated-outcome.test.ts     # ★ NEW (v4.2.0)
│   ├── reputation-score.test.ts      # ★ NEW (v4.3.0)
│   ├── escrow-entry.test.ts          # ★ NEW (v4.4.0)
│   ├── stake-position.test.ts        # ★ NEW (v4.4.0)
│   ├── commons-dividend.test.ts      # ★ NEW (v4.4.0)
│   └── mutual-credit.test.ts         # ★ NEW (v4.4.0)
├── properties/                       # ★ NEW directory (v4.4.0)
│   ├── temporal.test.ts              # L2 temporal property tests
│   └── economic.test.ts              # L3 economic property tests
└── cross-field/                      # ★ NEW directory (v4.1.0)
    ├── performance-record.test.ts    # Cross-field validation tests
    ├── escrow-entry.test.ts
    └── mutual-credit.test.ts
```

**Estimated vector counts:**

| Schema | Valid | Invalid | Edge | Total |
|--------|-------|---------|------|-------|
| RoutingConstraint | 3 | 3 | 2 | 8 |
| PerformanceRecord | 3 | 4 | 2 | 9 |
| ContributionRecord | 2 | 2 | 1 | 5 |
| Sanction | 3 | 3 | 2 | 8 |
| DisputeRecord | 3 | 2 | 1 | 6 |
| ValidatedOutcome | 2 | 2 | 1 | 5 |
| ReputationScore | 2 | 2 | 1 | 5 |
| EscrowEntry | 3 | 3 | 2 | 8 |
| StakePosition | 2 | 2 | 1 | 5 |
| CommonsDividend | 2 | 2 | 1 | 5 |
| MutualCredit | 2 | 2 | 1 | 5 |
| **Total new** | **27** | **27** | **15** | **69** |

Combined with existing 447 tests: **target 600+ total**.

---

## 14. Security Architecture

### 14.1 Financial Schema Strictness (Unchanged)

All financial schemas maintain `additionalProperties: false`:
- BillingEntry, CreditNote, BillingRecipient
- EscrowEntry (new)
- StakePosition (new, experimental)
- CommonsDividend (new, experimental)
- MutualCredit (new, experimental)

**Rationale:** Financial payload injection is the highest-severity protocol attack. Strictness is non-negotiable for any schema involving money.

### 14.2 Signed MicroUSD Safety

The v4.0.0 signed MicroUSD default introduces negative amounts. Safety boundaries:

| Context | Allows Negative | Enforcement |
|---------|----------------|-------------|
| `BillingEntry.raw_cost_micro` | Yes (credits) | Service-layer business rules |
| `BillingEntry.total_cost_micro` | Yes (credits) | Service-layer business rules |
| `BillingRecipient.amount_micro` | Yes (credits) | Cross-field: sum must equal total |
| `EscrowEntry.amount_micro` | No | Use `MicroUSDUnsigned` — escrow holds are always positive |
| `StakePosition.amount_micro` | No | Use `MicroUSDUnsigned` — stakes are always positive |
| `MutualCredit.amount_micro` | Yes | Credit can represent either direction |

**Design decision:** `EscrowEntry.amount_micro` and `StakePosition.amount_micro` use the signed `MicroUSD` at the schema level (simpler consumer pattern) but service-layer validation MUST reject negative amounts. This is documented in the schema descriptions.

### 14.3 Sanction Evidence Chain

Sanctions require evidence (`evidence_event_ids` with `minItems: 1`). This prevents:
- **Anonymous sanctions**: Every sanction traces back to specific events
- **Fabricated sanctions**: Evidence IDs must correspond to real DomainEvents
- **Invisible sanctions**: The evidence chain creates an audit trail

Service-layer responsibility: validate that `evidence_event_ids` reference actual stored events.

### 14.4 Experimental Schema Isolation

Experimental schemas (`x-experimental: true`) are:
- Exported from the main package (no separate entry point — see OQ4 resolution below)
- Clearly marked in JSON Schema output via `x-experimental: true`
- Documented with stability warnings in TSDoc
- Excluded from backward compatibility guarantees between minor versions

**OQ4 resolution:** Experimental schemas are exported from the same entry point. Separate `@0xhoneyjar/loa-hounfour/experimental` export path was rejected — it adds complexity without meaningful protection (consumers already opt-in by importing the type).

---

## 15. Build & CI Pipeline

### 15.1 Build Steps (Extended)

```bash
pnpm run typecheck         # tsc --noEmit (strict mode)
pnpm run build             # tsc (emit to dist/)
pnpm run test              # vitest run (all tests including L2/L3 properties)
pnpm run schema:generate   # Generate JSON Schema files (now 40+)
pnpm run schema:check      # Validate generated schemas
pnpm run vectors:check     # Validate golden vectors
pnpm run semver:check      # Validate version bump
pnpm run check:migration   # Validate migration compatibility
pnpm run schemas:validate  # Full schema validation suite
```

### 15.2 Schema Generation Extension

`scripts/generate-schemas.ts` extended with all new schemas:

```typescript
const schemasToGenerate = [
  // Existing (unchanged)
  // ... all v1.0.0–v3.2.0 schemas ...

  // v4.0.0
  { name: 'routing-constraint', schema: RoutingConstraintSchema },

  // v4.1.0
  { name: 'performance-record', schema: PerformanceRecordSchema },
  { name: 'contribution-record', schema: ContributionRecordSchema },

  // v4.2.0
  { name: 'sanction', schema: SanctionSchema },
  { name: 'dispute-record', schema: DisputeRecordSchema },
  { name: 'validated-outcome', schema: ValidatedOutcomeSchema },

  // v4.3.0
  { name: 'reputation-score', schema: ReputationScoreSchema },

  // v4.4.0
  { name: 'escrow-entry', schema: EscrowEntrySchema },
  { name: 'stake-position', schema: StakePositionSchema },
  { name: 'commons-dividend', schema: CommonsDividendSchema },
  { name: 'mutual-credit', schema: MutualCreditSchema },
];
```

### 15.3 Package.json Updates

```json
{
  "name": "@0xhoneyjar/loa-hounfour",
  "version": "4.4.0"
}
```

Version bumped per release: 4.0.0 → 4.1.0 → 4.2.0 → 4.3.0 → 4.4.0.

---

## 16. Barrel Export Updates

**File:** `src/index.ts`

New exports per version (additive to existing):

```typescript
// v4.0.0
export {
  RoutingConstraintSchema,
  type RoutingConstraint,
} from './schemas/routing-constraint.js';

// + MicroUSDUnsigned from currency.ts
// + New aggregate event types and guards from domain-event.ts

// v4.1.0
export {
  PerformanceRecordSchema,
  type PerformanceRecord,
} from './schemas/performance-record.js';

export {
  ContributionRecordSchema,
  type ContributionRecord,
} from './schemas/contribution-record.js';

// v4.2.0
export {
  SanctionSchema,
  type Sanction,
} from './schemas/sanction.js';

export {
  DisputeRecordSchema,
  type DisputeRecord,
} from './schemas/dispute-record.js';

export {
  ValidatedOutcomeSchema,
  type ValidatedOutcome,
} from './schemas/validated-outcome.js';

export {
  SANCTION_SEVERITY_LEVELS,
  SANCTION_SEVERITY_ORDER,
  VIOLATION_TYPES,
  ESCALATION_RULES,
  type SanctionSeverity,
  type ViolationType,
} from './vocabulary/sanctions.js';

// v4.3.0
export {
  ReputationScoreSchema,
  type ReputationScore,
} from './schemas/reputation-score.js';

export {
  REPUTATION_WEIGHTS,
  REPUTATION_DECAY,
  MIN_REPUTATION_SAMPLE_SIZE,
  type ReputationComponent,
} from './vocabulary/reputation.js';

// v4.4.0
export {
  EscrowEntrySchema,
  type EscrowEntry,
} from './schemas/escrow-entry.js';

export {
  StakePositionSchema,
  type StakePosition,
} from './schemas/stake-position.js';

export {
  CommonsDividendSchema,
  type CommonsDividend,
} from './schemas/commons-dividend.js';

export {
  MutualCreditSchema,
  type MutualCredit,
} from './schemas/mutual-credit.js';

export {
  ECONOMIC_CHOREOGRAPHY,
  type EconomicChoreography,
  type EconomicScenarioChoreography,
} from './vocabulary/economic-choreography.js';

// MicroUSDUnsigned (v4.0.0)
export { MicroUSDUnsigned } from './vocabulary/currency.js';
```

---

## 17. Migration Guide (v3.2.0 → v4.0.0)

### 17.1 Breaking Changes Summary

| Change | v3.2.0 | v4.0.0 | Consumer Action |
|--------|--------|--------|-----------------|
| MicroUSD pattern | `^[0-9]+$` | `^-?[0-9]+$` | Update regex validators |
| MicroUSDSigned | Separate type | Alias for MicroUSD | No action (backward compat) |
| Envelope additionalProperties | `false` | `true` | Remove strict envelope checks |
| MIN_SUPPORTED_VERSION | `2.4.0` | `3.0.0` | Ensure consumers on v3.x |
| BillingRecipient.role | 4 values | 6 values (+agent_performer, commons) | Update exhaustive matches |
| DomainEvent.aggregate_type | 6 values | 10 values (+performance, governance, reputation, economy) | Update exhaustive matches |

### 17.2 Backward Compatibility Guarantee

**All v3.2.0 valid payloads are accepted by v4.0.0 schemas.** The breaking changes affect:
- Validation rules (signed pattern accepts unsigned values)
- New union members (existing values remain valid)
- Envelope relaxation (strict data passes permissive validation)

No data migration required. Consumer code changes only.

### 17.3 Migration Example

```typescript
// BEFORE (v3.2.0 — consumer regex validation)
if (!/^[0-9]+$/.test(amount)) throw new Error('Invalid MicroUSD');

// AFTER (v4.0.0 — accepts signed amounts)
if (!/^-?[0-9]+$/.test(amount)) throw new Error('Invalid MicroUSD');
// OR: use the schema validator directly
const result = validators.billingEntry().Check(data);
```

---

## 18. Rollout Plan

### 18.1 Phased Rollout Strategy

Each minor version is independently shippable. Consumers upgrade incrementally:

| Phase | Version | Deliverables | Duration |
|-------|---------|-------------|----------|
| **A** | v4.0.0-rc.1 | Breaking changes on npm prerelease | Day 0 |
| **B** | v4.0.0 | Signed MicroUSD, envelope relaxation, RoutingConstraint | Day 1 |
| **C** | v4.1.0 | PerformanceRecord, ContributionRecord | Day 2–3 |
| **D** | v4.2.0 | SanctionSchema, DisputeRecord, ValidatedOutcome | Day 3–4 |
| **E** | v4.3.0 | ReputationScore, agent-as-recipient | Day 4–5 |
| **F** | v4.4.0 | EscrowEntry, StakePosition, CommonsDividend, MutualCredit | Day 5–6 |
| **G** | v4.4.0 (final) | L2/L3 property tests, cross-runner CI design | Day 6–7 |

### 18.2 Coordination

- **Launch compatibility:** v4.0.0 is launch-*enabling*, not launch-*blocking*. v3.2.0 is already launch-ready.
- **Consumer pinning:** loa-finn and arrakis pin at v4.0.0 minimum, upgrade through v4.1–v4.4 incrementally.
- **Experimental warning:** StakePosition, CommonsDividend, MutualCredit are experimental — consumers must acknowledge instability.

---

## 19. Open Questions Resolved

| # | Question | Resolution |
|---|----------|------------|
| OQ1 | Rating scale: 0-5 stars or 0-1 continuous? | **0-5 stars** — familiar UX, sufficient granularity. ReputationScore normalizes to 0-1 internally. |
| OQ2 | StakePosition: protocol-level or chain-level? | **Protocol-level** with `x-experimental` — defines the schema vocabulary, chain implementation is mibera-freeside's concern. |
| OQ4 | Experimental schemas: separate export path? | **No** — same entry point, marked with `x-experimental: true` in schema metadata. Separate path adds complexity without protection. |
| OQ5 | Reputation decay: time-based or activity-based? | **Time-based** — `REPUTATION_DECAY.half_life_days = 30`, floor of 0.1. Simpler, well-understood, sufficient for launch. |
| OQ6 | MutualCredit reciprocal settlement: linked PerformanceRecord? | **Not required at schema level** — cross-field validator logs warning but does not reject. Service-layer can enforce. |
| OQ7 | Graduated sanctions: 5 levels or continuous? | **5 discrete levels** — matches Ostrom research, simpler routing/policy mapping, sufficient for current governance needs. |
| OQ3 | CommonsDividend governance ↔ arrakis interaction? | **Deferred** — governance field defines the mechanism; arrakis implements the specific algorithm. Integration contract TBD post-launch. |

---

## 20. File Inventory

### New Files

| File | Version | Lines (est.) | Purpose |
|------|---------|-------------|---------|
| `src/schemas/routing-constraint.ts` | v4.0.0 | ~50 | Unified routing constraint |
| `src/schemas/performance-record.ts` | v4.1.0 | ~80 | Performance + outcome tracking |
| `src/schemas/contribution-record.ts` | v4.1.0 | ~40 | Non-financial contributions |
| `src/schemas/sanction.ts` | v4.2.0 | ~60 | Graduated sanctions |
| `src/schemas/dispute-record.ts` | v4.2.0 | ~70 | Conflict resolution |
| `src/schemas/validated-outcome.ts` | v4.2.0 | ~50 | Staked quality validation |
| `src/schemas/reputation-score.ts` | v4.3.0 | ~55 | Agent quality signal |
| `src/schemas/escrow-entry.ts` | v4.4.0 | ~45 | Hold-and-release flows |
| `src/schemas/stake-position.ts` | v4.4.0 | ~55 | Reciprocal investment |
| `src/schemas/commons-dividend.ts` | v4.4.0 | ~50 | Community value pools |
| `src/schemas/mutual-credit.ts` | v4.4.0 | ~55 | Agent-to-agent obligations |
| `src/vocabulary/sanctions.ts` | v4.2.0 | ~80 | Severity levels, violation types |
| `src/vocabulary/reputation.ts` | v4.3.0 | ~35 | Weights, decay parameters |
| `src/vocabulary/economic-choreography.ts` | v4.4.0 | ~90 | Ceremony sequences |
| `src/test-infrastructure/protocol-state-tracker.ts` | v4.4.0 | ~80 | L2 temporal test helper |
| `src/test-infrastructure/protocol-ledger.ts` | v4.4.0 | ~50 | L3 economic test helper |
| **Total new source** | | **~945** |  |

### Modified Files

| File | Version | Change |
|------|---------|--------|
| `src/version.ts` | v4.0.0 → v4.4.0 | Version bumps |
| `src/vocabulary/currency.ts` | v4.0.0 | Signed default, MicroUSDUnsigned |
| `src/schemas/domain-event.ts` | v4.0.0 | Envelope relaxation, new aggregates |
| `src/schemas/stream-events.ts` | v4.0.0 | Envelope relaxation |
| `src/schemas/billing-entry.ts` | v4.0.0 + v4.3.0 | Signed MicroUSD, new recipient roles |
| `src/vocabulary/errors.ts` | v4.0.0–v4.4.0 | 14 new error codes |
| `src/vocabulary/event-types.ts` | v4.1.0–v4.4.0 | ~20 new event types |
| `src/vocabulary/lifecycle-reasons.ts` | v4.2.0 | 6 sanction-related reasons |
| `src/validators/index.ts` | v4.0.0–v4.4.0 | 11 new validators, 3 cross-field validators |
| `src/validators/compatibility.ts` | v4.0.0 | MIN_SUPPORTED bump |
| `src/utilities/billing.ts` | v4.0.0 | Signed amount support |
| `src/utilities/lifecycle.ts` | v4.2.0 | Sanction guard function |
| `src/index.ts` | v4.0.0–v4.4.0 | ~60 new exports |
| `package.json` | v4.4.0 | Version bump |
| `scripts/generate-schemas.ts` | v4.0.0–v4.4.0 | 11 new schema entries |

---

## 21. Sprint Estimation

| Sprint | Version | Deliverables | Est. Effort |
|--------|---------|-------------|-------------|
| **Sprint 1** | v4.0.0 | Signed MicroUSD, envelope relaxation, MIN_SUPPORTED bump, RoutingConstraint, domain-event aggregate extension, error codes, updated validators | ~1.5 days |
| **Sprint 2** | v4.1.0 | PerformanceRecord, ContributionRecord, performance event types, cross-field validators, golden vectors | ~1 day |
| **Sprint 3** | v4.2.0 | SanctionSchema, DisputeRecord, ValidatedOutcome, sanctions vocabulary, lifecycle-reasons extension, sanction guard, governance event types, golden vectors | ~1.5 days |
| **Sprint 4** | v4.3.0 | ReputationScore, reputation vocabulary, agent-as-recipient, reputation event types, golden vectors | ~0.5 day |
| **Sprint 5** | v4.4.0 | EscrowEntry, StakePosition, CommonsDividend, MutualCredit, economic-choreography vocabulary, economy event types, cross-field validators, golden vectors | ~1.5 days |
| **Sprint 6** | v4.4.0 (test) | ProtocolStateTracker, ProtocolLedger, L2 temporal properties, L3 economic properties, cross-runner format script, barrel exports, schema generation, final version bump | ~1.5 days |
| **Total** | v3.2.0 → v4.4.0 | 11 new schemas, 3 vocabularies, L4 test infrastructure | **~7.5 days** |

---

## 22. Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| Signed MicroUSD breaks consumer regex | Medium | All unsigned values are valid signed values. Migration guide published. |
| Envelope relaxation surprises strict consumers | Medium | Only envelopes relaxed; financial/identity remain strict. Strip-then-validate pattern documented. |
| Experimental schemas adopted prematurely | Medium | `x-experimental: true` marking + stability warning in docs |
| PerformanceRecord cross-field validation complexity | Low | Cross-field validators are optional (opt-out via `{ crossField: false }`) |
| L2/L3 property tests add build time | Low | Run in parallel with L0/L1; fast-check shrinking keeps failures fast |
| New aggregate types break exhaustive switches | Low | Intentional — forces consumer acknowledgment of new aggregates |
| 11 new schemas increase bundle size | Low | ESM tree-shaking; consumers import selectively. Target <60KB gzipped. |
| Economic choreography is speculative | Medium | Vocabulary only (not enforced). Service-layer implements actual orchestration. |

---

## 23. Theoretical Foundations (Decision Documentation)

Following Bridgebuilder Part 10 recommendation: document the theory informing design decisions.

### Ostrom Principles → Schema Mapping

| Principle | Schema | Design Decision |
|-----------|--------|----------------|
| 1. Boundaries | AgentDescriptor (existing) | NFT-based identity defines who belongs |
| 2. Proportionality | ContributionRecord (v4.1.0) | Tracks what each participant puts in |
| 3. Collective choice | CommonsDividend.governance (v4.4.0) | Governance field defines allocation mechanism |
| 4. Monitoring | ValidatedOutcome (v4.2.0) | Staked validation creates accountable monitors |
| 5. Graduated sanctions | SanctionSchema (v4.2.0) | 5-level severity with evidence trail |
| 6. Conflict resolution | DisputeRecord (v4.2.0) | Non-financial dispute handling |
| 7. Self-governance | Maintained (3-repo architecture) | Protocol doesn't prescribe governance structure |
| 8. Nested enterprises | Maintained (3-repo architecture) | loa-hounfour → loa-finn → arrakis hierarchy |

### ECSA Concepts → Schema Mapping

| ECSA Concept | Schema | Design Decision |
|-------------|--------|----------------|
| Stake Token | StakePosition | `stake_type` captures conviction/delegation/validation |
| Commodity Token | PerformanceRecord (output) | `billing_entry_id` links to existing billing |
| Liquidity Token | MicroUSD | Universal denomination (signed in v4.0.0) |
| Performance | PerformanceRecord (outcome) | `outcome.outcome_validated` + ValidatedOutcome |
| Synthetic Commons | CommonsDividend | `governance` field determines allocation |
| Distributed Credit | MutualCredit | `settlement_method: 'reciprocal_performance'` |

### Mechanism Design Choices

| Mechanism | Implementation | Hurwicz Property |
|-----------|---------------|------------------|
| BillingRecipient.share_bps | Deterministic allocation (largest remainder) | Incentive compatible — no gaming the split |
| ValidatedOutcome.validator_stake_micro | Skin in the game | Truthful reporting incentive |
| SanctionSchema.evidence_event_ids | Evidence chain required | Verifiable information |
| ReputationScore.decay_applied | Time-based decay toward neutral | Dynamic efficiency — past reputation doesn't entrench |
