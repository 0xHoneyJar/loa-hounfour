/**
 * Feedback Dampening — EMA-based score smoothing with cold-start Bayesian prior.
 *
 * Pure function, zero external dependencies. Production-validated across 16 dixie cycles.
 * Implements adaptive alpha ramp: slow initial response, convergence to steady state.
 *
 * Bounded feedback invariant: |result - old| <= alpha_max * |new - old|
 *
 * V-007 variance formula choice: sample variance for small n (unbiased estimator).
 *
 * @see PRD FR-3 — Feedback Dampening Constants
 * @see SDD §5.3 — Feedback Dampening
 * @since v8.3.0
 */
import { Type } from '@sinclair/typebox';
/**
 * Default alpha_min — minimum learning rate (high sample count).
 * Low value prevents overreaction to outliers in mature populations.
 */
export const FEEDBACK_DAMPENING_ALPHA_MIN = 0.1;
/**
 * Default alpha_max — maximum learning rate (low sample count).
 * Higher value allows faster convergence during early data collection.
 */
export const FEEDBACK_DAMPENING_ALPHA_MAX = 0.5;
/**
 * Default ramp samples — number of observations to reach full alpha_max → alpha_min ramp.
 * After ramp_samples observations, alpha stabilizes at alpha_min.
 */
export const DAMPENING_RAMP_SAMPLES = 50;
/**
 * Default pseudo-count — Bayesian prior weight for cold-start smoothing.
 * Higher values pull cold-start estimates toward 0.5 (maximum uncertainty).
 */
export const DEFAULT_PSEUDO_COUNT = 10;
/**
 * Configuration for feedback dampening behavior.
 */
export const FeedbackDampeningConfigSchema = Type.Object({
    alpha_min: Type.Number({
        minimum: 0,
        maximum: 1,
        default: FEEDBACK_DAMPENING_ALPHA_MIN,
        description: 'Minimum learning rate (used at high sample counts).',
    }),
    alpha_max: Type.Number({
        minimum: 0,
        maximum: 1,
        default: FEEDBACK_DAMPENING_ALPHA_MAX,
        description: 'Maximum learning rate (used at low sample counts).',
    }),
    ramp_samples: Type.Integer({
        minimum: 1,
        default: DAMPENING_RAMP_SAMPLES,
        description: 'Number of samples to complete alpha ramp from max to min.',
    }),
    pseudo_count: Type.Integer({
        minimum: 0,
        default: DEFAULT_PSEUDO_COUNT,
        description: 'Bayesian prior weight for cold-start smoothing.',
    }),
}, {
    $id: 'FeedbackDampeningConfig',
    additionalProperties: false,
});
/**
 * Compute a dampened score using EMA with adaptive alpha ramp.
 *
 * Cold start (oldScore === null): Uses Bayesian pseudo-count prior to pull
 * the initial estimate toward 0.5, weighted by evidence strength.
 *
 * Steady state: EMA update with alpha that ramps from alpha_max (responsive)
 * to alpha_min (conservative) as sampleCount increases.
 *
 * @param oldScore - Previous score (null for first observation)
 * @param newScore - New observation value
 * @param sampleCount - Number of observations so far (including this one)
 * @param config - Optional dampening configuration (uses defaults if omitted)
 * @returns Dampened score
 */
export function computeDampenedScore(oldScore, newScore, sampleCount, config) {
    const alphaMin = config?.alpha_min ?? FEEDBACK_DAMPENING_ALPHA_MIN;
    const alphaMax = config?.alpha_max ?? FEEDBACK_DAMPENING_ALPHA_MAX;
    const rampSamples = config?.ramp_samples ?? DAMPENING_RAMP_SAMPLES;
    const pseudoCount = config?.pseudo_count ?? DEFAULT_PSEUDO_COUNT;
    if (alphaMin > alphaMax) {
        throw new Error(`alpha_min (${alphaMin}) must not exceed alpha_max (${alphaMax})`);
    }
    // Cold start: Bayesian pseudo-count prior
    if (oldScore === null) {
        const effectiveSamples = Math.max(sampleCount, 1);
        const weight = pseudoCount / (pseudoCount + effectiveSamples);
        return weight * 0.5 + (1 - weight) * newScore;
    }
    // Adaptive alpha ramp: alpha_max at n=0, alpha_min at n>=ramp_samples
    const rampProgress = Math.min(sampleCount / rampSamples, 1);
    const alpha = alphaMin + (alphaMax - alphaMin) * (1 - rampProgress);
    // EMA update
    return oldScore + alpha * (newScore - oldScore);
}
//# sourceMappingURL=feedback-dampening.js.map