# PRD: loa-hounfour v7.0.0 — The Coordination-Aware Protocol

**Status:** Draft
**Author:** Bridgebuilder (Field Report #42 — From Composition to Coordination)
**Date:** 2026-02-17
**Cycle:** cycle-016
**Version:** v7.0.0 (breaking — new coordination primitives, permission semantics, governance mechanisms)
**Sources:**
- [PR #14 — v6.0.0 Deep Review Part II: Critical Eye — 4 Structural Gaps](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — BridgeTransferSaga, DelegationOutcome, MonetaryPolicy, model-checking
- [PR #14 — v6.0.0 Deep Review Part III: The Cambrian Reading](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Protected variation, competition, permission gap
- [PR #14 — v6.0.0 Deep Review Part IV: Flourishing and What Comes Next](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — Level 7 capabilities, saga orchestration, MAY semantics
- [PR #14 — v6.0.0 Bridge Iterations 1-3](https://github.com/0xHoneyJar/loa-hounfour/pull/14) — 3 deferred LOW findings (F-007, F-008, F-020)
- [loa-finn #66 — Launch Readiness RFC](https://github.com/0xHoneyJar/loa-finn/issues/66) — Protocol convergence P0, hounfour extraction critical path
- [loa-finn #31 — Multi-Model Provider Abstraction RFC](https://github.com/0xHoneyJar/loa-finn/issues/31) — Pool routing, model coordination
- [loa-finn #24 — Bridgebuilder Persona](https://github.com/0xHoneyJar/loa-finn/issues/24) — Review methodology, educational depth
- [loa #247 — Flatline Alternatives: Meeting Geometries](https://github.com/0xHoneyJar/loa/issues/247) — Permission Gap analysis, Epistemic Tristate, MAY semantics
- [arrakis #62 — Billing & Payments RFC](https://github.com/0xHoneyJar/arrakis/issues/62) — Reserve/finalize, x402, cross-system settlement
- [Web4 — Social Monies Manifesto](https://meow.bio/web4.html) — "Monies, not money", community currencies
- Ostrom, "Governing the Commons" (1990) — Principles 3 (collective choice), 6 (conflict resolution)
- Garcia-Molina & Salem, "Sagas" (1987) — Compensating transactions for long-lived processes
- Castro & Liskov, "Practical Byzantine Fault Tolerance" (1999) — Consensus under partial trust
- Black Queen Hypothesis (Morris et al., 2012) — Obligate interdependence, dissent as survival mechanism

---

## 0. The Question Behind the Question

> "v6.0.0 proved economies can compose. v7.0.0 asks: **when composition fails, what happens?**"

v6.0.0 was the composition threshold. Registry bridges, delegation trees, minting policies, constraint type system, schema graph operations — all implemented, all tested, 3,504 tests passing, Bridgebuilder flatline achieved in 3 iterations. The protocol can express cross-economy relationships and concurrent delegation.

But the Deep Review (Parts II–IV) revealed that composition without coordination is structurally incomplete:

1. **Registry bridges define WHAT can cross boundaries, but not HOW.** `RegistryBridge` specifies exchange rate governance and bridge invariants, but there is no operation protocol — no saga, no compensation logic, no failure handling. When a cross-registry transfer partially fails (one side committed, the other rolled back), the protocol has no recovery path. This is the distributed systems equivalent of building a TCP header format without defining the three-way handshake. (Garcia-Molina & Salem, 1987)

2. **Delegation trees record consensus thresholds, but discard dissent.** `DelegationTreeNode.consensus_minimum` defines how many children must agree, but when they disagree, the minority opinion vanishes. In a Black Queen ecosystem where specialized models detect failure modes invisible to generalists, the dissenting voice may carry the most important signal. (Morris et al., 2012)

3. **Minting policies and conservation invariants live in separate universes.** `MintingPolicyConfig` governs how new tokens are created. `ConservationPropertyRegistry` governs how existing tokens are conserved. No constraint links them. A minting policy could violate every conservation principle and no evaluator builtin would notice. This is monetary policy without a central bank — creation disconnected from preservation. (The Fed's dual mandate analogy from Deep Review Part IV)

4. **Every constraint says MUST or MUST NOT. None says MAY.** 23 evaluator builtins, 32+ constraint files, all expressing prohibition semantics. The permission semantic — "this is explicitly permitted within these boundaries" — has no structural representation. Ostrom's work on commons governance shows that successful institutions need explicit participation rights alongside usage restrictions. The Permission Gap (loa #247) is not a nice-to-have; it is structurally necessary for community currencies that want to encourage experimentation within safety boundaries.

5. **Governed agents have no voice.** `governance_weight` exists but `GovernanceProposal` does not. Agents can be governed but cannot propose governance changes. This violates Ostrom's Principle 3 (collective-choice arrangements: most individuals affected by operational rules can participate in modifying them).

These five gaps share a common theme: **v6.0.0 built the nouns of composition (bridges, trees, policies) without the verbs of coordination (transfer, resolve, couple, permit, propose).** v7.0.0 adds the verbs.

### Why This Is a Stabilization Release

This might seem paradoxical — adding new schemas to stabilize — but the logic is direct:

- **loa-finn #66 identifies protocol convergence as the P0 launch blocker.** Arrakis has invented local versions of conservation invariants, JWT boundary specs, branded types, and entry type taxonomy. Hounfour must be the canonical source. But being canonical means being *complete* — a canonical source that defines bridge schemas without bridge transfer protocols forces arrakis to invent the transfer protocol locally, recreating the dependency inversion we're trying to fix.

- **"Stable" means "downstream consumers don't need to invent protocols that should be canonical."** Every gap in hounfour's coordination layer is a protocol arrakis or loa-finn will invent independently. Each independent invention is a future convergence debt. Better to define once, correctly, in the canonical source.

- **The deferred findings (F-007, F-008, F-020) are type safety issues** that, while LOW severity, represent exactly the kind of rough edge that erodes consumer confidence in a protocol definition layer.

The FAANG parallel: Kubernetes v1.0 shipped in July 2015 with an incomplete API (no RBAC, no CRDs, no admission webhooks). The "stable" label attracted consumers who then invented ad-hoc solutions for the gaps, creating a fragmented ecosystem that took years to converge. K8s learned: stable means complete enough that consumers don't need to go around you.

---

## 1. Problem Statement

### 1.1 What v6.0.0 Achieved

| Achievement | Evidence |
|------------|---------|
| 6 liveness properties with bounded temporal logic | `src/vocabulary/temporal-properties.ts` — LivenessProperty |
| Capability-scoped trust with 6 dimensions | `src/schemas/agent-identity.ts` — CapabilityScopedTrust |
| Constraint type system with CI-time validation | `src/constraints/type-checker.ts` — validateConstraintFile() |
| 4 schema graph operations | `src/graph/` — reachability, cycles, impact, topological sort |
| Registry composition with bridge invariants | `src/economy/registry-composition.ts` — RegistryBridge |
| DelegationTree with recursive tree validators | `src/governance/delegation-tree.ts` — DelegationTreeNode |
| 23 evaluator builtins with specs | `src/constraints/evaluator-spec.ts` — EVALUATOR_BUILTIN_SPECS |
| 87 schemas, 35+ constraint files | `schemas/index.json` |
| 3,504 tests across 140 files | All passing |

### 1.2 The Five Coordination Gaps

| # | Gap | What Exists | What's Missing |
|---|-----|-------------|----------------|
| 1 | Bridge without transfer | `RegistryBridge` (treaty structure) | `BridgeTransferSaga` (operation protocol with compensation) |
| 2 | Delegation without dissent | `DelegationTreeNode.consensus_minimum` | `DelegationOutcome` (recording unanimous, majority, deadlock, escalation) |
| 3 | Minting without conservation | `MintingPolicyConfig` + `ConservationPropertyRegistry` (independent) | `MonetaryPolicy` (coupling invariant binding creation to preservation) |
| 4 | Constraints without permission | 23 MUST/MUST_NOT builtins, 0 MAY | `PermissionBoundary` (explicit permission semantics) |
| 5 | Governance without voice | `governance_weight` field exists | `GovernanceProposal` (collective decision mechanism) |

### 1.3 Deferred Code Quality Issues

Three LOW-severity findings deferred from v6.0.0 bridge iterations:

| ID | Issue | File | Impact |
|----|-------|------|--------|
| F-007 | `as any` cast for `x-cross-field-validated` annotation | `src/economy/registry-composition.ts:140` | TypeBox type narrowing limitation; cast suppresses type safety |
| F-008 | `BridgeInvariant invariant_id` pattern `^B-\d{1,2}$` limits to B-99 | `src/economy/registry-composition.ts:36` | Only 4 canonical invariants now, but pattern limits future growth |
| F-020 | `parseExpr()` return cast to `any` in evaluator | `src/constraints/evaluator.ts` | Cross-cutting pattern; expression AST untyped at boundaries |

### 1.4 The Kernel Metaphor, Extended Again

| OS Kernel | v6.0.0 | v7.0.0 Addition |
|-----------|--------|-----------------|
| Process isolation | Capability-scoped trust | (complete) |
| Memory protection | Branded types | (complete) |
| System calls | JWT boundary | (complete) |
| Kernel invariants | Liveness + safety properties | (complete) |
| File system | Schema graph with operations | (complete) |
| IPC | Delegation trees | **Conflict resolution** (signal handling, deadlock detection) |
| Networking | Registry bridges | **Transfer protocol** (TCP handshake, not just packet format) |
| Kernel modules | Typed evaluator builtins | **Permission model** (capabilities, not just syscall table) |
| Monetary policy | Minting + conservation (separate) | **Central bank** (coupled policy with review triggers) |
| System governance | governance_weight | **Constitutional process** (amendment proposals, voting) |

v6.0.0 built the composable kernel. v7.0.0 gives it coordination primitives.

---

## 2. Goals & Success Metrics

### 2.1 Goals

1. **G1**: Resolve all deferred code quality findings (F-007, F-008, F-020)
2. **G2**: Define BridgeTransferSaga with saga pattern, compensation logic, and failure handling
3. **G3**: Add DelegationOutcome schema capturing unanimous, majority, deadlock, and escalation results
4. **G4**: Create MonetaryPolicy coupling minting policies to conservation invariants with governance review triggers
5. **G5**: Introduce PermissionBoundary schema and MAY constraint semantics alongside MUST/MUST_NOT
6. **G6**: Create GovernanceProposal schema enabling governed agents to propose and vote on changes
7. **G7**: Version bump to 7.0.0 with schema index update and conformance vectors

### 2.2 Success Metrics

| Metric | Target |
|--------|--------|
| Deferred findings resolved | 3/3 (F-007, F-008, F-020) |
| BridgeTransferSaga states | 6+ (initiated, reserving, transferring, compensating, settled, failed) |
| DelegationOutcome variants | 4 (unanimous, majority, deadlock, escalation) |
| MonetaryPolicy constraints | 3+ coupling minting to conservation |
| PermissionBoundary evaluator builtins | 2+ (permission_granted, within_boundary) |
| GovernanceProposal states | 4+ (proposed, voting, ratified, rejected) |
| New constraint files | 6+ |
| New evaluator builtins | 4+ |
| New tests | ~200 |
| Total tests passing | 3,504 + ~200 = ~3,700 |
| CONTRACT_VERSION | 7.0.0 |

---

## 3. User & Stakeholder Context

### 3.1 Primary Consumers

| Consumer | What They Need | Feature |
|----------|---------------|---------|
| **arrakis billing service** | Saga protocol for reserve→finalize→settle with compensation on failure | FR-2 |
| **loa-finn ensemble orchestrator** | Conflict resolution for multi-model delegation (recording which models agreed/dissented) | FR-3 |
| **arrakis credit system** | Coupling invariant ensuring minting doesn't violate conservation (required for x402 payments) | FR-4 |
| **Web4 community economies** | Permission boundaries enabling experimentation within safety constraints ("MAY mint up to X if conditions Y") | FR-5 |
| **Governance participants** | Proposal mechanism for modifying registry parameters (Ostrom Principle 3) | FR-6 |
| **All downstream consumers** | Clean type safety at protocol boundaries (no `as any` casts in canonical source) | FR-1 |

### 3.2 Breaking Changes

| Change | What Breaks | Migration Path |
|--------|------------|----------------|
| `RegistryBridge` gains required `transfer_protocol` field | Existing bridge instances | Add `transfer_protocol: { saga_type: 'atomic' }` |
| Constraint file schema gains optional `permission_boundaries` | No breakage — additive | Opt-in; existing files unchanged |
| `DelegationTreeNode` gains optional `last_outcome` field | No breakage — additive | Opt-in; null/undefined means "no outcome recorded" |
| New schemas (BridgeTransferSaga, DelegationOutcome, MonetaryPolicy, PermissionBoundary, GovernanceProposal) | No breakage — purely additive | New schemas |
| `BridgeInvariant invariant_id` pattern expanded from `^B-\d{1,2}$` to `^B-\d{1,4}$` | Relaxation — all existing values remain valid | No migration needed |

---

## 4. Functional Requirements

### FR-1: Deferred Finding Resolution (P0 — Stability)

**Source:** PR #14 Bridge Iterations 1–3, deferred findings F-007, F-008, F-020
**Priority:** P0 — these are type safety issues in the canonical protocol definition layer

#### F-007: TypeBox Cross-Field Annotation Type Safety

**File:** `src/economy/registry-composition.ts:140`
**Problem:** `x-cross-field-validated` annotation uses `as any` cast because TypeBox's `Type.Object()` doesn't accept arbitrary extension properties in its type parameter.
**Solution:** Create a `withExtension<T>(schema: T, extensions: Record<string, unknown>): T` utility that uses TypeBox's `Type.Unsafe()` or `Type.Transform()` to add custom JSON Schema properties without `as any`. Alternatively, use the `[Kind]` symbol approach that TypeBox supports for custom annotations.
**Tests:** Verify the annotation flows through to generated JSON Schema without cast. Verify type narrowing works at compile time.

#### F-008: BridgeInvariant ID Pattern Expansion

**File:** `src/economy/registry-composition.ts:36`
**Problem:** Pattern `^B-\d{1,2}$` limits invariant IDs to B-99. Only 4 canonical invariants exist today, but the pattern creates an unnecessary ceiling.
**Solution:** Expand to `^B-\d{1,4}$` (supports up to B-9999).
**Tests:** Verify B-1, B-99, B-100, B-9999 all validate. Verify B-10000 rejects.

#### F-020: parseExpr() Return Type Safety

**File:** `src/constraints/evaluator.ts`
**Problem:** `parseExpr()` returns an AST node typed as `any`, which propagates untyped values through the evaluation pipeline.
**Solution:** Define a `ConstraintASTNode` discriminated union type representing the possible AST shapes (literal, identifier, function_call, binary_op, unary_op, member_access). Type `parseExpr()` return as `ConstraintASTNode`. Update evaluation functions to accept `ConstraintASTNode` instead of `any`.
**Tests:** Verify all 23 builtin evaluations still pass with typed AST. Add compile-time type check that `parseExpr()` return is not `any`.

---

### FR-2: BridgeTransferSaga — Operation Protocol (P0 — Coordination)

**Source:** PR #14 Deep Review Part II — Gap 1: "Composition Without Coordination"
**Location:** `src/economy/bridge-transfer-saga.ts` (new)

**The Problem:** RegistryBridge defines the treaty between two economies but provides no operation protocol. When economy A wants to transfer value to economy B through a bridge, what are the steps? What happens when step 3 of 5 fails? What is the compensation path?

The Saga pattern (Garcia-Molina & Salem, 1987) solves exactly this: a sequence of transactions where each transaction has a compensating transaction. If T₃ fails, execute C₂, C₁ to roll back. Uber's Cadence, Netflix's Conductor, and AWS Step Functions all implement saga orchestration — but here the participants are autonomous agents across trust boundaries, not microservices under a single operator.

**BridgeTransferSaga schema:**
```
BridgeTransferSaga {
  saga_id: string                        — uuid, unique per transfer
  bridge_id: string                      — references RegistryBridge.bridge_id
  source_registry: string                — registry initiating transfer
  target_registry: string                — registry receiving transfer
  saga_type: 'atomic' | 'choreography'  — orchestration style
  status: SagaStatus                     — state machine
  steps: BridgeTransferStep[]            — ordered sequence
  compensation_steps: BridgeTransferStep[] — rollback sequence (reverse order)
  timeout: {
    total_seconds: number                — maximum saga duration
    per_step_seconds: number             — maximum per-step duration
  }
  participants: SagaParticipant[]        — agents involved
  initiated_at: string                   — ISO 8601
  settled_at: string | null              — ISO 8601, null if incomplete
  error?: SagaError                      — populated on failure
  contract_version: string
}
```

**SagaStatus state machine:**
```
initiated → reserving → transferring → settling → settled
    ↓           ↓            ↓            ↓
  failed   compensating  compensating  compensating
               ↓            ↓            ↓
            reversed     reversed     reversed
```

**BridgeTransferStep schema:**
```
BridgeTransferStep {
  step_id: string
  step_type: 'reserve' | 'validate' | 'transfer' | 'confirm' | 'settle'
  participant: string                    — agent_id of responsible party
  status: 'pending' | 'in_progress' | 'completed' | 'failed' | 'compensated'
  amount_micro: string                   — BigInt string
  exchange_rate?: ExchangeRateSnapshot   — rate at time of step
  started_at: string | null
  completed_at: string | null
  error?: string
}
```

**SagaParticipant schema:**
```
SagaParticipant {
  agent_id: string
  role: 'initiator' | 'counterparty' | 'observer' | 'arbiter'
  registry_id: string
  trust_scopes: CapabilityScopedTrust
}
```

**Constraints:**
- `saga-steps-ordered`: step_id values must be sequential
- `saga-compensation-reversed`: compensation_steps must be in reverse order of steps
- `saga-amount-conserved`: `bigint_eq(source_debit, target_credit)` after exchange rate
- `saga-timeout-positive`: total_seconds > 0 and per_step_seconds > 0
- `saga-participants-include-initiator`: At least one participant has role 'initiator'

**Evaluator Builtins (new):**
- `saga_amount_conserved(saga)`: Verify total debited equals total credited (after exchange rate conversion)
- `saga_steps_sequential(saga)`: Verify step ordering invariant

**Conformance Vectors:**
- Vector: Successful atomic transfer (all steps completed → settled)
- Vector: Partial failure with compensation (step 3 fails → compensation → reversed)
- Vector: Timeout triggered (saga exceeds total_seconds → failed)
- Vector: Invalid: compensation steps in wrong order (rejected)

**FAANG Parallel:** AWS Step Functions' saga implementation for distributed transactions. Uber's Cadence (now Temporal) handles exactly this pattern at scale — long-running workflows across unreliable participants with compensation. The key insight from Temporal: the saga definition is the specification, not the implementation. We define the protocol; arrakis and loa-finn implement the state machine.

---

### FR-3: DelegationOutcome — Conflict Resolution (P1 — Coordination)

**Source:** PR #14 Deep Review Part II — Gap 2: "Delegation Trees Without Conflict Resolution"
**Location:** `src/governance/delegation-outcome.ts` (new)

**The Problem:** `DelegationTreeNode.consensus_minimum` specifies how many children must agree, but the protocol cannot record or reason about what happened when they didn't all agree. Minority dissent is lost — a 2-of-3 majority result is indistinguishable from unanimity.

In a Black Queen ecosystem (Morris et al., 2012), specialized agents lose general capabilities but gain deep expertise. The agent that dissents may be the only one that detects a specific failure mode. Discarding dissent is discarding the ecosystem's most valuable signal.

**DelegationOutcome schema:**
```
DelegationOutcome {
  outcome_id: string                     — uuid
  tree_node_id: string                   — references DelegationTreeNode.node_id
  outcome_type: 'unanimous' | 'majority' | 'deadlock' | 'escalation'
  result: unknown                        — the agreed-upon result (null for deadlock)
  votes: DelegationVote[]                — per-child results
  consensus_achieved: boolean
  consensus_threshold: number            — copied from node's consensus_minimum
  dissent_records: DissentRecord[]       — minority opinions
  escalated_to?: string                  — agent_id if escalation
  escalation_reason?: string
  resolved_at: string                    — ISO 8601
  contract_version: string
}
```

**DelegationVote schema:**
```
DelegationVote {
  voter_id: string                       — agent_id of voting child
  vote: 'agree' | 'disagree' | 'abstain'
  result: unknown                        — this voter's proposed result
  confidence: number                     — 0.0 to 1.0
  reasoning?: string                     — brief justification
}
```

**DissentRecord schema:**
```
DissentRecord {
  dissenter_id: string                   — agent_id
  dissent_type: 'minority_report' | 'abstention' | 'timeout'
  proposed_alternative: unknown          — what the dissenter would have chosen
  reasoning: string                      — why they disagree
  severity: 'informational' | 'warning' | 'blocking'
  acknowledged: boolean                  — was the dissent surfaced to a human?
}
```

**DelegationTreeNode extension:**
```
DelegationTreeNode {
  ...existing fields...
  last_outcome?: DelegationOutcome       — NEW optional, most recent outcome
}
```

**Constraints:**
- `outcome-votes-match-children`: len(votes) >= consensus_threshold
- `outcome-consensus-consistent`: if outcome_type == 'unanimous', all votes are 'agree'
- `outcome-deadlock-no-result`: if outcome_type == 'deadlock', result is null
- `outcome-escalation-has-target`: if outcome_type == 'escalation', escalated_to is non-empty
- `outcome-dissent-has-reasoning`: every DissentRecord has non-empty reasoning

**Evaluator Builtins (new):**
- `outcome_consensus_valid(outcome)`: Verify vote counts match outcome_type claim

**Conformance Vectors:**
- Vector: Unanimous 3-of-3 decision (all agree, no dissent)
- Vector: Majority 2-of-3 with minority report (one dissenter, acknowledged)
- Vector: Deadlock 1-of-3 (below threshold, escalation triggered)
- Vector: Invalid: unanimous with dissent records (rejected)

**Meeting Geometries Connection (loa #247):** Different delegation geometries produce different outcome types. A Flatline/tribunal produces binary known-good/known-bad. A Study Group gradually refines toward consensus. A Free Jazz session sustains creative disagreement. The DelegationOutcome schema is geometry-neutral — it can record the result of any collaboration topology while preserving its epistemic character.

---

### FR-4: MonetaryPolicy — Minting-Conservation Coupling (P1 — Economic)

**Source:** PR #14 Deep Review Part II — Gap 3: "Minting Policy as Monetary Policy Without Coupling to Conservation"
**Location:** `src/economy/monetary-policy.ts` (new)

**The Problem:** `MintingPolicyConfig` controls token creation. `ConservationPropertyRegistry` controls token preservation. They share a namespace (the same micro-USD tokens) but no constraints link them. A minting policy that creates 1M tokens per epoch while conservation invariants guarantee budget sums are conserved creates a paradox — where do the minted tokens go? Who absorbs them?

The real-world parallel is not FAANG — it's central banking. The Federal Reserve's dual mandate (price stability + maximum employment) is a coupling invariant between two policy domains. MakerDAO's Dai maintains its peg through a coupling between minting (vault creation) and conservation (collateral ratios). Without coupling, minting is inflation without accountability.

**MonetaryPolicy schema:**
```
MonetaryPolicy {
  policy_id: string                      — uuid
  registry_id: string                    — the conservation registry this governs
  minting_policy: string                 — references MintingPolicyConfig.policy_id
  conservation_ceiling: string           — BigInt: maximum total supply
  coupling_invariant: string             — constraint expression binding minting to conservation
  collateral_ratio_bps: number           — basis points (e.g., 15000 = 150% collateralization)
  review_trigger: ReviewTrigger
  last_reviewed_at: string | null        — ISO 8601
  contract_version: string
}
```

**ReviewTrigger schema:**
```
ReviewTrigger {
  trigger_type: 'epoch_boundary' | 'supply_threshold' | 'manual' | 'governance_vote'
  threshold_pct?: number                 — for supply_threshold: fire when total_supply / ceiling > this
  epoch_interval?: number                — for epoch_boundary: review every N epochs
}
```

**Constraints:**
- `monetary-policy-ceiling-positive`: `bigint_gt(conservation_ceiling, '0')`
- `monetary-policy-mint-under-ceiling`: `bigint_lte(max_mint_per_epoch, conservation_ceiling)` (cannot mint more than ceiling in a single epoch)
- `monetary-policy-collateral-minimum`: collateral_ratio_bps >= 10000 (at least 100% collateralized)
- `monetary-policy-coupling-references-both`: coupling_invariant must reference both minting and conservation terms

**Evaluator Builtins (new):**
- `monetary_policy_solvent(policy, current_supply)`: Verify current_supply + pending_mints <= conservation_ceiling

**Conformance Vectors:**
- Vector: Policy with 150% collateral, ceiling above current supply (valid)
- Vector: Policy with max_mint_per_epoch exceeding ceiling (rejected)
- Vector: Policy with 50% collateral ratio (rejected — below minimum)

**Web4 Connection:** Community currencies under the "Monies not Money" vision need monetary policies that are simultaneously permissive (communities should be able to experiment) and sound (no hyperinflation). MonetaryPolicy provides the guardrails: a community can set its own ceiling, collateral ratio, and review triggers, but the coupling invariant ensures minting respects conservation.

---

### FR-5: PermissionBoundary — MAY Semantics (P1 — Governance)

**Source:** PR #14 Deep Review Part IV — "The Permission Gap"; loa #247 — Meeting Geometries Permission Gap Analysis
**Location:** `src/governance/permission-boundary.ts` (new), `src/constraints/evaluator.ts` (extend)

**The Problem:** All 23 evaluator builtins express MUST or MUST NOT. The constraint system has severities `error` and `warning`. Both are prohibition semantics — they define what is forbidden. What is missing is **MAY** — the explicit articulation of what is permitted within defined boundaries.

This matters concretely:
- A delegation tree says "children MUST have authority scopes that are subsets of parent scopes" — but cannot say "children MAY explore approaches their parent hasn't considered, provided they report back."
- A minting policy says "max_mint_per_epoch MUST NOT exceed X" — but cannot say "community members MAY propose new minting rules through the governance process."
- A bridge says "exchange rates MUST be within tolerance" — but cannot say "experimental exchange rate mechanisms MAY be tested in sandboxed registries."

Ostrom's work (1990) is definitive here: successful commons governance institutions don't just have rules about what you can't do. They have **explicit participation rights** alongside prohibitions. The right to participate is structurally as important as the prohibition against overuse.

**PermissionBoundary schema:**
```
PermissionBoundary {
  boundary_id: string                    — uuid
  scope: string                          — e.g., "minting_experimentation", "delegation_exploration"
  permitted_if: string                   — constraint expression that ENABLES (not restricts)
  reporting: ReportingRequirement
  revocation: RevocationPolicy
  severity: 'advisory' | 'monitored'    — advisory: log only; monitored: track and review
  contract_version: string
}
```

**ReportingRequirement schema:**
```
ReportingRequirement {
  required: boolean
  report_to: string                      — agent_id or role
  frequency: 'per_action' | 'per_epoch' | 'on_violation'
  format: 'audit_trail' | 'summary' | 'detailed'
}
```

**RevocationPolicy schema:**
```
RevocationPolicy {
  trigger: 'violation_count' | 'governance_vote' | 'manual' | 'timeout'
  violation_threshold?: number           — for violation_count
  timeout_seconds?: number               — for timeout
}
```

**Constraint File Extension:**
```json
{
  "constraints": [...],
  "permission_boundaries": [
    {
      "boundary_id": "...",
      "scope": "sandbox_minting",
      "permitted_if": "governance_config.sandbox_permeability > 0 && trust_scopes.scopes.governance >= 'verified'",
      "reporting": { "required": true, "report_to": "governance_admin", "frequency": "per_epoch", "format": "summary" },
      "revocation": { "trigger": "violation_count", "violation_threshold": 3 },
      "severity": "monitored"
    }
  ]
}
```

**Evaluator Builtins (new):**
- `permission_granted(context, boundary_id)`: Evaluate whether the permission boundary's `permitted_if` expression is satisfied in the given context
- `within_boundary(context, boundary_id)`: Check that the action falls within the boundary's scope and reporting requirements are met

**Constraints:**
- `permission-boundary-has-reporting`: If `permitted_if` is non-trivial, reporting.required must be true
- `permission-boundary-has-revocation`: Every boundary must have a revocation policy
- `permission-scope-unique`: boundary_id values unique within a constraint file

**Conformance Vectors:**
- Vector: Permission granted with valid context and reporting configured (valid)
- Vector: Permission with revocation triggered (violation_count exceeded)
- Vector: Invalid: permission boundary without revocation policy (rejected)

**Epistemic Tristate Connection (loa #247):** Permission boundaries produce a natural tristate:
- **known-good**: permission granted AND within boundary AND reporting current
- **known-bad**: permission revoked OR boundary violated
- **unknown**: permission not yet evaluated OR reporting overdue

---

### FR-6: GovernanceProposal — Collective Decision-Making (P2 — Governance)

**Source:** PR #14 Deep Review Part IV — "Registry governance: no mechanism for governed agents to exercise voice"
**Location:** `src/governance/governance-proposal.ts` (new)

**The Problem:** `GovernanceConfig.governance_weight` gives agents proportional influence, but there is no mechanism to exercise it. This is analogous to having voting rights without ballot access — the right exists in theory but has no operational realization. Ostrom's Principle 3 requires that "most individuals affected by operational rules can participate in modifying the operational rules."

**GovernanceProposal schema:**
```
GovernanceProposal {
  proposal_id: string                    — uuid
  proposer_id: string                    — agent_id
  registry_id: string                    — which registry this modifies
  proposal_type: 'parameter_change' | 'policy_change' | 'boundary_change' | 'emergency'
  title: string                          — human-readable title
  description: string                    — detailed description
  changes: ProposedChange[]              — what would change
  status: ProposalStatus                 — state machine
  voting: VotingRecord
  quorum_threshold_bps: number           — basis points of total governance_weight needed
  approval_threshold_bps: number         — basis points of participating weight for approval
  voting_period_seconds: number
  proposed_at: string                    — ISO 8601
  resolved_at: string | null
  contract_version: string
}
```

**ProposalStatus state machine:**
```
proposed → voting → ratified | rejected | expired
    ↓
  withdrawn
```

**ProposedChange schema:**
```
ProposedChange {
  target_field: string                   — JSON path to the field being changed
  current_value: unknown
  proposed_value: unknown
  rationale: string                      — why this change
}
```

**VotingRecord schema:**
```
VotingRecord {
  total_weight: number                   — sum of all eligible governance_weights
  participating_weight: number           — sum of weights that voted
  approve_weight: number
  reject_weight: number
  abstain_weight: number
  votes: GovernanceVote[]
}
```

**GovernanceVote schema:**
```
GovernanceVote {
  voter_id: string                       — agent_id
  vote: 'approve' | 'reject' | 'abstain'
  weight: number                         — voter's governance_weight
  reasoning?: string
  voted_at: string                       — ISO 8601
}
```

**Constraints:**
- `proposal-quorum-met`: participating_weight >= (total_weight * quorum_threshold_bps / 10000)
- `proposal-approval-met`: If ratified, approve_weight >= (participating_weight * approval_threshold_bps / 10000)
- `proposal-rejection-consistent`: If rejected, approve_weight < (participating_weight * approval_threshold_bps / 10000)
- `proposal-voting-period-positive`: voting_period_seconds > 0
- `proposal-changes-non-empty`: changes.length > 0

**Conformance Vectors:**
- Vector: Proposal ratified with 80% approval, 60% quorum (valid)
- Vector: Proposal rejected with 40% approval (valid)
- Vector: Proposal expired without quorum (valid)
- Vector: Invalid: ratified with approval below threshold (rejected)

**FAANG Parallel:** MakerDAO's governance module is the closest real-world equivalent — token-weighted voting on system parameters (stability fee, collateral ratios, new collateral types). Their lesson: separate the proposal mechanism (schema) from the execution mechanism (runtime). The proposal schema defines what CAN be changed and what votes are needed; the runtime decides whether to execute.

---

### FR-7: Version Bump + Release (P0)

**Version:** 7.0.0 (breaking — new required field on RegistryBridge)
**Location:** `src/version.ts`, `schemas/index.json`, `package.json`

**Changes:**
1. Update `CONTRACT_VERSION` to `'7.0.0'`
2. Update `MIN_SUPPORTED_VERSION` to `'7.0.0'`
3. Regenerate `schemas/index.json` with all new schemas
4. Update `package.json` version
5. Update all existing schema `contract_version` fields to `'7.0.0'`
6. Add new conformance vectors for all FR-2 through FR-6 schemas
7. Verify all tests pass (target: ~3,700)
8. Update schema count in `EVALUATOR_BUILTINS` constant

---

## 5. Technical & Non-Functional Requirements

### 5.1 Performance

- Saga validation (FR-2) must complete in < 50ms for a 10-step saga
- DelegationOutcome validation must complete in < 10ms
- Permission boundary evaluation must not add > 5ms overhead per constraint file
- All existing benchmarks must not regress

### 5.2 Security

- BridgeTransferSaga must be fail-closed: any validation failure → saga status 'failed'
- Permission boundaries must not override MUST/MUST_NOT constraints — MAY is additive, not overriding
- GovernanceProposal votes must be individually verifiable (each vote signed by voter)
- No new `as any` casts introduced (F-020 resolution is net reduction)

### 5.3 Compatibility

- All existing 3,504 tests must continue to pass
- Schema graph operations must discover new schemas automatically
- Constraint type checker must validate new constraint files
- Evaluator spec registry must include specs for all new builtins

---

## 6. Scope & Prioritization

### 6.1 In Scope (v7.0.0)

| Priority | Feature | Sprint |
|----------|---------|--------|
| P0 | FR-1: Deferred finding resolution | Sprint 1 |
| P0 | FR-2: BridgeTransferSaga | Sprint 2 |
| P0 | FR-7: Version bump + release | Sprint 4 |
| P1 | FR-3: DelegationOutcome | Sprint 2 |
| P1 | FR-4: MonetaryPolicy | Sprint 3 |
| P1 | FR-5: PermissionBoundary | Sprint 3 |
| P2 | FR-6: GovernanceProposal | Sprint 3 |

### 6.2 Explicitly Out of Scope (deferred to v8.0.0+)

| Item | Why Deferred | Source |
|------|-------------|--------|
| Model-checking integration (TLA+/Alloy) | Aspirational — requires toolchain investment beyond protocol scope | Deep Review II Gap 4 |
| CompetitionPolicy schema | Interesting but not coordination primitive — optimization, not correctness | Deep Review III Cambrian |
| Emergent Pattern Recognition | Requires ML pipeline — infrastructure, not protocol | Deep Review IV Capability 4 |
| Registry versioning (protocol vs registry) | Minor — can be additive in any future release | Deep Review IV architectural |
| Meeting Geometry schemas | Depends on loa #247 RFC resolution — premature to formalize | loa #247 |
| MeetingConfig interface | Runtime concern, not protocol definition | loa #247 |

### 6.3 Sprint Allocation

| Sprint | Focus | FRs |
|--------|-------|-----|
| Sprint 1 | Stability — Deferred findings + AST typing | FR-1 |
| Sprint 2 | Coordination — Saga + Conflict Resolution | FR-2, FR-3 |
| Sprint 3 | Governance — Monetary Policy + Permissions + Proposals | FR-4, FR-5, FR-6 |
| Sprint 4 | Release — Version bump + conformance + integration | FR-7 |

---

## 7. Risks & Dependencies

### 7.1 Technical Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| F-020 AST typing may require evaluator refactor | Could affect all 23 builtins | Incremental: type the top-level return first, propagate gradually |
| BridgeTransferSaga state machine complexity | Saga with compensation paths is inherently complex | Lean on Garcia-Molina & Salem's formal model; test every state transition |
| PermissionBoundary could create constraint file schema bloat | Existing files already have 2-8 constraints each | permission_boundaries is optional — files without MAY semantics unchanged |
| GovernanceProposal voting math edge cases | Basis-point arithmetic with rounding | Use existing `bigint_*` builtins for all vote calculations |

### 7.2 Dependencies

| Dependency | Status | Risk |
|------------|--------|------|
| TypeBox `Type.Unsafe()` or `Type.Transform()` for F-007 | Available in current TypeBox version | Low |
| Existing evaluator infrastructure for new builtins | Proven pattern (23 existing builtins) | Low |
| Schema graph for new schema discovery | Operational (v6.0.0) | Low |
| Constraint type checker for new constraint files | Operational (v6.0.0) | Low |

### 7.3 External Dependencies

| Dependency | Impact | Mitigation |
|------------|--------|------------|
| arrakis needs BridgeTransferSaga for reserve→finalize flow | loa-finn #66 P0 | This PRD directly addresses the need |
| loa-finn needs DelegationOutcome for ensemble routing decisions | loa-finn #31 | DelegationOutcome is additive to existing DelegationTree |
| Web4 community currencies need PermissionBoundary | meow.bio/web4.html | Permission boundaries are optional schema extensions |

---

## 8. The Level 7 Assessment

### What Level 7 (Coordination-Aware) Means

| Level | Name | What It Proves | Version |
|-------|------|---------------|---------|
| 4 | Formalization-Aware | Temporal properties, cross-language constraints | v4.6.0 |
| 5 | Conservation-Aware | Economic invariants hold across all operations | v5.5.0 |
| 6 | Composition-Aware | Economies can compose (bridges, trees, policies) | v6.0.0 |
| **7** | **Coordination-Aware** | **Composition failures are handled (sagas, outcomes, coupling, permissions)** | **v7.0.0** |

Level 7 is not about adding more nouns to the protocol. It's about adding verbs:

- **Transfer** (BridgeTransferSaga): "How do economies actually exchange value?"
- **Resolve** (DelegationOutcome): "What happens when agents disagree?"
- **Couple** (MonetaryPolicy): "How do creation and preservation relate?"
- **Permit** (PermissionBoundary): "What is explicitly allowed within constraints?"
- **Propose** (GovernanceProposal): "How do governed agents change governance?"

### The Cambrian Assessment Updated

| Condition | v6.0.0 State | v7.0.0 Target | Assessment |
|-----------|-------------|---------------|------------|
| Hard Parts (shells) | Constraint type system | + PermissionBoundary (MAY types) | **COMPLETE** — both prohibition and permission articulated |
| Eyes (vision) | Schema graph operations | + saga state visibility | **OPERATIONAL** |
| Oxygen (metabolism) | Bridges + minting | + MonetaryPolicy (coupled metabolism) | **MATURE** — creation and conservation formally linked |
| Hox Genes (regulatory) | 23 builtins + tree recursion | + 4 coordination builtins | **DIVERSIFYING** |
| Protected Variation | Structurally enabled (bridges, trees) | + PermissionBoundary (culturally activated) | **ACTIVATED** — explicit permission to experiment |
| Predation (competition) | Not yet | Deferred to v8.0.0 | Not yet |

Five of six Cambrian conditions are met or strengthened. The protocol is ready for speciation — communities building diverse economic experiments within the shared constraint framework.

---

## 9. Closing: The Telescope Fold

> "The most interesting question about v7.0.0 isn't 'what features does it add?' but 'what new kinds of things become possible that we can't currently imagine?'"
> — Bridgebuilder, Deep Review Part IV

v7.0.0 is structured as a telescope fold — each feature requirement nests inside the next:

1. **FR-1** (deferred fixes) cleans the lens
2. **FR-2** (saga) defines how composed economies transact
3. **FR-3** (outcomes) records what happens when agents coordinate
4. **FR-4** (monetary policy) couples creation to conservation
5. **FR-5** (permissions) articulates what is allowed, not just what is forbidden
6. **FR-6** (governance proposals) gives governed agents a voice
7. **FR-7** (release) extends the telescope to its full reach

Each layer depends on and amplifies the previous. Sagas need outcomes (what if a saga step produces a deadlocked delegation?). Monetary policy needs permissions (MAY mint within boundaries). Governance needs sagas (how does a ratified proposal execute across registries?).

The hard constraint is real: "a stable hounfour is needed for everything else downstream." This PRD serves that constraint directly. Every coordination gap left unfilled is a protocol arrakis or loa-finn will invent independently. Every independent invention is convergence debt. The cheapest, fastest, most correct path to launch is to define the coordination primitives once, canonically, now — while there are no users, no production load, and no backward compatibility to maintain.

The Cambrian explosion didn't produce better trilobites. It produced entirely new phyla. v7.0.0 is the transition from "can economies compose?" to "what kinds of coordination become possible?" — and the answer to that question is the competitive moat.

---

*— Bridgebuilder, Field Report #42*
*Cycle 016 | The Coordination-Aware Protocol*
*"The verbs of composition are the vocabulary of coordination."*
