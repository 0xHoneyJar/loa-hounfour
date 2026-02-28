# SDD: Hounfour v8.3.0 — Pre-Launch Protocol Hardening

**Status:** Draft
**Author:** Jani + Claude
**Date:** 2026-02-28
**PRD:** [grimoires/loa/prd.md](grimoires/loa/prd.md)
**Version:** v8.3.0 (MINOR — all changes additive, confirmed by finn/dixie/freeside)

---

## 1. Executive Summary

This SDD designs the implementation of 8 functional requirements (43 acceptance criteria) for hounfour v8.3.0. All changes are purely additive — new files, new exports, new schemas, extended unions. Zero changes to existing public API surfaces.

The design follows three principles:
1. **Module locality** — new code lands in the module closest to its domain (x402 → economy, dampening → commons, contracts → integrity)
2. **Pattern consistency** — every new schema uses the established TypeBox + Static + $id + additionalProperties:false pattern
3. **Opt-in complexity** — `computeChainBoundHash()` doesn't replace `computeAuditEntryHash()`, `GovernedResourceBase` doesn't replace `GOVERNED_RESOURCE_FIELDS`, conditional constraints don't affect existing constraint files

**New files:** 8 source files, 8 constraint files, 1 documentation file, 1 verification script
**Modified files:** 5 barrel files, 1 constraint type file, 1 evaluator file, 1 economic boundary file
**New conformance vectors:** 50+ across all FRs
**Breaking changes:** None

---

## 2. System Architecture

### 2.1 Module Placement

```
src/
├── commons/
│   ├── feedback-dampening.ts        ← NEW (FR-3)
│   ├── chain-bound-hash.ts          ← NEW (FR-5)
│   ├── audit-timestamp.ts           ← NEW (FR-5)
│   ├── advisory-lock.ts             ← NEW (FR-5)
│   ├── governed-resource-runtime.ts ← NEW (FR-8)
│   ├── audit-trail-hash.ts          ← EXISTING (extended docs only)
│   ├── governed-resource.ts         ← EXISTING (unchanged)
│   └── index.ts                     ← MODIFIED (new re-exports)
├── economy/
│   ├── x402-payment.ts              ← NEW (FR-1)
│   ├── economic-boundary.ts         ← MODIFIED (FR-2 — extended DenialCode + utility)
│   └── index.ts                     ← MODIFIED (new re-exports)
├── integrity/
│   ├── consumer-contract.ts         ← NEW (FR-4)
│   └── index.ts                     ← MODIFIED (new re-exports)
├── constraints/
│   ├── types.ts                     ← MODIFIED (FR-6 — condition field)
│   └── evaluator.ts                 ← MODIFIED (FR-6 — condition handling)
├── governance/
│   └── index.ts                     ← MODIFIED (FR-2 — new utility re-export)
│
constraints/
├── X402Quote.constraints.json           ← NEW
├── X402Settlement.constraints.json      ← NEW
├── FeedbackDampening.constraints.json   ← NEW
├── ConsumerContract.constraints.json    ← NEW
├── ChainBoundHash.constraints.json      ← NEW
├── GovernedResourceRuntime.constraints.json ← NEW
├── MutationContext.constraints.json     ← NEW
├── AuditTimestamp.constraints.json      ← NEW
│
vectors/
├── conformance/x402/                    ← NEW
├── conformance/feedback-dampening/      ← NEW
├── conformance/chain-bound-hash/        ← NEW
├── conformance/advisory-lock/           ← NEW
├── conformance/audit-timestamp/         ← NEW
├── conformance/consumer-contract/       ← NEW
├── conformance/governed-resource-runtime/ ← NEW
├── conformance/conditional-constraints/ ← NEW
│
docs/
└── integration/
    └── audit-trail-domains.md           ← NEW (FR-5)
│
scripts/
└── verify-consumer-contract.ts          ← NEW (FR-4)
```

### 2.2 Dependency Graph

```
FR-5 (audit trail utilities)     FR-8 (GovernedResource<T> runtime)
  ├── chain-bound-hash.ts          ├── governed-resource-runtime.ts
  │   └── depends: audit-trail-hash.ts (existing)
  │                @noble/hashes (existing)
  │                canonicalize (existing)
  ├── audit-timestamp.ts           FR-3 (feedback dampening)
  │   └── depends: (none — pure validation)
  ├── advisory-lock.ts             FR-1 (x402 schemas)
  │   └── depends: (none — pure math)
  │                                FR-6 (conditional constraints)
FR-2 (economic boundary)           ├── types.ts (extended)
  └── depends: economic-boundary.ts (existing)
               governance/reputation-aggregate.ts (existing)
                                   FR-4 (consumer contracts)
FR-7 (release)                       └── depends: (none — schema only)
  └── depends: all other FRs complete
```

No circular dependencies. No new npm packages required. All new utilities use existing dependencies (`@noble/hashes`, `canonicalize`, `@sinclair/typebox`).

---

## 3. Technology Stack

No changes to the technology stack. All new code uses existing dependencies:

| Technology | Usage | Version |
|-----------|-------|---------|
| TypeScript | All source code | ES2024, NodeNext modules |
| TypeBox | Schema definitions | Existing (via `@sinclair/typebox`) |
| `@noble/hashes` | SHA-256 for chain-bound hashing | Existing |
| `canonicalize` | RFC 8785 JCS for deterministic serialization | Existing |
| Vitest | Testing | Existing |

---

## 4. Component Design

### 4.1 FR-1: x402 Payment Schema Canonicalization

**File:** `src/economy/x402-payment.ts`

Four new TypeBox schemas following the established pattern. All financial values use the existing `MicroUSD` string-encoded pattern (`^[0-9]+$`).

```typescript
// src/economy/x402-payment.ts
import { Type, type Static } from '@sinclair/typebox';

// Re-use existing MicroUSD wire format from vocabulary/currency.ts
// maxLength: 20 prevents unbounded magnitudes (max ~$18.4 trillion at micro-USD scale)
// *(Flatline Sprint SKP-005, severity 775)*
const MicroUSDStringSchema = Type.String({ pattern: '^[0-9]+$', maxLength: 20 });

export const X402QuoteSchema = Type.Object(
  {
    quote_id: Type.String({ format: 'uuid' }),
    model: Type.String({ minLength: 1 }),
    max_cost_micro: MicroUSDStringSchema,
    payment_address: Type.String({
      pattern: '^0x[a-fA-F0-9]{40}$',
      description: 'EIP-55 checksummed Ethereum address.',
    }),
    chain_id: Type.Integer({ minimum: 1 }),
    token_address: Type.String({
      pattern: '^0x[a-fA-F0-9]{40}$',
      description: 'Settlement token contract address.',
    }),
    valid_until: Type.String({ format: 'date-time' }),
    cost_per_input_token_micro: Type.Optional(MicroUSDStringSchema),
    cost_per_output_token_micro: Type.Optional(MicroUSDStringSchema),
  },
  {
    $id: 'X402Quote',
    additionalProperties: false,
    description: 'x402 payment quote issued by a model provider.',
  },
);
export type X402Quote = Static<typeof X402QuoteSchema>;

export const X402PaymentProofSchema = Type.Object(
  {
    payment_header: Type.String({ minLength: 1 }),
    quote_id: Type.String({ format: 'uuid' }),
    tx_hash: Type.Optional(Type.String({
      pattern: '^0x[a-fA-F0-9]{64}$',
      description: 'On-chain transaction hash for settlement verification.',
    })),
  },
  {
    $id: 'X402PaymentProof',
    additionalProperties: false,
    description: 'Proof of payment accompanying an x402 request.',
  },
);
export type X402PaymentProof = Static<typeof X402PaymentProofSchema>;

export const X402SettlementStatusSchema = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('confirmed'),
    Type.Literal('failed'),
    Type.Literal('refunded'),
  ],
  { $id: 'X402SettlementStatus' },
);
export type X402SettlementStatus = Static<typeof X402SettlementStatusSchema>;

export const X402SettlementSchema = Type.Object(
  {
    payment_id: Type.String({ format: 'uuid' }),
    quote_id: Type.String({ format: 'uuid' }),
    actual_cost_micro: MicroUSDStringSchema,
    settlement_status: X402SettlementStatusSchema,
    settled_at: Type.Optional(Type.String({ format: 'date-time' })),
    chain_id: Type.Integer({ minimum: 1 }),
    token_address: Type.String({ pattern: '^0x[a-fA-F0-9]{40}$' }),
  },
  {
    $id: 'X402Settlement',
    additionalProperties: false,
    description: 'Settlement record for an x402 payment.',
  },
);
export type X402Settlement = Static<typeof X402SettlementSchema>;

export const X402ErrorCodeSchema = Type.Union(
  [
    Type.Literal('PAYMENT_REQUIRED'),
    Type.Literal('NOT_ALLOWLISTED'),
    Type.Literal('INFERENCE_FAILED'),
    Type.Literal('FEATURE_DISABLED'),
    Type.Literal('QUOTE_EXPIRED'),
    Type.Literal('INSUFFICIENT_FUNDS'),
  ],
  {
    $id: 'X402ErrorCode',
    description: 'Machine-parseable x402 error codes.',
  },
);
export type X402ErrorCode = Static<typeof X402ErrorCodeSchema>;
```

