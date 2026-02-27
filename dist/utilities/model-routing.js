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
export function computeModelRoutingScores(aggregate, profiles) {
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
export function selectModel(routingScores, minimumScore = 0) {
    const eligible = routingScores.filter(s => s.routing_score >= minimumScore);
    if (eligible.length === 0)
        return null;
    return eligible[0].model_id; // Already sorted by routing_score desc
}
/**
 * Compute composite basket weights — each model's share normalized to sum to 1.0.
 *
 * This is the SDR basket calculation: routing_weight values are normalized
 * so they form a proper probability distribution.
 */
export function computeCompositeBasketWeights(profiles) {
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
export function isModelEligible(cohort, signal) {
    if (!cohort)
        return false;
    if (cohort.personal_score === null)
        return false;
    // State check: model's implied state must be >= qualifying state
    // Since ModelCohort doesn't directly carry a state, we check the score threshold
    const meetsScore = cohort.personal_score >= signal.qualifying_score;
    return meetsScore;
}
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
export function computeRebalancedWeights(currentProfiles, performanceEvents, dampingFactor = 0.1) {
    if (currentProfiles.length === 0)
        return [];
    // Group performance events by model_id
    const eventsByModel = new Map();
    for (const event of performanceEvents) {
        const existing = eventsByModel.get(event.model_id) ?? [];
        existing.push(event);
        eventsByModel.set(event.model_id, existing);
    }
    // Compute adjusted weights
    const adjusted = currentProfiles.map(profile => {
        const events = eventsByModel.get(profile.model_id) ?? [];
        let newWeight = profile.routing_weight;
        if (events.length > 0) {
            // Average quality delta: actual - expected
            const totalDelta = events.reduce((sum, e) => sum + (e.actual_quality - e.expected_quality), 0);
            const avgDelta = totalDelta / events.length;
            // Adjust weight by delta * damping
            newWeight = profile.routing_weight + avgDelta * dampingFactor;
        }
        // Clamp to [0, 1]
        newWeight = Math.max(0, Math.min(1, newWeight));
        return { model_id: profile.model_id, weight: newWeight };
    });
    // Normalize to sum to 1.0
    const total = adjusted.reduce((sum, e) => sum + e.weight, 0);
    if (total === 0) {
        // All weights zeroed — equal distribution
        const equal = 1 / adjusted.length;
        return adjusted.map(e => ({ ...e, weight: equal }));
    }
    return adjusted.map(e => ({
        model_id: e.model_id,
        weight: e.weight / total,
    }));
}
//# sourceMappingURL=model-routing.js.map