# RFC: v9.0.0 Cross-Repo Extraction — Pre-Launch Protocol Hardening

**Status:** DRAFT — Open for feedback from loa-finn, loa-dixie, loa-freeside
**Author:** Planning extraction from staging deployment feedback
**Date:** 2026-02-27
**Blocking:** Closed main launch (NOT staging deployment)
**References:** loa-finn#66, loa-hounfour#38, loa-dixie#45, loa-dixie#40, loa-freeside#91, loa-freeside#103

---

## Context

During the deployment of loa-finn, loa-dixie, and loa-freeside to staging, all three repos have surfaced patterns, gaps, and hardening opportunities that belong in hounfour as the constitutional protocol layer. This RFC captures everything identified so far and invites each repo to contribute additional insights before closed main launch.

**Timeline constraint:** Staging deployment proceeds in parallel — this work does NOT gate E2E testing. However, all identified extractions MUST land in hounfour before opening to the public.

**Versioning:** If any extraction adds required fields or breaks existing consumers, this becomes v9.0.0 (MAJOR). Additive-only changes can land as v8.3.0 (MINOR).

---

## 1. Extraction Candidates from loa-finn

Source: loa-finn#66 (30 comments), PRs #102, #104, #107

### 1.1 [P0] Model Performance Feedback Loop Closure (hounfour#38)

The autopoietic loop — model quality → reputation → routing — is the last named schema gap. loa-finn PR #107 wired `ReputationEvent` normalizer, `TaskType→RoutingKey` mapping, and `QualityObservation` adapter against v8.2.0, but the loop requires the `model_performance` variant to carry enough signal for routing decisions.

**What hounfour needs:**
- `model_performance` variant on `ReputationEvent` with `quality_observation` payload
- Multi-dimensional quality signals (`satisfaction`, `coherence`, `safety`) rather than collapsing to a single score
- Routing attribution — which model produced which output in ensemble contexts

