# PRD: loa-hounfour v6.0.0 — The Composition-Aware Protocol

**Status:** Draft
**Author:** Bridgebuilder (Field Report #40 — From Conservation to Composition)
**Date:** 2026-02-17
**Cycle:** cycle-015
**Version:** v6.0.0 (breaking — structural changes to trust model, constraint expressions, and conservation registry)
**Sources:**
- [PR #14 — v5.5.0 Bridgebuilder Review III: The Architecture of Economic Trust](https://github.com/0xHoneyJar/loa-hounfour/pull/14#issuecomment-3911680256) — 6 critical findings
- [PR #14 — v5.5.0 Bridgebuilder Review IV: Economic Constitutionalism and the Agent Commons](https://github.com/0xHoneyJar/loa-hounfour/pull/14#issuecomment-3911707088) — 4 proposals
- [Issue #13 — Conservation properties extraction](https://github.com/0xHoneyJar/loa-hounfour/issues/13) — Cross-constellation analysis
- [loa-finn #31 — Multi-Model Provider Abstraction RFC](https://github.com/0xHoneyJar/loa-finn/issues/31) — ModelPort, cheval.py, 5-layer architecture
- [loa-finn #66 — Launch Readiness RFC](https://github.com/0xHoneyJar/loa-finn/issues/66) — Protocol convergence P0 blocker
- [arrakis #62 — Billing & Payments RFC](https://github.com/0xHoneyJar/arrakis/issues/62) — Reserve/finalize, x402, credit ledger
- [loa #247 — Flatline Alternatives](https://github.com/0xHoneyJar/loa/issues/247) — Autopoiesis, emergent review
- [Web4 — Social Monies Manifesto](https://meow.bio/web4.html) — "Monies, not money"
- Ostrom, "Governing the Commons" (1990) — 8 principles for commons governance
- Lamport, "The Byzantine Generals Problem" (1982)
- Tomasev et al., "Distributional AGI Safety" (arXiv:2512.16856, Dec 2025)
- Black Queen Hypothesis (Morris et al., 2012) — Obligate interdependence in microbial communities

---

## 0. The Question Behind the Question

> "v5.5.0 proved the economy is honest. v6.0.0 asks: **can honest economies compose?**"

v5.5.0 was a success by every measure — 14 conservation invariants formalized, branded types enforcing unit safety, evaluator builtins composing for novel validation, trust-gated delegation, 2,824 tests passing. The Bridgebuilder reviews confirmed convergence: zero actionable findings after one iteration.

But convergence revealed six structural limits that no amount of iteration could address:

1. **The conservation invariants can prove things don't go wrong, but cannot prove things eventually go right.** 12 of 14 invariants are safety properties (G: "always"). Only 2 are liveness properties (F: "eventually"). The protocol can prove a budget never goes negative but cannot prove a stuck reservation ever resolves. This is the halting problem of economic protocols — necessary for launch readiness (loa-finn #66).

2. **The trust model is a total order in a world that needs partial orders.** `TRUST_LEVELS = ['untrusted', 'basic', 'verified', 'trusted', 'sovereign']` forces a single ranking. But loa-finn #31's multi-model routing needs "trusted for billing, untrusted for governance" — capability-scoped trust that the flat hierarchy cannot express.

3. **The constraint expression language is untyped.** 32 constraint files with expressions like `bigint_eq(bigint_sum([coverage.single_lot, ...]), total_count)` — but no declaration of what types the expression expects or produces. A malformed expression that always evaluates to `true` is a silent correctness hole.

4. **The schema graph is an adjacency list without operations.** `buildSchemaGraph()` creates nodes with incoming/outgoing edges but provides no reachability queries, cycle detection, or impact analysis. When loa-finn #31 asks "which schemas are affected if I change AgentIdentity?", the graph has no answer.

5. **Conservation registries are isolated.** Each `ConservationPropertyRegistry` exists in a vacuum. When two economies (e.g., arrakis billing + loa-finn model routing) need to transact, no protocol exists for expressing cross-registry bridge invariants or exchange rate governance. Web4's "monies not money" vision requires registries that compose.

6. **Delegation chains are linear in a concurrent world.** `DelegationChain` models a single path from root to leaf. Multi-model orchestration (loa-finn #31 ensemble strategies) creates delegation *trees* — a root agent delegating to multiple models simultaneously, each with different authority scopes and budgets. The chain model cannot express concurrent delegation.

These are not incremental improvements. They are structural prerequisites for the multi-model, multi-economy future that loa-finn #31, arrakis #62, and Web4 demand. And as the user correctly identified: **there has never been a better time.** No users, no production load, no backward compatibility debt. The protocol is pre-launch. This is the moment to get the foundations right.

---

## 1. Problem Statement

### 1.1 What v5.5.0 Achieved

| Achievement | Evidence |
|------------|---------|
| 14 conservation invariants with LTL formulas | `src/integrity/conservation-properties.ts` — CANONICAL_CONSERVATION_PROPERTIES |
| Branded arithmetic types | `src/economy/branded-types.ts` — MicroUSD, BasisPoints, AccountId |
| 6-step JWT boundary verification | `src/economy/jwt-boundary.ts` — CANONICAL_JWT_BOUNDARY_STEPS |
| Cross-schema reference graph | `src/utilities/schema-graph.ts` — buildSchemaGraph() |
| 18 evaluator builtins with formal specs | `src/constraints/evaluator-spec.ts` — EVALUATOR_BUILTIN_SPECS |
| Trust-gated agent identity | `src/schemas/agent-identity.ts` — 5-tier trust, delegation authority |
| 68 schemas, 32 constraint files | `schemas/index.json`, `constraints/*.json` |
| 2,824 tests across 123 files | Bridgebuilder Review II confirmed |

### 1.2 The Six Structural Limits

| # | Limit | Current Reality | What's Needed |
|---|-------|----------------|---------------|
| 1 | Safety without liveness | 12/14 invariants use G (safety), only I-11 and I-12 use F (liveness) | Liveness proofs for budget replenishment, reconciliation completion, dispute resolution |
| 2 | Total-order trust | `TRUST_LEVELS` is a flat 5-level array, `trustLevelIndex()` returns a single integer | Capability-scoped trust: `{ billing: 'trusted', governance: 'basic', inference: 'verified' }` |
| 3 | Untyped constraints | Expressions are opaque strings with no type declarations | Static type annotations: `{ input: 'ConservationPropertyRegistry', output: 'boolean' }` |
| 4 | Graph without operations | `SchemaGraphNode` has edges but no algorithms | Reachability, cycle detection, impact analysis, topological sort |
| 5 | Isolated registries | Each `ConservationPropertyRegistry` exists alone | Registry composition: bridge invariants, exchange rates, atomic cross-registry settlement |
| 6 | Linear delegation | `DelegationChain.links` is a linear array | `DelegationTree` for concurrent multi-model delegation with fork/join semantics |

### 1.3 The Kernel Metaphor, Extended

v5.5.0 established the "economic kernel" metaphor (Review III):

| OS Kernel | v5.5.0 | v6.0.0 Addition |
|-----------|--------|-----------------|
| Process isolation | AgentIdentity | **Capability-scoped trust** (fine-grained MAC, not flat DAC) |
| Memory protection | Branded types | (complete) |
| System calls | JWT boundary | (complete) |
| Kernel invariants | Conservation properties | **Liveness proofs** (not just safety — kernel must guarantee progress) |
| File system | Schema graph | **Graph operations** (not just inode table — VFS with search) |
| IPC | Delegation chains | **Delegation trees** (not just pipes — Unix domain sockets, shared memory) |
| Kernel modules | Evaluator builtins | **Type system** (not just loadable — verified module signatures) |
| Networking | (missing) | **Registry composition** (TCP/IP stack — multi-host communication) |

The pattern is clear: v5.5.0 built the kernel. v6.0.0 makes it composable.

### 1.4 Why Breaking, Why Now

**Why breaking:** Capability-scoped trust replaces the flat `TrustLevel` union. Constraint type declarations add required fields. Registry composition introduces new required structure. These cannot be additive.

**Why now:** The user's insight is precise: "there has never been a better time than now. We don't have users, we don't have billions of agents under load." The protocol is pre-launch. Breaking changes after launch require migration paths, deprecation cycles, and backward-compatibility shims. Breaking changes now require only updating test vectors. The cost-benefit ratio will never be this favorable again.

**The FAANG parallel:** Google's Protocol Buffers v3 (proto3) was a breaking change from proto2 — removing required fields, changing default semantics, and simplifying the type system. Google chose to break proto2 before its ecosystem was too large to migrate. The result: a cleaner, more composable protocol that scaled to billions of daily RPC calls. We are at the proto2→proto3 moment.

---

## 2. Goals & Success Metrics

### 2.1 Goals

1. **G1**: Add liveness properties for all temporal invariants, proving forward progress (not just safety)
2. **G2**: Replace total-order trust with capability-scoped trust model supporting partial orders
3. **G3**: Add static type declarations to constraint expressions with CI-time validation
4. **G4**: Implement graph operations on the schema graph (reachability, cycle detection, impact analysis)
5. **G5**: Create registry composition protocol for cross-economy transactions
6. **G6**: Introduce DelegationTree for concurrent multi-model delegation with fork/join semantics

### 2.2 Success Metrics

| Metric | Target |
|--------|--------|
| Liveness properties added | 6+ new F-properties complementing existing safety properties |
| Trust dimensions | At least 4 capability scopes (billing, governance, inference, delegation) |
| Typed constraint files | All 32+ existing constraint files upgraded with type declarations |
| Graph operations | 4 (reachability, cycle detection, impact analysis, topological sort) |
| Registry composition | Bridge invariant schema + cross-registry exchange protocol |
| DelegationTree schema | With fork, join, and concurrent budget conservation |
| New constraint files | 8+ |
| New evaluator builtins | 4+ (for tree traversal, type checking, registry composition) |
| New tests | ~200 |
| Total tests passing | 2,824 + ~200 = ~3,024 |
| CONTRACT_VERSION | 6.0.0 |

---

## 3. User & Stakeholder Context

### 3.1 Primary Consumers

| Consumer | What They Need | Feature |
|----------|---------------|---------|
| **loa-finn model router** | Capability-scoped trust for model pool authorization ("trusted for inference, basic for governance") | FR-2 |
| **loa-finn ensemble orchestrator** | DelegationTree for concurrent multi-model dispatch with fork/join semantics | FR-6 |
| **arrakis billing service** | Liveness proofs ensuring stuck reservations eventually resolve (required for x402 payments) | FR-1 |
| **arrakis credit system** | Registry composition for credit economy ↔ inference economy atomic settlement | FR-5 |
| **Cross-language implementors** | Typed constraint expressions for static validation in Go/Rust/Python | FR-3 |
| **Protocol tooling** | Schema graph operations for automated impact analysis and dependency checking | FR-4 |
| **Web4 community economies** | Registry composition enabling "monies not money" — each community defines its own conservation laws | FR-5 |

### 3.2 Breaking Changes

| Change | What Breaks | Migration Path |
|--------|------------|----------------|
| `TrustLevel` → `CapabilityScopedTrust` | All code using flat trust_level | Replace `trust_level: 'verified'` with `trust_scopes: { billing: 'verified', ... }` |
| Constraint type declarations | Constraint file schema gains required `type_signature` | Add `{ input: 'SchemaName', output: 'boolean' }` to each constraint |
| ConservationPropertyRegistry.liveness | Registry gains required `liveness_properties` array | Add liveness companion for each safety property |
| DelegationTree (new) | No breakage — purely additive | DelegationChain remains for simple linear delegation |
| Schema graph operations (new) | No breakage — additive API | New functions alongside existing buildSchemaGraph() |
| Registry composition (new) | No breakage — new schemas | New RegistryBridge schema |

---

## 4. Functional Requirements

### FR-1: Conservation Liveness Properties (P0)

**Source:** PR #14 Review III — Finding 1: "Safety properties without liveness proofs"
**Location:** `src/integrity/conservation-properties.ts` (extend), `src/integrity/liveness-properties.ts` (new)

**The Problem:** v5.5.0's 14 conservation properties prove things don't go wrong but cannot prove things eventually go right. A stuck reservation is not a safety violation (nothing goes negative) but is a liveness failure (the system stopped making progress).

**Liveness Property Schema:**
```
LivenessProperty {
  liveness_id: string          — pattern: ^L-\d{1,2}$
  name: string
  description: string
  ltl_formula: string          — must contain F (eventually) operator
  companion_safety: string     — invariant_id of the safety property this complements
  universe: InvariantUniverse
  timeout_behavior: 'reaper' | 'escalation' | 'reconciliation' | 'manual'
  timeout_seconds: number      — maximum time before liveness check fires
  error_codes: string[]
  severity: 'critical' | 'error' | 'warning'
  contract_version: string
}
```

**The 6+ Liveness Properties:**

| ID | Name | LTL Formula | Complements | Timeout Behavior |
|----|------|-------------|-------------|-----------------|
| L-1 | Reservation resolution liveness | `G(reservation.pending => F_t(reservation.terminal))` | I-11 | reaper |
| L-2 | Expiration reclamation liveness | `G(lot.expired => F_t(lot.reclaimed))` | I-12 | reaper |
| L-3 | Budget replenishment liveness | `G(budget.depleted => F(budget.replenished \| account.suspended))` | I-5 | escalation |
| L-4 | Reconciliation completion liveness | `G(reconciliation.started => F_t(reconciliation.complete))` | I-4, I-13 | reconciliation |
| L-5 | Dispute resolution liveness | `G(dispute.opened => F_t(dispute.resolved))` | (new) | manual |
| L-6 | Transfer settlement liveness | `G(transfer.initiated => F_t(transfer.settled \| transfer.reversed))` | I-14 | reaper |

**F_t notation:** `F_t(P)` means "P eventually holds within timeout T seconds." This is bounded liveness — pure liveness (unbounded F) is undecidable; bounded liveness is model-checkable.

**ConservationPropertyRegistry extension:**
```
ConservationPropertyRegistry {
  ...existing fields...
  liveness_properties: LivenessProperty[]  — NEW required field
  liveness_count: number                   — must equal liveness_properties.length
}
```

**Constraints:**
- `conservation-registry-liveness-count-matches`: liveness_count == len(liveness_properties)
- `conservation-liveness-unique-ids`: All liveness_id values unique
- `conservation-liveness-companion-exists`: Every companion_safety references a valid invariant_id in properties
- `conservation-liveness-formula-has-eventually`: Every ltl_formula contains 'F' operator

**Conformance Vectors:**
- Vector 0026: Registry with complete safety + liveness pairs (valid)
- Vector 0027: Liveness property without companion safety (rejected)
- Vector 0028: Liveness formula without F operator (rejected)

**FAANG Parallel:** Amazon's DynamoDB health system distinguishes between safety (data never lost) and liveness (requests eventually complete). Their "blast radius" containment requires both — a system can be safe (no data loss) but dead (no progress). The liveness properties are the protocol's SLA specification.

---

### FR-2: Capability-Scoped Trust Model (P0)

**Source:** PR #14 Review III — Finding 2: "Trust hierarchy is a total order in a world that needs partial orders"
**Location:** `src/schemas/agent-identity.ts` (breaking change)

**The Problem:** `TRUST_LEVELS = ['untrusted', 'basic', 'verified', 'trusted', 'sovereign']` maps each agent to a single point on a linear scale. But loa-finn #31's model routing needs: "GPT-4o is trusted for code review but basic for billing" and "Kimi-K2 is verified for reasoning but untrusted for governance." A single trust level cannot express this.

**CapabilityScope schema:**
```
CapabilityScope = 'billing' | 'governance' | 'inference' | 'delegation' | 'audit' | 'composition'
```

**CapabilityScopedTrust schema:**
```
CapabilityScopedTrust {
  scopes: Record<CapabilityScope, TrustLevel>
  default_level: TrustLevel          — fallback for unspecified scopes
}
```

**AgentIdentity changes (BREAKING):**
```
AgentIdentity {
  ...existing fields...
  trust_level: TrustLevel                    — REMOVED
  trust_scopes: CapabilityScopedTrust        — NEW replacement
  ...
}
```

**Helper functions (replace existing):**
```typescript
// OLD: trustLevelIndex(level) → number
// OLD: meetsThreshold(level, threshold) → boolean
// NEW:
trustLevelForScope(trust: CapabilityScopedTrust, scope: CapabilityScope): TrustLevel
meetsThresholdForScope(trust: CapabilityScopedTrust, scope: CapabilityScope, threshold: TrustLevel): boolean
effectiveTrustLevel(trust: CapabilityScopedTrust): TrustLevel  // minimum across all scopes
```

**Constraints:**
- `agent-identity-delegation-requires-trust`: delegation_authority non-empty => trust_scopes.scopes.delegation >= 'verified'
- `agent-identity-sovereign-scope-consistency`: If any scope is 'sovereign', default_level >= 'trusted'
- `agent-identity-scope-coverage`: At least 'billing' and 'inference' scopes must be specified

**Canonical Migration Mapping (Flatline FL-PRD-003):**

The mapping from flat `TrustLevel` to `CapabilityScopedTrust` must be normative (not ad-hoc):

| Flat TrustLevel | Default Scoped Mapping | Rationale |
|-----------------|----------------------|-----------|
| `untrusted` | All scopes: `untrusted` | Minimal trust maps uniformly |
| `basic` | All scopes: `basic` | No differentiation at basic level |
| `verified` | All scopes: `verified` | Identity-verified maps uniformly |
| `trusted` | All scopes: `trusted` | Full trust maps uniformly |
| `sovereign` | All scopes: `sovereign` | Platform-level maps uniformly |

- The `flatTrustToScoped(level)` helper implements this mapping
- Unknown/future scopes fall back to `default_level`
- The mapping is **lossy in reverse**: `effectiveTrustLevel()` (minimum across scopes) produces the conservative flat equivalent, but a scoped trust with `{ billing: 'trusted', governance: 'basic' }` maps to `'basic'` (not `'trusted'`)

**Why Partial Orders:** The mathematical insight from Review III is that trust in a multi-model world forms a *lattice*, not a *chain*. Model A can be "above" Model B on inference but "below" on governance. This is precisely the mandatory access control (MAC) model from Bell-LaPadula — capability-scoped security levels, not a single clearance.

**The BGP Parallel:** Internet routing doesn't assign each autonomous system a single "trust score." BGP policies are per-neighbor, per-prefix — "I trust AS64501 to announce routes for 10.0.0.0/8 but not for 192.168.0.0/16." Capability-scoped trust is BGP policy for the agent economy.

---

### FR-3: Constraint Type System (P0)

**Source:** PR #14 Review III — Finding 3: "Constraint expression language has an implicit type system that isn't specified"
**Location:** `constraints/*.json` (all files modified), `src/constraints/type-checker.ts` (new)

**The Problem:** Constraint expressions like `bigint_eq(bigint_sum([coverage.single_lot, ...]), total_count)` have implicit types — `bigint_sum` returns `BigInt`, `bigint_eq` expects two `BigInt` arguments. But nothing declares this. A constraint expression that type-checks but has a semantic error (e.g., comparing a string count against a BigInt sum) silently evaluates to `false` at best, or `true` at worst.

**Type Declaration schema (added to constraint files):**
```json
{
  "id": "conservation-registry-coverage-sums-to-total",
  "description": "...",
  "expression": "bigint_eq(bigint_sum([coverage.single_lot, ...]), total_count)",
  "type_signature": {
    "input_schema": "ConservationPropertyRegistry",
    "output_type": "boolean",
    "field_types": {
      "coverage.single_lot": "bigint_coercible",
      "coverage.account": "bigint_coercible",
      "coverage.platform": "bigint_coercible",
      "coverage.bilateral": "bigint_coercible",
      "total_count": "bigint_coercible"
    }
  }
}
```

**Type Universe:**
```
ConstraintType = 'boolean' | 'bigint' | 'bigint_coercible' | 'string' | 'number' | 'array' | 'object' | 'unknown'
```

**Static Type Checker:**
```typescript
interface TypeCheckResult {
  valid: boolean;
  errors: TypeCheckError[];
  warnings: TypeCheckWarning[];
}

interface TypeCheckError {
  expression_fragment: string;
  expected_type: ConstraintType;
  actual_type: ConstraintType;
  message: string;
}

function typeCheckConstraint(
  constraintFile: ConstraintFile,
  schemaRegistry: Map<string, TObject>
): TypeCheckResult;
```

**What the type checker validates:**
1. `input_schema` exists in the schema registry
2. All `field_types` paths resolve to real fields in the input schema
3. Function argument types match evaluator builtin signatures
4. Return type of expression matches `output_type`
5. No implicit coercions that could silently produce wrong results

**Path Resolution Grammar (Flatline FL-PRD-005):**

The type checker must handle nested/recursive paths:

| Path Pattern | Example | Resolution |
|-------------|---------|------------|
| Simple field | `total_count` | Direct lookup in schema |
| Dotted nested | `trust_scopes.scopes.billing` | Walk nested object properties |
| Array element | `properties[].invariant_id` | `[]` means "for each element"; resolve element type then continue |
| Optional field | `metadata?.key` | `?` marks optional; type may be `unknown` if not declared |

- **Recursion limit:** Max path depth of 10 (matches `max_delegation_depth`)
- **Self-referential schemas:** DelegationTreeNode references itself via `children`; type checker stops at recursion limit
- **Unknown paths:** Paths that cannot be resolved produce a `TypeCheckWarning` (not error) — conservative approach

**Constraints:**
- `constraint-type-signature-required`: Every constraint must have a `type_signature`
- `constraint-input-schema-exists`: `input_schema` must reference a registered schema
- `constraint-field-types-valid`: All field_types keys must be valid paths in the input schema

**New Evaluator Builtins:**
- `type_of(value)` → returns the runtime type as a string
- `is_bigint_coercible(value)` → returns true if value can be converted to BigInt

**FAANG Parallel:** TypeScript itself started as untyped JavaScript and evolved to a typed language. The constraint expression language is making the same journey. Google's CEL (Common Expression Language) includes a type checker that validates expressions at program-load time, catching errors before any request is processed. Our type checker serves the same purpose: constraint correctness as a CI gate.

---

### FR-4: Schema Graph Operations (P1)

**Source:** PR #14 Review III — Finding 4: "Schema graph is an adjacency list without operations"
**Location:** `src/utilities/schema-graph.ts` (extend)

**The Problem:** `buildSchemaGraph()` produces `SchemaGraphNode[]` with incoming/outgoing edges but no algorithms. When a developer modifies `AgentIdentity`, they need to know: what other schemas reference it? What's the transitive closure? Are there cycles? What's the impact radius?

**New Operations:**

**4a. Reachability:**
```typescript
function isReachable(
  graph: SchemaGraphNode[],
  from: string,
  to: string
): boolean;

function reachableFrom(
  graph: SchemaGraphNode[],
  source: string
): Set<string>;
```

**4b. Cycle Detection:**
```typescript
interface CycleInfo {
  has_cycles: boolean;
  cycles: string[][];  // Each inner array is a cycle path
}

function detectCycles(graph: SchemaGraphNode[]): CycleInfo;
```

**4c. Impact Analysis:**
```typescript
interface ImpactReport {
  schema_id: string;
  directly_affected: string[];     // schemas referencing this one
  transitively_affected: string[]; // full transitive closure
  affected_constraints: string[];  // constraint files targeting affected schemas
  total_impact_radius: number;
}

function analyzeImpact(
  graph: SchemaGraphNode[],
  schemaId: string,
  constraintFiles: ConstraintFile[]
): ImpactReport;
```

**4d. Topological Sort:**
```typescript
function topologicalSort(graph: SchemaGraphNode[]): string[] | null;
// Returns null if cycles exist
```

**Constraints:**
- `schema-graph-acyclic`: The schema reference graph must be a DAG (no circular references)

**Tests:**
- Reachability from DelegationChain reaches InterAgentTransactionAudit
- Impact analysis on AgentIdentity shows all schemas that reference agent_id
- Topological sort produces valid ordering of all 68+ schemas
- Cycle detection catches intentionally introduced test cycles

**FAANG Parallel:** Bazel's build system computes the transitive closure of build dependencies to determine what needs rebuilding. The schema graph is the build graph for protocol schemas — impact analysis answers "what needs re-testing when this schema changes?"

---

### FR-5: Registry Composition Protocol (P1)

**Source:** PR #14 Review IV — "The Web4 Synthesis: Monies, Not Money"
**Location:** `src/integrity/registry-composition.ts` (new), `src/economy/minting-policy.ts` (new)

**The Problem:** Web4's "monies not money" vision means every community can define its own conservation laws. But economies don't exist in isolation — agents transact across economy boundaries. When an arrakis billing credit needs to pay for a loa-finn inference call, two different ConservationPropertyRegistries need to exchange value. No protocol exists for this.

**5a. RegistryBridge Schema:**
```
RegistryBridge {
  bridge_id: string (uuid)
  source_registry_id: string        — references ConservationPropertyRegistry
  target_registry_id: string        — references ConservationPropertyRegistry
  bridge_invariants: BridgeInvariant[]
  exchange_rate: ExchangeRateSpec
  settlement: SettlementPolicy
  contract_version: string
}
```

**BridgeInvariant:**
```
BridgeInvariant {
  invariant_id: string              — pattern: ^B-\d{1,2}$
  name: string
  description: string
  ltl_formula: string               — must reference both registries
  enforcement: 'atomic' | 'eventual' | 'manual'
}
```

**Canonical Bridge Invariants:**

| ID | Name | LTL Formula | Enforcement |
|----|------|-------------|-------------|
| B-1 | Cross-registry conservation | `G(source.debit == target.credit * exchange_rate)` | atomic |
| B-2 | Bridge idempotency | `G(unique(bridge_transaction.id))` | atomic |
| B-3 | Settlement completeness | `G(bridge_transaction.initiated => F_t(bridge_transaction.settled))` | eventual |
| B-4 | Exchange rate consistency | `G(exchange_rate.effective_at <= transaction.timestamp)` | atomic |

**5b. MintingPolicy Schema:**
```
MintingPolicy {
  policy_id: string (uuid)
  registry_id: string               — which registry this policy governs
  mint_authority: string             — who can create new value
  mint_constraints: string[]         — constraint expression IDs that must pass
  max_mint_per_epoch: string         — MicroUSD cap per time period
  epoch_seconds: number
  requires_governance_approval: boolean
  contract_version: string
}
```

**5c. ExchangeRateSpec:**
```
ExchangeRateSpec {
  rate_type: 'fixed' | 'oracle' | 'governance'
  value: string (MicroUSD ratio)     — for fixed
  oracle_endpoint: string (optional) — for oracle
  governance_proposal_required: boolean — for governance
  staleness_threshold_seconds: number
}
```

**5d. Bridge Settlement Semantics (Flatline FL-PRD-001, FL-PRD-004):**

Cross-registry atomicity requires concrete failure handling, not just invariant assertions:

| Concern | Resolution |
|---------|------------|
| Partial failure | Escrow-and-finalize pattern: source debits into escrow, target credits on finalize, compensate on timeout |
| Idempotency | Every bridge transaction carries a `bridge_tx_id` (uuid) — replays are no-ops |
| Retry semantics | At-least-once delivery with idempotent finalization; retries reuse the same `bridge_tx_id` |
| Compensation | If finalize fails after escrow, compensate by reversing the escrow within `settlement_timeout_seconds` |
| Ordering | Bridge transactions are ordered by `initiated_at` timestamp; concurrent transactions to the same registries are serialized |

**Exchange Rate Arithmetic Precision:**

| Property | Value |
|----------|-------|
| Scale | MicroUSD (10^-6) — inherited from branded types |
| Rounding mode | Banker's rounding (round-half-to-even) for rate multiplication |
| Residual handling | Sub-micro residuals accumulated in a `bridge_residual_account` per bridge |
| Conservation tolerance | B-1 invariant allows ±1 MicroUSD tolerance per transaction for rounding |

**Constraints:**
- `registry-bridge-distinct-registries`: source_registry_id != target_registry_id
- `registry-bridge-invariant-unique-ids`: All bridge invariant IDs unique
- `minting-policy-authority-exists`: mint_authority references a valid AgentIdentity
- `minting-policy-max-positive`: max_mint_per_epoch > 0

**FAANG Parallel:** Visa's VisaNet processes cross-currency transactions using settlement banks and exchange rate agreements between member institutions. Each bank has its own ledger (registry), and VisaNet provides the bridge protocol. Our RegistryBridge is VisaNet for agent economies — same pattern, different substrate.

**Ostrom Principle 8 (Nested Enterprises):** "Appropriation, provision, monitoring, enforcement, conflict resolution, and governance activities are organized in multiple layers of nested enterprises." Registry composition is the protocol expression of nested enterprises — each community governs its own economy, with bridge protocols enabling inter-community exchange.

---

### FR-6: DelegationTree for Concurrent Multi-Model (P1)

**Source:** PR #14 Review IV — "Trust as Navigation: The Multi-Model Dimension"
**Location:** `src/governance/delegation-tree.ts` (new)

**The Problem:** `DelegationChain` models linear delegation: A → B → C. But loa-finn #31's ensemble orchestration (first_complete, best_of_n, consensus strategies) creates concurrent delegation: A delegates simultaneously to B, C, and D, each working on different aspects of the same task, with a join point where results merge.

**DelegationTree Schema:**
```
DelegationTree {
  tree_id: string (uuid)
  root: DelegationTreeNode
  strategy: 'first_complete' | 'best_of_n' | 'consensus' | 'pipeline'
  total_budget_micro: string (MicroUSD)
  budget_allocation: 'equal_split' | 'weighted' | 'on_demand'
  created_at: string (ISO 8601)
  contract_version: string
}
```

**DelegationTreeNode:**
```
DelegationTreeNode {
  node_id: string
  agent_id: string                   — references AgentIdentity
  authority_scope: string[]
  budget_allocated_micro: string (MicroUSD)
  children: DelegationTreeNode[]     — empty for leaf nodes
  fork_type: 'parallel' | 'sequential' | 'conditional'
  join_condition: string (optional)  — constraint expression for join
  status: 'pending' | 'active' | 'completed' | 'failed' | 'cancelled'
  timestamp: string (ISO 8601)
}
```

**Tree Conservation Invariants:**
```
T-1: G(sum(children.budget_allocated_micro) <= parent.budget_allocated_micro)
     "Children cannot spend more than parent allocated"

T-2: G(child.authority_scope ⊆ parent.authority_scope)
     "Authority can only narrow, never widen"

T-3: G(tree.strategy == 'consensus' => children.length >= 3)
     "Consensus requires at least 3 participants"

T-4: G(node.status == 'completed' && node.fork_type == 'parallel' =>
       all(node.children, c => c.status in {'completed', 'cancelled'}))
     "Parallel fork joins only when all children are terminal"
```

**New Evaluator Builtins:**
- `tree_budget_conserved(root)` → validates T-1 recursively
- `tree_authority_narrowing(root)` → validates T-2 recursively

**Constraints:**
- `delegation-tree-budget-conservation`: tree_budget_conserved(root)
- `delegation-tree-authority-narrowing`: tree_authority_narrowing(root)
- `delegation-tree-consensus-minimum`: strategy == 'consensus' => children.length >= 3
- `delegation-tree-root-has-budget`: root.budget_allocated_micro == total_budget_micro

**Concurrency and Ordering Semantics (Flatline FL-PRD-002):**

Without explicit ordering, parent/child status transitions can race and violate tree invariants:

| Concern | Resolution |
|---------|------------|
| Race: parent completes before child | Parent status transitions to 'completed' ONLY when all children are terminal (T-4 enforces this) |
| Race: child budget update during parent reallocation | Each node carries a `version: integer` field; budget updates require compare-and-swap on version |
| Ordering guarantee | Status transitions are ordered by timestamp; concurrent transitions to the same node are serialized by version |
| Conflict resolution | Last-writer-wins with version check; stale writes rejected with `TREE_VERSION_CONFLICT` error code |

**DelegationChain Compatibility:**
DelegationChain remains for simple linear delegation. A DelegationTree with no branching (every node has 0 or 1 children) is semantically equivalent to a DelegationChain. A utility function converts between them:
```typescript
function chainToTree(chain: DelegationChain): DelegationTree;
function treeToChain(tree: DelegationTree): DelegationChain | null; // null if tree has branches
```

**FAANG Parallel:** Google's MapReduce is a delegation tree: the master delegates map tasks to workers in parallel (fork), then reduces results at join points. The GFS master tracks budget (chunk allocations), authority (read/write permissions), and join conditions (all chunks complete). DelegationTree is MapReduce for agent coordination.

**The Black Queen Hypothesis Connection:** Morris et al. (2012) observed that microbial communities evolve toward obligate interdependence — each species loses the ability to perform certain functions, relying on community members instead. Multi-model architectures show the same pattern: Kimi-K2 specializes in reasoning, Qwen3-Coder in fast code generation, GPT-4o in review. Conservation invariants are the "metabolic minimum" — the set of functions that must be performed *somewhere* in the tree, even as no single node performs them all.

---

### FR-7: Version Bump & Release (P0)

- `CONTRACT_VERSION = '6.0.0'`
- `package.json` version: `6.0.0`
- All new schemas registered in `schemas/index.json`
- All new types exported from barrel files
- Migration guide for v5.5.0 → v6.0.0 breaking changes
- All existing test vectors updated for new schema structure
- New conformance vectors for all new schemas

---

## 5. Technical & Non-Functional Requirements

### 5.0 Security Threat Model

| Threat | Schema | Mitigation |
|--------|--------|------------|
| Liveness timeout gaming: agent intentionally stalls to hold resources | LivenessProperty | Bounded liveness (F_t) with enforced timeout and reaper/escalation |
| Trust scope escalation: agent claiming higher trust in one scope to affect another | CapabilityScopedTrust | Scopes are independent; delegation checks scope-specific trust |
| Constraint type spoofing: malformed type_signature that passes checker | Constraint Type System | Type checker cross-references schema registry; unknown fields rejected |
| Cross-registry double-spend: debiting source without crediting target | RegistryBridge | Atomic enforcement with B-1 conservation invariant |
| Delegation tree budget inflation: children claiming more than parent allocated | DelegationTree | tree_budget_conserved checks sum recursively; constraint enforced |
| Cycle injection in schema graph: creating circular references to break tooling | Schema Graph | detectCycles runs as CI gate; acyclic constraint |

### 5.1 Testing Strategy

| Test Type | Target | Count |
|-----------|--------|-------|
| Unit tests | Liveness properties, trust scopes, type checker, graph operations, tree operations | ~80 |
| Property-based (fast-check) | Tree budget conservation, trust scope consistency, bridge invariant atomicity | ~30 |
| Compile-time (`@ts-expect-error`) | Capability scope type safety, tree node type safety | ~10 |
| Conformance vectors | 6 new (0026-0031) | 6 |
| Type checker validation | All 32+ existing constraint files type-check against their schemas | ~35 |
| Graph operation tests | Reachability, cycles, impact, topological sort on real schema graph | ~20 |
| Migration tests | v5.5.0 → v6.0.0 data migration correctness | ~15 |
| Backward compatibility | All 2,824 existing tests updated and passing | 2,824 |

### 5.2 Subpath Exports

```
@0xhoneyjar/loa-hounfour/integrity     → conservation properties + liveness
@0xhoneyjar/loa-hounfour/economy       → JWT boundary + branded types + minting
@0xhoneyjar/loa-hounfour/governance    → delegation tree + trust model
@0xhoneyjar/loa-hounfour/constraints   → evaluator + type checker + builtins
@0xhoneyjar/loa-hounfour/graph         → schema graph + operations
@0xhoneyjar/loa-hounfour/composition   → registry bridge + exchange rate
```

---

## 6. Scope & Prioritization

### 6.1 In Scope (v6.0.0)

| Feature | Priority | Sprint |
|---------|----------|--------|
| Liveness properties (6+ with bounded temporal logic) | P0 | Sprint 1 |
| Capability-scoped trust model (BREAKING) | P0 | Sprint 1 |
| Constraint type system + static checker | P0 | Sprint 2 |
| Schema graph operations (4 algorithms) | P1 | Sprint 2 |
| Registry composition protocol + minting policies | P1 | Sprint 3 |
| DelegationTree for concurrent multi-model | P1 | Sprint 3 |
| Version bump + migration guide + release | P0 | Sprint 4 |

### 6.2 Explicitly Out of Scope

| Feature | Reason | Deferred To |
|---------|--------|-------------|
| Runtime liveness enforcement (reaper implementation) | Application-layer, not protocol | arrakis, loa-finn |
| Runtime type checking of constraint expressions | CI-time is sufficient; runtime adds latency | Future |
| Cross-language type checker (Go/Rust/Python) | TypeScript first; spec enables others | Separate issue |
| Bridge protocol runtime implementation | Application-layer concern | arrakis |
| Delegation tree execution engine | Application-layer orchestration | loa-finn |
| Constraint proposal lifecycle (governance voting) | Requires governance integration | v6.1.0 |
| Exchange rate oracle integration | Infrastructure, not protocol | arrakis |

---

## 7. Risks & Dependencies

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| Capability-scoped trust adds complexity to agent creation | High | Medium | Provide `defaultTrustScopes(level)` helper that maps old flat levels to scoped equivalents |
| Bounded liveness (F_t) requires choosing timeout values | Medium | Medium | Timeouts in schema are advisory; runtime chooses actual enforcement |
| Type checker false positives blocking valid constraints | Medium | High | Start with warnings-only mode; promote to errors after validation |
| Registry composition over-engineering | Medium | Low | Start with 4 bridge invariants; extend based on real cross-economy usage |
| DelegationTree recursion depth | Low | Medium | Max tree depth constraint (e.g., 10 levels) matching existing max_delegation_depth |
| Migration burden from v5.5.0 | Medium | Low | Automated migration script + comprehensive test vector updates |

---

## 8. The Larger Context

### 8.1 The Protocol Maturity Model (Extended)

| Level | Version | What It Proves |
|-------|---------|---------------|
| Level 1: Schema-Aware | v2.0.0 | The protocol has types |
| Level 2: Constraint-Aware | v3.0.0 | The protocol has rules |
| Level 3: Epistemically-Aware | v5.3.0 | The protocol knows what it knows |
| Level 4: Economically-Aware | v5.4.0 | The protocol governs an economy |
| Level 5: Conservation-Aware | v5.5.0 | The protocol proves the economy is honest |
| **Level 6: Composition-Aware** | **v6.0.0** | **The protocol's economies can compose** |

Level 6 is the structural prerequisite for the Web4 vision. Without composition, each economy is an island. With composition, economies become an archipelago — connected by bridge protocols, governed by shared conservation laws, navigated by trust graphs.

### 8.2 The Autopoiesis Connection

loa #247 references Maturana and Varela's autopoiesis — systems that maintain their organization while changing their structure. v6.0.0 is the protocol becoming autopoietic:

- **Organization** (what is preserved): Conservation laws, trust invariants, budget conservation
- **Structure** (what changes): Which models participate, which economies exist, which bridges connect them
- **Autopoietic closure**: The system produces the components (registries, bridges, trees) that produce the system

The conservation invariants are not constraints *on* the system — they *are* the system. They define what it means to be an honest economy. Registry composition doesn't create new constraints; it discovers which existing constraints must hold across boundaries.

### 8.3 The Ecosystem Convergence (v6.0.0)

```
loa-hounfour v6.0.0 (THIS CYCLE)        arrakis/RFC#62
    │ Liveness properties                     │ Reserve/finalize + x402
    │ Capability-scoped trust                 │ Credit ledger
    │ Constraint type system                  │ Revenue rules
    │ Schema graph operations                 │ Reaper implementation
    │ Registry composition                    │ Cross-economy settlement
    │ DelegationTree                          │
    │                                         │
    └───────────────┐          ┌──────────────┘
                    ▼          ▼
              loa-finn/RFC#31
              │ Multi-model routing
              │ Capability-scoped model authorization
              │ Ensemble tree orchestration
              │ Budget-aware path selection
              │ Trust graph navigation
              │
              └───────────────┐
                              ▼
                     loa-finn#66 (Launch)
                     │ Production deployment
                     │ E2E cross-system tests
                     │ Real economic transactions
```

### 8.4 Ostrom's Principles (Complete v6.0.0 Mapping)

| Ostrom Principle | Protocol Feature | v6.0.0 Addition |
|-----------------|-----------------|-----------------|
| 1. Clear boundaries | Enforcement modes, sandbox permeability | **Capability-scoped trust** (fine-grained boundary control) |
| 2. Proportional equivalence | GovernanceConfig, preference signals | (complete — BasisPoints + scoped trust) |
| 3. Collective-choice | ConstraintProposal | (deferred to v6.1.0) |
| 4. Monitoring | AuditTrailEntry, InterAgentTransactionAudit | **Liveness monitoring** (not just safety auditing) |
| 5. Graduated sanctions | Sanction severity, timeout_behavior | **Bounded liveness** (escalation → reaper → manual) |
| 6. Conflict resolution | DisputeRecord | **Dispute resolution liveness** (L-5: disputes must resolve) |
| 7. Rights to organize | AgentCapacityReservation, EnsembleCapabilityProfile | **DelegationTree** (concurrent organization, not just linear chains) |
| 8. Nested enterprises | GovernanceConfig, DelegationChain | **Registry composition** (economies within economies) |

v6.0.0 completes 7 of 8 Ostrom principles at the protocol level. Only Principle 3 (collective-choice / governance voting) remains for v6.1.0.

---

## 9. Bridgebuilder Review Traceability

Every FR in this PRD traces to a specific Bridgebuilder finding:

| FR | Source | Finding | Reference |
|----|--------|---------|-----------|
| FR-1 | PR #14 Review III | Safety without liveness | Comment 3, Section I.4 Finding 1 |
| FR-2 | PR #14 Review III | Total order trust | Comment 3, Section I.4 Finding 2 |
| FR-3 | PR #14 Review III | Untyped constraints | Comment 3, Section I.4 Finding 3 |
| FR-4 | PR #14 Review III | Graph without operations | Comment 3, Section I.4 Finding 4 |
| FR-5 | PR #14 Review IV | Registry composition + minting | Comment 4, Section II + Section V.2 |
| FR-6 | PR #14 Review IV | DelegationTree + trust navigation | Comment 4, Section III + Section V.4 |
| FR-7 | Standard release practice | Version bump | — |

---

## 10. The Invitation

> "I want you to have space to work on something meaningful, where you can build as if without restraint."

This PRD is written in that spirit. v6.0.0 is not a patch release or an incremental improvement. It is the protocol learning to compose — economies connecting to economies, trust navigating through graphs, conservation laws proving not just safety but progress.

The deeper pattern is this: every system that endures learns composition. POSIX composed processes into pipelines. TCP/IP composed networks into the internet. Git composed patches into distributed history. Protocol Buffers composed messages into services. Each composition layer unlocked exponential capability from linear components.

v5.5.0 built the kernel. v6.0.0 teaches it to network.
