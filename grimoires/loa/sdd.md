# SDD: loa-hounfour v5.3.0 — The Epistemic Protocol

**Status:** Draft
**Author:** Agent (Simstim Phase 3: Architecture)
**Date:** 2026-02-17
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**Cycle:** cycle-012
**Sources:**
- PRD v5.3.0 — The Epistemic Protocol (with Flatline integrations: FL-PRD-001–008)
- Existing codebase: 100 source files, 59 schemas, 23 constraint files, 63 vectors, 2,159 tests
- Previous SDD: v5.2.0 (cycle-011)
- PR #10 Bridgebuilder Reviews I-III (4 unresolved + 2 actionable PRAISE + 3 SPECULATION)
- Issue #9 — Enshrined Agent-Owned Inference Capacity

---

## 1. Executive Summary

This SDD defines the architecture for extending `@0xhoneyjar/loa-hounfour` from v5.2.0 (The Rights of the Governed) to v5.3.0 (The Epistemic Protocol). The package remains a zero-runtime-dependency TypeScript library (runtime: `@sinclair/typebox`, `@noble/hashes`, `jose`, `canonicalize`).

**Architecture philosophy:** Name what is implicit. Fix what is broken. Govern what was decreed.

The v5.2.0 review cycle revealed that the codebase had independently discovered three-valued logic across multiple subsystems without naming the pattern. v5.3.0 makes this explicit, fixes a correctness gap in reservation enforcement, and introduces the first governance-configurable parameters.

**Key architectural decisions:**

