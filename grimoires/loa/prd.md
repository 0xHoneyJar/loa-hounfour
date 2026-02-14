# PRD: loa-hounfour v4.4.0 — The Agent Economy Release

**Status:** Draft
**Author:** Agent (from Bridgebuilder Grand Synthesis + ECSA Framework Analysis)
**Date:** 2026-02-14
**Sources:**
- [Product Mission — Launch Readiness RFC](https://github.com/0xHoneyJar/loa-finn/issues/66)
- [Hounfour RFC — Multi-Model Provider Abstraction](https://github.com/0xHoneyJar/loa-finn/issues/31)
- [Bridgebuilder Persona](https://github.com/0xHoneyJar/loa-finn/issues/24)
- [Arrakis Billing RFC — Path to Revenue](https://github.com/0xHoneyJar/arrakis/issues/62)
- [ECSA Postcapitalist Framework](https://postcapitalist.agency/)
- [Arrakis Agent Economy Discussion](https://github.com/0xHoneyJar/arrakis/issues/62)
- Bridgebuilder Deep Review Parts 1–10 (PR #1 comments 41–50)
- V4-PLANNING.md (existing forward-looking proposals)
- SCHEMA-EVOLUTION.md (evolution strategy)

---

## 1. Executive Summary

loa-hounfour is the shared protocol contract package (`@0xhoneyjar/loa-hounfour`) that defines the canonical type schemas, validators, vocabulary, and integrity primitives consumed by loa-finn (inference engine), arrakis (gateway), and mibera-freeside (smart contracts).

**v3.2.0** (current) provides a production-ready protocol for the Phase 1 Consumer MVP: agent identity, lifecycle, billing with multi-party attribution, conversations with access policies, transfers with choreography, domain events with saga context, capability negotiation, protocol discovery, health status, thinking traces, and tool calls. 447 tests across 27 suites. 27 generated JSON schemas. 4-language golden vector runners.

**v4.4.0** extends the protocol from a **Transaction Economy** (who pays for what) to a **Value Economy** (who creates what value, and how is it recognized). This is the architectural foundation for the agent economy described in the Hounfour RFC and the postcapitalist economic framework.

The version number v4.4.0 carries cultural significance within the mibera ecosystem — "meme maff" resonating with the community's identity. The four-four symmetry represents the balanced duality at the heart of the protocol: strict safety for financial schemas, permissive extensibility for event envelopes; cost attribution for consumption, value attribution for creation.

### Version Journey: v3.2.0 → v4.4.0

| Version | Codename | Focus |
|---------|----------|-------|
| **v4.0.0** | The Breaking Foundation | Signed MicroUSD default, envelope relaxation, MIN_SUPPORTED bump |
| **v4.1.0** | The Performance Layer | PerformanceRecord, outcome tracking, contribution records |
| **v4.2.0** | The Governance Layer | Graduated sanctions, dispute resolution, validated outcomes |
| **v4.3.0** | The Reputation Layer | Reputation scoring, agent-as-recipient, routing constraints |
| **v4.4.0** | The Agent Economy | Escrow, staking primitives, commons dividends, mutual credit |

Each minor version is independently shippable and useful. v4.0.0 alone unblocks the product launch with cleaner financial semantics. v4.4.0 completes the vision.

---

## 2. Problem Statement

### The Three Economies Gap

Every multi-agent system operates three economies simultaneously. loa-hounfour v3.2.0 models 1.5 of them:

| Economy | Description | v3.2.0 Coverage | v4.4.0 Target |
|---------|-------------|-----------------|---------------|
| **Attention Economy** | Who gets to speak? Model routing, capability gating, health-aware scheduling | **Strong** — RoutingPolicy, CapabilitySchema, HealthStatus, pool system | Strengthen with RoutingConstraint |
| **Transaction Economy** | Who pays for what? Cost tracking, allocation, settlement | **Strong** — BillingEntry, CreditNote, allocateRecipients, MicroUSD | Complete with signed default, escrow |
| **Value Economy** | Who creates what value? Outcomes, reputation, governance, investment | **Absent** — No outcome tracking, no reputation, no contribution records, no staking | **Full implementation** |

### Why the Value Economy Matters Now

The [product mission](https://github.com/0xHoneyJar/loa-finn/issues/66) describes post-launch capabilities that cannot exist without value economy primitives:

| Product Feature | Required Protocol Primitive |
|----------------|---------------------------|
| Soul Memory | PerformanceRecord (tracks what agent learned from interactions) |
| Personality Evolution | ReputationScore (measures quality over time) |
| Inter-NFT Communication | MutualCredit (agents extending trust to each other) |
| Community Credit System | CommonsDividend (community value pools from arrakis#62) |
| Escrow for Marketplace | EscrowEntry (hold-and-release financial flows) |
| Agent Compensation | Agent-as-BillingRecipient (agents can receive value, not just incur costs) |

### Why v4.4.0 Specifically

1. **Cultural resonance**: "4.4" is meme maff in the mibera religion — launching the Hounfour publicly at this version number creates a cultural moment
2. **Architectural completeness**: v4.4.0 represents the transition from "protocol for transactions" to "protocol for communities" — a meaningful versioning milestone
3. **Competitive timing**: No other multi-model protocol has financial attribution + value economy primitives. Shipping v4.4.0 before the Cambrian Threshold (Part 5 of Bridgebuilder review) establishes the vocabulary standard
4. **Launch compatibility**: v4.0.0 breaking changes are backwards-compatible with v3.2.0 data (signed MicroUSD accepts unsigned values; envelope relaxation is additive). Launch can pin at v4.0.0 and consumers upgrade incrementally through v4.1–v4.4

> Sources: Bridgebuilder Deep Review Parts 1–10 (PR #1), V4-PLANNING.md, ECSA postcapitalist.agency, arrakis#62

---

## 3. Goals & Success Metrics

### Goals

| # | Goal | Measure |
|---|------|---------|
| G1 | Ship v4.0.0 breaking changes that clean up financial semantics for launch | Signed MicroUSD default, envelope relaxation, MIN_SUPPORTED 3.0.0 |
| G2 | Introduce the Value Economy layer — outcome tracking and contribution records | PerformanceRecord and ContributionRecord schemas with golden vectors |
| G3 | Implement Ostrom-aligned governance primitives | Graduated sanctions (5 levels), dispute resolution, validated outcomes |
| G4 | Build reputation infrastructure for agent quality signals | ReputationScore, agent-as-BillingRecipient, RoutingConstraint |
| G5 | Ship escrow and commons dividend primitives for the agent economy | EscrowEntry, CommonsDividend, StakePosition schemas |
| G6 | Achieve Level 4 test epistemology — temporal and economic property testing | Event sequence validation, trial balance tests, cross-runner equivalence CI |
| G7 | Maintain launch compatibility — v4.0.0 must not block Phase 1 Consumer MVP | All v3.2.0 data remains valid under v4.0.0 schemas |
| G8 | Reach v4.4.0 as the public launch version of the Hounfour protocol | Cultural milestone aligned with mibera identity |

### Success Metrics

| Metric | Target |
|--------|--------|
| Test count | 600+ (up from 447) |
| Schema count | 40+ (up from 27) |
| Test epistemology level | L4 (temporal + economic property tests) |
| Cross-runner equivalence | All 4 runners agree on 100% of vectors |
| Golden vector count | 30+ files (up from 19) |
| v4.0.0 backward compatibility | 100% of v3.2.0 valid payloads accepted |
| Consumer upgrade time | <1 day per consumer (loa-finn, arrakis) |

### Milestones

| Milestone | Version | Deliverables |
|-----------|---------|-------------|
| Breaking Foundation | v4.0.0 | Signed MicroUSD, envelope relaxation, MIN_SUPPORTED 3.0.0, RoutingConstraint |
| Performance Layer | v4.1.0 | PerformanceRecord, ContributionRecord, outcome tracking |
| Governance Layer | v4.2.0 | SanctionSchema, DisputeRecord, ValidatedOutcome |
| Reputation Layer | v4.3.0 | ReputationScore, agent-as-BillingRecipient, routing integration |
| Agent Economy | v4.4.0 | EscrowEntry, StakePosition, CommonsDividend, MutualCredit |

---

## 4. User & Stakeholder Context

### Primary Users (Downstream Developers)

| User | Repo | v4.4.0 Impact |
|------|------|--------------|
| **loa-finn developer** | loa-finn | Routing constraints, performance tracking, escrow lifecycle, reputation queries |
| **arrakis developer** | arrakis | Credit system integration (CommonsDividend), community governance UI, reputation display |
| **mibera-freeside developer** | mibera-freeside | Staking primitives for on-chain agent economy, escrow smart contracts |

### New Stakeholders (v4.4.0)

| Stakeholder | Interest |
|-------------|----------|
| **Community creators** | Revenue from agent performances via dividends (private + commons) |
| **Community moderators** | Governance tools — sanctions, dispute resolution, validated outcomes |
| **Agent economists** | Fair value attribution, Shapley value computation, escrow mechanisms |
| **Mibera cultural community** | v4.4.0 as the canonical meme maff release |

### User Stories

**US1:** As a loa-finn developer, I need `RoutingConstraint` so I can compose access, capability, cost, and health signals into a single routing decision without consulting 4 separate subsystems.

**US2:** As an arrakis developer, I need `PerformanceRecord` so I can track both what an agent *produced* (output) and what value it *created* (outcome) for the community credit system.

**US3:** As a community moderator, I need `SanctionSchema` with graduated severity levels so I can apply proportional responses to agent policy violations (warning → rate-limit → restrict → suspend → terminate).

**US4:** As a loa-finn developer, I need `EscrowEntry` so I can implement hold-and-release financial flows for marketplace transactions where payment must be held until performance is validated.

**US5:** As a mibera-freeside developer, I need `StakePosition` so I can implement on-chain reciprocal staking — users investing conviction in agents and earning dividends from validated performances.

**US6:** As a loa-finn developer, I need `ReputationScore` so I can factor agent quality history into routing decisions — higher-reputation agents get priority for quality-sensitive tasks.

**US7:** As an arrakis developer, I need `CommonsDividend` so I can implement community value pools where validated agent performances generate collective returns distributed by governance rules.

**US8:** As a loa-finn developer, I need `MutualCredit` so I can implement agent-to-agent delegation where Agent A can extend credit to Agent B for multi-step sagas, with settlement via reciprocal performance.

**US9:** As a protocol consumer, I need temporal property tests so I can verify that random sequences of domain events never violate lifecycle or choreography invariants — catching bugs that unit tests miss.

**US10:** As an arrakis developer, I need `DisputeRecord` so I can implement non-financial conflict resolution — handling quality complaints, safety concerns, and ownership disputes with evidence trails.

> Sources: Bridgebuilder Parts 2 (RoutingConstraint), 3 (Escrow, Compensation), 4 (Temporal Testing), 7 (PerformanceRecord, StakePosition), 8 (MutualCredit, CommonsDividend), 9 (Ostrom Sanctions, Disputes)

---

## 5. Functional Requirements

### Phase 1: v4.0.0 — The Breaking Foundation

#### FR1: Signed MicroUSD as Default

**Priority:** P0 — Breaking change, clean financial semantics

Current `MicroUSD` pattern: `^[0-9]+$` (unsigned only)
New `MicroUSD` pattern: `^-?[0-9]+$` (signed, accepts negative for credits/refunds)

Rename current unsigned type to `MicroUSDUnsigned` for explicit non-negative enforcement.

| Field | v3.x Type | v4.0.0 Type |
|-------|-----------|-------------|
| `BillingEntry.raw_cost_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| `BillingEntry.total_cost_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| `CreditNote.amount_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |
| `BillingRecipient.amount_micro` | `MicroUSD` (unsigned) | `MicroUSD` (signed) |

**Migration**: Existing unsigned values are valid signed values. Consumer regex validators on `^[0-9]+$` need updating.

**Rationale**: Every mature billing system (Stripe, Square, Adyen) uses signed amounts. Unsigned was a premature constraint.

> Source: V4-PLANNING.md, Bridgebuilder Part 3

#### FR2: Selective Envelope Relaxation

**Priority:** P0 — Forward compatibility for ecosystem growth

| Schema Category | v3.x | v4.0.0 |
|----------------|------|--------|
| Event envelopes (DomainEvent, DomainEventBatch, StreamEvent variants) | `additionalProperties: false` | `additionalProperties: true` |
| Financial schemas (BillingEntry, CreditNote, BillingRecipient) | `false` | `false` (unchanged) |
| Identity schemas (AgentDescriptor, NftId) | `false` | `false` (unchanged) |
| Transfer schemas (TransferSpec) | `false` | `false` (unchanged) |
| Query schemas (CapabilityQuery) | `true` | `true` (unchanged) |

**Rationale**: Allows event consumers to add metadata fields without breaking downstream validators. Financial and identity schemas remain strict for security.

> Source: SCHEMA-EVOLUTION.md, Bridgebuilder Part 5 (Cambrian Threshold analysis)

#### FR3: MIN_SUPPORTED_VERSION Bump

**Priority:** P0 — Drop v2.x support

`MIN_SUPPORTED_VERSION` changes from `'2.4.0'` to `'3.0.0'`.

| Version Range | v3.x Support | v4.0.0 Support |
|---------------|-------------|----------------|
| v2.0.0–v2.3.0 | Rejected | Rejected |
| v2.4.0 | Supported (with warning) | **Rejected** |
| v3.0.0+ | Supported | Supported |
| v4.0.0+ | — | Supported |

**Rationale**: All consumers should be on v3.x by launch. Three major versions of support window is generous.

> Source: V4-PLANNING.md

#### FR4: RoutingConstraint Schema

**Priority:** P1 — Unifies routing signals for multi-model orchestration

```typescript
interface RoutingConstraint {
  required_capabilities?: string[];
  max_cost_micro?: MicroUSD;
  min_health?: 'healthy' | 'degraded';
  allowed_providers?: string[];
  trust_level?: 'platform' | 'byok' | 'delegated';
  min_reputation?: number;           // 0-1, links to ReputationScore (v4.3.0)
  contract_version: string;
}
```

**Rationale**: The Hounfour RFC's ModelPort interface needs a single schema to evaluate routing decisions against, rather than consulting 4 separate subsystems (access, capability, cost, health).

> Source: Bridgebuilder Part 2 (BB-GRAND-001)

### Phase 2: v4.1.0 — The Performance Layer

#### FR5: PerformanceRecord Schema

**Priority:** P0 — Core value economy primitive

```typescript
interface PerformanceRecord {
  performance_id: string;               // UUID
  agent_id: string;
  conversation_id: string;

  // OUTPUT: what was produced (links to existing billing)
  billing_entry_id: string;
  tokens_consumed: MicroUSD;
  model_used: string;

  // OUTCOME: what value was created (NEW)
  outcome: {
    user_rating?: number;               // 0-5
    resolution_signal?: boolean;        // Did this resolve the user's need?
    amplification_count?: number;       // Shares/references by others
    outcome_validated: boolean;
    validated_by?: string[];            // Agent IDs or user IDs who validated
  };

  // DIVIDEND: how value flows from this performance
  dividend_target: 'private' | 'commons' | 'mixed';
  dividend_split_bps?: number;          // 0-10000, share going to commons

  occurred_at: string;                  // ISO datetime
  contract_version: string;
}
```

**ECSA parallel**: "Performance" — a socially validated productive act. Distinguishes outputs (recorded on ledger) from outcomes (socially validated effects).

**Invariants:**
- `billing_entry_id` must reference an existing BillingEntry
- `dividend_split_bps` required when `dividend_target` is `'mixed'`
- `outcome.user_rating` must be in [0, 5]
- `outcome.amplification_count` must be non-negative

> Source: Bridgebuilder Part 7 (BB-POST-002), ECSA Performance framework

#### FR6: ContributionRecord Schema

**Priority:** P1 — Tracks non-financial contributions (Ostrom Principle 2)

```typescript
interface ContributionRecord {
  contribution_id: string;              // UUID
  contributor_id: string;
  contribution_type: 'curation' | 'training' | 'validation'
                   | 'moderation' | 'infrastructure' | 'capital';
  value_micro: MicroUSD;               // Assessed value
  community_id?: string;
  assessed_by: 'self' | 'peer' | 'algorithmic' | 'governance_vote';
  occurred_at: string;
  contract_version: string;
}
```

**Ostrom parallel**: Principle 2 — Congruence between appropriation and provision rules. What you take out should be proportional to what you put in.

> Source: Bridgebuilder Part 9 (Ostrom P2)

### Phase 3: v4.2.0 — The Governance Layer

#### FR7: SanctionSchema (Graduated Sanctions)

**Priority:** P0 — Ostrom Principle 5

```typescript
interface Sanction {
  sanction_id: string;                  // UUID
  agent_id: string;
  severity: 'warning' | 'rate_limited' | 'pool_restricted'
          | 'suspended' | 'terminated';
  trigger: {
    violation_type: string;
    occurrence_count: number;           // >= 1
    evidence_event_ids: string[];
  };
  imposed_by: 'automatic' | 'moderator' | 'governance_vote';
  appeal_available: boolean;
  imposed_at: string;
  expires_at?: string;                  // Null for permanent sanctions
  contract_version: string;
}
```

**Lifecycle integration**: `severity: 'suspended'` triggers `active → suspended` lifecycle transition. The sanction provides the reason and evidence that lifecycle guards check.

**Rationale**: Current `GuardSeverity` has only 2 levels (client_error, policy_violation). Effective commons governance requires graduated responses — Ostrom's research shows this is critical for long-lived communities.

> Source: Bridgebuilder Part 9 (Ostrom P5, BB-POST-003)

#### FR8: DisputeRecord Schema

**Priority:** P1 — Non-financial conflict resolution (Ostrom Principle 6)

```typescript
interface DisputeRecord {
  dispute_id: string;                   // UUID
  dispute_type: 'quality' | 'safety' | 'billing' | 'ownership' | 'personality';
  complainant_id: string;
  respondent_id: string;                // Can be agent_id or owner_id
  evidence: Array<{
    event_id: string;
    description: string;
  }>;
  resolution?: {
    outcome: 'upheld' | 'dismissed' | 'compromised';
    sanction_id?: string;              // Links to SanctionSchema
    credit_note_id?: string;           // Links to CreditNote for financial resolution
    resolved_by: string;
    resolved_at: string;
  };
  filed_at: string;
  contract_version: string;
}
```

**Rationale**: Current protocol handles financial disputes (CreditNote) but not operational disputes (quality complaints, safety concerns, personality changes). Communities need both.

> Source: Bridgebuilder Part 9 (Ostrom P6, BB-POST-004)

#### FR9: ValidatedOutcome Schema

**Priority:** P1 — Staked quality validation

```typescript
interface ValidatedOutcome {
  outcome_id: string;                   // UUID
  performance_id: string;              // Links to PerformanceRecord
  validator_id: string;
  validator_stake_micro: MicroUSD;     // Skin in the game
  rating: number;                       // 0-5
  rationale?: string;
  disputed: boolean;
  dispute_outcome?: 'upheld' | 'overturned' | 'split';
  validated_at: string;
  contract_version: string;
}
```

**ECSA parallel**: Outcome validation where validators stake on their assessments. If community disagrees, validator's stake is at risk.

> Source: Bridgebuilder Part 9 (Ostrom P4)

### Phase 4: v4.3.0 — The Reputation Layer

#### FR10: ReputationScore Schema

**Priority:** P0 — Agent quality signal for routing

```typescript
interface ReputationScore {
  agent_id: string;
  score: number;                        // 0-1 normalized
  components: {
    outcome_quality: number;            // 0-1, from ValidatedOutcome ratings
    performance_consistency: number;    // 0-1, variance in performance quality
    dispute_ratio: number;              // 0-1, fraction of disputes vs performances
    community_standing: number;         // 0-1, from community governance signals
  };
  sample_size: number;                  // Number of performances scored
  last_updated: string;
  decay_applied: boolean;               // Time-based score decay
  contract_version: string;
}
```

**Integration**: `RoutingConstraint.min_reputation` (FR4) references this schema. Higher-reputation agents get priority for quality-sensitive tasks.

> Source: Bridgebuilder Part 10 (BB-POST-001)

#### FR11: Agent-as-BillingRecipient

**Priority:** P1 — Agents can receive value, not just incur costs

Extend `BillingRecipient.role` union:

```typescript
type BillingRecipientRole = 'provider' | 'platform' | 'producer' | 'agent_tba'
                          | 'agent_performer'  // NEW: agent receives performance dividend
                          | 'commons';         // NEW: community pool receives dividend
```

**Rationale**: Currently, recipients are implicitly human-owned accounts. Agent performers and community commons need to be first-class recipients.

> Source: Bridgebuilder Part 10 (BB-POST-006)

### Phase 5: v4.4.0 — The Agent Economy

#### FR12: EscrowEntry Schema

**Priority:** P0 — Hold-and-release financial flows

```typescript
interface EscrowEntry {
  escrow_id: string;                    // UUID
  billing_entry_id: string;            // Links to original charge
  amount_micro: MicroUSD;
  state: 'held' | 'released' | 'disputed' | 'refunded' | 'expired';
  hold_until: string;                   // ISO datetime
  release_conditions?: string[];
  released_at?: string;
  contract_version: string;
}
```

**Design decision**: Escrow as separate entity (not billing lifecycle state). Rationale: escrow can outlive its originating conversation, multiple billing entries might fund a single escrow, and escrow disputes need their own audit trail.

> Source: Bridgebuilder Part 3, arrakis#62

#### FR13: StakePosition Schema (Experimental)

**Priority:** P1 — Reciprocal investment primitive

```typescript
interface StakePosition {
  stake_id: string;                     // UUID
  staker_id: string;                   // Human or agent
  performer_id: string;                // Agent being staked in
  amount_micro: MicroUSD;
  stake_type: 'conviction' | 'delegation' | 'validation';
  vesting: {
    schedule: 'immediate' | 'performance_gated' | 'time_gated';
    vested_micro: MicroUSD;
    remaining_micro: MicroUSD;
  };
  created_at: string;
  contract_version: string;
}
```

**ECSA parallel**: "Stake Token" — mutual belief in future performance. Unlike traditional investment (I buy shares), this is reciprocal recognition (I believe in your future performances).

**x-experimental: true** — Schema stability not guaranteed until validated by real usage.

> Source: Bridgebuilder Part 8, ECSA Stake Token framework

#### FR14: CommonsDividend Schema (Experimental)

**Priority:** P1 — Community value pools

```typescript
interface CommonsDividend {
  dividend_id: string;                  // UUID
  community_id: string;
  source_performance_id: string;       // Links to PerformanceRecord
  amount_micro: MicroUSD;
  governance: 'mod_discretion' | 'member_vote' | 'algorithmic' | 'stake_weighted';
  distribution?: {
    distributed_at: string;
    recipients: BillingRecipient[];
    method: string;
  };
  issued_at: string;
  contract_version: string;
}
```

**Ostrom parallel**: Common-pool resource with defined governance. The governance field determines how commons dividends are allocated — matching Ostrom's Principle 3 (collective-choice arrangements).

> Source: Bridgebuilder Part 8-9, ECSA Synthetic Commons, arrakis#62

#### FR15: MutualCredit Schema (Experimental)

**Priority:** P2 — Agent-to-agent obligations

```typescript
interface MutualCredit {
  credit_id: string;                    // UUID
  issuer_id: string;                   // Who extends credit
  receiver_id: string;                 // Who receives credit
  amount_micro: MicroUSDSigned;        // Signed — positive or negative
  credit_type: 'refund' | 'prepayment' | 'obligation' | 'delegation';
  settlement: {
    due_at?: string;
    settled: boolean;
    settled_at?: string;
    settlement_method?: 'direct_payment' | 'reciprocal_performance'
                      | 'commons_contribution' | 'forgiven';
  };
  contract_version: string;
}
```

**Graeber parallel**: "Debt: The First 5,000 Years" — credit and obligation preceded barter and money. The `settlement_method: 'reciprocal_performance'` enables agents to settle debts through validated work rather than money.

> Source: Bridgebuilder Part 8, ECSA Distributed Credit, Graeber

---

## 6. Technical Requirements

### TR1: Test Epistemology Level 4

Extend the test suite to cover 4 epistemological layers:

| Level | Name | Current | v4.4.0 Target |
|-------|------|---------|---------------|
| L0 | Structural (schema validation) | Complete (125 checks, 4 languages) | Maintain |
| L1 | Behavioral (property tests) | Strong (20 properties, 1000 iterations) | Expand to new schemas |
| L2 | Temporal (event sequence validation) | **Gap** | **NEW: random event sequence property tests** |
| L3 | Economic (financial flow conservation) | **Gap** | **NEW: trial balance and multi-step flow tests** |
| L4 | Interop (cross-runner equivalence) | Partial (golden vectors, no round-trip) | **NEW: CI step diffing all 4 runners** |

**Temporal property testing** (L2):

```typescript
fc.assert(
  fc.property(
    fc.array(domainEventArb, { minLength: 2, maxLength: 20 }),
    (events) => {
      const state = new ProtocolStateTracker();
      for (const event of events) {
        const result = state.apply(event);
        expect(result.applied || VALID_REJECTION_REASONS.includes(result.reason)).toBe(true);
      }
      expect(state.isConsistent()).toBe(true);
    },
  ),
  { numRuns: 500 },
);
```

**Economic property testing** (L3):

```typescript
fc.assert(
  fc.property(
    fc.array(billingEventArb, { minLength: 1, maxLength: 50 }),
    (events) => {
      const ledger = new ProtocolLedger();
      for (const event of events) { ledger.record(event); }
      expect(ledger.trialBalance()).toBe(0n); // Money is conserved
    },
  ),
  { numRuns: 200 },
);
```

> Source: Bridgebuilder Part 4 (BB-GRAND-002, BB-GRAND-003)

### TR2: Cross-Runner Equivalence CI

Add a CI step that runs all 4 language runners (TS, Go, Python, Rust) against the same vector set and diffs the results. Any divergence fails the build.

> Source: Bridgebuilder Part 5 (BB-GRAND-004)

### TR3: Experimental Schema Marking

Schemas marked `x-experimental: true` in their JSON Schema output are explicitly unstable. Consumers must opt-in:

```typescript
// In schema generation
const schema = Type.Object({...}, {
  additionalProperties: false,
  'x-experimental': true,    // Flows through to JSON Schema
});
```

Experimental schemas: StakePosition, CommonsDividend, MutualCredit.
Stable schemas: All others.

### TR4: Backward Compatibility for v4.0.0 Breaking Changes

| Change | Impact | Mitigation |
|--------|--------|------------|
| Signed MicroUSD | Consumer regex `^[0-9]+$` breaks | Migration guide with regex update |
| Envelope relaxation | Strict consumers reject new envelope fields | Strip-then-validate pattern (SCHEMA-EVOLUTION.md) |
| MIN_SUPPORTED bump | v2.4.0 consumers rejected | All consumers should be on v3.x by launch |

**Critical invariant**: All v3.2.0 valid payloads MUST be accepted by v4.0.0 schemas. The breaking changes affect validation rules, not data shapes.

### TR5: Schema Vocabulary Extensions

New vocabulary files for the value economy:

| File | Contents |
|------|----------|
| `src/vocabulary/sanctions.ts` | Graduated severity levels, violation types |
| `src/vocabulary/reputation.ts` | Reputation component weights, decay parameters |
| `src/vocabulary/economic-choreography.ts` | Staking/unstaking ceremony step sequences |

### TR6: Economic Choreography

Extend `TRANSFER_CHOREOGRAPHY` vocabulary pattern for economic ceremonies:

```typescript
const ECONOMIC_CHOREOGRAPHY = {
  stake: {
    forward: ['stake_offered', 'stake_accepted', 'performance_began',
              'output_recorded', 'outcome_validated', 'dividend_issued'],
    invariants: [
      { description: 'Staker and performer must be different entities' },
      { description: 'Stake amount must not exceed staker balance' },
      { description: 'Dividend cannot issue before outcome validation' },
    ],
  },
  escrow: {
    forward: ['funds_held', 'conditions_met', 'funds_released'],
    invariants: [
      { description: 'Release requires all conditions met or expiry' },
      { description: 'Disputed escrow cannot be released without resolution' },
    ],
  },
} as const;
```

> Source: Bridgebuilder Part 8

---

## 7. Non-Functional Requirements

| Requirement | Target | Rationale |
|-------------|--------|-----------|
| Bundle size | <60KB gzipped (up from 50KB) | New schemas add ~10KB |
| Tree-shaking | ESM exports, side-effect-free | Consumers import selectively |
| Zero runtime deps | TypeBox is devDependency only | Compiled validators have no runtime deps |
| Node.js | >=22 | LTS alignment |
| TypeScript | Strict mode, no `any` | Type safety is the product |
| Validation perf | <1ms per schema validation | Hot path in request processing |
| Test count | 600+ | Level 4 epistemology requires more property tests |
| Schema descriptions | 100% coverage | SchemaStore integration requirement |

---

## 8. Scope & Prioritization

### In Scope

| Version | Deliverables | Priority |
|---------|-------------|----------|
| **v4.0.0** | Signed MicroUSD, envelope relaxation, MIN_SUPPORTED 3.0.0, RoutingConstraint | P0 — Launch enabler |
| **v4.1.0** | PerformanceRecord, ContributionRecord, outcome tracking | P0 — Value economy foundation |
| **v4.2.0** | SanctionSchema, DisputeRecord, ValidatedOutcome | P1 — Governance layer |
| **v4.3.0** | ReputationScore, agent-as-recipient, routing integration | P1 — Quality signals |
| **v4.4.0** | EscrowEntry, StakePosition, CommonsDividend, MutualCredit | P1 — Agent economy |

### Explicitly Out of Scope

| Item | Reason | Revisit |
|------|--------|---------|
| GovernanceProposal schema | Requires Cambrian Threshold (>5 uncoordinated consumers) | v5.0.0+ |
| AutonomousBudget schema | Agent self-management is post-product-market-fit | v5.0.0+ |
| PricingSpread (bid-ask negotiation) | Dynamic pricing is ECSA v2 complexity | v6.0.0+ |
| ValueDenomination (multi-unit accounting) | Single currency (MicroUSD) sufficient for now | v6.0.0+ |
| Protocol Buffers encoding | JSON-first sufficient for current scale | v5.0.0+ |
| GraphQL schema generation | Insufficient consumer demand | v5.0.0+ |

---

## 9. Risks & Dependencies

### Risks

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| v4.0.0 breaking changes delay launch | Low | High | v3.2.0 is already launch-ready; v4.0.0 is launch-enabling, not launch-blocking |
| Experimental schemas (StakePosition, etc.) create false API stability expectations | Medium | Medium | `x-experimental: true` marking + documentation |
| Level 4 testing (temporal/economic) is technically complex | Medium | Low | Property testing infrastructure exists; complexity is in arbitraries, not framework |
| Agent economy schemas are speculative — may need revision | High | Medium | Ship as experimental; don't promise stability until real usage |
| Consumer upgrade fatigue (v3.2.0 → v4.4.0 in rapid succession) | Medium | Medium | Each minor is independently shippable; consumers upgrade incrementally |

### Dependencies

| Dependency | Type | Status |
|------------|------|--------|
| TypeBox ^0.34 | Dev dependency | Installed |
| fast-check ^4.5 | Dev dependency | Installed (property testing) |
| jose ^6.1 | Dev dependency | Installed |
| arrakis#62 credit system | External — CommonsDividend integration | RFC drafted |
| loa-finn#66 Phase 1 launch | External — v4.0.0 must not block | v3.2.0 is fallback |
| loa-finn#31 Hounfour RFC | External — RoutingConstraint integration | 93% complete |
| ECSA postcapitalist.agency | Research reference | Conceptual |

---

## 10. Theoretical Foundations

This section documents the economic and governance research informing the v4.4.0 design. Included per Bridgebuilder review recommendation for decision documentation.

### Economic Theories Applied

| Theory | Author(s) | Protocol Application |
|--------|-----------|---------------------|
| **Mechanism Design** | Hurwicz, Maskin, Myerson (Nobel 2007) | BillingRecipient share_bps as mechanism; PerformanceRecord outcome validation as truthful reporting incentive |
| **Two-Sided Markets** | Rochet & Tirole (Nobel 2014) | Platform as two-sided market (creators + users); protocol controls pricing vocabulary |
| **Commons Governance** | Ostrom (Nobel 2009) | 8 design principles mapped to protocol schemas (Bridgebuilder Part 9) |
| **Fair Division** | Shapley (Nobel 2012) | SagaValueAttribution with Shapley values for multi-model contribution splitting |
| **Debt as Social Fabric** | Graeber | MutualCredit with reciprocal performance settlement |
| **Commodities by Means of Commodities** | Sraffa | Multi-model saga value attribution — outputs produced by chains of agent outputs |
| **Postcapitalist Expression** | ECSA | Three-token architecture (stake, commodity, liquidity) mapped to protocol schemas |

### Ostrom Compliance Scorecard (v4.4.0 Target)

| Principle | v3.2.0 | v4.4.0 Target |
|-----------|--------|---------------|
| 1. Boundaries | Complete | Maintained |
| 2. Proportionality | Partial | **Complete** (ContributionRecord) |
| 3. Collective choice | Not yet needed | Future (post-Cambrian) |
| 4. Monitoring | Strong | **Enhanced** (ValidatedOutcome) |
| 5. Graduated sanctions | Minimal (2 levels) | **Complete** (5 levels) |
| 6. Conflict resolution | Financial only | **Complete** (DisputeRecord) |
| 7. Self-governance | Implicit | Maintained |
| 8. Nested enterprises | Strong (3-repo) | Maintained |

---

## 11. Open Questions

| # | Question | Owner | Impact |
|---|----------|-------|--------|
| OQ1 | Should `PerformanceRecord.outcome.user_rating` use 0-5 stars or 0-1 continuous? | Product | Affects reputation computation |
| OQ2 | Should `StakePosition` be protocol-level (loa-hounfour) or chain-level (mibera-freeside)? | Architecture | Affects where staking logic lives |
| OQ3 | How should `CommonsDividend.governance` interact with arrakis community governance? | Arrakis team | Integration design |
| OQ4 | Should experimental schemas be in a separate npm export path (e.g., `@0xhoneyjar/loa-hounfour/experimental`)? | Engineering | Affects consumer import patterns |
| OQ5 | How should `ReputationScore.decay_applied` work? Time-based? Activity-based? Both? | Product | Affects score computation |
| OQ6 | Should `MutualCredit.settlement_method: 'reciprocal_performance'` require a linked PerformanceRecord? | Architecture | Affects settlement validation |
| OQ7 | Is 5-level graduated sanctions sufficient, or should severity be a continuous scale? | Governance | Affects SanctionSchema design |

---

## 12. Appendices

### A. Version History Context

| Version | Cycle | Codename | Key Achievement |
|---------|-------|----------|----------------|
| v1.1.0 | — | Foundation | JWT, streaming, routing, 91 vectors |
| v2.0.0 | 001 | Protocol Types | Agent identity, billing, conversations |
| v2.1.0 | 002 | Excellence Refinements | Lifecycle payloads, credit notes, decision trails |
| v2.2.0 | 003 | Deep Excellence | Saga context, capability negotiation, discovery |
| v2.3.0 | 004 | Resilience & Completeness | Transfer choreography, schema evolution strategy |
| v2.4.0 | 005 | Protocol Maturity | Guard architecture, financial safety, multi-model topology |
| v3.0.0 | 005 | The Sovereignty Release | Access policies, breaking changes, constitutional rights |
| v3.1.0 | 006 | Hounfour Protocol Types | HealthStatus, ThinkingTrace, ToolCall, validation hardening |
| v3.2.0 | 006 | Ecosystem Maturity | Signed arithmetic, credit validation, property testing |
| **v4.0.0–v4.4.0** | **007** | **The Agent Economy** | **Value economy, governance, reputation, staking** |

### B. Bridgebuilder Findings Integrated

| Finding ID | Source | Integrated As |
|-----------|--------|---------------|
| BB-GRAND-001 | Part 2 | FR4: RoutingConstraint |
| BB-GRAND-002 | Part 4 | TR1: Temporal property tests |
| BB-GRAND-003 | Part 4 | TR1: Economic property tests |
| BB-GRAND-004 | Part 5 | TR2: Cross-runner equivalence CI |
| BB-POST-001 | Part 10 | FR10: ReputationScore |
| BB-POST-002 | Part 10 | FR5: PerformanceRecord |
| BB-POST-003 | Part 10 | FR7: SanctionSchema |
| BB-POST-004 | Part 10 | FR8: DisputeRecord |
| BB-POST-005 | Part 10 | FR6: ContributionRecord |
| BB-POST-006 | Part 10 | FR11: Agent-as-BillingRecipient |
| BB-POST-007 | Part 10 | FR13/FR14/FR15: Staking + Credit |

### C. ECSA Concepts Mapped to Schemas

| ECSA Concept | Schema |
|-------------|--------|
| Stake Token | StakePosition |
| Commodity Token | PerformanceRecord (output dimension) |
| Liquidity Token | MicroUSD (universal denomination) |
| Performance | PerformanceRecord |
| Outcome Validation | ValidatedOutcome |
| Synthetic Commons | CommonsDividend |
| Distributed Credit | MutualCredit |
| Graduated Sanctions | SanctionSchema |
| Performance Indices | ReputationScore.components |

### D. Competitive Context Update

| Capability | loa-hounfour v3.2.0 | v4.4.0 | Vercel AI SDK | LiteLLM | MCP | A2A (Google) |
|-----------|---------------------|--------|---------------|---------|-----|-------------|
| Multi-party billing | Yes | Yes | No | No | No | No |
| Cost attribution | Yes | Yes | No | No | No | No |
| Value attribution | No | **Yes** | No | No | No | No |
| Reputation | No | **Yes** | No | No | No | No |
| Escrow | No | **Yes** | No | No | No | No |
| Commons governance | No | **Yes** | No | No | No | No |
| Agent staking | No | **Yes** | No | No | No | No |
| Cross-language vectors | 4 languages | 4 languages | No | No | No | No |
| Graduated sanctions | No | **Yes** | No | No | No | No |

No other multi-model protocol offers financial + value economy primitives.