**Barrel update:** Add to `src/economy/index.ts`:
```typescript
export {
  X402QuoteSchema, X402PaymentProofSchema, X402SettlementSchema,
  X402SettlementStatusSchema, X402ErrorCodeSchema,
  type X402Quote, type X402PaymentProof, type X402Settlement,
  type X402SettlementStatus, type X402ErrorCode,
} from './x402-payment.js';
```

**Constraints:** Each constraint file follows the established `ConstraintFile` schema *(Flatline IMP-006, avg 727.5)*:

`constraints/X402Quote.constraints.json`:
```json
{
  "schema_ref": "X402Quote",
  "version": "8.3.0",
  "constraints": [
    { "id": "x402-quote-valid-until-future", "expression": "valid_until > $now", "severity": "MUST" },
    { "id": "x402-quote-cost-positive", "expression": "max_cost_micro > '0'", "severity": "MUST" },
    { "id": "x402-quote-chain-id-known", "expression": "chain_id IN $known_chains", "severity": "SHOULD" }
  ]
}
```

`constraints/X402Settlement.constraints.json`: actual_cost_micro <= quote.max_cost_micro, settlement state transitions (pending → confirmed|failed, confirmed → refunded).

**Vectors:** 12 vectors in `vectors/conformance/x402/`:
- `valid-quote-berachain-honey.json` — happy path (Berachain, Honey token)
- `valid-quote-mainnet-usdc.json` — Ethereum mainnet, USDC
- `valid-settlement-confirmed.json` — confirmed settlement
- `valid-payment-proof-with-tx.json` — proof with on-chain tx
- `valid-payment-proof-offchain.json` — proof without tx (payment channel)
- `invalid-quote-expired.json` — valid_until in past
- `invalid-quote-zero-cost.json` — max_cost_micro = "0"
- `invalid-settlement-overpay.json` — actual_cost > max_cost
- `invalid-address-not-checksummed.json` — lowercase address
- `error-code-payment-required.json` — 402 response
- `error-code-insufficient-funds.json` — balance too low
- `settlement-refund-flow.json` — confirmed → refunded

---

### 4.2 FR-2: Economic Boundary Evaluation Refinement

**Modified file:** `src/economy/economic-boundary.ts`

Two changes:

#### 4.2.1 Extended DenialCode Union

Add new granular codes as additive union members:

```typescript
// Addition to existing DenialCodeSchema union literals
Type.Literal('BUDGET_PERIOD_EXPIRED'),
Type.Literal('TIER_REPUTATION_MISMATCH'),
Type.Literal('BUDGET_SCOPE_MISMATCH'),
```

Existing codes preserved. TypeScript consumers with `switch`/`assertNever` will get compile-time errors on new variants — this is intentional and desirable (forces handling of new denial reasons).

#### 4.2.2 mapTierToReputationState() Utility

**New file:** `src/governance/tier-reputation-map.ts`

```typescript
import { REPUTATION_STATES, type ReputationStateName } from './reputation-aggregate.js';

/**
 * Canonical mapping from billing tier to minimum reputation state.
 * Used by consumers to resolve economic boundary gap #1 (lossy tier-to-score normalization).
 *
 * @param tier - Billing tier string (from JwtClaims.tier)
 * @returns Minimum reputation state for the tier, or 'cold' for unknown tiers
 */
export function mapTierToReputationState(tier: string): ReputationStateName {
  const mapping: Record<string, ReputationStateName> = {
    free: 'cold',
    basic: 'warming',
    pro: 'established',
    enterprise: 'authoritative',
  };
  return mapping[tier] ?? 'cold';
}
```

**Barrel update:** Add to `src/governance/index.ts`:
```typescript
export { mapTierToReputationState } from './tier-reputation-map.js';
```

**Documentation:** Gaps 2 (budget_period_end), 3 (evaluation_gap), and 6 (conservation invariant) documented as "already resolved in v7.9.1/v8.0.0" in `docs/integration/audit-trail-domains.md` migration guide section.

---

### 4.3 FR-3: Feedback Dampening Protocol Pattern

**File:** `src/commons/feedback-dampening.ts`

Pure math module with zero external dependencies. The adaptive alpha ramp prevents Nyquist instability in autopoietic feedback loops.

```typescript
import { Type, type Static } from '@sinclair/typebox';

// --- Constants (production-validated across 16 dixie cycles) ---

export const FEEDBACK_DAMPENING_ALPHA_MIN = 0.1;
export const FEEDBACK_DAMPENING_ALPHA_MAX = 0.5;
export const DAMPENING_RAMP_SAMPLES = 50;
export const DEFAULT_PSEUDO_COUNT = 10;

// --- Schema ---

export const FeedbackDampeningConfigSchema = Type.Object(
  {
    alpha_min: Type.Number({ minimum: 0, maximum: 1, default: 0.1 }),
    alpha_max: Type.Number({ minimum: 0, maximum: 1, default: 0.5 }),
    ramp_samples: Type.Integer({ minimum: 1, default: 50 }),
    pseudo_count: Type.Integer({ minimum: 0, default: 10 }),
  },
  {
    $id: 'FeedbackDampeningConfig',
    additionalProperties: false,
    description:
      'Configuration for EMA feedback dampening. Adaptive alpha ramp '
      + 'prevents oscillation in autopoietic reputation → routing feedback loops. '
      + 'Invariant: |dampened - old| <= alpha_max * |new - old| (bounded feedback).',
  },
);
export type FeedbackDampeningConfig = Static<typeof FeedbackDampeningConfigSchema>;

// --- Computation ---

/**
 * Compute dampened EMA score with adaptive alpha ramp.
 *
 * Alpha ramp: alpha = alpha_min + (alpha_max - alpha_min) * min(n / ramp_samples, 1)
 *
 * For cold start (oldScore === null): returns newScore weighted by pseudo-count prior.
 * For steady state (n >= ramp_samples): alpha = alpha_max.
 *
 * Uses sample variance (n-1 denominator, Bessel's correction) for small-sample
 * statistical correctness. See V-007 for rationale.
 *
 * @param oldScore - Previous dampened score, or null for cold start
 * @param newScore - Incoming raw score
 * @param sampleCount - Number of samples seen (monotonically increasing)
 * @param config - Optional tuning parameters (defaults to exported constants)
 * @returns Dampened score
 *
 * @pure — zero side effects, deterministic
 */
export function computeDampenedScore(
  oldScore: number | null,
  newScore: number,
  sampleCount: number,
  config?: FeedbackDampeningConfig,
): number {
  const alphaMin = config?.alpha_min ?? FEEDBACK_DAMPENING_ALPHA_MIN;
  const alphaMax = config?.alpha_max ?? FEEDBACK_DAMPENING_ALPHA_MAX;
  const rampSamples = config?.ramp_samples ?? DAMPENING_RAMP_SAMPLES;
  const pseudoCount = config?.pseudo_count ?? DEFAULT_PSEUDO_COUNT;

  // Cold start: Bayesian prior blend
  if (oldScore === null) {
    const weight = pseudoCount / (pseudoCount + Math.max(sampleCount, 1));
    return weight * 0.5 + (1 - weight) * newScore;
  }

  // Adaptive alpha ramp
  const rampProgress = Math.min(sampleCount / rampSamples, 1);
  const alpha = alphaMin + (alphaMax - alphaMin) * rampProgress;

  // EMA update
  return oldScore + alpha * (newScore - oldScore);
}
```