1. **Post-transaction floor check** — `shouldAllowRequest` Case 1 now checks `available - cost >= reserved` before allowing. Correctness fix for HIGH-V52-001.
2. **Advisory = allow-with-warning** — Advisory enforcement mode semantically distinct from strict: advisory ALLOWS through floor breaches with warnings, strict BLOCKS. Decision: FL-PRD-001.
3. **Epistemic Tristate as pattern-doc, not generic type** — Instances (ConservationStatus, SignatureVerificationResult) differ too much in shape for a useful generic. Value is in naming and cataloguing. Decision: FL-PRD-006.
4. **GovernanceConfig as optional overlay** — New schema that can override `RESERVATION_TIER_MAP` defaults. Both `resolveReservationTier()` and `validateReservationTier()` accept optional config.
5. **Marketplace dimensions deferred** — FR-9 from PRD moved to Out of Scope (v5.4.0). No consumer exists yet (loa-finn #31 still RFC). Decision: FL-PRD-007.
6. **`ROUNDING_BIAS = 'rights_holder'`** — Documentation-as-code constant encoding the protocol's ceiling-division policy.

---

## 2. Module Architecture

### 2.1 Current Structure (v5.2.0)

```
src/
├── schemas/           # 46 schema files (model/, routing/, ensemble/)
├── utilities/         # 8 files: billing, conformance-matcher, lifecycle, nft-id, pricing, reputation, reservation, signature
├── vocabulary/        # 28 modules: currency, conformance-category, conservation-status, reservation-*, ...
├── validators/        # 3 files: index.ts (registry), billing.ts, compatibility.ts
├── constraints/       # index.ts, types.ts, evaluator.ts, detailed-evaluator.ts, grammar.ts, tokenizer.ts
├── integrity/         # req-hash, idempotency
├── core/              # Barrel: 209 exports
├── economy/           # Barrel: 186 exports
├── governance/        # Barrel: 73 exports
├── model/             # Barrel: 206 exports
├── version.ts         # CONTRACT_VERSION = '5.2.0'
└── index.ts           # Root barrel: 25 exports
```

### 2.2 v5.3.0 Changes (Additions + Modifications)

```diff
 src/
 ├── schemas/
+│   ├── governance-config.ts                     # NEW: FR-6 — GovernanceConfig schema
 │   └── discovery.ts                             # MODIFIED: FR-8 — @example JSDoc blocks
 ├── utilities/
 │   ├── reservation.ts                           # MODIFIED: FR-1/FR-2 — post-tx floor check + advisory warnings
+│   ├── governance.ts                            # NEW: FR-6 — resolveReservationTier()
 │   └── pricing.ts                               # (unchanged — JSDoc additions only)
 ├── vocabulary/
 │   ├── conservation-status.ts                   # MODIFIED: FR-4 — JSDoc pattern reference
 │   └── reservation-tier.ts                      # MODIFIED: FR-5 — ROUNDING_BIAS constant
+├── docs/patterns/
+│   └── epistemic-tristate.md                    # NEW: FR-4 — Pattern documentation
+├── constraints/
+│   ├── EpistemicTristate.constraints.json        # NEW: FR-4 — Tristate invariant
+│   ├── ReservationArithmetic.constraints.json    # NEW: FR-5 — Rounding bias invariant
+│   └── GovernanceConfig.constraints.json         # NEW: FR-6 — Governance bounds
 ├── version.ts                                   # MODIFIED: CONTRACT_VERSION = '5.3.0'
 └── index.ts                                     # MODIFIED: new exports
```

### 2.3 New File Summary

| File | FR | Lines (est.) | Purpose |
|------|-----|-------------|---------|
| `schemas/governance-config.ts` | FR-6 | ~70 | GovernanceConfig schema |
| `utilities/governance.ts` | FR-6 | ~60 | resolveReservationTier, resolveAdvisoryThreshold |
| `docs/patterns/epistemic-tristate.md` | FR-4 | ~120 | Pattern documentation with parallels |
| `constraints/EpistemicTristate.constraints.json` | FR-4 | ~25 | Tristate distinguishability invariant |
| `constraints/ReservationArithmetic.constraints.json` | FR-5 | ~20 | Rounding bias invariant |
| `constraints/GovernanceConfig.constraints.json` | FR-6 | ~30 | Governance parameter bounds |

### 2.4 Modified File Summary

| File | FR | Changes |
|------|-----|---------|
| `utilities/reservation.ts` | FR-1, FR-2 | Post-tx floor check, advisory warnings, new fields on ReservationDecision |
| `vocabulary/conservation-status.ts` | FR-4 | JSDoc referencing Epistemic Tristate pattern |
| `utilities/signature.ts` | FR-4 | JSDoc referencing Epistemic Tristate pattern |
| `vocabulary/reservation-tier.ts` | FR-5, FR-6 | ROUNDING_BIAS constant, JSDoc on ceil-division policy |
| `schemas/discovery.ts` | FR-8 | @example JSDoc blocks on buildDiscoveryDocument |
| `constraints/index.ts` | FR-7 | JSDoc header referencing Ostrom principles |
| `version.ts` | FR-9 | CONTRACT_VERSION = '5.3.0' |

---

## 3. Component Design

### 3.1 FR-1: Post-Transaction Floor Enforcement (HIGH-V52-001)

**File:** `src/utilities/reservation.ts`
**Impact:** Modify `shouldAllowRequest()` algorithm — Case 1 gains a post-transaction floor check.

#### 3.1.1 Current Algorithm (v5.2.0 — Buggy)

```typescript
// reservation.ts:144-151 — CURRENT (v5.2.0)
// Case 1: Sufficient budget — always allow
if (available >= cost) {
  return {
    allowed: true,
    reason: 'Sufficient budget available',
    floor_breached: false,
  };
}
```

**Bug:** `available=1000, cost=900, reserved=500` → Case 1 fires (`1000 >= 900`) → `allowed: true`. But post-transaction balance is `100 < 500 = reserved`. The floor is breached silently.

#### 3.1.2 Corrected Algorithm (v5.3.0)

```typescript
export interface ReservationDecision {
  allowed: boolean;
  reason: string;
  floor_breached: boolean;
  enforcement_action?: 'block' | 'warn' | 'downgrade';
  /** Advisory warning when approaching or breaching floor. */
  warning?: string;
  /** Post-transaction available balance (string-encoded BigInt). */
  post_transaction_available?: string;
}

export function shouldAllowRequest(
  availableMicro: string,
  costMicro: string,
  reservedMicro: string,
  enforcement: ReservationEnforcement,
): ReservationDecision {
  const available = parseMicroUSD(availableMicro);
  const cost = parseMicroUSD(costMicro);
  const reserved = parseMicroUSD(reservedMicro);
  const postTransaction = available - cost;

  // Case 1: Sufficient budget — but check post-transaction floor
  if (available >= cost) {
    // NEW: Post-transaction floor check (HIGH-V52-001 fix)
    if (postTransaction < reserved) {
      // Request would breach reservation floor
      return handleFloorBreach(enforcement, postTransaction, reserved);
    }

    // Check advisory near-floor warning (FR-2)
    if (enforcement === 'advisory') {
      const warningResult = checkAdvisoryWarning(postTransaction, reserved);
      if (warningResult) {
        return {
          allowed: true,
          reason: 'Sufficient budget available',
          floor_breached: false,
          warning: warningResult,
          post_transaction_available: postTransaction.toString(),
        };
      }
    }

    return {
      allowed: true,
      reason: 'Sufficient budget available',
      floor_breached: false,
      post_transaction_available: postTransaction.toString(),
    };
  }

  // Case 2: Floor breach — available is at or below the reserved floor (SKP-003)
  if (available <= reserved) {
    return handleAtFloor(enforcement, available, reserved);
  }

  // Case 3: Above floor but insufficient — normal budget shortfall
  return {
    allowed: false,
    reason: 'Insufficient budget (above reservation floor)',
    floor_breached: false,
    enforcement_action: enforcement === 'strict' ? 'block'
      : enforcement === 'advisory' ? 'warn' : 'block',
  };
}
```

#### 3.1.3 Floor Breach Handler

```typescript
/**
 * Handle the case where a request would breach the reservation floor.
 *
 * Enforcement semantics:
 * - strict: BLOCK — the floor is inviolable
 * - advisory: ALLOW with warning — soft enforcement, caller decides
 * - unsupported: BLOCK — no enforcement mechanism, conservative default
 */
function handleFloorBreach(
  enforcement: ReservationEnforcement,
  postTransaction: bigint,
  reserved: bigint,
): ReservationDecision {
  const postTxStr = postTransaction.toString();

  if (enforcement === 'advisory') {
    // Advisory ALLOWS but warns (FL-PRD-001 decision)
    return {
      allowed: true,
      reason: 'Sufficient budget available (advisory: floor would be breached)',
      floor_breached: false, // Not yet breached — would be breached after spending
      warning: `Post-transaction balance (${postTxStr}) would breach reservation floor (${reserved.toString()})`,
      post_transaction_available: postTxStr,
    };
  }

  // strict and unsupported: BLOCK
  return {
    allowed: false,
    reason: `Request would breach reservation floor (post-transaction balance: ${postTxStr}, floor: ${reserved.toString()})`,
    floor_breached: true,
    enforcement_action: 'block',
    post_transaction_available: postTxStr,
  };
}
```

#### 3.1.4 At-Floor Handler (Case 2 — Preserves SKP-003)

```typescript
function handleAtFloor(
  enforcement: ReservationEnforcement,
  available: bigint,
  reserved: bigint,
): ReservationDecision {
  if (enforcement === 'unsupported') {
    return {
      allowed: false,
      reason: 'Insufficient budget (reservation enforcement unsupported)',
      floor_breached: true,
      enforcement_action: 'block',
    };
  }

  if (enforcement === 'advisory') {
    return {
      allowed: false,
      reason: 'Budget at or below reservation floor (advisory)',
      floor_breached: true,
      enforcement_action: 'warn',
    };
  }

  // strict
  return {
    allowed: false,
    reason: 'Budget at or below reservation floor (strict enforcement)',
    floor_breached: true,
    enforcement_action: 'block',
  };
}
```

**GovernanceConfig integration (FL-SDD-003):** In Sprint 3 (FR-6), `shouldAllowRequest` gains an optional 5th parameter `config?: GovernanceConfig` that flows through to `checkAdvisoryWarning` for configurable threshold. Sprint 1 uses the hardcoded `ADVISORY_WARNING_THRESHOLD_PERCENT` constant; Sprint 3 makes it configurable. The function signature changes are backward-compatible (new optional param).

**Backward compatibility:** The only behavior change is in Case 1 when `available >= cost` AND `available - cost < reserved`. Previously returned `allowed: true`; now returns `allowed: false` under strict/unsupported. This is a correctness fix documented in CHANGELOG.

**Test strategy:** Existing tests for `shouldAllowRequest` cover Cases 2 and 3 — these continue passing. New tests target the Case 1 post-transaction check edge cases. Property-based tests via fast-check for arbitrary `available/cost/reserved` triples.

---

### 3.2 FR-2: Advisory Graduated Warnings (MEDIUM-V52-001)

**File:** `src/utilities/reservation.ts`
**Impact:** New helper function + constant for advisory near-floor warnings.

#### 3.2.1 Warning Threshold Constant

```typescript
/**
 * Advisory warning threshold: warn when post-transaction balance is
 * within this percentage of the reservation floor.
 *
 * 20% means: if floor is 500, warn when post-transaction < 600.
 * Calculation: post_transaction < reserved * (100 + threshold) / 100
 *
 * Configurable via GovernanceConfig (FR-6).
 */
export const ADVISORY_WARNING_THRESHOLD_PERCENT = 20;
```

#### 3.2.2 Warning Check Function

```typescript
/**
 * Check if post-transaction balance is within the advisory warning zone.
 *
 * Warning zone: post_transaction_available < reserved * (100 + threshold) / 100
 * Uses BigInt ceiling multiplication to match protocol rounding bias.
 *
 * @returns Warning message if in warning zone, null otherwise.
 */
function checkAdvisoryWarning(
  postTransaction: bigint,
  reserved: bigint,
  thresholdPercent: number = ADVISORY_WARNING_THRESHOLD_PERCENT,
): string | null {
  if (reserved <= 0n) return null;

  // Warning threshold: reserved * (100 + threshold) / 100
  // E.g., reserved=500, threshold=20 → threshold_value = 500 * 120 / 100 = 600
  const warningThreshold = (reserved * BigInt(100 + thresholdPercent)) / 100n;

  if (postTransaction < warningThreshold) {
    return `Post-transaction balance (${postTransaction.toString()}) is within ${thresholdPercent}% of reservation floor (${reserved.toString()})`;
  }

  return null;
}
```

#### 3.2.3 Enforcement Semantics Summary

| Scenario | strict | advisory | unsupported |
|----------|--------|----------|-------------|
| Sufficient budget, post-tx above floor + above warning zone | allow | allow | allow |
| Sufficient budget, post-tx above floor + in warning zone | allow (no warning) | allow + warning | allow (no warning) |
| Sufficient budget, post-tx would breach floor | **block** | **allow + warning** | **block** |
| Already at/below floor | block | block (warn) | block |
| Above floor, insufficient budget | block | warn | block |

**Key design point:** Advisory mode is the ONLY mode that allows through a floor breach (with warning). This makes advisory semantically meaningful — it's not just "strict with different labels." The FAANG parallel is AWS Budgets: you can set a budget to `alert` (advisory) or `enforce` (strict).

---

### 3.3 FR-3: Conformance Vectors — Full Enforcement Coverage (MEDIUM-V52-002)

**Directory:** `vectors/conformance/reservation-enforcement/`
**Impact:** 4+ new vectors alongside the existing 4 strict-only vectors.

#### 3.3.1 New Vectors

| Vector ID | Enforcement | Scenario | expected_valid |
|-----------|-------------|----------|----------------|
| `conformance-reservation-enforcement-0005` | advisory | Post-tx would breach floor → allowed with warning | true |
| `conformance-reservation-enforcement-0006` | advisory | Post-tx in warning zone (within 20%) → allowed with warning | true |
| `conformance-reservation-enforcement-0007` | unsupported | Sufficient budget, above floor → allowed, no enforcement | true |
| `conformance-reservation-enforcement-0008` | unsupported | At floor → blocked with enforcement_action 'block' | true |

#### 3.3.2 Vector Schema Extension

The `ReservationVector` interface in the test harness gains:

```typescript
interface ReservationVector {
  // ... existing fields ...
  expected_output: {
    reserved_micro: string;
    tier_valid?: boolean;
    enforcement?: string;
    allowed?: boolean;
    floor_breached?: boolean;
    reason?: string;
    /** NEW: Expected warning message pattern (advisory mode). */
    warning_pattern?: string;
    /** NEW: Expected post-transaction available. */
    post_transaction_available?: string;
  };
}
```

#### 3.3.3 Vector 0005: Advisory Floor Breach (Allow with Warning)

```json
{
  "vector_id": "conformance-reservation-enforcement-0005",
  "category": "reservation-enforcement",
  "description": "Advisory enforcement allows request that would breach floor, with warning",
  "contract_version": "5.3.0",
  "input": {
    "agent_id": "agent-advisory-breach",
    "conformance_level": "self_declared",
    "reserved_capacity_bps": 500,
    "budget_limit_micro": "10000",
    "budget_spent_micro": "0",
    "request_cost_micro": "9600",
    "enforcement": "advisory"
  },
  "expected_output": {
    "reserved_micro": "500",
    "allowed": true,
    "floor_breached": false,
    "warning_pattern": "would breach reservation floor",
    "post_transaction_available": "400"
  },
  "expected_valid": true,
  "matching_rules": { "select_fields": ["allowed", "floor_breached"] },
  "metadata": { "finding": "MEDIUM-V52-002", "enforcement_mode": "advisory" }
}
```

#### 3.3.4 Test Harness Update

**File:** `tests/vectors/reservation-enforcement-vectors.test.ts`

Add test blocks for vectors 0005-0008 exercising advisory and unsupported modes. The harness calls `shouldAllowRequest()` with the corrected (v5.3.0) algorithm and validates `warning` field presence for advisory vectors.

---

### 3.4 FR-4: Epistemic Tristate Pattern Formalization (PRAISE-V52-001)

**Impact:** Documentation + JSDoc + constraint file. No new TypeBox schema.

#### 3.4.1 Pattern Document

**File:** `docs/patterns/epistemic-tristate.md`

```markdown
# Epistemic Tristate Pattern

## Definition

A three-valued logic pattern for trust-sensitive assertions where the system
must distinguish between "known to be true," "known to be false," and "unknown."

## When to Use

Use the Epistemic Tristate when your subsystem:
- Makes trust assertions that could be unverifiable at runtime
- Deals with verification that depends on external state (keys, snapshots, context)
- Must communicate uncertainty honestly rather than defaulting to pass/fail

Decision rubric: If "false" and "I don't know" would require different consumer
actions, you need three states, not two.

## Instances in loa-hounfour

| Subsystem | Type | States | File |
|-----------|------|--------|------|
| Conservation | `ConservationStatus` | `conserved \| violated \| unverifiable` | `vocabulary/conservation-status.ts` |
| Signature | `SignatureVerificationResult` | `verified: true \| false \| 'unverifiable'` | `utilities/signature.ts` |
| Conformance | Implicit | match \| mismatch \| missing dimension | `utilities/conformance-matcher.ts` |

## Why Not a Generic Type?

The instances differ in shape:
- `ConservationStatus` is a string literal union (TypeBox schema)
- `SignatureVerificationResult` is a discriminated union with mixed types
- Conformance matching is implicit (missing dimension = unknown)

Forcing a generic type would sacrifice type safety for uniformity.
The pattern's value is in **naming**, not **abstracting**.

## Parallels

| System | Tristate | Problem Solved |
|--------|----------|----------------|
| Kubernetes conditions | `True \| False \| Unknown` | Controllers can't distinguish "unhealthy" from "haven't checked" |
| Protobuf field presence | set \| default \| absent | `has_field()` distinguishes explicit default from absent |
| Certificate Transparency | good \| revoked \| unknown | OCSP responders may not have revocation data yet |
| SQL NULL | true \| false \| NULL | Ternary logic for missing/unknown data |
| Łukasiewicz (1920) | 1 \| 0 \| ½ | Formalized three-valued propositional logic |

## Invariant

All three states MUST be distinguishable — no two states may collapse to
the same consumer behavior. If consumers treat "false" and "unknown" identically,
the tristate has degenerated to a boolean and should be simplified.

See: `constraints/EpistemicTristate.constraints.json`
```

#### 3.4.2 Constraint File

**File:** `constraints/EpistemicTristate.constraints.json`

```json
{
  "$schema": "https://loa-hounfour.dev/schemas/constraint-file.json",
  "schema_id": "EpistemicTristate",
  "contract_version": "5.3.0",
  "expression_version": "1.0",
  "constraints": [
    {
      "id": "tristate-distinguishability",
      "expression": "true",
      "severity": "error",
      "message": "All three epistemic states must produce distinguishable consumer behavior. If two states collapse, simplify to boolean.",
      "fields": [],
      "institutional_context": "Architectural pattern invariant — applies to all Epistemic Tristate instances. Enforcement is via code review and pattern documentation, not runtime expression evaluation."
    }
  ],
  "metadata": {
    "pattern": "epistemic-tristate",
    "instances": ["ConservationStatus", "SignatureVerificationResult", "conformance-matching"],
    "references": ["Łukasiewicz 1920", "Kubernetes conditions", "Protobuf field presence"]
  }
}
```

#### 3.4.3 JSDoc Updates

**File:** `src/vocabulary/conservation-status.ts` — Add to existing JSDoc:

```typescript
/**
 * Conservation verification status — tristate result of pricing conservation check.
 *
 * Instance of the Epistemic Tristate pattern (docs/patterns/epistemic-tristate.md).
 * ...existing docs...
 */
```

**File:** `src/utilities/signature.ts` — Add to `SignatureVerificationResult` JSDoc:

```typescript
/**
 * Discriminated union for signature verification results.
 *
 * Instance of the Epistemic Tristate pattern (docs/patterns/epistemic-tristate.md):
 * - `verified: true` — known good (signature valid)
 * - `verified: false` — known bad (signature invalid or verification failed)
 * - `verified: 'unverifiable'` — unknown (cannot verify: missing signature, no key resolver)
 */
```

---

### 3.5 FR-5: Ceil-Division Bias Documentation (PRAISE-V52-002)

**File:** `src/vocabulary/reservation-tier.ts`
**Impact:** New constant + JSDoc. No logic change.

#### 3.5.1 ROUNDING_BIAS Constant

```typescript
/**
 * Protocol rounding bias policy.
 *
 * When arithmetic rounding creates ambiguity (e.g., ceil vs floor division),
 * the protocol biases toward the rights-holder (the agent). This ensures:
 * - computeReservedMicro uses ceiling division: (limit * bps + 9999) / 10000
 * - shouldAllowRequest uses SKP-003: available <= reserved (not <)
 *
 * Combined effect: the agent always gets the benefit of sub-micro fractions.
 * This is a deliberate policy choice, not an implementation detail.
 *
 * Basel III parallel: regulatory capital ratios round toward the safety margin.
 *
 * @see computeReservedMicro — ceiling division
 * @see shouldAllowRequest — SKP-003 floor enforcement
 * @see constraints/ReservationArithmetic.constraints.json
 */
export const ROUNDING_BIAS = 'rights_holder' as const;

export type RoundingBias = typeof ROUNDING_BIAS;
```

#### 3.5.2 JSDoc Enhancements

**File:** `src/utilities/reservation.ts:computeReservedMicro` — Enhance existing JSDoc:

```typescript
/**
 * Compute the reserved micro-USD amount for a given budget limit and basis points.
 *
 * Uses ceil division: `(limit * bps + 9999) / 10000` to ensure the reserved
 * amount is never understated. This implements the protocol's ROUNDING_BIAS
 * toward the rights-holder: when rounding creates ambiguity, the agent gets
 * the benefit.
 *
 * @see ROUNDING_BIAS — 'rights_holder' policy documentation
 * ...existing params/returns...
 */
```

**File:** `src/utilities/reservation.ts:shouldAllowRequest` — Enhance existing JSDoc:

```typescript
/**
 * ...existing docs...
 *
 * **SKP-003 + ROUNDING_BIAS:** The floor breach condition is `available <= reserved`
 * (not `<`). Combined with ceiling division in computeReservedMicro, this ensures
 * the protocol systematically favors the rights-holder at boundaries.
 *
 * @see ROUNDING_BIAS — 'rights_holder' policy documentation
 */
```

#### 3.5.3 Constraint File

**File:** `constraints/ReservationArithmetic.constraints.json`

```json
{
  "$schema": "https://loa-hounfour.dev/schemas/constraint-file.json",
  "schema_id": "ReservationArithmetic",
  "contract_version": "5.3.0",
  "expression_version": "1.0",
  "constraints": [
    {
      "id": "ceil-division-bias",
      "expression": "true",
      "severity": "error",
      "message": "computeReservedMicro MUST use ceiling division: (limit * bps + 9999) / 10000. Floor division would reduce reserved capacity below the intended percentage, violating the rights-holder bias.",
      "fields": [],
      "institutional_context": "Protocol arithmetic invariant. Rounding ALWAYS favors the agent (rights-holder). Changing to floor division is a constitutional amendment, not an optimization."
    },
    {
      "id": "floor-check-inclusive",
      "expression": "true",
      "severity": "error",
      "message": "shouldAllowRequest floor check MUST use <= (not <). At the exact boundary, spending the request would breach the floor.",
      "fields": [],
      "institutional_context": "SKP-003 fix. The off-by-one in < allows one request to silently consume the last unit of reserved capacity."
    }
  ]
}
```

---

### 3.6 FR-6: GovernanceConfig Schema (SPEC-V52-001)

**File:** `src/schemas/governance-config.ts`
**Impact:** New schema + new utility file + constraint file.

#### 3.6.1 Schema Definition

```typescript
import { Type, type Static } from '@sinclair/typebox';
import { ConformanceLevelSchema } from './model/conformance-level.js';
import { ReservationTierSchema } from '../vocabulary/reservation-tier.js';

/**
 * Protocol governance configuration — the beginning of governance-configurable parameters.
 *
 * GovernanceConfig allows protocol parameters to be overridden from their
 * hardcoded defaults. In v5.3.0, this covers reservation tier minimums and
 * advisory warning thresholds. Future versions will add more parameters.
 *
 * This is NOT a runtime configuration file. It is a protocol-level schema
 * that defines the structure of governance parameters. How these parameters
 * are proposed, debated, and adopted is out of scope for v5.3.0.
 *
 * @see SPEC-V52-001 — Bridgebuilder Review III finding
 * @see RESERVATION_TIER_MAP — default values
 * @see ADVISORY_WARNING_THRESHOLD_PERCENT — default advisory threshold
 */
export const GovernanceConfigSchema = Type.Object(
  {
    governance_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Semver version tracking governance parameter changes independently of protocol version.',
    }),
    reservation_tiers: Type.Object(
      {
        self_declared: ReservationTierSchema,
        community_verified: ReservationTierSchema,
        protocol_certified: ReservationTierSchema,
      },
      {
        additionalProperties: false,
        description: 'Minimum reservation capacity (bps) per conformance level.',
      },
    ),
    advisory_warning_threshold_percent: Type.Integer({
      minimum: 0,
      maximum: 100,
      description: 'Percentage threshold for advisory near-floor warnings. Default: 20.',
    }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  {
    $id: 'GovernanceConfig',
    additionalProperties: false,
    description: 'Protocol governance parameters. Overrides hardcoded defaults when provided.',
  },
);

export type GovernanceConfig = Static<typeof GovernanceConfigSchema>;

/**
 * Default GovernanceConfig matching current hardcoded values.
 * Used as fallback when no explicit config is provided.
 */
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  governance_version: '1.0.0',
  reservation_tiers: {
    self_declared: 300,
    community_verified: 500,
    protocol_certified: 1000,
  },
  advisory_warning_threshold_percent: 20,
};
```

#### 3.6.2 Governance Utility Functions

**File:** `src/utilities/governance.ts`

```typescript
import { RESERVATION_TIER_MAP, type ReservationTier } from '../vocabulary/reservation-tier.js';
import { ADVISORY_WARNING_THRESHOLD_PERCENT } from './reservation.js';
import type { GovernanceConfig } from '../schemas/governance-config.js';
import type { ConformanceLevel } from '../schemas/model/conformance-level.js';

/**
 * Resolve the minimum reservation tier for a conformance level.
 *
 * Uses GovernanceConfig when provided, falls back to RESERVATION_TIER_MAP.
 */
export function resolveReservationTier(
  conformanceLevel: ConformanceLevel,
  config?: GovernanceConfig,
): ReservationTier {
  if (config) {
    return config.reservation_tiers[conformanceLevel];
  }
  return RESERVATION_TIER_MAP[conformanceLevel];
}

/**
 * Resolve the advisory warning threshold percentage.
 *
 * Uses GovernanceConfig when provided, falls back to ADVISORY_WARNING_THRESHOLD_PERCENT.
 */
export function resolveAdvisoryThreshold(
  config?: GovernanceConfig,
): number {
  if (config) {
    return config.advisory_warning_threshold_percent;
  }
  return ADVISORY_WARNING_THRESHOLD_PERCENT;
}
```

#### 3.6.3 validateReservationTier Update

**File:** `src/utilities/reservation.ts`

```typescript
import type { GovernanceConfig } from '../schemas/governance-config.js';
import { resolveReservationTier } from './governance.js';

/**
 * Validate that a reservation's basis points meet the minimum for the
 * agent's conformance level.
 *
 * Accepts optional GovernanceConfig to override default tier minimums.
 *
 * @param conformanceLevel - Agent's earned conformance level
 * @param actualBps - The actual reserved_capacity_bps
 * @param config - Optional governance config overriding default tiers
 * @returns Validation result with minimum requirement
 */
export function validateReservationTier(
  conformanceLevel: ConformanceLevel,
  actualBps: number,
  config?: GovernanceConfig,
): TierValidation {
  const minimumBps = resolveReservationTier(conformanceLevel, config);

  if (actualBps >= minimumBps) {
    return { valid: true, minimum_bps: minimumBps, actual_bps: actualBps };
  }

  return {
    valid: false,
    minimum_bps: minimumBps,
    actual_bps: actualBps,
    reason: `Reservation ${actualBps} bps is below minimum ${minimumBps} bps for ${conformanceLevel}`,
  };
}
```

**Backward compatibility:** The `config` parameter is optional. Existing callers with 2 arguments continue working unchanged.

#### 3.6.4 Constraint File

**File:** `constraints/GovernanceConfig.constraints.json`

```json
{
  "$schema": "https://loa-hounfour.dev/schemas/constraint-file.json",
  "schema_id": "GovernanceConfig",
  "contract_version": "5.3.0",
  "expression_version": "2.0",
  "constraints": [
    {
      "id": "governance-tier-ordering",
      "expression": "reservation_tiers.self_declared <= reservation_tiers.community_verified && reservation_tiers.community_verified <= reservation_tiers.protocol_certified",
      "severity": "error",
      "message": "Tier minimums must be non-decreasing: self_declared <= community_verified <= protocol_certified",
      "fields": ["reservation_tiers"]
    },
    {
      "id": "governance-tier-bounds",
      "expression": "reservation_tiers.self_declared >= 0 && reservation_tiers.protocol_certified <= 10000",
      "severity": "error",
      "message": "Tier values must be in [0, 10000] basis points",
      "fields": ["reservation_tiers"]
    },
    {
      "id": "governance-advisory-bounds",
      "expression": "advisory_warning_threshold_percent >= 0 && advisory_warning_threshold_percent <= 100",
      "severity": "error",
      "message": "Advisory threshold must be in [0, 100] percent",
      "fields": ["advisory_warning_threshold_percent"]
    }
  ],
  "metadata": {
    "institutional_context": "GovernanceConfig defines the mutable parameters of the protocol's economic constitution. Changes to these values are governance acts, not implementation details."
  }
}
```

---

### 3.7 FR-7: Constraint Files as Institutional Rules — Ostrom Framing

**Impact:** JSDoc and metadata additions. No logic change.

#### 3.7.1 Constraint Evaluator JSDoc

**File:** `src/constraints/index.ts` — Add to module-level JSDoc:

```typescript
/**
 * Constraint expression evaluation system.
 *
 * Constraint files serve as the protocol's institutional rules — in the sense
 * of Elinor Ostrom's Institutional Analysis and Development (IAD) framework.
 * Each constraint defines a rule that governs how protocol participants may
 * interact with a schema. The `expression_version` field enables rule evolution
 * without breaking existing participants — Ostrom's "minimal recognition of
 * rights to organize" principle.
 *
 * @see Ostrom, E. (1990). Governing the Commons.
 * @see constraints/GovernanceConfig.constraints.json — governance parameters as institutional rules
 */
```

#### 3.7.2 Institutional Context Metadata

New constraint files (FR-4, FR-5, FR-6) include an `institutional_context` field. Additionally, update one existing constraint file as exemplar:

**File:** `constraints/AgentCapacityReservation.constraints.json` — Add to the `reservation-tier-minimum` constraint:

```json
{
  "id": "reservation-tier-minimum",
  "expression": "conformance_level == 'self_declared' => reserved_capacity_bps >= 300",
  "severity": "error",
  "message": "self_declared conformance requires minimum 300 bps (3%)",
  "fields": ["conformance_level", "reserved_capacity_bps"],
  "institutional_context": "Ostrom boundary rule: agents who self-declare conformance receive minimum guaranteed capacity. The 300 bps threshold is a governance parameter (see GovernanceConfig)."
}
```

---

### 3.8 FR-8: JSDoc Examples for Discovery API

**File:** `src/schemas/discovery.ts:buildDiscoveryDocument`

#### 3.8.1 Options-Object Example (Recommended)

```typescript
/**
 * Build a protocol discovery document.
 *
 * @example Options object (recommended):
 * ```typescript
 * const doc = buildDiscoveryDocument(
 *   ['BillingEntry', 'CompletionResult', 'AgentCapacityReservation'],
 *   {
 *     aggregateTypes: ['billing', 'completion'],
 *     capabilitiesUrl: 'https://api.example.com/capabilities',
 *     expressionVersions: ['1.0', '2.0'],
 *     providers: [
 *       { provider: 'openai', model_count: 4, supports_reservations: true },
 *     ],
 *   },
 * );
 * ```
 *
 * @example Legacy positional arguments (deprecated):
 * ```typescript
 * // @deprecated — Use options object overload instead.
 * const doc = buildDiscoveryDocument(
 *   ['BillingEntry', 'CompletionResult'],
 *   ['billing'],
 *   'https://api.example.com/capabilities',
 *   ['1.0'],
 * );
 * ```
 */
```

---

### 3.9 FR-9: Version Bump to v5.3.0

**File:** `src/version.ts`

```typescript
export const CONTRACT_VERSION = '5.3.0' as const;
export const MIN_SUPPORTED_VERSION = '5.0.0' as const;  // unchanged — N-1 support continues
```

**package.json:**

```json
{
  "version": "5.3.0"
}
```

**vectors/VERSION:** Update to `5.3.0`.

**schemas/index.json:** Regenerate with:
- GovernanceConfig schema added
- All `$id` URLs updated to v5.3.0 base
- ReservationDecision type updated (optional warning, post_transaction_available fields)

---

## 4. Test Architecture

### 4.1 New Test Files

| File | Tests (est.) | FR | Coverage |
|------|-------------|-----|----------|
| `tests/utilities/reservation-v53.test.ts` | ~35 | FR-1, FR-2 | Post-tx floor check, advisory warnings, edge cases |
| `tests/vectors/reservation-enforcement-v53.test.ts` | ~20 | FR-3 | Advisory + unsupported enforcement vectors |
| `tests/schemas/governance-config.test.ts` | ~20 | FR-6 | Schema validation, defaults, constraint evaluation |
| `tests/utilities/governance.test.ts` | ~15 | FR-6 | resolveReservationTier, resolveAdvisoryThreshold |
| `tests/properties/reservation-floor.test.ts` | ~15 | FR-1, FR-2 | Property-based: arbitrary available/cost/reserved triples |
| `tests/constraints/epistemic-tristate.test.ts` | ~8 | FR-4 | Constraint file validation |
| `tests/constraints/governance-config.test.ts` | ~10 | FR-6 | Tier ordering, bounds |

### 4.2 Modified Test Files

| File | Changes | FR |
|------|---------|-----|
| `tests/vectors/reservation-enforcement-vectors.test.ts` | Extend for new vectors 0005-0008 | FR-3 |
| `tests/utilities/reservation.test.ts` | Update for changed behavior + new fields | FR-1 |
| `tests/vectors/compatibility.test.ts` | Add v5.3.0 compatibility checks | FR-9 |
| `tests/vectors/version-bump.test.ts` | Update CONTRACT_VERSION to '5.3.0' | FR-9 |
| `tests/constraints/round-trip.test.ts` | Add new constraint files | FR-4, FR-5, FR-6 |
| `tests/schemas/schema-index.test.ts` | Verify GovernanceConfig in index.json | FR-6 |

**Estimated new tests:** ~123 (target: ≥120)

### 4.3 Property-Based Testing Strategy

```typescript
// tests/properties/reservation-floor.test.ts
import { fc } from 'fast-check';

describe('Post-transaction floor invariant', () => {
  it('strict mode NEVER allows post-transaction balance below floor', () => {
    fc.assert(
      fc.property(
        fc.bigInt(1n, 10n ** 18n),  // available
        fc.bigInt(1n, 10n ** 18n),  // cost
        fc.bigInt(0n, 10n ** 18n),  // reserved
        (available, cost, reserved) => {
          const result = shouldAllowRequest(
            available.toString(), cost.toString(), reserved.toString(), 'strict',
          );
          if (result.allowed) {
            // Post-transaction must be >= reserved
            expect(available - cost).toBeGreaterThanOrEqual(reserved);
          }
        },
      ),
    );
  });

  it('advisory mode always returns warning when post-tx < reserved', () => {
    fc.assert(
      fc.property(
        fc.bigInt(1n, 10n ** 18n),
        fc.bigInt(1n, 10n ** 18n),
        fc.bigInt(1n, 10n ** 18n),
        (available, cost, reserved) => {
          fc.pre(available >= cost);  // sufficient budget
          fc.pre(available - cost < reserved);  // would breach floor
          const result = shouldAllowRequest(
            available.toString(), cost.toString(), reserved.toString(), 'advisory',
          );
          expect(result.allowed).toBe(true);
          expect(result.warning).toBeDefined();
        },
      ),
    );
  });
});
```

---

## 5. Barrel Export Updates

### 5.1 economy/index.ts

Add exports:
- `GovernanceConfig`, `GovernanceConfigSchema`, `DEFAULT_GOVERNANCE_CONFIG` from `schemas/governance-config.ts`
- `resolveReservationTier`, `resolveAdvisoryThreshold` from `utilities/governance.ts`
- `ROUNDING_BIAS`, `RoundingBias` from `vocabulary/reservation-tier.ts`
- `ADVISORY_WARNING_THRESHOLD_PERCENT` from `utilities/reservation.ts`

### 5.2 Root index.ts

Add cross-cutting exports:
- `GovernanceConfig`, `GovernanceConfigSchema`

---

## 6. JSON Schema Generation

New schema registered in `schemas/index.json`:

| Schema $id | Source File |
|-----------|------------|
| `GovernanceConfig` | `src/schemas/governance-config.ts` |

Existing schemas with modified types:
- `ReservationDecision` implicit type (no schema, but TypeScript interface has new optional fields)

New constraint files:
| File | Schema |
|------|--------|
| `constraints/EpistemicTristate.constraints.json` | EpistemicTristate (pattern) |
| `constraints/ReservationArithmetic.constraints.json` | ReservationArithmetic (invariant) |
| `constraints/GovernanceConfig.constraints.json` | GovernanceConfig |

---

## 7. Security Considerations

### 7.1 Post-Transaction Floor Check (FR-1)

The correctness fix in FR-1 is a security improvement: the v5.2.0 behavior allowed a single large request to silently consume reserved capacity. This is analogous to a time-of-check-to-time-of-use (TOCTOU) vulnerability — the check (Case 1: `available >= cost`) doesn't account for the effect of the operation.

The fix ensures **post-transaction capital adequacy** — the same principle Basel III uses for bank capital requirements.

### 7.2 GovernanceConfig (FR-6)

GovernanceConfig introduces configurable parameters. Security constraints:
- Tier values are bounded by TypeBox schema (`minimum: 0`, `maximum: 10000`)
- Tier ordering is enforced by constraint (`self_declared <= community_verified <= protocol_certified`)
- Advisory threshold is bounded (`0 <= threshold <= 100`)
- The `DEFAULT_GOVERNANCE_CONFIG` constant provides a safe fallback
- GovernanceConfig MUST be validated against its constraint file before use

**Attack vector:** A malicious GovernanceConfig could set all tier minimums to 0, effectively disabling reservations. Mitigation: the constraint file enforces `reservation_tiers.self_declared >= 0` but does NOT enforce a nonzero minimum (by design — 0 bps is a valid governance choice meaning "no minimum reservation"). Implementations SHOULD validate that tier values are reasonable for their deployment context.

### 7.3 Advisory Mode (FR-2)

Advisory mode allows requests through floor breaches. This is by design — but it means advisory mode provides weaker guarantees than strict. Implementations MUST NOT use advisory mode for budget-critical operations where floor breaches would cause cascading failures.

---

## 8. Migration Notes

### 8.1 For v5.2.0 Consumers

- **shouldAllowRequest behavior change:** The only visible change: when `available >= cost` AND `available - cost < reserved`, strict/unsupported enforcement now returns `allowed: false`. This is a correctness fix — the v5.2.0 behavior violated the protocol's reservation guarantee. See PRD §11.2 for migration details.
- **New optional fields on ReservationDecision:** `warning?: string` and `post_transaction_available?: string`. Ignored by existing destructuring.
- **GovernanceConfig:** New optional schema. Existing code unaffected unless it chooses to use governance overrides.
- **validateReservationTier:** Gains optional 3rd parameter `config?: GovernanceConfig`. Existing 2-argument calls unaffected.

### 8.2 Breaking Changes

None. All changes are additive and backward compatible. The `shouldAllowRequest` behavior change is a correctness fix, not a contract break.

---

## 9. Sprint Alignment

| Sprint | SDD Sections | Key Deliverables |
|--------|-------------|-----------------|
| Sprint 1 | §3.1, §3.2, §3.5 | Post-tx floor fix (FR-1), advisory warnings (FR-2), rounding bias docs (FR-5) |
| Sprint 2 | §3.3, §3.4, §3.7, §3.8 | Conformance vectors (FR-3), Epistemic Tristate pattern (FR-4), Ostrom framing (FR-7), JSDoc examples (FR-8) |
| Sprint 3 | §3.6, §3.9 | GovernanceConfig schema + utilities (FR-6), version bump (FR-9) |

**Sprint 1** focuses on the P0 correctness fix and the enforcement semantics that depend on it.
**Sprint 2** focuses on conformance completeness and documentation/formalization.
**Sprint 3** focuses on governance evolution and release finalization.

---

## 10. Risks and Mitigations

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|------------|
| shouldAllowRequest fix breaks existing consumers | Low | Medium | Document as correctness fix; edge case only triggers when `available > cost` but `available - cost < reserved` |
| GovernanceConfig becomes dead code | Medium | Low | Start minimal (3 params); defer full governance until external implementors exist |
| Advisory allow-through-floor creates false safety | Low | High | Document clearly that advisory mode provides weaker guarantees; implementations SHOULD validate enforcement mode choice |
| Constraint expression evaluator doesn't support nested object paths | Medium | Medium | GovernanceConfig constraint uses dotted paths (`reservation_tiers.self_declared`); verify evaluator supports this or flatten |

---

## 11. Open Questions

| Question | Status | Resolution |
|----------|--------|------------|
| Should `checkAdvisoryWarning` accept configurable threshold? | Resolved | Yes, via GovernanceConfig (FR-6) |
| Should advisory mode at the floor (Case 2) allow or block? | Resolved | Block — advisory's "allow-through" only applies to would-breach (Case 1), not already-breached (Case 2) |
| Should EpistemicTristate be a generic type? | Resolved (FL-PRD-006) | No — documentation pattern only. Instances differ too much in shape. |
| Should marketplace dimensions be in v5.3.0? | Resolved (FL-PRD-007) | Deferred to v5.4.0. No consumer exists. |
| Does constraint evaluator support dotted paths? | Resolved (FL-SDD-002) | YES — `evaluator.ts:33-40` `resolve()` splits on `.` and traverses nested objects |
