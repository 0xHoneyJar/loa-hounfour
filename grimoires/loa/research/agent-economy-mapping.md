# Agent Economy Research Mapping — v5.4.0

**Version:** 5.4.0
**Date:** 2026-02-17
**Status:** Published

---

## Abstract

v5.4.0 "The Agent Economy" extends the loa-hounfour protocol from governing individual agent economics to governing relational agent economics. This document maps each new schema and extension to its academic source, traces the design decisions to research principles, and analyzes convergence across three DeepMind research papers.

---

## Paper 1: Intelligent AI Delegation (arXiv:2602.11865)

**Core thesis:** Safe AI delegation requires structured authority chains with explicit scope narrowing and temporal bounds.

### Schema Mapping

| Paper Concept | Schema | File | Field(s) |
|---------------|--------|------|----------|
| Delegation chain | `DelegationChainSchema` | `src/schemas/model/routing/delegation-chain.ts` | `chain_id`, `links`, `root_delegator` |
| Authority scope narrowing | `DelegationLinkSchema` | `src/schemas/model/routing/delegation-chain.ts` | `authority_scope` |
| Depth bounds | `DelegationChainSchema` | `src/schemas/model/routing/delegation-chain.ts` | `max_depth` |
| Budget allocation per hop | `DelegationLinkSchema` | `src/schemas/model/routing/delegation-chain.ts` | `budget_allocated_micro` |
| Revocation (FL-PRD-001) | `DelegationChainSchema` | `src/schemas/model/routing/delegation-chain.ts` | `revocation_policy` |

### Constraint Mapping

| Paper Principle | Constraint ID | Expression |
|----------------|---------------|------------|
| Depth limits prevent unbounded delegation | `delegation-depth-limit` | `links.length <= max_depth` |
| Authority must narrow at each hop | `delegation-authority-conservation` | `all_links_subset_authority(links)` |
| Budget cannot exceed parent allocation | `delegation-budget-conservation` | `delegation_budget_conserved(links)` |
| Temporal ordering is irreversible | `delegation-temporal-ordering` | `links_temporally_ordered(links)` |
| Chain must be contiguous | `delegation-link-continuity` | `links_form_chain(links)` |

---

## Paper 2: Virtual Agent Economies (arXiv:2509.10147)

**Core thesis:** Agent economies need both market mechanisms (auctions, pricing) and institutional structures (governance, sandboxes) to remain stable and fair.

### Schema Mapping

| Paper Concept | Schema | File | Field(s) |
|---------------|--------|------|----------|
| Inter-agent transfers | `InterAgentTransactionAuditSchema` | `src/schemas/inter-agent-transaction-audit.ts` | `sender`, `receiver`, `amount_micro` |
| Conservation invariant | `InterAgentTransactionAuditSchema` | `src/schemas/inter-agent-transaction-audit.ts` | `conservation_check` |
| Idempotency (FL-SDD-003) | `InterAgentTransactionAuditSchema` | `src/schemas/inter-agent-transaction-audit.ts` | `idempotency_key` |
| Sandbox economy model | `GovernanceConfigSchema` | `src/schemas/governance-config.ts` | `sandbox_permeability` |
| Auction preference signals | `PreferenceSignalSchema` | `src/schemas/model/routing/budget-scope.ts` | `bid_priority`, `cost_sensitivity` |

### Constraint Mapping

| Paper Principle | Constraint ID | Expression |
|----------------|---------------|------------|
| Transfers are zero-sum | `transaction-sender-conservation` | `bigint_eq(bigint_sub(...), ...)` |
| Receiver balance grows by exact amount | `transaction-receiver-conservation` | `bigint_eq(bigint_add(...), ...)` |
| No self-dealing | `transaction-no-self-transfer` | `sender.agent_id != receiver.agent_id` |
| Sandbox consistency | `governance-sandbox-consistency` | `sandbox_permeability != 'impermeable' \|\| advisory == 0` |

---

## Paper 3: Distributional AGI Safety (arXiv:2512.16856)