**Invariant:** `|computeDampenedScore(old, new, n) - old| <= alpha_max * |new - old|` — bounded feedback guarantee. This is equivalent to dixie INV-006.

**Barrel update:** Add to `src/commons/index.ts`:
```typescript
export {
  FEEDBACK_DAMPENING_ALPHA_MIN,
  FEEDBACK_DAMPENING_ALPHA_MAX,
  DAMPENING_RAMP_SAMPLES,
  DEFAULT_PSEUDO_COUNT,
  FeedbackDampeningConfigSchema,
  computeDampenedScore,
  type FeedbackDampeningConfig,
} from './feedback-dampening.js';
```

**Vectors:** 8 vectors in `vectors/conformance/feedback-dampening/`:
- `cold-start-null-score.json` — oldScore = null, expect pseudo-count weighted blend
- `ramp-early.json` — sampleCount = 5 (< 50), alpha near alpha_min
- `ramp-midpoint.json` — sampleCount = 25, alpha = 0.3
- `steady-state.json` — sampleCount = 100 (>= 50), alpha = alpha_max
- `boundary-score-zero.json` — newScore = 0
- `boundary-score-one.json` — newScore = 1
- `bounded-feedback-invariant.json` — verify |result - old| <= alpha_max * |new - old|
- `custom-config.json` — non-default alpha_min/alpha_max/ramp_samples

---

### 4.4 FR-4: Consumer-Driven Contract Specification

**File:** `src/integrity/consumer-contract.ts`

Schema + validation utility for consumer-driven contracts.

```typescript
import { Type, type Static } from '@sinclair/typebox';

export const ConsumerContractEntrypointSchema = Type.Object(
  {
    symbols: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Imported symbol names from this entrypoint.',
    }),
    min_version: Type.Optional(Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Per-entrypoint minimum version requirement.',
    })),
  },
  { additionalProperties: false },
);

export const ConsumerContractSchema = Type.Object(
  {
    consumer: Type.String({ minLength: 1 }),
    provider: Type.Literal('@0xhoneyjar/loa-hounfour'),
    provider_version_range: Type.String({
      minLength: 1,
      description: 'Semver range (e.g., ">=8.2.0").',
    }),
    entrypoints: Type.Record(
      Type.String(),
      ConsumerContractEntrypointSchema,
      {
        description: 'Map of entrypoint paths to consumed symbols.',
      },
    ),
    generated_at: Type.String({ format: 'date-time' }),
    checksum: Type.Optional(Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'SHA-256 of sorted symbol list for drift detection.',
    })),
  },
  {
    $id: 'ConsumerContract',
    additionalProperties: false,
    description: 'Consumer-driven contract declaring imported symbols per entrypoint.',
  },
);
export type ConsumerContract = Static<typeof ConsumerContractSchema>;

/**
 * Result of validating a consumer contract against actual exports.
 */
export interface ContractValidationResult {
  valid: boolean;
  missing_symbols: Array<{ entrypoint: string; symbol: string }>;
  unknown_entrypoints: string[];
}

/**
 * Validate a consumer contract against actual hounfour exports.
 *
 * @param contract - The consumer contract to validate
 * @param exportMap - Map of entrypoint → exported symbol names
 * @returns Validation result with details on missing symbols
 */
export function validateConsumerContract(
  contract: ConsumerContract,
  exportMap: Record<string, string[]>,
): ContractValidationResult {
  const missing: ContractValidationResult['missing_symbols'] = [];
  const unknown: string[] = [];

  for (const [entrypoint, spec] of Object.entries(contract.entrypoints)) {
    const exports = exportMap[entrypoint];
    if (!exports) {
      unknown.push(entrypoint);
      continue;
    }
    for (const sym of spec.symbols) {
      if (!exports.includes(sym)) {
        missing.push({ entrypoint, symbol: sym });
      }
    }
  }

  return {
    valid: missing.length === 0 && unknown.length === 0,
    missing_symbols: missing,
    unknown_entrypoints: unknown,
  };
}
```

**Checksum computation** *(Flatline IMP-009, avg 810)*: The `checksum` field uses a canonical algorithm — `sha256(sorted(all_symbol_strings).join('\n'))`. A `computeContractChecksum(contract: ConsumerContract): string` utility is exported alongside `validateConsumerContract()` so consumers and CI can produce/verify checksums deterministically.

**CI script:** `scripts/verify-consumer-contract.ts` — loads contract JSON from `vectors/contracts/<consumer>.json`, introspects `dist/` barrel exports, calls `validateConsumerContract()`, verifies `checksum` via `computeContractChecksum()`, exits non-zero on missing symbols or checksum drift.

**Barrel update:** Add to `src/integrity/index.ts`:
```typescript
export {
  ConsumerContractSchema,
  ConsumerContractEntrypointSchema,
  validateConsumerContract,
  type ConsumerContract,
  type ContractValidationResult,
} from './consumer-contract.js';
```

**Vectors:** `vectors/contracts/` with example contracts for finn, dixie, freeside based on their known imports.

---

### 4.5 FR-5: Audit Trail Domain Separation + Chain-Bound Hash Utility

Three new utility files extending the existing audit trail infrastructure. All use existing `@noble/hashes` and `canonicalize` dependencies.

#### 4.5.1 Chain-Bound Hash

**File:** `src/commons/chain-bound-hash.ts`

