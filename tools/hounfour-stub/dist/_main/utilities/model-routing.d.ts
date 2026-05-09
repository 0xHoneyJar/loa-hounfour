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
import type { EconomicPerformanceEvent } from '../economy/economic-performance.js';
import type { ReputationRoutingSignal } from '../governance/reputation-routing.js';
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
export declare function computeModelRoutingScores(aggregate: ReputationAggregate, profiles: ModelEconomicProfile[]): ModelRoutingScore[];
/**
 * Select the highest-scoring model meeting the minimum threshold.
 * Returns null if no model meets the threshold.
 */
export declare function selectModel(routingScores: ModelRoutingScore[], minimumScore?: number): string | null;
/**
 * Compute composite basket weights — each model's share normalized to sum to 1.0.
 *
 * This is the SDR basket calculation: routing_weight values are normalized
 * so they form a proper probability distribution.
 */
export declare function computeCompositeBasketWeights(profiles: ModelEconomicProfile[]): Array<{
    model_id: string;
    weight: number;
}>;
/**
 * Check whether a model cohort meets the qualifying criteria from a routing signal.
 *
 * Compares the model's reputation state against the signal's minimum state
 * (using REPUTATION_STATE_ORDER), and checks the score threshold.
 */
export declare function isModelEligible(cohort: ModelCohort | undefined, signal: ReputationRoutingSignal): boolean;
/**
 * Compute rebalanced basket weights from performance data.
 *
 * Adjusts routing weights based on observed quality vs expected quality.
 * Models that consistently outperform expectations gain weight; models
 * that underperform lose weight. Weights are clamped to [0, 1] and
 * normalized to sum to 1.0.
 *
 * @param currentProfiles - Current ModelEconomicProfile entries
 * @param performanceEvents - Recent EconomicPerformanceEvent entries
 * @param dampingFactor - How aggressively to rebalance (0 = no change, 1 = fully reactive). Default 0.1.
 * @returns New basket entries with rebalanced weights
 *
 * @see DR-F2 — Static routing weights (no rebalancing event)
 * @since v7.8.0 (Sprint 3)
 */
export declare function computeRebalancedWeights(currentProfiles: ModelEconomicProfile[], performanceEvents: EconomicPerformanceEvent[], dampingFactor?: number): Array<{
    model_id: string;
    weight: number;
}>;
//# sourceMappingURL=model-routing.d.ts.map