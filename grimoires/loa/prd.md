# PRD: Hounfour v9 — Pre-Launch Protocol Hardening

**Status:** Draft
**Author:** Jani + Claude
**Date:** 2026-02-27
**Cycle:** cycle-001 (hounfour)
**References:** [PR #39 RFC](https://github.com/0xHoneyJar/loa-hounfour/pull/39) · [Issue #38](https://github.com/0xHoneyJar/loa-hounfour/issues/38) · [Finn PRD cycle-037](https://github.com/0xHoneyJar/loa-finn/blob/main/grimoires/loa/prd.md) · [Finn Issue #66](https://github.com/0xHoneyJar/loa-finn/issues/66) · [Dixie PRD cycle-017](grimoires/loa/context/dixie-prd-cycle-017.md)

---

## 1. Problem Statement

Hounfour v8.2.0 shipped the Commons Protocol (GovernedResource substrate, ModelPerformanceEvent, QualityObservation, audit trail hash chains). Three consumer repos — loa-finn, loa-dixie, loa-freeside — are deploying to staging simultaneously. During this deployment, all three surfaced gaps in the protocol layer that must be resolved before the ecosystem graduates from staging to closed main launch.

loa-finn has provided the most concrete feedback (PR #39 comment, full PRD for cycle-037). loa-dixie has responded with a comprehensive PRD for cycle-017, contributing 3 Tier 1 patterns ready for immediate extraction, 4 Tier 2 patterns requiring validation, and 3 Tier 3 patterns needing design work. Key finding: **v8.2.0 already exports most of what consumers need**, but there are gaps in x402 payment schemas, economic boundary evaluation refinements, proper release distribution, runtime governance interfaces, and cross-repo conformance infrastructure.

The versioning question — v8.3.0 (MINOR, additive-only) vs v9.0.0 (MAJOR, breaking) — depends on whether any extraction adds required fields to existing schemas. Both finn and dixie independently confirm v8.3.0 is appropriate — all contributions are additive. This PRD is intentionally conservative: prefer additive-only changes (v8.3.0) unless a breaking change is demonstrably necessary.

> Sources: PR #39 RFC (21 extraction candidates), finn cycle-037 PRD (6 FRs, 24 ACs), dixie cycle-017 PRD (3 Tier 1, 4 Tier 2, 3 Tier 3 patterns), dixie PR #15 Part III (GovernedResource<T> isomorphism), freeside Issue #91 (x402 schema gaps), freeside Issue #103 (dist/ distribution fix)

---

## 2. Goals & Success Metrics

| Goal | Metric | Target |
|------|--------|--------|
| G-1: All P0 extraction candidates resolved | RFC P0 items closed or deferred-with-justification | 6/6 |
| G-2: x402 payment schemas canonical | Schemas in `src/economy/`, vectors in `vectors/` | 4 schemas, 10+ vectors |
| G-3: Cross-repo conformance infrastructure | Consumer contract spec + CI validation tooling | 3 consumer contracts (finn, dixie, freeside) |
| G-4: Proper release distribution | Git tag, GitHub release, dist/ committed | v8.3.0 or v9.0.0 tagged |
| G-5: Economic boundary evaluation refined | `evaluateEconomicBoundary()` gaps closed | 7 semantic gaps addressed (from freeside spike) |
| G-6: Feedback dampening protocol pattern | Schema + invariant + reference implementation | FeedbackDampening config + `computeDampenedScore()` exported |
| G-7: Vision registry captures architectural insights | Visions captured from cross-repo deployment Bridgebuilder reviews | 7 visions captured (V-001 through V-007) |
| G-8: GovernedResource<T> runtime interface | Interface + abstract base class upstream | `GovernedResource<T>` + `GovernedResourceBase` exported |

---

## 3. Users & Stakeholders

| Persona | Need |
|---------|------|
| **loa-finn** | model_performance event validated against canonical schema; x402 schemas proposed upstream; CI-verifiable conformance tests against hounfour exports |
| **loa-dixie** | GovernedResource<T> runtime interface upstream (3 production witnesses); chain-bound hash utility (`computeChainBoundHash()`); EMA feedback dampening as protocol pattern with `computeDampenedScore()` reference implementation; audit trail domain separation; conditional constraints schema |
| **loa-freeside** | x402 payment schema bridge; economic boundary evaluation gaps closed; proper git tag for CI pin; consumer-driven contract format |
| **Hounfour maintainers** | Clean release with integrity manifest; breaking vs additive classification for each change; comprehensive test coverage |
| **Operator (Jani)** | Confidence that protocol layer is hardened before opening to the public; each repo can independently verify conformance |

---

## 4. Functional Requirements

### FR-1: x402 Payment Schema Canonicalization

**Priority:** P0
**Breaking:** No — purely additive (new schemas, no changes to existing)

Hounfour v8.2.0 exports `BillingEntrySchema`, `EscrowEntrySchema`, `CostTypeSchema`, and JWT schemas — but has **no x402 HTTP payment extension schemas**. loa-finn's cycle-037 PRD (FR-4, AC13-15) proposes documenting their current x402 schemas as JSON Schema files and upstreaming them.

**What to add to `src/economy/`:**

```typescript
// New file: src/economy/x402-payment.ts
export const X402QuoteSchema = Type.Object({
  quote_id: Type.String({ format: 'uuid' }),
  model: Type.String({ minLength: 1 }),
  max_cost_micro: MicroUSDSchema,        // Reuse existing string-encoded micro-USD
  payment_address: Type.String(),         // 0x-prefixed Ethereum address
  chain_id: Type.Integer({ minimum: 1 }),
  token_address: Type.String(),           // Settlement token (e.g. Honey on Berachain)
  valid_until: Type.String({ format: 'date-time' }),
  // Optional pricing breakdown
  cost_per_input_token_micro: Type.Optional(MicroUSDSchema),
  cost_per_output_token_micro: Type.Optional(MicroUSDSchema),
});

export const X402PaymentProofSchema = Type.Object({
  payment_header: Type.String(),          // X-Payment header value
  quote_id: Type.String({ format: 'uuid' }),
  tx_hash: Type.Optional(Type.String()),  // On-chain settlement tx
});

export const X402SettlementSchema = Type.Object({
  payment_id: Type.String({ format: 'uuid' }),
  quote_id: Type.String({ format: 'uuid' }),
  actual_cost_micro: MicroUSDSchema,
  settlement_status: Type.Union([
    Type.Literal('pending'),
    Type.Literal('confirmed'),
    Type.Literal('failed'),
    Type.Literal('refunded'),
  ]),
  settled_at: Type.Optional(Type.String({ format: 'date-time' })),
  chain_id: Type.Integer({ minimum: 1 }),
  token_address: Type.String(),
});

export const X402ErrorCodeSchema = Type.Union([
  Type.Literal('PAYMENT_REQUIRED'),       // 402 — need payment
  Type.Literal('NOT_ALLOWLISTED'),        // 403 — wallet not in allowlist
  Type.Literal('INFERENCE_FAILED'),       // 502 — model inference error
  Type.Literal('FEATURE_DISABLED'),       // 503 — x402 feature flag off
  Type.Literal('QUOTE_EXPIRED'),          // 410 — quote TTL exceeded
  Type.Literal('INSUFFICIENT_FUNDS'),     // 402 — balance too low
]);
```

**Acceptance Criteria:**
- AC1: `X402QuoteSchema`, `X402PaymentProofSchema`, `X402SettlementSchema`, `X402ErrorCodeSchema` exported from `@0xhoneyjar/loa-hounfour/economy`
- AC2: JSON Schema files generated in `schemas/`
- AC3: 10+ conformance vectors covering happy path, expired quote, insufficient funds, refund
- AC4: `MicroUSDSchema` (existing) reused for all cost fields — no floating point
- AC5: Settlement asset is generic (not hardcoded to any chain) — supports Berachain Honey, USDC, etc.

> Sources: finn cycle-037 FR-4 (AC13-15), freeside #91 (x402 activation), freeside #98 (Berachain Honey), finn #66 Comment 20 (billing RFC)

### FR-2: Economic Boundary Evaluation Refinement

**Priority:** P0
**Breaking:** TBD — depends on whether gaps require field additions to existing schemas

loa-freeside's decision engine spike (PR #94) identified 7 semantic gaps when migrating from local conservation logic to hounfour's `evaluateEconomicBoundary()`:

| Gap | Description | Resolution Strategy |
|-----|-------------|---------------------|
| 1 | Lossy tier-to-score normalization | Add `mapTierToReputationState()` as exported utility |
| 2 | Approximated `budget_period_end` | Document as consumer-responsibility (not protocol) |
| 3 | Missing `evaluation_gap` action feedback | Already addressed in v7.9.1 (`EvaluationGap` schema exists) — document |
| 4 | Tier→ReputationState mapping | Export canonical mapping function |
| 5 | Budget scope alignment | Verify `BudgetScopePreference` covers freeside patterns |
| 6 | Conservation invariant verification | Already in v8.0.0 (`ConservationLaw` + factories) — document |
| 7 | Denial reason granularity | Extend `DenialCode` union (open issue #30) |

**Acceptance Criteria:**
- AC6: `mapTierToReputationState()` exported from `@0xhoneyjar/loa-hounfour/governance`
- AC7: `DenialCode` union extended with granular codes (additive — existing codes preserved)
- AC8: Gaps 2, 3, 6 documented as "already resolved" in migration guide with code references
- AC9: Gap 5 verified — `BudgetScopePreference` schema covers freeside's spending limit patterns

> Sources: freeside PR #94 (decision engine spike), RFC PR #39 §3.2

### FR-3: Feedback Dampening Protocol Pattern

**Priority:** P1
**Breaking:** No — purely additive
**Primary contributor:** loa-dixie (invented cycle-007, production since)

loa-dixie independently implemented EMA dampening with adaptive alpha ramp (PR #15 Finding F1) to prevent amplification spirals in the autopoietic feedback loop. This is not dixie-specific — it's a protocol-level requirement for any repo participating in the reputation→routing feedback loop. Dixie's cycle-017 PRD confirms TRIVIAL extraction complexity — pure math, zero external deps.

**What to add:**

```typescript
// New file: src/commons/feedback-dampening.ts

// EMA tuning constants — production-validated across 16 cycles in dixie
export const FEEDBACK_DAMPENING_ALPHA_MIN = 0.1;  // Initial cold-start alpha
export const FEEDBACK_DAMPENING_ALPHA_MAX = 0.5;   // Steady-state alpha ceiling
export const DAMPENING_RAMP_SAMPLES = 50;          // Samples to reach alpha_max
export const DEFAULT_PSEUDO_COUNT = 10;            // Bayesian pseudo-count prior

export const FeedbackDampeningConfigSchema = Type.Object({
  alpha_min: Type.Number({ minimum: 0, maximum: 1, default: 0.1 }),
  alpha_max: Type.Number({ minimum: 0, maximum: 1, default: 0.5 }),
  ramp_samples: Type.Integer({ minimum: 1, default: 50 }),
  pseudo_count: Type.Integer({ minimum: 0, default: 10 }),
}, { $id: 'FeedbackDampeningConfig' });

/**
 * Reference implementation — pure function, zero external deps.
 * Adaptive alpha ramp: alpha = alpha_min + (alpha_max - alpha_min) * min(sampleCount / ramp_samples, 1)
 * Prevents Nyquist instability in autopoietic feedback loops.
 */
export function computeDampenedScore(
  oldScore: number | null,
  newScore: number,
  sampleCount: number,
  config?: Static<typeof FeedbackDampeningConfigSchema>,
): number;
```

**Acceptance Criteria:**
- AC10: `FeedbackDampeningConfigSchema` exported from `@0xhoneyjar/loa-hounfour/commons`
- AC11: Protocol-level invariant documented: `|dampened - old| <= alpha_max * |new - old|` (bounded feedback guarantee, equivalent to dixie INV-006)
- AC12: `computeDampenedScore()` reference implementation exported as utility — pure function, configurable via `FeedbackDampeningConfigSchema`
- AC13: 5+ conformance vectors: cold start (null oldScore), ramp-up (sampleCount < ramp_samples), steady state (sampleCount >= ramp_samples), boundary values (0, 1, negative)
- AC14: Default constants exported: `FEEDBACK_DAMPENING_ALPHA_MIN`, `FEEDBACK_DAMPENING_ALPHA_MAX`, `DAMPENING_RAMP_SAMPLES`, `DEFAULT_PSEUDO_COUNT`

> Sources: dixie cycle-017 PRD §P0-1/P1-10, dixie INV-006, dixie `reputation-scoring-engine.ts`, RFC PR #39 §2.3

### FR-4: Consumer-Driven Contract Specification Format

**Priority:** P1
**Breaking:** No — new infrastructure, no schema changes

loa-freeside maintains a `contract.json` (48 symbols across 7 entrypoints) that declares what it imports from hounfour. This is an excellent pattern that all three repos should adopt for version compatibility verification.

**What to add:**

```typescript
// New file: src/integrity/consumer-contract.ts
export const ConsumerContractSchema = Type.Object({
  consumer: Type.String({ minLength: 1 }),         // e.g., "loa-finn"
  provider: Type.Literal('@0xhoneyjar/loa-hounfour'),
  provider_version_range: Type.String(),            // semver range, e.g., ">=8.2.0"
  entrypoints: Type.Record(
    Type.String(),                                   // e.g., "/governance"
    Type.Object({
      symbols: Type.Array(Type.String()),            // imported symbol names
      min_version: Type.Optional(Type.String()),     // per-entrypoint min version
    })
  ),
  generated_at: Type.String({ format: 'date-time' }),
  checksum: Type.Optional(Type.String()),            // SHA-256 of sorted symbol list
});
```

**Acceptance Criteria:**
- AC15: `ConsumerContractSchema` exported from `@0xhoneyjar/loa-hounfour/integrity`
- AC16: `validateConsumerContract()` utility that checks contract symbols against actual exports
- AC17: Script `scripts/verify-consumer-contract.ts` for CI integration
- AC18_a: Example contracts for finn (48+ symbols), dixie, freeside in `vectors/contracts/`

> Sources: freeside PR #96 (`contract.json`), RFC PR #39 §3.3

### FR-5: Audit Trail Domain Separation + Chain-Bound Hash Utility

**Priority:** P0
**Breaking:** No — documentation + new utilities (additive)
**Contributors:** loa-finn (domain tags), loa-dixie (chain-bound hashing, TOCTOU prevention)

v8.0.0 already exports `computeAuditEntryHash()`, `buildDomainTag()`, `verifyAuditTrailIntegrity()`, and `AUDIT_TRAIL_GENESIS_HASH`. Two additions are needed:

1. **Documentation** of the domain separation convention and cross-repo verification guidance (from finn)
2. **Chain-bound hash utility** — `computeChainBoundHash()` extending `computeAuditEntryHash()` with chain binding, TOCTOU prevention pattern, and genesis race safeguards (from dixie)

loa-finn's cycle-037 PRD (FR-3) specifies: genesis seed `FINN_AUDIT_GENESIS_SEED = "finn:audit:genesis:v1"` with domain prefix `finn:audit:`. Each repo needs its own domain tag.

loa-dixie's cycle-017 PRD (P0-3) contributes: chain-bound hashing (`entryHash = sha256(contentHash + ":" + previousHash)`), `hash_domain_tag` for domain separation (`resource_type + contract_version`), TOCTOU prevention via `FOR UPDATE` serialization, and genesis race prevention via `UNIQUE(resource_type, previous_hash)` constraint.

**What to add:**
1. Documentation: `docs/integration/audit-trail-domains.md` — convention for domain tags, genesis seeds, cross-repo verification, TOCTOU prevention pattern
2. Conformance vectors: multi-domain hash chain verification (finn, dixie, freeside domain tags)
3. Utility: `validateDomainTag()` — ensures domain tags follow convention (`{repo}:{domain}:{qualifier}`)
4. Utility: `computeChainBoundHash()` — extends `computeAuditEntryHash()` with chain binding

```typescript
// Addition to src/commons/ or src/integrity/
/**
 * Chain-bound hash — extends computeAuditEntryHash() with previous-hash binding.
 * Prevents hash chain forgery by binding each entry to its predecessor.
 * Source: dixie audit-trail-store.ts — production-proven across 16 cycles.
 */
export function computeChainBoundHash(
  entry: {
    entry_id: string;
    timestamp: string;
    event_type: string;
    actor_id?: string;
    payload?: Record<string, unknown>;
  },
  domainTag: string,
  previousHash: string,
): string;
```

**Domain Tag Convention:**
```
loa-finn:audit:*        — Finn's audit trail
loa-dixie:reputation:*  — Dixie's reputation audit trail
loa-dixie:knowledge:*   — Dixie's knowledge governance trail
loa-freeside:billing:*  — Freeside's billing audit trail
```

**TOCTOU Prevention Pattern (documentation):**
- Genesis entry: `INSERT ... WHERE NOT EXISTS (SELECT 1 FROM ... WHERE previous_hash = 'GENESIS')`
- Subsequent entries: `SELECT ... FOR UPDATE` serialization on previous hash lookup
- Genesis race: `UNIQUE(resource_type, previous_hash)` constraint prevents duplicate genesis entries

**Acceptance Criteria:**
- AC18: `docs/integration/audit-trail-domains.md` with domain tag convention + TOCTOU prevention pattern
- AC19: `validateDomainTag()` exported from `@0xhoneyjar/loa-hounfour/commons`
- AC20: `computeChainBoundHash()` exported from `@0xhoneyjar/loa-hounfour/commons` — extends `computeAuditEntryHash()` with chain binding
- AC21: 8+ conformance vectors: multi-domain hash chain verification, chain-bound hash vs content-only hash, genesis entry, TOCTOU race scenario
- AC22: Cross-repo verification example in docs (finn chain verified by dixie)

> Sources: finn cycle-037 FR-3 (AC10-12), dixie cycle-017 PRD §P0-3, dixie `audit-trail-store.ts`, dixie ADR dual-track hash chain, RFC PR #39 §2.2

### FR-6: Conditional Constraints Schema

**Priority:** P1
**Breaking:** No — additive field on constraint files

loa-dixie vision-004 (Issue #40) proposes adding a `condition` field to the constraint DSL for feature-flagged behavior. This enables A/B testing of agent behavior rules without redeploying constraint sets.

**What to add to constraint grammar:**

```json
{
  "condition": {
    "when": "feature_flag_name",
    "override_text": "Alternative constraint text when flag is active",
    "override_rule_type": "SHOULD"
  }
}
```

**Acceptance Criteria:**
- AC23: `ConstraintConditionSchema` added to constraint grammar (optional field — all existing constraints remain valid)
- AC24: Constraint evaluator handles `condition.when` — if flag not set, uses original; if set, uses override
- AC25: GRAMMAR.md updated with condition syntax
- AC26: 5+ test cases: flag present, flag absent, override text, override rule_type, nested conditions rejected

> Sources: dixie Issue #40 (vision-004), RFC PR #39 §2.4

### FR-7: Proper Release & Distribution

**Priority:** P0
**Breaking:** No — distribution only

All three repos consume hounfour via git commit pin. Commit `b6e0027a` fixed the `dist/` gitignore issue, but there's no proper semver tag for it. Both dixie (Issue #57) and freeside (Issue #103) have open issues requesting the pin update.

**Acceptance Criteria:**
- AC27: Git tag created (v8.3.0 or v9.0.0 depending on breaking assessment)
- AC28: GitHub Release created with changelog and migration notes
- AC29: `RELEASE-INTEGRITY.json` regenerated with updated checksums

> Sources: freeside #103, dixie #57, RFC PR #39 §4.1-4.2

### FR-8: GovernedResource\<T\> Runtime Interface Extraction

**Priority:** P1
**Breaking:** No — purely additive (new interface + abstract base, no changes to existing schemas)
**Primary contributor:** loa-dixie (3 production witnesses, ADR-015)

v8.0.0 exports `GOVERNED_RESOURCE_FIELDS` schema defining the structural substrate. loa-dixie has independently developed a production-proven runtime interface `GovernedResource<TState, TEvent, TInvariant>` with an abstract base class `GovernedResourceBase`, validated across 3 concrete implementations (the "three-witness" standard from ADR-015 — "The Kubernetes CRD Moment"):

1. `ReputationService` → `GovernedResource<ReputationState, ReputationEvent, ReputationInvariant>`
2. `ScoringPathTracker` → `GovernedResource<ScoringPath, ScoringPathEvent, ScoringPathInvariant>`
3. `KnowledgeGovernor` → `GovernedResource<KnowledgeState, KnowledgeEvent, KnowledgeInvariant>`

This upgrades GovernedResource from a schema-level concept to a runtime-level contract. Extraction is justified by the three-witness convergence — the same interface emerged independently across multiple implementations.

**What to add:**

```typescript
// New file: src/commons/governed-resource.ts

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

export interface GovernedResource<
  TState,
  TEvent,
  TInvariant extends string = string
> {
  readonly resourceId: string;
  readonly resourceType: string;
  readonly current: TState;
  readonly version: number;

  transition(event: TEvent, actorId: string): Promise<TransitionResult<TState>>;
  verify(invariantId: TInvariant): InvariantResult;
  verifyAll(): InvariantResult[];

  readonly auditTrail: Readonly<AuditTrail>;
  readonly mutationLog: ReadonlyArray<GovernanceMutation>;
}

// Abstract base providing invariant verification harness and audit trail wiring
export abstract class GovernedResourceBase<TState, TEvent, TInvariant extends string = string>
  implements GovernedResource<TState, TEvent, TInvariant> {
  // Consumers implement: applyEvent(), defineInvariants(), initializeState()
}
```

**NOTE:** This is the runtime interface only. The existing `GOVERNED_RESOURCE_FIELDS` schema remains unchanged. Consumers who don't need the runtime interface can continue using the schema alone.

**Acceptance Criteria:**
- AC30: `GovernedResource<TState, TEvent, TInvariant>` interface exported from `@0xhoneyjar/loa-hounfour/commons`
- AC31: `GovernedResourceBase` abstract class exported with default invariant verification harness
- AC32: `TransitionResult<TState>` and `InvariantResult` types exported
- AC33: TypeBox schemas for `TransitionResult` and `InvariantResult` generated in `schemas/`
- AC34: 5+ conformance vectors: valid transition, invariant violation, version monotonicity, audit trail append
- AC35: ADR-015 ("The Kubernetes CRD Moment") included in `docs/` as design rationale
- AC36: Existing `GOVERNED_RESOURCE_FIELDS` schema unchanged — backward compatible

> Sources: dixie cycle-017 PRD §P0-2, dixie `governed-resource.ts`, dixie ADR-015, RFC PR #39 §2.1

---

## 5. Technical & Non-Functional Requirements

| Requirement | Target |
|-------------|--------|
| Backward compatibility | All v8.2.0 consumers continue to work without changes |
| New schema generation | JSON Schema 2020-12 for all new types |
| Conformance vectors | 40+ new vectors across all 8 FRs |
| Test coverage | 100% of new code paths; zero regression on existing 6,393 tests |
| Build time | `npm run build` completes in <15s |
| Schema count | 193+ (current) → 210+ (target) |
| Constraint evaluation | Conditional constraints add <1ms per evaluation |
| Pure functions | `computeDampenedScore()`, `computeChainBoundHash()` — zero side effects, deterministic |

---

## 6. Scope

### In Scope
- x402 payment schemas (quote, proof, settlement, error codes)
- Economic boundary evaluation refinements (tier mapping, denial codes)
- Feedback dampening protocol schema + reference implementation + constants
- Consumer-driven contract specification format + validation
- Audit trail domain separation documentation + chain-bound hash utility
- Conditional constraints schema extension
- GovernedResource\<T\> runtime interface + abstract base class (dixie Tier 1)
- Proper git tag + release + integrity manifest
- Conformance vectors for all new schemas

### Out of Scope (Deferred)
- **model_performance schema changes** — v8.2.0 already exports what finn needs; finn will implement against existing schema (confirmed in finn PRD FR-1)
- **Agent Descriptor JSON-LD** (P2 from RFC) — deferred to post-launch
- **Routing vocabulary standardization** (P2 from RFC) — deferred; finn has local mapping
- **Dual-chain cross-verification** (P2 from RFC) — deferred
- **Settlement asset per-chain schema** (P2 from RFC) — generic `chain_id` + `token_address` in x402 schemas is sufficient
- **MCP tool billing** — future phase (from finn #66 Comment 2)
- **Agent lifecycle guard conditions** (P1 from RFC) — deferred; existing enum is sufficient for launch
- **Governance Mutation Attribution** (dixie Tier 2) — actor type discrimination (`human | system | autonomous`), `resolveActorId()`, `MutationLog` — needs design decision: library convention vs protocol-level schema. Target v8.4.0 or v9.0.0
- **Conviction-Gated Access** (dixie Tier 3) — 5-tier model currently BGT-coupled, needs abstraction layer for non-THJ use
- **EvaluationGap / ZPD** (dixie Tier 3) — ADR-004, needs ecosystem validation before extraction
- **Autonomy Governance** (dixie Tier 3) — SovereigntyEngine may be dixie-specific

### Cross-Repo Deployment Visions (from Bridgebuilder Reviews)

Bridgebuilder reviews across finn (PRs #63, #105, #108, #109, #110), dixie (PRs #8, #50, #51, #56, #58), and freeside (PRs #88, #96, #97, #99, #100) surfaced 7 protocol-level insights relevant to hounfour. These are captured as visions in `grimoires/loa/visions/entries/` and triaged below.

| Vision | Title | Affects FR | Action |
|--------|-------|-----------|--------|
| V-001 | Audit Trail Single-Writer Invariant | FR-5 | Add as documented invariant in audit trail docs |
| V-002 | Advisory Lock Hash Collision (Birthday Paradox) | FR-5 | Note in chain-bound hash docs; consider `computeAdvisoryLockId()` |
| V-003 | Timestamp Validation at Audit I/O Boundary | FR-5 | Add `parseAuditTimestamp()` utility or document validation requirement |
| V-004 | Temporal Trust — Revocable Graduation vs Decayed Confidence | Deferred | Design question for post-launch (governance module) |
| V-005 | Five-Repo Conservation Stack | Documentation | Frame in release notes and ecosystem docs |
| V-006 | S2S JWT jti Claim (Replay Protection) | FR-1 (related) | Consider `S2SJwtPayloadSchema` requiring `jti` — additive |
| V-007 | EMA Population vs Sample Variance | FR-3 | Document variance formula choice in `computeDampenedScore()` |

**Actionable for v8.3.0:** V-001 (documentation in FR-5), V-003 (validation utility or doc), V-007 (doc in FR-3)
**Deferred:** V-002 (performance, not correctness), V-004 (design question), V-005 (documentation only), V-006 (needs breaking-change assessment)

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| x402 schema design doesn't match freeside's consumption patterns | Medium | Medium | Freeside reviews schemas before merge; consumer contract validates |
| DenialCode extension breaks existing switch/case exhaustive checks | Low | High | Add new codes as additive union members; existing `assertNever` catches new variants at compile time |
| Conditional constraints add complexity to evaluator | Medium | Low | Feature-gated; existing constraints unaffected (condition field is optional) |
| Version decision delays release | Low | Medium | Default to v8.3.0 (MINOR); only bump MAJOR if breaking change is unavoidable |
| GovernedResource\<T\> interface too rigid for other repos | Low | High | Three-witness proof validates abstraction; abstract base is optional |
| EMA constants tuned to dixie's workload | Medium | Medium | Export as configurable via `FeedbackDampeningConfigSchema`; document tuning methodology |
| Chain-bound hash adds complexity for simple use cases | Low | Medium | Export as opt-in utility; existing `computeAuditEntryHash()` remains for simple use |
| Freeside doesn't provide feedback before launch | Medium | Low | Finn + dixie feedback is comprehensive; freeside contribution expected soon |

### Dependencies
- loa-finn cycle-037 PRD (primary consumer feedback — **received**)
- loa-dixie cycle-017 PRD (Tier 1 extraction patterns — **received**)
- loa-freeside feedback on PR #39 (requested, expected soon)
- Staging deployment stable (parallel — not blocking this work)

---

## 8. Implementation Notes

### Breaking Change Assessment

| FR | Change | Breaking? | Reason |
|----|--------|-----------|--------|
| FR-1 | New x402 schemas | No | New files, new exports, no changes to existing |
| FR-2 | `mapTierToReputationState()`, extended `DenialCode` | No | New utility, additive union extension |
| FR-3 | `FeedbackDampeningConfigSchema` + `computeDampenedScore()` + constants | No | New schema, new exports, new utility |
| FR-4 | `ConsumerContractSchema` | No | New schema, new export |
| FR-5 | `validateDomainTag()`, `computeChainBoundHash()`, docs | No | New utilities, documentation |
| FR-6 | `condition` field on constraints | No | Optional field — all existing constraints valid |
| FR-7 | Release tag | No | Distribution only |
| FR-8 | `GovernedResource<T>` interface + `GovernedResourceBase` | No | New interface + abstract class, existing schemas unchanged |

**Conclusion: v8.3.0 (MINOR)** — all 8 FRs are additive. No breaking changes required. Confirmed independently by finn (cycle-037) and dixie (cycle-017).

### Sprint Estimation

| Sprint | FR Coverage | Estimated Effort |
|--------|-------------|-----------------|
| Sprint 1 | FR-1 (x402 schemas) + FR-7 (release prep) | 1 sprint |
| Sprint 2 | FR-2 (economic boundary) + FR-5 (audit trail + chain-bound hash) | 1 sprint |
| Sprint 3 | FR-3 (feedback dampening) + FR-8 (GovernedResource<T>) | 1 sprint |
| Sprint 4 | FR-4 (consumer contracts) + FR-6 (conditional constraints) + vectors + release | 1 sprint |

**Total: 4 sprints → v8.3.0 release**

### Finn PRD Cross-Reference

loa-finn's cycle-037 addresses these hounfour P0 items from their side:

| Finn FR | Hounfour Action | Status |
|---------|----------------|--------|
| FR-1 (model_performance emission) | No hounfour change needed — v8.2.0 schema sufficient | Resolved |
| FR-2 (GovernedResource verification) | Runtime interface now upstream via FR-8 | Addressed by FR-8 |
| FR-3 (Audit trail verification) | Documentation + chain-bound hash utility | Addressed by FR-5 |
| FR-4 (x402 schema verification) | Schemas need to be added | Addressed by FR-1 |
| FR-5 (PR #39 feedback) | Receive and integrate | Ongoing (freeside pending) |
| FR-6 (CI modernization) | Not hounfour scope | N/A |

### Dixie PRD Cross-Reference

loa-dixie's cycle-017 contributes to hounfour via Tier 1 extraction:

| Dixie Contribution | Hounfour FR | Status |
|-------------------|-------------|--------|
| GovernedResource\<T\> interface + GovernedResourceBase | FR-8 | **NEW — added** |
| `computeDampenedScore()` + EMA constants | FR-3 | Updated with implementation details |
| `computeChainBoundHash()` + TOCTOU pattern | FR-5 | Updated with chain-bound hash utility |
| Governance Mutation Attribution | Deferred | Tier 2 — needs library vs protocol decision |
| Conviction-Gated Access | Deferred | Tier 3 — needs BGT abstraction |
| EvaluationGap (ZPD) | Deferred | Tier 3 — needs ecosystem validation |

Dixie confirms v8.3.0 MINOR recommendation — all Tier 1 contributions are purely additive.

### Cross-Repo Coordination Points

| Coordination | Repos | Risk |
|-------------|-------|------|
| EMA dampening should compose with finn's scoring pipeline | finn + dixie | If finn changes scoring schema, dixie's dampening input may need adaptation |
| Chain-bound hash extends existing `computeAuditEntryHash()` | dixie + hounfour | Must remain backward-compatible — existing consumers use content-only hash |
| x402 schemas must match freeside's consumption patterns | freeside + hounfour | Freeside review pending |
| GovernedResource\<T\> interface must not constrain finn's verification | finn + dixie | Interface is opt-in — schema-only consumers unaffected |

### Anti-Duplication Rule

From finn #66 Comment 10 — enforced throughout:

| Responsibility | Owner | This PRD |
|----------------|-------|----------|
| Type schemas + runtime interfaces | loa-hounfour (ONLY) | FR-1, FR-2, FR-3, FR-4, FR-6, FR-8 |
| JWT minting | loa-freeside (ONLY) | — |
| JWT validation | loa-finn (ONLY) | — |
| Model routing | loa-finn (ONLY) | — |
| Reputation storage | loa-dixie (ONLY) | — |
| Billing ledger | loa-finn (ONLY) | — |