```typescript
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import _canonicalize from 'canonicalize';
import type { AuditEntryHashInput } from './audit-trail-hash.js';
import { computeAuditEntryHash } from './audit-trail-hash.js';

const canonicalize = _canonicalize as unknown as (input: unknown) => string | undefined;

/**
 * Compute chain-bound hash — extends computeAuditEntryHash() with previous-hash binding.
 *
 * Hash = sha256(contentHash + ":" + previousHash)
 *
 * This binds each entry to its predecessor, preventing hash chain forgery.
 * The content hash is computed via computeAuditEntryHash() for consistency.
 *
 * @param entry - Content fields of the audit entry
 * @param domainTag - Domain tag string (from buildDomainTag or validateDomainTag)
 * @param previousHash - Hash of the preceding entry (AUDIT_TRAIL_GENESIS_HASH for first)
 * @returns Chain-bound hash in `sha256:<64 hex chars>` format
 * @throws {ChainBoundHashError} If canonicalization fails (typed error with `code: 'CANONICALIZATION_FAILED'`)
 *
 * @pure — deterministic, zero side effects
 */

export class ChainBoundHashError extends Error {
  readonly code: 'CANONICALIZATION_FAILED' | 'EMPTY_DOMAIN_TAG' | 'INVALID_PREVIOUS_HASH';
  constructor(code: ChainBoundHashError['code'], message: string) {
    super(message);
    this.name = 'ChainBoundHashError';
    this.code = code;
  }
}

export function computeChainBoundHash(
  entry: AuditEntryHashInput,
  domainTag: string,
  previousHash: string,
): string {
  const contentHash = computeAuditEntryHash(entry, domainTag);
  const chainInput = `${contentHash}:${previousHash}`;
  return `sha256:${bytesToHex(sha256(new TextEncoder().encode(chainInput)))}`;
}

/**
 * Domain tag format convention for cross-repo audit trails.
 *
 * Format: `{repo}:{domain}:{qualifier}`
 * Examples:
 *   loa-finn:audit:agent-lifecycle
 *   loa-dixie:reputation:scoring-path
 *   loa-freeside:billing:credit-lot
 *
 * @param domainTag - The domain tag to validate
 * @returns Validation result
 */
export function validateDomainTag(domainTag: string): {
  valid: boolean;
  error?: string;
} {
  const parts = domainTag.split(':');
  if (parts.length < 3) {
    return {
      valid: false,
      error: `Domain tag must have at least 3 colon-separated segments (got ${parts.length}): "${domainTag}"`,
    };
  }
  for (const part of parts) {
    if (part.length === 0) {
      return {
        valid: false,
        error: `Domain tag contains empty segment: "${domainTag}"`,
      };
    }
    if (!/^[a-z0-9_-]+$/.test(part)) {
      return {
        valid: false,
        error: `Domain tag segment must be lowercase alphanumeric with hyphens/underscores: "${part}"`,
      };
    }
  }
  return { valid: true };
}
```

**Byte-level framing specification** *(Flatline Sprint SKP-002, severity 760)*:
- All strings are UTF-8 encoded before hashing
- Chain input format: `{contentHash}:{previousHash}` — colon (0x3A) as delimiter
- `contentHash` and `previousHash` are both `sha256:<64 hex chars>` format — no ambiguity since neither contains colons in the hex portion
- Conformance vectors include negative cases: Unicode in domain tags (normalized to UTF-8), delimiter edge cases
- Cross-language consumers (Go/Rust/Python) MUST use the same UTF-8 encoding + TextEncoder equivalent

**Relationship to existing code:** `computeChainBoundHash()` calls `computeAuditEntryHash()` internally, then binds the result to the previous hash. This is strictly additive — consumers using `computeAuditEntryHash()` directly are unaffected.

#### 4.5.2 Audit Timestamp Validation

**File:** `src/commons/audit-timestamp.ts`

```typescript
/**
 * Validate and normalize ISO 8601 timestamps before audit chain entry.
 *
 * Prevents invalid/malformed timestamps from entering hash chains.
 * Once an invalid timestamp enters the chain, it's permanently embedded
 * (chain immutability) — so validation at the I/O boundary is critical.
 *
 * Source: freeside bridgebuilder HIGH finding (PR #99, iter-1), Vision V-003.
 *
 * @pure — zero side effects, deterministic
 */

/**
 * Validate an ISO 8601 timestamp string for audit trail use.
 *
 * Checks:
 * 1. Parseable as a Date
 * 2. Not NaN / Invalid Date
 * 3. Not before Unix epoch (1970-01-01)
 * 4. Not unreasonably far in the future (> 24h from now — clock skew tolerance)
 *
 * @param input - String to validate as ISO 8601 timestamp
 * @returns Validation result with normalized canonical form
 */
/**
 * @param input - String to validate as ISO 8601 timestamp
 * @param options - Optional: `now` for injectable reference time (deterministic testing)
 *                  *(Flatline IMP-004, avg 760)*
 * @returns Validation result with normalized canonical form. Never throws.
 */
export function validateAuditTimestamp(
  input: string,
  options?: { now?: number },
): {
  valid: boolean;
  normalized: string;
  error?: string;
} {
  if (typeof input !== 'string' || input.length === 0) {
    return { valid: false, normalized: '', error: 'Timestamp must be a non-empty string' };
  }

  // Strict ISO 8601 regex before Date parsing (rejects implementation-dependent formats)
  const ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:?\d{2})$/;
  if (!ISO_8601_RE.test(input)) {
    return { valid: false, normalized: '', error: `Not strict ISO 8601 format: "${input}"` };
  }

  const date = new Date(input);
  if (isNaN(date.getTime())) {
    return { valid: false, normalized: '', error: `Invalid ISO 8601 format: "${input}"` };
  }

  const epochMs = date.getTime();
  if (epochMs < 0) {
    return { valid: false, normalized: '', error: 'Timestamp before Unix epoch (1970-01-01)' };
  }

  const TWENTY_FOUR_HOURS_MS = 86_400_000;
  const referenceNow = options?.now ?? Date.now();
  if (epochMs > referenceNow + TWENTY_FOUR_HOURS_MS) {
    return { valid: false, normalized: '', error: 'Timestamp more than 24h in the future' };
  }

  return { valid: true, normalized: date.toISOString() };
}
```

**Design note:** The 24h future tolerance accommodates clock skew across distributed systems. The optional `now` parameter enables deterministic testing without system clock dependency. With `now` injected, the function is fully pure. Uses strict ISO 8601 regex pre-check before `Date` parsing to reject implementation-dependent formats.

#### 4.5.3 Advisory Lock Key

**File:** `src/commons/advisory-lock.ts`

```typescript
/**
 * Collision-resistant advisory lock key computation using FNV-1a (32-bit).
 *
 * Replaces Java-style hashCode() which has birthday-paradox collision risk
 * at O(10K) domain tags. FNV-1a provides better distribution and documented
 * collision bounds.
 *
 * Source: freeside audit-helpers.ts + dixie BB-DEEP-04, Vision V-002.
 *
 * @pure — zero side effects, deterministic
 */

// FNV-1a constants (32-bit)
const FNV_OFFSET_BASIS = 0x811c9dc5;
const FNV_PRIME = 0x01000193;

/**
 * Compute a 32-bit advisory lock key from a domain tag using FNV-1a.
 *
 * Collision probability: ~1 in 2^16 at 256 tags, ~1 in 2^10 at 1024 tags.
 * For PostgreSQL pg_advisory_xact_lock() usage.
 *
 * @param domainTag - Domain tag string (e.g., "loa-freeside:billing:credit-lot")
 * @returns 32-bit signed integer suitable for pg_advisory_xact_lock()
 */
export function computeAdvisoryLockKey(domainTag: string): number {
  let hash = FNV_OFFSET_BASIS;
  for (let i = 0; i < domainTag.length; i++) {
    hash ^= domainTag.charCodeAt(i);
    hash = Math.imul(hash, FNV_PRIME);
  }
  // Convert to signed 32-bit integer (PostgreSQL advisory locks use int4)
  return hash | 0;
}
```

**Barrel update:** Add to `src/commons/index.ts`:
```typescript
// Chain-bound hashing + domain separation (v8.3.0, FR-5)
export {
  computeChainBoundHash,
  validateDomainTag,
} from './chain-bound-hash.js';

// Audit timestamp validation (v8.3.0, FR-5)
export { validateAuditTimestamp } from './audit-timestamp.js';

// Advisory lock key computation (v8.3.0, FR-5)
export { computeAdvisoryLockKey } from './advisory-lock.js';
```

**Documentation:** `docs/integration/audit-trail-domains.md` covering:
1. Domain tag convention (`{repo}:{domain}:{qualifier}`)
2. TOCTOU prevention pattern (SQL `FOR UPDATE` + `UNIQUE(resource_type, previous_hash)`)
3. Single-writer invariant (V-001) — concurrent writers fork the chain
4. Genesis race prevention
5. Cross-repo verification example (finn chain verified by dixie)
6. Migration guide from `computeAuditEntryHash()` to `computeChainBoundHash()`