**Cross-ref:** loa-dixie Bridgebuilder meditation (PR #15 Part III) argues single-score collapse loses information for multi-model routing decisions.

### 1.2 [P1] Agent Lifecycle Guard Conditions

loa-finn#66 Comment 7 (Finding 7) identified the need for `AgentLifecycleState` transitions to carry guard condition schemas — reason codes for why a transition occurred.

**What hounfour needs:**
- `LifecycleTransitionGuard` schema with `reason_code` and `reason_message`
- Valid transition matrix (which states can reach which states)
- Kubernetes-style `reason_code + reason_message` split for filtering

**Status:** `AgentLifecycleState` enum exists (v3.0.0+). Guard conditions do not.

### 1.3 [P1] Transfer Specification — Compensation & Escrow

loa-finn#66 Comment 7 (Finding 4, HIGH) identified that `TransferSpec` lacks a compensation/escrow primitive. Five scenarios need handling:

1. Happy path — conversations sealed, new holder gets clean slate
2. Mid-session transfer — active WebSocket terminated, session sealed
3. Outstanding credits — credits are per-agent (in TBA), transfer with NFT
4. Rapid flip — no cooldown, minimal provisioning per trade
5. Transfer to contract — agent enters SUSPENDED state

**What hounfour needs:**
- `TransferCompensation` schema for credit handling during transfers
- `ConversationSealingPolicy` validation for mid-transfer behavior
- Escrow release conditions tied to transfer events

### 1.4 [P1] BillingEntry Multi-Party Recipients

loa-finn#66 Comments 6-7 establish that `BillingEntry.recipients[]` must be multi-party from day 1 to avoid Stripe Connect-style rewrites. The pattern supports platform fees, tool provider revenue, and agent TBA revenue simultaneously.

**What hounfour needs:**
- Verify `BillingEntry` schema supports `recipients[]` array (may already exist)
- `CostEntry.recipients[]` with role attribution (platform, provider, agent)
- Revenue split validation constraints

### 1.5 [P2] Agent Descriptor Content Negotiation

loa-finn#66 Comment 7 (Finding 1, HIGH) — the agent homepage is not a page, it's a protocol surface. Design with content negotiation from day 1:

- `Accept: text/html` → rendered page
- `Accept: application/json` → AgentDescriptor JSON-LD
- `Accept: text/markdown` → llms.txt (Cloudflare markdown-for-agents standard)

**What hounfour needs:**
- `AgentDescriptor` JSON-LD context definition
- `llms.txt` schema/structure definition
- Content negotiation guidance in protocol docs

### 1.6 [P2] Routing Vocabulary Standardization

loa-finn PR #107 introduced `mapTaskTypeToRoutingKey` for 6 protocol task types. The mapping from semantic task types to pool routing keys needs protocol-level definition.

**What hounfour needs:**
- `RoutingKey` vocabulary aligned with `TaskType` taxonomy
- Mapping rules as constraints or schema definitions
- ADR documenting the routing vocabulary governance

---

## 2. Extraction Candidates from loa-dixie

Source: PRs #15, #25, #26, #27, #46, #47, #50, #56; Issues #40, #45, #57

### 2.1 [P0] GovernedResource\<T\> Protocol Abstraction

The single most explicit and repeated call across dixie's Bridgebuilder meditations (PR #15, Parts I-III). Three repos independently discovered the same governance primitive:

| Repo | Domain | Primitive |
|------|--------|-----------|
| loa-freeside | Billing | Conservation Guard |
| loa-dixie | Reputation | EMA Dampening |
| loa-dixie | Knowledge | Freshness Weights |
| loa-hounfour | Lifecycle | State Machine Transitions |

All are instances of: **governance of a scarce resource through bounded, event-sourced state transitions with self-knowledge.**

**What hounfour needs:**
```typescript
interface GovernedResource<TState, TEvent, TInvariant> {
  readonly current: TState;
  readonly version: number;
  readonly stateHistory: EventLog<TEvent>;
  transition(event: TEvent, actor: ActorId): TransitionResult<TState>;
  verify(invariant: TInvariant): InvariantResult;
  verifyAll(): InvariantResult[];
  readonly auditTrail: AuditTrail;
  readonly mutationLog: MutationLog;
}
```

**Status:** `GovernedResource` TypeBox schema exists in `src/commons/`. Verify it matches the runtime interface pattern all three repos need. The schema may need the `stateHistory`, `verify/verifyAll`, `auditTrail`, and `mutationLog` properties if not already present.

### 2.2 [P0] Audit Trail Genesis Hash & Domain Separation

loa-dixie CI sprint `BB-C015-011` explicitly imports `AUDIT_TRAIL_GENESIS_HASH` from hounfour instead of hardcoding. Issue #45 (L-026) proposes `computeAuditEntryHash` with domain tags (`audit:reputation`, `audit:knowledge`) as a protocol-level utility.

**What hounfour needs:**
- Export `AUDIT_TRAIL_GENESIS_HASH` constant (verify it's in the public API)
- Export `computeAuditEntryHash(payload, domainTag)` utility
- Domain tag registry or convention documentation
- Hash chain verification with domain separation prevents cross-chain collision attacks

### 2.3 [P1] Feedback Dampening as Protocol Pattern

loa-dixie PR #15 (F1, MEDIUM) identified the amplification spiral risk in the autopoietic loop. The EMA dampening with adaptive alpha ramp was implemented in dixie:

```typescript
const rampFraction = Math.min(1, sampleCount / DAMPENING_RAMP_SAMPLES);
const alpha = ALPHA_MIN + (ALPHA_MAX - ALPHA_MIN) * rampFraction;
return alpha * newScore + (1 - alpha) * oldScore;
```

This is not dixie-specific — it's a protocol-level requirement for any feedback loop in the system.

**What hounfour needs:**
- `FeedbackDampening` configuration schema (alpha_min, alpha_max, ramp_samples)
- Protocol-level invariant: bounded feedback guarantee (INV-006 equivalent)
- Documentation of the adaptive alpha ramp pattern for consumer implementors

### 2.4 [P1] Conditional Constraints (Feature-Flagged Behavior)

loa-dixie Issue #40 (vision-004) — add a `condition` field to the constraint DSL:

```json
{
  "condition": {
    "when": "feature_flag_name",
    "override_text": "Alternative constraint text",
    "override_rule_type": "SHOULD"
  }
}
```

Enables A/B testing of agent behavior rules without redeploying the constraint set.

**What hounfour needs:**
- `ConstraintCondition` schema in the constraint grammar
- Feature flag evaluation semantics
- Interaction with existing constraint versioning

### 2.5 [P1] Transaction Boundary in Store Interfaces

loa-dixie PR #15 Part II identifies that `handleModelPerformance()` makes multiple independent `store.put()` calls. A crash between them leaves aggregate and cohort inconsistent.

**What hounfour needs:**
- `Transactable` interface: `transact<T>(fn: (tx: Transaction) => Promise<T>): Promise<T>`
- Add to `ReputationStore` and `MutationLogPersistence` protocol definitions
- Documentation of transaction boundary requirements for consumer implementors

### 2.6 [P2] Collection Score Empirical Baseline

loa-dixie PR #15 Part II — `DEFAULT_COLLECTION_SCORE = 0` means every new agent starts at "worthless." Should be the running population mean.

**What hounfour needs:**
- Protocol guidance on collection score initialization
- `CollectionScorePolicy` schema (static default vs. empirical running mean)
- Risk analysis of feedback loop from empirical baseline

### 2.7 [P2] Dual-Chain Cross-Verification

`ScoringPathTracker` maintains two independent hash chains but never cross-verifies. The second chain provides no additional tamper detection without cross-verification.

**What hounfour needs:**
- `crossVerify()` method specification in audit trail protocol
- Cross-chain verification semantics (when to verify, what constitutes a violation)

### 2.8 [P2] Propose-Learning Patterns (Issue #45)

Several patterns from dixie's implementation are candidates for protocol-level utilities:

- **L-023:** Forward-only migrations as monotonic expansion constraint
- **L-024:** Mock pool pattern for PG store testing (test utility)
- **L-025:** Welford's algorithm extension to pairwise covariance (streaming stats)
- **L-026:** Hash chain verification with domain separation (covered in 2.2)

---

## 3. Extraction Candidates from loa-freeside

Source: PRs #94, #96, #99, #100; Issues #91, #98, #103

### 3.1 [P0] x402 Payment Schema Integration Points

loa-freeside Issue #91 is the highest-priority open business item. The protocol schemas that directly participate in x402 integration:

| Hounfour Schema | x402 Integration Point |
|-----------------|----------------------|
| `CostPerToken` | Price per API request (string-encoded micro-USD) |
| `EscrowSchema` | Pre-authorized budget for session |
| `BillingRecordSchema` | Transaction record for each payment |
| `EconomicBoundary` | Trust × capital evaluation before payment |
| `BudgetScopePreference` | User's spending limits and preferences |

**What hounfour needs:**
- Verify all 5 schemas are sufficient for x402 flow (request → boundary check → inference → payment → record)
- `PaymentReceiptSchema` for x402 receipt validation
- `PricingTier` schema linking conviction tiers to fee tiers
- Bridge from x402 payment events to `BillingRecordSchema`

### 3.2 [P0] Economic Boundary Evaluation (hounfour#24)

loa-freeside references `evaluateEconomicBoundary()` (hounfour#24) repeatedly. The decision engine spike in PR #94 identified 7 semantic gaps for full migration from local conservation logic to canonical evaluation:

1. Lossy tier-to-score normalization
2. Approximated `budget_period_end`
3. Missing `evaluation_gap` action feedback
4. Tier→ReputationState mapping (`mapTierToReputationState()`)
5. Budget scope alignment
6. Conservation invariant verification
7. Denial reason granularity

**What hounfour needs:**
- Close gaps 1-7 in `evaluateEconomicBoundary()` or document them as consumer-implementation details
- `EconomicDenialReason` schema with granular codes
- Tier→ReputationState mapping as protocol vocabulary

### 3.3 [P1] Consumer-Driven Contract Specification

loa-freeside maintains a `contract.json` (48 symbols across 7 entrypoints) that defines what it imports from hounfour. This is an excellent pattern that should be formalized.

**What hounfour needs:**
- Consumer-driven contract spec format definition
- CI tooling to validate contracts against actual exports
- Contract compatibility checking across versions

### 3.4 [P1] 3-Stage Rollout Pattern (legacy/shadow/enforce)

loa-freeside PR #94 introduced a `parseBoundaryMicroUsd` wrapper with 3-stage rollout (legacy/shadow/enforce) for migrating to canonical hounfour functions. This pattern was independently discovered and should be a protocol-level recommendation.

**What hounfour needs:**
- Migration guide documenting the 3-stage rollout pattern
- `RolloutMode` enum (legacy/shadow/enforce) as protocol vocabulary
- Dead-letter quarantine pattern for shadow-mode divergences

### 3.5 [P1] Supply-Chain Verification

loa-freeside PR #94 added `rebuild-hounfour-dist.sh` with `SOURCE_DATE_EPOCH=0`, isolated git clone, and tarball hash verification. This is analogous to Bazel reproducible builds.

**What hounfour needs:**
- `RELEASE-INTEGRITY.json` is already published (v8.2.0) — verify it's sufficient
- Document the reproducible build verification process for consumers
- CI template for consumer-side hash verification

### 3.6 [P2] x402 on Berachain with Honey Settlement

loa-freeside Issue #98 — x402 with Honey (Berachain native stablecoin) as settlement asset. EIP-2612 and EIP-3009 support for signature-based approvals.

**What hounfour needs:**
- `SettlementAsset` schema to support multiple settlement currencies
- `PaymentNetwork` enum (if not already present) to distinguish settlement chains
- Berachain-specific x402 facilitator integration notes

---

## 4. Cross-Cutting Concerns

### 4.1 [P0] Dependency Pin Update (Immediate)

Both loa-dixie (Issue #57) and loa-freeside (Issue #103) need to update their hounfour dependency pin from `addb0bf` to `b6e0027a` to get the `dist/` fix. loa-freeside reports ~70% of CI failures are caused by this.

**Action:** This is a consumer-side fix, not a hounfour code change. But hounfour should tag a proper release to make consumption cleaner than commit-pinning.

### 4.2 [P0] Proper npm Release or Git Tag

All three repos consume hounfour via git commit pin. A proper semver tag (v8.2.0 or v8.2.1) would simplify consumption and CI.

### 4.3 [P1] Protocol Version Handshake Standardization

Each repo implements its own version handshake:
- loa-finn: `FINN_MIN_SUPPORTED` + feature thresholds
- loa-freeside: `CONTRACT_VERSION` + consumer-driven contract
- loa-dixie: `invariants.yaml` pinned to version

**What hounfour needs:**
- Standardized version handshake schema
- `PeerCapabilities` negotiation protocol
- Minimum supported version advertising

### 4.4 [P1] Conformance Vector Coverage

Current: 91+ golden vectors in hounfour, 236 in freeside sietch, 202 in finn.

**What hounfour needs:**
- Unified vector manifest covering all consumer scenarios
- Nightly regression runner (219+ vectors)
- Vector directory mapping for cross-repo consumption

---

## 5. Priority Matrix

### P0 — Must have before closed main launch

| # | Item | Source | Estimated Effort |
|---|------|--------|-----------------|
| 1 | Model performance feedback loop (hounfour#38) | finn | 1 sprint |
| 2 | GovernedResource\<T\> protocol verification | dixie | 1 sprint |
| 3 | Audit trail genesis hash + domain separation exports | dixie | 0.5 sprint |
| 4 | x402 payment schema verification | freeside | 1 sprint |
| 5 | Economic boundary evaluation gaps | freeside | 1 sprint |
| 6 | Proper git tag / release | all | 0.5 sprint |

### P1 — Should have before closed main launch

| # | Item | Source | Estimated Effort |
|---|------|--------|-----------------|
| 7 | Lifecycle guard conditions | finn | 0.5 sprint |
| 8 | Transfer compensation/escrow | finn | 1 sprint |
| 9 | BillingEntry multi-party verification | finn | 0.5 sprint |
| 10 | Feedback dampening schema | dixie | 0.5 sprint |
| 11 | Conditional constraints | dixie | 1 sprint |
| 12 | Transaction boundary interfaces | dixie | 0.5 sprint |
| 13 | Consumer-driven contract format | freeside | 0.5 sprint |
| 14 | 3-stage rollout pattern docs | freeside | 0.25 sprint |
| 15 | Protocol version handshake | all | 1 sprint |

### P2 — Nice to have / post-launch

| # | Item | Source | Estimated Effort |
|---|------|--------|-----------------|
| 16 | Agent descriptor content negotiation | finn | 1 sprint |
| 17 | Routing vocabulary | finn | 0.5 sprint |
| 18 | Collection score empirical baseline | dixie | 0.5 sprint |
| 19 | Dual-chain cross-verification | dixie | 0.5 sprint |
| 20 | Settlement asset schema | freeside | 0.5 sprint |
| 21 | Supply-chain verification docs | freeside | 0.25 sprint |

---

## 6. Feedback Requested

Each repo team should review this RFC and:

1. **Confirm priority** — Are the P0/P1/P2 assignments correct from your perspective?
2. **Add missing items** — What else surfaced during staging that should be extracted?
3. **Flag blockers** — Which items are blocking your staging work right now?
4. **Provide schemas** — If you've already implemented a local version of something listed here, share the types so hounfour can adopt rather than reinvent.

### How to contribute

Comment on this PR with:
- `[finn]` prefix for loa-finn feedback
- `[dixie]` prefix for loa-dixie feedback
- `[freeside]` prefix for loa-freeside feedback
- `[all]` prefix for cross-cutting feedback

---

## 7. Versioning Decision

**If any P0 item adds required fields:** v9.0.0 (MAJOR)
**If all P0 items are additive-only:** v8.3.0 (MINOR)

Decision deferred until P0 items are spec'd. Each item section should document whether it's additive or breaking.

---

## 8. Anti-Duplication Rule (from finn#66 Comment 10)

> "Type schemas = loa-hounfour (ONLY)"

| Responsibility | Owner |
|----------------|-------|
| Type schemas | loa-hounfour (ONLY) |
| JWT minting | loa-freeside (ONLY) |
| JWT validation | loa-finn (ONLY) |
| Model routing | loa-finn (ONLY) |
| Reputation storage | loa-dixie (ONLY) |
| Smart contracts | mibera-freeside (ONLY) |
| Billing ledger writes | loa-finn (ONLY) |
| User-facing UI | loa-freeside (ONLY) |

Any type currently defined locally in a consumer repo that matches an extraction candidate here MUST be replaced by the hounfour canonical version once extracted.
