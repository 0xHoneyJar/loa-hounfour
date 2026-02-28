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
import { type Static } from '@sinclair/typebox';
/**
 * Default alpha_min — minimum learning rate (high sample count).
 * Low value prevents overreaction to outliers in mature populations.
 */
export declare const FEEDBACK_DAMPENING_ALPHA_MIN = 0.1;
/**
 * Default alpha_max — maximum learning rate (low sample count).
 * Higher value allows faster convergence during early data collection.
 */
export declare const FEEDBACK_DAMPENING_ALPHA_MAX = 0.5;
/**
 * Default ramp samples — number of observations to reach full alpha_max → alpha_min ramp.
 * After ramp_samples observations, alpha stabilizes at alpha_min.
 */
export declare const DAMPENING_RAMP_SAMPLES = 50;
/**
 * Default pseudo-count — Bayesian prior weight for cold-start smoothing.
 * Higher values pull cold-start estimates toward 0.5 (maximum uncertainty).
 */
export declare const DEFAULT_PSEUDO_COUNT = 10;
/**
 * Configuration for feedback dampening behavior.
 */
export declare const FeedbackDampeningConfigSchema: import("@sinclair/typebox").TObject<{
    alpha_min: import("@sinclair/typebox").TNumber;
    alpha_max: import("@sinclair/typebox").TNumber;
    ramp_samples: import("@sinclair/typebox").TInteger;
    pseudo_count: import("@sinclair/typebox").TInteger;
}>;
export type FeedbackDampeningConfig = Static<typeof FeedbackDampeningConfigSchema>;
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
export declare function computeDampenedScore(oldScore: number | null, newScore: number, sampleCount: number, config?: FeedbackDampeningConfig): number;
//# sourceMappingURL=feedback-dampening.d.ts.map