**Vectors:** 12 vectors in `vectors/conformance/chain-bound-hash/`, `vectors/conformance/advisory-lock/`, `vectors/conformance/audit-timestamp/`:
- `chain-bound-genesis.json` — first entry with GENESIS_HASH
- `chain-bound-multi-entry.json` — 3-entry chain with verified linkage
- `chain-bound-cross-domain.json` — finn + dixie domain tags producing different hashes
- `chain-bound-tamper-detection.json` — modified entry breaks chain
- `domain-tag-valid-three-segment.json` — valid: `loa-finn:audit:agent`
- `domain-tag-invalid-empty-segment.json` — invalid: `loa-finn::agent`
- `domain-tag-invalid-uppercase.json` — invalid: `loa-Finn:audit:agent`
- `timestamp-valid-iso8601.json` — valid with normalization
- `timestamp-invalid-malformed.json` — not parseable
- `timestamp-invalid-epoch.json` — before 1970-01-01
- `timestamp-invalid-future.json` — more than 24h ahead
- `advisory-lock-deterministic.json` — same input → same output
- `advisory-lock-distribution.json` — 100 tags with no collisions

---

### 4.6 FR-6: Conditional Constraints Schema

**Modified file:** `src/constraints/types.ts`

Add optional `condition` field to the `Constraint` interface:

```typescript
// Addition to Constraint interface
export interface ConstraintCondition {
  /** Feature flag name. When flag is truthy, override applies. */
  when: string;
  /** Alternative constraint text when flag is active. */
  override_text?: string;
  /** Alternative rule type when flag is active. */
  override_rule_type?: 'MUST' | 'SHOULD' | 'MAY';
}

export interface Constraint {
  // ... existing fields unchanged ...

  /**
   * Optional condition for feature-flagged constraint behavior.
   * When present, the constraint evaluator checks the flag in the evaluation context.
   * If flag is not set or falsy, original expression/severity apply.
   * If flag is set, override_text and override_rule_type apply instead.
   *
   * Nested conditions (condition.when referencing another conditional constraint)
   * are rejected by the type checker.
   *
   * @since v8.3.0 — FR-6 conditional constraints
   */
  condition?: ConstraintCondition;
}
```

**Modified file:** `src/constraints/evaluator.ts`

Extend `EvaluationContext` and evaluator to handle conditions:

```typescript
export interface EvaluationContext {
  evaluation_timestamp?: string;
  /** Feature flags for conditional constraints (FR-6). */
  feature_flags?: Record<string, boolean>;
}
```

In the evaluator, before evaluating a constraint's expression, check:
```typescript
if (constraint.condition) {
  const flagActive = ctx?.feature_flags?.[constraint.condition.when] ?? false;
  if (flagActive && constraint.condition.override_text) {
    // Evaluate override_text instead of original expression
    expression = constraint.condition.override_text;
  }
}
```

**Key design decisions:**
- `condition` field is optional — all existing constraints remain valid
- Nested conditions are rejected at runtime validation: the evaluator checks `condition.when` against a flat `feature_flags` map — flag values referencing other conditional constraints produce `false` (no recursion). TypeScript types do not enforce this; runtime check is authoritative *(Flatline IMP-007, avg 725)*
- Override only changes text and severity — the constraint still evaluates against the same data shape
- Feature flags are passed via `EvaluationContext`, not global state

**Barrel update:** Add `ConstraintCondition` type export to `src/constraints/index.ts`.

**Vectors:** 5 vectors in `vectors/conformance/conditional-constraints/`:
- `flag-active-override.json` — flag set, override_text evaluated
- `flag-absent-original.json` — flag not set, original expression used
- `flag-override-rule-type.json` — override_rule_type changes severity
- `nested-condition-rejected.json` — type checker rejects nested
- `no-condition-unchanged.json` — constraint without condition works as before

---

### 4.7 FR-7: Proper Release & Distribution

No new source code. Release process:

1. **Version bump:** `package.json` version → `8.3.0`
2. **Build:** `npm run build` → `dist/` generated
3. **Schema generation:** `npm run schema:generate` → `schemas/` updated with new types
4. **Constraint validation:** `npm run check:constraints` → all constraint files valid
5. **Conformance vectors:** `npm run vectors:check` → all vectors pass
6. **Test suite:** `npm test` → all 6,393+ tests pass (existing + ~100 new)
7. **Semver check:** `npm run semver:check` → no breaking changes detected
8. **Integrity manifest:** `node scripts/generate-release-integrity.ts` → `RELEASE-INTEGRITY.json`
9. **Git tag:** `git tag v8.3.0`
10. **GitHub Release:** with CHANGELOG and migration notes
11. **Commit `dist/`:** for git-based consumers (existing pattern from `b6e0027a`)
12. **Provenance attestation** *(Flatline Sprint SKP-001, severity 910)*: Generate SHA-256 checksums for `dist/`, `schemas/`, `vectors/` in `RELEASE-INTEGRITY.json`. Sigstore/GPG signing deferred to post-launch — document as v8.4.0 goal in release notes.

**CHANGELOG highlights:**
- 8 new features (FR-1 through FR-8)
- 4 new schemas in economy module
- 4 new utilities in commons module
- 1 new schema in integrity module
- Conditional constraints DSL extension
- 50+ new conformance vectors
- GovernedResource<T> runtime interface

---

### 4.8 FR-8: GovernedResource\<T\> Runtime Interface Extraction

**File:** `src/commons/governed-resource-runtime.ts`

Runtime interface and abstract base class for the governed resource pattern. This is the runtime complement to the existing `GOVERNED_RESOURCE_FIELDS` schema spread — consumers who need only schemas continue using the spread, consumers who need runtime behavior (transition, verify, audit) extend the abstract base.

