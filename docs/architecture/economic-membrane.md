# The Economic Membrane — v7.7.0 Architecture

> *"The boundary between trust and capital is not a wall but a membrane —
> selectively permeable, responsive to reputation gradients."*

## Overview

v7.7.0 introduces the **Economic Membrane**: a formal boundary layer between
reputation (trust) and economic (capital) subsystems. This document describes
the architectural motivation, the schemas that define the membrane, and the
routing utilities that implement the SDR basket calculation for multi-model
economics.

## Architectural Motivation

Prior to v7.7.0, reputation and economic concerns were coupled implicitly:
- Reputation scores influenced access decisions but had no formal economic surface
- Model costs existed in provider specs but lacked connection to quality metrics
- Governance proposals could be ratified but had no execution lifecycle

The Economic Membrane formalizes these boundaries as explicit, auditable schemas.

### The IMF SDR Parallel

The multi-model routing system draws directly from the IMF's Special Drawing
Rights (SDR) basket calculation. Just as the SDR defines a composite currency
from weighted national currencies, our `computeCompositeBasketWeights` normalizes
model routing weights into a probability distribution. Each model is a "currency"
in the agent economy; the routing weight is its exchange rate.

This parallel was identified in the Bridgebuilder deep review (PR #22, Part 1 SIII)
and formalized as loa-finn #31.

## Schema Architecture

### Sprint 1: Governance Execution Bridge (DR-S9)

The gap between proposal ratification and execution:

```
GovernanceProposal (ratified) → ProposalExecution → ProposalOutcomeEvent
```

- **ProposalExecution**: Tracks the execution lifecycle (`pending` → `applying` →
  `applied`/`rolled_back`/`failed`) with per-change application results
- **ProposalOutcomeEvent**: Immutable event record linking proposals to outcomes
- **proposal_execution_valid** builtin: Validates execution state transitions

### Sprint 2: Economic Membrane Schemas

Three schema families define the membrane:

#### EconomicBoundary
The membrane itself — snapshots of trust-layer and capital-layer state that
determine access decisions:

```
TrustLayerSnapshot     ←  reputation_state, blended_score, personal_weight
CapitalLayerSnapshot   ←  available_budget, reserved_amount, currency
AccessDecision         ←  granted, reason, trust/capital snapshots
EconomicBoundary       ←  boundary_id, personality, collection, layers, decision
```

The `conservation_check` field enforces the lot invariant: budget allocations
must be conserved across the boundary crossing.

#### ReputationEconomicImpact
Maps reputation events to economic consequences:

```
EconomicImpactType     ←  rate_adjustment | access_grant | access_revoke | ...
ReputationTriggerEvent ←  The reputation event that caused the impact
EconomicImpactEntry    ←  What changed (type, field, before/after values)
ReputationEconomicImpact ←  Full impact record with entries array
```

#### ModelEconomicProfile
Per-model cost and quality data for routing decisions:

```
CostPerToken           ←  input/output costs in micro-USD (string-encoded)
ModelEconomicProfile   ←  model_id, provider, costs, quality_yield, routing_weight
```

### Sprint 3: Community Engagement + Governance Utilities

- **CommunityEngagementSignal**: Captures participation, endorsement, contribution,
  and cultural resonance signals
- **Governance utilities**: `isProposalActionable`, `computeVotingResult`,
  `isConstraintEnactable`, `computeGovernanceWeight`
- **`now()` builtin**: Zero-argument temporal function returning current ISO 8601

### Sprint 4: Cross-Model Routing Utilities

Four utility functions implement the SDR basket calculation:

| Function | Purpose |
|----------|---------|
| `computeModelRoutingScores` | Score models by quality x routing_weight |
| `selectModel` | Pick highest-scoring model above threshold |
| `computeCompositeBasketWeights` | Normalize weights to probability distribution |
| `isModelEligible` | Check cohort against routing signal criteria |

**`model_routing_eligible` builtin**: Constraint-level eligibility check using
reputation state ordering and score thresholds.

## Conservation Invariants

The Economic Membrane maintains two key conservation properties:

1. **Budget Conservation**: `available_budget + reserved_amount` must be conserved
   across access decisions (enforced by EconomicBoundary constraints)
2. **Quality-Cost Monotonicity**: Higher quality_yield models should correlate
   with higher routing_weight over time (emergent, not enforced)

## Integration Points

- **loa-finn**: Consumes routing utilities for model selection (#31)
- **arrakis**: Uses EconomicBoundary for access control decisions
- **Constraint evaluator**: `model_routing_eligible` and `proposal_execution_valid`
  enable constraint-level validation of economic and governance flows

## Schema Count

v7.7.0 adds 17 schemas over v7.6.0 (127 → 144 total):
- Sprint 1: 4 (execution-status, proposal-execution, proposal-event-type, proposal-outcome-event)
- Sprint 2: 10 (trust/capital/access/boundary, impact-type/trigger/entry/impact, cost-per-token, model-economic-profile)
- Sprint 3: 2 (engagement-signal-type, community-engagement-signal)
- Sprint 4: 1 evaluator builtin (model_routing_eligible), 0 new schemas

## Evaluator Builtins

v7.7.0 adds 3 builtins (37 → 40 total):
- `proposal_execution_valid(from_status, to_status)` — Sprint 1
- `now()` — Sprint 3 (zero-argument temporal utility)
- `model_routing_eligible(qualifying_state, qualifying_score, current_state, current_score)` — Sprint 4
