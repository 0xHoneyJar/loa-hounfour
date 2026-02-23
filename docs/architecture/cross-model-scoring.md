# Cross-Model Reputation Scoring

## Overview

The cross-model scoring system treats per-model reputation cohorts as weighted components of a meta-score, analogous to the IMF's Special Drawing Rights (SDR) basket where each currency is weighted by trade volume.

## Implementation

### Core Function

`computeCrossModelScore()` in `src/governance/reputation-aggregate.ts:260-277`:

```
Formula: Σ(score_i × n_i) / Σ(n_i)
```

Each model cohort's contribution is weighted by its effective sample count (after temporal decay). Models with more observations have proportionally more influence on the aggregate score.

### Supporting Infrastructure

| Component | Location | Purpose |
|-----------|----------|---------|
| `ModelCohortSchema` | `src/governance/reputation-aggregate.ts:40-51` | Per-model reputation state |
| `computeDecayedSampleCount()` | `src/governance/reputation-aggregate.ts:231-240` | Temporal decay (half-life) |
| `computeCrossModelScore()` | `src/governance/reputation-aggregate.ts:260-277` | Weighted meta-scoring |
| `getModelCohort()` | `src/governance/reputation-aggregate.ts:295-300` | Cohort lookup helper |

## SDR Parallel

The cross-model scoring mechanism mirrors the IMF SDR basket:

| SDR Concept | Protocol Equivalent |
|-------------|-------------------|
| Currency in basket | Model cohort (e.g., "native", "gpt-4o") |
| Trade volume weight | `sample_count` (observation frequency) |
| Basket rebalancing | Adding/removing model cohorts |
| Currency depreciation | `computeDecayedSampleCount()` (exponential decay) |

### Model Addition (Currency Inclusion)

When a new model is added to an agent's repertoire, it starts with `sample_count: 0` and `personal_score: null` (cold state). Its weight in the meta-score is zero until observations accumulate — analogous to a new currency entering the SDR basket with no initial trade volume.

### Model Deprecation (Currency Removal)

When a model is deprecated, its cohort's sample count decays exponentially via `computeDecayedSampleCount()`. The half-life (default: 30 days) ensures the deprecated model's influence fades naturally rather than requiring explicit removal — analogous to a currency's SDR weight declining as trade volume decreases.

### Rebalancing (Weight Adjustment)

The meta-score automatically rebalances as observation patterns change. A model receiving more quality events gains proportionally more weight. No manual rebalancing is needed — the formula `Σ(score_i × n_i) / Σ(n_i)` inherently reflects current usage patterns.

## Composition

The cross-model score composes with the Bayesian blending pipeline:

1. **Per-model decay**: `computeDecayedSampleCount(cohort.sample_count, days, halfLife)`
2. **Cross-model aggregation**: `computeCrossModelScore(decayedCohorts)`
3. **Bayesian blending**: `computeBlendedScore(crossModelScore, collectionScore, totalSamples, pseudoCount)`

This three-stage pipeline ensures that model-level reputation, temporal relevance, and collection-level priors are all reflected in the final blended score.