```typescript
import type { AuditTrail, AuditEntry } from './audit-trail.js';
import type { GovernanceMutation } from './governed-resource.js';
import { Type, type Static } from '@sinclair/typebox';

// --- Schemas for cross-language vectors ---

export const TransitionResultSchema = Type.Object(
  {
    success: Type.Boolean(),
    new_state: Type.Unknown({ description: 'The state after transition (type varies per resource).' }),
    version: Type.Integer({ minimum: 0 }),
    violations: Type.Optional(Type.Array(Type.String())),
  },
  {
    $id: 'TransitionResult',
    additionalProperties: false,
    description: 'Result of a GovernedResource state transition.',
  },
);

export const InvariantResultSchema = Type.Object(
  {
    invariant_id: Type.String({ minLength: 1 }),
    holds: Type.Boolean(),
    detail: Type.Optional(Type.String()),
  },
  {
    $id: 'InvariantResult',
    additionalProperties: false,
    description: 'Result of checking a single invariant on a GovernedResource.',
  },
);

export const MutationContextSchema = Type.Object(
  {
    actor_id: Type.String({ minLength: 1 }),
    actor_type: Type.Union([
      Type.Literal('human'),
      Type.Literal('system'),
      Type.Literal('autonomous'),
    ]),
    access_policy: Type.Optional(Type.Object({
      required_reputation_state: Type.Optional(Type.String()),
      required_role: Type.Optional(Type.String()),
      min_reputation_score: Type.Optional(Type.Number({ minimum: 0, maximum: 1 })),
    })),
  },
  {
    $id: 'MutationContext',
    additionalProperties: false,
    description:
      'Context for a governed resource mutation — actor identity, type, and access policy. '
      + 'Generalized from freeside\'s CreditMutationContext (6-witness pattern).',
  },
);

// --- TypeScript interfaces ---

export interface TransitionResult<TState> {
  readonly success: boolean;
  readonly newState: TState;
  readonly version: number;
  readonly violations?: ReadonlyArray<string>;
}

export interface InvariantResult {
  readonly invariantId: string;
  readonly holds: boolean;
  readonly detail?: string;
}

export interface MutationContext {
  readonly actorId: string;
  readonly actorType: 'human' | 'system' | 'autonomous';
  readonly accessPolicy?: {
    required_reputation_state?: string;
    required_role?: string;
    min_reputation_score?: number;
  };
}

/**
 * Runtime interface for governed resources.
 *
 * Consumers implement this for resources requiring:
 * - Event-sourced state transitions with invariant verification
 * - Append-only audit trail integration
 * - Optimistic concurrency control (version monotonicity)
 *
 * The existing GOVERNED_RESOURCE_FIELDS schema spread remains available
 * for consumers who need only the schema (no runtime behavior).
 *
 * @typeParam TState - Resource state type
 * @typeParam TEvent - Event type that triggers transitions
 * @typeParam TInvariant - String literal union of invariant IDs
 */
export interface GovernedResource<
  TState,
  TEvent,
  TInvariant extends string = string,
> {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly current: TState;
  readonly version: number;

  transition(event: TEvent, context: MutationContext): Promise<TransitionResult<TState>>;
  verify(invariantId: TInvariant): InvariantResult;
  verifyAll(): InvariantResult[];

  readonly auditTrail: Readonly<AuditTrail>;
  readonly mutationLog: ReadonlyArray<GovernanceMutation>;
}

/**
 * Abstract base providing invariant verification harness and audit trail wiring.
 *
 * Consumers extend this and implement:
 * - applyEvent(state, event, context) — pure state transition logic
 * - defineInvariants() — returns invariant check functions
 * - onTransitionSuccess(event, context, prev, next, version) — audit trail + mutation log append
 *
 * @typeParam TState - Resource state type
 * @typeParam TEvent - Event type that triggers transitions
 * @typeParam TInvariant - String literal union of invariant IDs
 * @typeParam TContext - Mutation context type (defaults to MutationContext)
 */
export abstract class GovernedResourceBase<
  TState,
  TEvent,
  TInvariant extends string = string,
  TContext extends MutationContext = MutationContext,
> implements GovernedResource<TState, TEvent, TInvariant> {
  abstract readonly resourceId: string;
  abstract readonly resourceType: string;

  private _state: TState;
  private _version: number;
  private _auditTrail: AuditTrail;
  private _mutationLog: GovernanceMutation[];

  constructor(initialState: TState) {
    this._state = initialState;
    this._version = 0;
    this._auditTrail = {
      entries: [],
      hash_algorithm: 'sha256',
      genesis_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
      integrity_status: 'verified',
    };
    this._mutationLog = [];
  }

  get current(): TState { return this._state; }
  get version(): number { return this._version; }
  get auditTrail(): Readonly<AuditTrail> { return this._auditTrail; }
  get mutationLog(): ReadonlyArray<GovernanceMutation> { return this._mutationLog; }

  /**
   * CONCURRENCY CONTRACT: GovernedResourceBase assumes single-writer semantics.
   * Callers MUST NOT invoke transition() concurrently on the same instance.
   * For concurrent access, use external serialization (e.g., pg_advisory_xact_lock,
   * optimistic version check at DB layer). The async signature exists to support
   * subclass hooks (e.g., post-transition audit append) — the base applyEvent()
   * is synchronous. *(Flatline IMP-002, avg 875)*
   */
  async transition(event: TEvent, context: TContext): Promise<TransitionResult<TState>> {
    // 1. Apply event to produce candidate state (synchronous — applyEvent is pure)
    const candidateState = this.applyEvent(this._state, event, context);

    // 2. Verify all invariants against candidate state
    const previousState = this._state;
    this._state = candidateState;
    const results = this.verifyAll();
    const violations = results.filter(r => !r.holds);

    if (violations.length > 0) {
      // Rollback
      this._state = previousState;
      await this.onTransitionFailure(event, context, violations);
      return {
        success: false,
        newState: previousState,
        version: this._version,
        violations: violations.map(v => `${v.invariantId}: ${v.detail ?? 'violated'}`),
      };
    }

    // 3. Commit: increment version + invoke audit hook
    this._version += 1;
    await this.onTransitionSuccess(event, context, previousState, this._state, this._version);

    return {
      success: true,
      newState: this._state,
      version: this._version,
    };
  }

  /**
   * Hook called after a successful transition. Subclasses MUST implement to:
   * - Append to audit trail (via computeChainBoundHash or computeAuditEntryHash)
   * - Append to mutation log
   * - Perform post-transition side effects (e.g., event emission)
   *
   * The base class does NOT auto-append — this is intentional to avoid
   * coupling the abstract base to a specific persistence model.
   * *(Flatline SKP-007, severity 910 — mandatory hook pattern)*
   */
  protected abstract onTransitionSuccess(
    event: TEvent,
    context: TContext,
    previousState: TState,
    newState: TState,
    version: number,
  ): Promise<void>;

  /**
   * Hook called after a failed transition (invariant violation, rollback).
   * Optional override — default is no-op.
   */
  protected async onTransitionFailure(
    _event: TEvent,
    _context: TContext,
    _violations: InvariantResult[],
  ): Promise<void> { /* no-op by default */ }

  verify(invariantId: TInvariant): InvariantResult {
    const invariants = this.defineInvariants();
    const check = invariants.get(invariantId);
    if (!check) {
      return { invariantId, holds: false, detail: `Unknown invariant: ${invariantId}` };
    }
    return check(this._state);
  }

  verifyAll(): InvariantResult[] {
    const invariants = this.defineInvariants();
    return Array.from(invariants.entries()).map(([id, check]) => check(this._state));
  }

  /**
   * Apply an event to the current state, producing a new state.
   * Must be a pure function — no side effects.
   */
  protected abstract applyEvent(state: TState, event: TEvent, context: TContext): TState;

  /**
   * Define invariants that must hold after every transition.
   * Returns a map of invariant ID → check function.
   */
  protected abstract defineInvariants(): Map<TInvariant, (state: TState) => InvariantResult>;
}
```

**Barrel update:** Add to `src/commons/index.ts`:
```typescript
// GovernedResource<T> runtime interface (v8.3.0, FR-8)
export {
  TransitionResultSchema,
  InvariantResultSchema,
  MutationContextSchema,
  type TransitionResult,
  type InvariantResult,
  type MutationContext,
  type GovernedResource,
  GovernedResourceBase,
} from './governed-resource-runtime.js';
```

**Relationship to existing code:**
- `GOVERNED_RESOURCE_FIELDS` (schema spread) — unchanged, still available
- `GovernanceClassSchema` — unchanged
- `GovernanceMutationSchema` — unchanged, re-used by `GovernedResourceBase`
- `AuditTrailSchema` — unchanged, used as type for `auditTrail` property

**Vectors:** 10 vectors in `vectors/conformance/governed-resource-runtime/`:
- `valid-transition-success.json` — event applied, invariants hold
- `valid-transition-version-increment.json` — version goes from 0 to 1
- `invalid-transition-invariant-violation.json` — event violates invariant, rollback
- `valid-verify-single-invariant.json` — single invariant check
- `valid-verify-all-invariants.json` — all invariants pass
- `mutation-context-human.json` — actorType = 'human'
- `mutation-context-system.json` — actorType = 'system'
- `mutation-context-autonomous.json` — actorType = 'autonomous'
- `mutation-context-with-access-policy.json` — access_policy fields populated
- `version-monotonicity.json` — version only increases

---

## 5. Data Architecture

No new database schemas. All new types are protocol schemas (TypeBox → JSON Schema 2020-12) consumed by downstream repos for their own persistence.

**Schema generation impact:**
- 8 new JSON Schema files in `schemas/` (X402Quote, X402PaymentProof, X402Settlement, X402ErrorCode, ConsumerContract, FeedbackDampeningConfig, TransitionResult, InvariantResult, MutationContext)
- 3 new DenialCode literals in existing DenialCode schema
- 1 new ConstraintCondition in constraint grammar docs

---

## 6. API Design

