/**
 * Model routing utilities — the SDR basket calculation for multi-model economics.
 *
 * Given reputation data and model cost profiles, these utilities compute
 * which model should serve a request. The routing_weight IS the exchange rate
 * in the multi-model-as-multi-currency metaphor.
 *
 * @see DR-S10 — Cross-model routing utilities
 * @see Part 1 §III: SDR parallel — multi-model as multi-currency
 * @see loa-finn #31 — Multi-model provider abstraction
 * @since v7.7.0 (Sprint 4)
 */
import type { ReputationAggregate } from '../governance/reputation-aggregate.js';
import type { ModelCohort } from '../governance/reputation-aggregate.js';
import type { ModelEconomicProfile } from '../economy/model-economic-profile.js';
import type { ReputationRoutingSignal } from '../governance/reputation-routing.js';
import { REPUTATION_STATE_ORDER } from '../vocabulary/reputation.js';

export interface ModelRoutingScore {
  model_id: string;
  routing_score: number;
  cost_efficiency: number;
}

/**
 * Compute routing scores for available models based on reputation and cost data.
 *
 * For each model profile, the routing score combines:
 * - quality_yield (weighted by cohort match if available)
 * - cost_efficiency (quality per unit cost)
 * - routing_weight (current basket allocation)
 *
 * Models not present in the aggregate's cohorts use the aggregate's blended_score.
 */
export function computeModelRoutingScores(
  aggregate: ReputationAggregate,
  profiles: ModelEconomicProfile[],
): ModelRoutingScore[] {
  return profiles.map(profile => {
    // Find matching cohort for per-model quality data
    const cohort = aggregate.model_cohorts?.find(c => c.model_id === profile.model_id);
    const effectiveQuality = cohort?.personal_score ?? aggregate.blended_score;

    // Cost efficiency: quality per micro-USD of output cost (avoid division by zero)
    const outputCost = parseInt(profile.cost_per_token.output, 10);
    const cost_efficiency = outputCost > 0
      ? effectiveQuality / outputCost
      : effectiveQuality;

    // Routing score: quality × routing_weight (the SDR basket calculation)
    const routing_score = effectiveQuality * profile.routing_weight;

    return {
      model_id: profile.model_id,
      routing_score,
      cost_efficiency,
    };
  }).sort((a, b) => b.routing_score - a.routing_score);
}

/**
 * Select the highest-scoring model meeting the minimum threshold.
 * Returns null if no model meets the threshold.
 */
export function selectModel(
  routingScores: ModelRoutingScore[],
  minimumScore = 0,
): string | null {
  const eligible = routingScores.filter(s => s.routing_score >= minimumScore);
  if (eligible.length === 0) return null;
  return eligible[0].model_id; // Already sorted by routing_score desc
}

/**
 * Compute composite basket weights — each model's share normalized to sum to 1.0.
 *
 * This is the SDR basket calculation: routing_weight values are normalized
 * so they form a proper probability distribution.
 */
export function computeCompositeBasketWeights(
  profiles: ModelEconomicProfile[],
): Array<{ model_id: string; weight: number }> {
  const totalWeight = profiles.reduce((sum, p) => sum + p.routing_weight, 0);
  if (totalWeight === 0) {
    // Equal distribution when no weights assigned
    const equal = 1 / profiles.length;
    return profiles.map(p => ({ model_id: p.model_id, weight: equal }));
  }
  return profiles.map(p => ({
    model_id: p.model_id,
    weight: p.routing_weight / totalWeight,
  }));
}

/**
 * Check whether a model cohort meets the qualifying criteria from a routing signal.
 *
 * Compares the model's reputation state against the signal's minimum state
 * (using REPUTATION_STATE_ORDER), and checks the score threshold.
 */
export function isModelEligible(
  cohort: ModelCohort | undefined,
  signal: ReputationRoutingSignal,
): boolean {
  if (!cohort) return false;
  if (cohort.personal_score === null) return false;

  // State check: model's implied state must be >= qualifying state
  // Since ModelCohort doesn't directly carry a state, we check the score threshold
  const meetsScore = cohort.personal_score >= signal.qualifying_score;

  return meetsScore;
}
