/**
 * @deprecated Since v7.1.0. Superseded by the Bayesian blending model.
 * Use {@link BAYESIAN_BLEND} for reputation score computation.
 * The v4.3.0 weighted-component model is retained for backwards
 * compatibility but should not be used in new code.
 */
export declare const REPUTATION_WEIGHTS: {
    readonly outcome_quality: 0.4;
    readonly performance_consistency: 0.25;
    readonly dispute_ratio: 0.2;
    readonly community_standing: 0.15;
};
/** @deprecated Since v7.1.0. Use `BAYESIAN_BLEND` instead. */
export type ReputationComponent = keyof typeof REPUTATION_WEIGHTS;
/**
 * @deprecated Since v7.2.0. For temporal decay with the Bayesian model,
 * use `computeDecayedSampleCount()` from `@0xhoneyjar/loa-hounfour/governance`.
 * The `half_life_days` value (30) is still used as the default decay parameter.
 */
export declare const REPUTATION_DECAY: {
    readonly half_life_days: 30;
    readonly floor: 0.1;
    readonly ceiling: 1;
    readonly neutral: 0.5;
};
/**
 * @deprecated Since v7.1.0. Use `BAYESIAN_BLEND.min_sample_count` instead.
 */
export declare const MIN_REPUTATION_SAMPLE_SIZE = 5;
/**
 * Default temporal decay half-life in days for reputation sample counts.
 * Extracted from the deprecated `REPUTATION_DECAY.half_life_days` to break
 * the circular deprecation (active code importing deprecated constant).
 *
 * @since v7.3.1
 */
export declare const DEFAULT_HALF_LIFE_DAYS = 30;
/** Bayesian blending parameters for reputation score computation. */
export declare const BAYESIAN_BLEND: {
    /** Collection prior strength (k). Higher = more conservative. */
    readonly pseudo_count_k: 3;
    /** Minimum observations for 'established' state. */
    readonly min_sample_count: 5;
    /** Personal weight threshold for 'authoritative' state. At k=3: n > 27 reaches 0.9. */
    readonly authoritative_threshold: 0.9;
};
/** Anti-manipulation defaults for collection score computation. */
export declare const ANTI_MANIPULATION: {
    /** Max unique evaluators per aggregate. */
    readonly max_contributors: 100;
    /** Trim top/bottom N% for collection score (trimmed mean). */
    readonly trimmed_mean_percentile: 10;
    /** Minimum distinct evaluators for collection score. */
    readonly min_unique_evaluators: 3;
};
/** Reputation state machine states in order of progression. */
export declare const REPUTATION_STATES: readonly ["cold", "warming", "established", "authoritative"];
/** Reputation state type derived from the canonical state list. */
export type ReputationStateName = typeof REPUTATION_STATES[number];
/** Ordered mapping from reputation state to numeric rank for comparisons. */
export declare const REPUTATION_STATE_ORDER: Record<ReputationStateName, number>;
/**
 * Type-narrowing guard for reputation states.
 *
 * Validates that a string is a known reputation state and narrows the type
 * for the TypeScript compiler. Prefer this over `as ReputationStateName` casts
 * to make runtime validation explicit rather than hidden behind assertions.
 *
 * @since v7.9.1 — F1 deep review improvement
 */
export declare function isKnownReputationState(state: string): state is ReputationStateName;
//# sourceMappingURL=reputation.d.ts.map