Hounfour is a library, not a service. The "API" is the TypeScript export surface.

### 6.1 New Exports by Entrypoint

| Entrypoint | New Exports | Count |
|-----------|-------------|-------|
| `@0xhoneyjar/loa-hounfour/economy` | X402QuoteSchema, X402PaymentProofSchema, X402SettlementSchema, X402SettlementStatusSchema, X402ErrorCodeSchema + types | +10 |
| `@0xhoneyjar/loa-hounfour/governance` | mapTierToReputationState | +1 |
| `@0xhoneyjar/loa-hounfour/commons` | FeedbackDampeningConfigSchema, computeDampenedScore, 4 constants, computeChainBoundHash, validateDomainTag, validateAuditTimestamp, computeAdvisoryLockKey, GovernedResource, GovernedResourceBase, TransitionResultSchema, InvariantResultSchema, MutationContextSchema + types | +20 |
| `@0xhoneyjar/loa-hounfour/integrity` | ConsumerContractSchema, ConsumerContractEntrypointSchema, validateConsumerContract + types | +5 |
| `@0xhoneyjar/loa-hounfour/constraints` | ConstraintCondition type | +1 |

**Total new exports: ~37**
**Removed exports: 0**
**Modified exports: 1** (DenialCodeSchema — extended union, additive)

### 6.2 Function Signatures

All new functions are pure and deterministic (except `validateAuditTimestamp` which reads system clock for the 24h future check):

| Function | Module | Side Effects | Dependencies |
|----------|--------|-------------|-------------|
| `computeDampenedScore()` | commons | None | None |
| `computeChainBoundHash()` | commons | None | `@noble/hashes`, `canonicalize` |
| `validateDomainTag()` | commons | None | None |
| `validateAuditTimestamp()` | commons | Reads system clock (injectable via `now` option) | None |
| `computeAdvisoryLockKey()` | commons | None | None |
| `mapTierToReputationState()` | governance | None | None |
| `validateConsumerContract()` | integrity | None | None |

---

## 7. Security Architecture

### 7.1 Hash Chain Integrity

`computeChainBoundHash()` uses the same SHA-256 from `@noble/hashes` as the existing `computeAuditEntryHash()`. The chain binding (`contentHash + ":" + previousHash`) follows the standard Merkle-chain pattern. RFC 8785 canonical JSON ensures deterministic serialization.

**Threat: Hash collision in advisory locks.** FNV-1a (32-bit) has ~50% collision probability at ~77K tags (birthday paradox). For PostgreSQL advisory locks with up to ~1000 domain tags per repo, collision probability is negligible (~0.01%). Documented in function JSDoc.

### 7.2 Timestamp Validation

`validateAuditTimestamp()` prevents two attack vectors:
1. **Past manipulation** — timestamps before Unix epoch rejected (prevents negative-time entries)
2. **Future manipulation** — timestamps more than 24h ahead rejected (prevents precomputed entries)

### 7.3 x402 Payment Schemas

Ethereum addresses in x402 schemas use a two-layer validation model *(Flatline IMP-003, avg 847.5)*:
1. **Schema layer** (JSON Schema): `^0x[a-fA-F0-9]{40}$` — structural validity (40 hex chars, 0x prefix)
2. **Runtime layer** (consumer I/O boundary): `checksumAddress()` from `@0xhoneyjar/loa-hounfour/economy` for EIP-55 checksum verification

Conformance vectors test BOTH layers: `invalid-address-not-checksummed.json` passes schema regex but fails EIP-55. Consumers MUST apply runtime checksum validation at their I/O boundary. Financial values use string-encoded micro-USD — no floating point anywhere.

### 7.4 Consumer Contract Validation

`validateConsumerContract()` performs symbol existence checks only. It does NOT execute imported code or evaluate expressions — purely structural validation. The `checksum` field enables drift detection without full re-validation.

---

## 8. Testing Strategy

### 8.1 Test Organization

```
tests/
├── commons/
│   ├── feedback-dampening.test.ts         ← NEW
│   ├── chain-bound-hash.test.ts           ← NEW
│   ├── audit-timestamp.test.ts            ← NEW
│   ├── advisory-lock.test.ts              ← NEW
│   └── governed-resource-runtime.test.ts  ← NEW
├── economy/
│   └── x402-payment.test.ts              ← NEW
├── governance/
│   └── tier-reputation-map.test.ts       ← NEW
├── integrity/
│   └── consumer-contract.test.ts         ← NEW
├── constraints/
│   └── conditional-constraints.test.ts   ← NEW
└── vectors/
    └── (vector validation tests — auto-generated from vector files)
```

### 8.2 Test Coverage Targets

| FR | Unit Tests | Vector Tests | Property Tests |
|----|-----------|-------------|----------------|
| FR-1 | Schema validation (valid/invalid), type exports | 12 conformance vectors | Address format, micro-USD non-negative |
| FR-2 | DenialCode extension, mapTierToReputationState | 3 vectors (existing boundary + new codes) | Tier mapping totality |
| FR-3 | computeDampenedScore (cold start, ramp, steady) | 8 conformance vectors | Bounded feedback invariant (property) |
| FR-4 | validateConsumerContract (valid, missing, unknown) | 3 contract examples | — |
| FR-5 | computeChainBoundHash, validateDomainTag, validateAuditTimestamp, computeAdvisoryLockKey | 12 conformance vectors | Advisory lock distribution (property) |
| FR-6 | Condition evaluation (flag on/off, override, nested reject) | 5 conformance vectors | — |
| FR-7 | (build/release validation — manual) | — | — |
| FR-8 | GovernedResourceBase (transition, verify, rollback) | 10 conformance vectors | Version monotonicity (property) |

**Estimated new tests: ~100**
**Estimated new conformance vectors: 53**

---

## 9. Sprint Plan

### Sprint 1: Foundation Utilities (FR-3, FR-5)

Pure functions with zero dependencies on other FRs. Creates the building blocks.

| Task | Files | ACs |
|------|-------|-----|
| Implement feedback dampening | `src/commons/feedback-dampening.ts`, tests, vectors | AC10-AC14 |
| Implement chain-bound hash | `src/commons/chain-bound-hash.ts`, tests, vectors | AC18-AC20 |
| Implement audit timestamp validation | `src/commons/audit-timestamp.ts`, tests, vectors | AC21 |
| Implement advisory lock key | `src/commons/advisory-lock.ts`, tests, vectors | AC22 |
| Implement validateDomainTag | (in chain-bound-hash.ts) | AC19 |
| Write audit trail domains doc | `docs/integration/audit-trail-domains.md` | AC18, AC23_b |
| Update commons barrel | `src/commons/index.ts` | — |

### Sprint 2: Schemas + Boundary (FR-1, FR-2, FR-6)

Schema additions and economic boundary refinements.

| Task | Files | ACs |
|------|-------|-----|
| Implement x402 payment schemas | `src/economy/x402-payment.ts`, tests, vectors, constraints | AC1-AC5 |
| Extend DenialCode union | `src/economy/economic-boundary.ts` | AC7 |
| Implement mapTierToReputationState | `src/governance/tier-reputation-map.ts`, tests | AC6 |
| Document resolved gaps (2,3,5,6) | migration guide section in docs | AC8-AC9 |
| Implement conditional constraints | `src/constraints/types.ts`, `evaluator.ts`, tests, vectors | AC24-AC27_a |
| Update economy + governance barrels | barrel files | — |

### Sprint 3: Contracts + GovernedResource (FR-4, FR-8)

Higher-level abstractions that build on Sprint 1.