**Core thesis:** AGI may emerge as a "patchwork" — collections of individually limited systems that together exhibit capabilities no single system possesses. Safety analysis must account for emergent properties of ensembles.

### Schema Mapping

| Paper Concept | Schema | File | Field(s) |
|---------------|--------|------|----------|
| Patchwork AGI hypothesis | `EnsembleCapabilityProfileSchema` | `src/schemas/model/ensemble/ensemble-capability-profile.ts` | `emergent_capabilities` |
| Individual vs collective | `EnsembleCapabilityProfileSchema` | Same | `individual_capabilities` vs `emergent_capabilities` |
| Evidence requirements | `CapabilityEvidenceSchema` | Same | `evidence_type`, `vector_id` |
| Safety profiles | `SafetyProfileSchema` | Same | `max_autonomy_level`, `requires_human_approval` |

### Constraint Mapping

| Paper Principle | Constraint ID | Expression |
|----------------|---------------|------------|
| Emergent != individual | `ensemble-capability-emergent-not-individual` | `no_emergent_in_individual(...)` |
| Claims need evidence | `ensemble-capability-evidence-required` | `all_emergent_have_evidence(...)` |
| Model keys must align | `ensemble-capability-individual-keys-match-models` | `object_keys_subset(...)` |

---

## Convergence Analysis

The three papers converge on several shared principles that v5.4.0 encodes structurally:

### 1. Conservation as Protocol Invariant

All three papers assume that resources (authority, budget, capability) are conserved across transformations. In v5.4.0:
- **DelegationChain**: authority_scope narrows monotonically; budget cannot exceed parent allocation
- **InterAgentTransactionAudit**: pre/post balances satisfy zero-sum conservation
- **EnsembleCapabilityProfile**: emergent capabilities are structurally separated from individual capabilities (no double-counting)

### 2. Explicit Scope Bounding

Each paper emphasizes the danger of unbounded scope:
- **Delegation**: max_depth prevents infinite chains
- **Transactions**: typed transaction_type prevents category confusion
- **Ensembles**: safety_profile.max_autonomy_level bounds operational scope

### 3. Evidence-Based Trust

Trust is earned through verifiable evidence, not declared:
- **Delegation**: outcome field tracks completion vs failure
- **Transactions**: conservation_check is a verifiable tristate, not just "pass"
- **Ensembles**: capability_evidence requires `tested|theoretical|observed` classification

---

## Ostrom Principles Progress

Elinor Ostrom's 8 principles for governing the commons map naturally to protocol features. v5.4.0 advances several:

| Ostrom Principle | v5.3.0 Status | v5.4.0 Advancement |
|-----------------|---------------|-------------------|
| 1. Defined boundaries | Reservation tiers | Sandbox permeability axis |
| 2. Proportional equivalence | Conformance levels | Preference signals for bidding |
| 3. Collective choice | GovernanceConfig | mission_alignment field |
| 4. Monitoring | AuditTrailEntry | InterAgentTransactionAudit |
| 5. Graduated sanctions | Sanction schema | Delegation revocation policy |
| 6. Conflict resolution | DisputeRecord | Delegation outcome tracking |
| 7. Minimal recognition of rights | Agent descriptors | Delegation authority_scope |
| 8. Nested enterprises | Ensemble strategies | EnsembleCapabilityProfile |

---

## File Reference

| Schema/Extension | Source File | Constraint File |
|-----------------|-------------|-----------------|
| DelegationChain | `src/schemas/model/routing/delegation-chain.ts` | `constraints/DelegationChain.constraints.json` |
| InterAgentTransactionAudit | `src/schemas/inter-agent-transaction-audit.ts` | `constraints/InterAgentTransactionAudit.constraints.json` |
| EnsembleCapabilityProfile | `src/schemas/model/ensemble/ensemble-capability-profile.ts` | `constraints/EnsembleCapabilityProfile.constraints.json` |
| GovernanceConfig (extended) | `src/schemas/governance-config.ts` | `constraints/GovernanceConfig.constraints.json` |
| BudgetScope (extended) | `src/schemas/model/routing/budget-scope.ts` | `constraints/BudgetScope.constraints.json` |