| Task | Files | ACs |
|------|-------|-----|
| Implement ConsumerContract schema | `src/integrity/consumer-contract.ts`, tests | AC15-AC16 |
| Implement verify-consumer-contract script | `scripts/verify-consumer-contract.ts` | AC17 |
| Create example contracts | `vectors/contracts/` | AC18_a |
| Implement GovernedResource<T> runtime | `src/commons/governed-resource-runtime.ts`, tests, vectors | AC30-AC34 |
| Write ADR-015 doc | `docs/adr-015-governed-resource.md` | AC35 |
| Verify GOVERNED_RESOURCE_FIELDS unchanged | test assertion | AC36 |
| Update integrity + commons barrels | barrel files | — |

### Sprint 4: Release (FR-7)

Final integration, release prep, and distribution.

| Task | Files | ACs |
|------|-------|-----|
| Version bump to 8.3.0 | `package.json` | AC27 |
| Full build + schema generation | `dist/`, `schemas/` | AC27 |
| Run full test suite | — | — |
| Semver check | — | — |
| Generate RELEASE-INTEGRITY.json | manifest | AC29 |
| Create git tag + GitHub Release | — | AC27-AC28 |
| Write CHANGELOG + migration notes | CHANGELOG.md | AC28 |

---

## 10. Risk Mitigations

| Risk | Mitigation |
|------|-----------|
| **DenialCode extension breaks exhaustive checks** | New codes are additive union members. TypeScript `switch` with `assertNever` will surface new variants at compile time — this is intentional. Document in migration guide. |
| **GovernedResourceBase too rigid** | Abstract base is optional. Consumers can implement the `GovernedResource<T>` interface directly. The `GOVERNED_RESOURCE_FIELDS` schema spread remains the default. |
| **FNV-1a advisory lock key differs from Java hashCode()** | Migration must handle both lock key formats during transition. Document in `computeAdvisoryLockKey()` JSDoc. Consumers should switch atomically (not incrementally). |
| **EMA constants tuned to dixie workload** | Exported as `FeedbackDampeningConfig` schema with defaults. Consumers can override. Document tuning methodology in JSDoc. |
| **validateAuditTimestamp reads system clock** | Injectable `now` parameter for deterministic testing. When `now` is provided, function is fully pure. |
| **Conditional constraints add evaluator complexity** | Feature-gated: only activated when `condition` field is present. Existing constraints unaffected. Nested conditions rejected at type-check time. |

---

## 11. Migration Guide

### For existing consumers (no action required)

All v8.2.0 imports continue to work unchanged. No breaking changes.

### For consumers adopting new features

#### x402 Payment Schemas
```typescript
// NEW in v8.3.0
import { X402QuoteSchema, X402SettlementSchema } from '@0xhoneyjar/loa-hounfour/economy';
```

#### Feedback Dampening
```typescript
// NEW in v8.3.0
import { computeDampenedScore, FeedbackDampeningConfigSchema } from '@0xhoneyjar/loa-hounfour/commons';
const score = computeDampenedScore(previousScore, rawScore, sampleCount);
```

#### Chain-Bound Hashing (upgrading from computeAuditEntryHash)
```typescript
// BEFORE (still works)
import { computeAuditEntryHash } from '@0xhoneyjar/loa-hounfour/commons';
const hash = computeAuditEntryHash(entry, domainTag);

// AFTER (opt-in, adds chain binding)
import { computeChainBoundHash, validateAuditTimestamp, computeAdvisoryLockKey } from '@0xhoneyjar/loa-hounfour/commons';
const { valid, normalized } = validateAuditTimestamp(entry.timestamp);
if (!valid) throw new Error('Invalid timestamp');
const chainHash = computeChainBoundHash({ ...entry, timestamp: normalized }, domainTag, previousHash);
const lockKey = computeAdvisoryLockKey(domainTag); // for pg_advisory_xact_lock
```

#### GovernedResource\<T\> Runtime (upgrading from GOVERNED_RESOURCE_FIELDS)
```typescript
// BEFORE (still works)
import { GOVERNED_RESOURCE_FIELDS } from '@0xhoneyjar/loa-hounfour/commons';
const MyResourceSchema = Type.Object({ ...GOVERNED_RESOURCE_FIELDS, myField: Type.String() });

// AFTER (opt-in, adds runtime behavior)
import { GovernedResourceBase, type MutationContext } from '@0xhoneyjar/loa-hounfour/commons';

interface MyMutationContext extends MutationContext {
  readonly customField: string;
}

class MyResource extends GovernedResourceBase<MyState, MyEvent, MyInvariant, MyMutationContext> {
  protected applyEvent(state: MyState, event: MyEvent, ctx: MyMutationContext): MyState { ... }
  protected defineInvariants(): Map<MyInvariant, (state: MyState) => InvariantResult> { ... }
}
```

#### Consumer Contracts
```typescript
// NEW in v8.3.0 — for CI integration
import { validateConsumerContract, type ConsumerContract } from '@0xhoneyjar/loa-hounfour/integrity';
```

---

## 12. Acceptance Criteria Traceability

| AC | FR | Component | Test |
|----|-----|-----------|------|
| AC1-AC5 | FR-1 | x402-payment.ts | x402-payment.test.ts, 12 vectors |
| AC6 | FR-2 | tier-reputation-map.ts | tier-reputation-map.test.ts |
| AC7 | FR-2 | economic-boundary.ts | economic-boundary.test.ts (extended) |
| AC8-AC9 | FR-2 | docs/integration/ | documentation review |
| AC10-AC14 | FR-3 | feedback-dampening.ts | feedback-dampening.test.ts, 8 vectors |
| AC15-AC18_a | FR-4 | consumer-contract.ts, script | consumer-contract.test.ts, 3 contracts |
| AC18-AC23_b | FR-5 | chain-bound-hash.ts, audit-timestamp.ts, advisory-lock.ts, docs | 12 vectors |
| AC24-AC27_a | FR-6 | types.ts, evaluator.ts | conditional-constraints.test.ts, 5 vectors |
| AC27-AC29 | FR-7 | build/release process | manual verification |
| AC30-AC36 | FR-8 | governed-resource-runtime.ts | governed-resource-runtime.test.ts, 10 vectors |

**Total: 43 ACs → 9 test files + 53 conformance vectors + 1 documentation file + 1 CI script**

---

## 13. Flatline Review Log

### Auto-Integrated (HIGH_CONSENSUS)

| ID | Avg Score | Integration |
|----|-----------|-------------|
| IMP-001 | 890 | Typed `ChainBoundHashError` with error codes |
| IMP-002 | 875 | Single-writer concurrency contract on `transition()` |
| IMP-003 | 847.5 | Two-layer address validation spec (schema + runtime EIP-55) |
| IMP-004 | 760 | Injectable `now` parameter + strict ISO 8601 regex |
| IMP-006 | 727.5 | Formal constraint file structure with schema examples |
| IMP-007 | 725 | Runtime nested condition rejection (not type-level) |
| IMP-009 | 810 | Canonical checksum computation for consumer contracts |

### Codex-Applied (BLOCKER recommendations accepted)

| ID | Severity | Integration |
|----|----------|-------------|
| SKP-007 | 910 | Abstract `onTransitionSuccess()`/`onTransitionFailure()` hooks |
| SKP-002 (sprint) | 760 | Byte-level framing spec for chain-bound hash |
| SKP-005 (sprint) | 775 | `maxLength: 20` on MicroUSD fields |
| SKP-001 (sprint) | 910 | Provenance attestation step in release process |

### Overridden

| ID | Severity | Rationale |
|----|----------|-----------|
| SKP-001 (sdd) | 960 | False positive — code snippets are TypeScript, not template artifacts |
| SKP-002 (sdd) | 760 | Already overridden in PRD (DenialCode union is additive by design) |
| SKP-003 (sdd) | 735 | Addressed by IMP-003 auto-integration |
| SKP-004 (sdd) | 710 | Addressed by IMP-004 auto-integration |
| SKP-010 (sprint) | 845 | Already overridden in PRD |
| SKP-003 (sprint) | 730 | Already overridden in PRD |
