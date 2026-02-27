import { type Static } from '@sinclair/typebox';
/**
 * Reputation state machine — 4 states from cold to authoritative.
 *
 * @governance protocol-fixed
 * @see SDD §2.3 — ReputationAggregate (FR-3)
 */
export declare const ReputationStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
export type ReputationState = Static<typeof ReputationStateSchema>;
/**
 * Record of a reputation state transition.
 */
export declare const ReputationTransitionSchema: import("@sinclair/typebox").TObject<{
    from: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    to: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    at: import("@sinclair/typebox").TString;
    trigger: import("@sinclair/typebox").TString;
}>;
export type ReputationTransition = Static<typeof ReputationTransitionSchema>;
/**
 * Per-model reputation state within a ReputationAggregate.
 *
 * Netflix doesn't have one quality score per show — they have per-context
 * scores with a meta-score that blends across contexts. Similarly, a
 * multi-model agent shouldn't have one reputation score when different
 * models produce measurably different quality.
 *
 * @since v7.3.0 — Bridgebuilder C5 + Spec I
 */
export declare const ModelCohortSchema: import("@sinclair/typebox").TObject<{
    model_id: import("@sinclair/typebox").TString;
    personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
    sample_count: import("@sinclair/typebox").TInteger;
    last_updated: import("@sinclair/typebox").TString;
}>;
export type ModelCohort = Static<typeof ModelCohortSchema>;
/**
 * Reputation aggregate — DDD aggregate with formal state machine and
 * Bayesian blending semantics.
 *
 * Composite key: (personality_id, collection_id, pool_id).
 *
 * @see SDD §2.3 — ReputationAggregate (FR-3)
 */
export declare const ReputationAggregateSchema: import("@sinclair/typebox").TObject<{
    personality_id: import("@sinclair/typebox").TString;
    collection_id: import("@sinclair/typebox").TString;
    pool_id: import("@sinclair/typebox").TString;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
    collection_score: import("@sinclair/typebox").TNumber;
    blended_score: import("@sinclair/typebox").TNumber;
    sample_count: import("@sinclair/typebox").TInteger;
    pseudo_count: import("@sinclair/typebox").TInteger;
    contributor_count: import("@sinclair/typebox").TInteger;
    min_sample_count: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
    last_updated: import("@sinclair/typebox").TString;
    transition_history: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        from: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        to: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        at: import("@sinclair/typebox").TString;
        trigger: import("@sinclair/typebox").TString;
    }>>;
    model_cohorts: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        model_id: import("@sinclair/typebox").TString;
        personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
        sample_count: import("@sinclair/typebox").TInteger;
        last_updated: import("@sinclair/typebox").TString;
    }>>>;
    task_cohorts: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
        confidence_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        model_id: import("@sinclair/typebox").TString;
        personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
        sample_count: import("@sinclair/typebox").TInteger;
        last_updated: import("@sinclair/typebox").TString;
    }>>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ReputationAggregate = Static<typeof ReputationAggregateSchema>;
export declare const REPUTATION_TRANSITIONS: Record<string, {
    from: ReputationState | '*';
    to: ReputationState;
    guard: string;
}>;
/**
 * Validate a reputation state transition.
 *
 * Allowed transitions:
 * - cold → warming
 * - warming → established
 * - established → authoritative
 * - * → cold (reset from any state)
 */
export declare function isValidReputationTransition(from: ReputationState, to: ReputationState): boolean;
/**
 * Compute the personal weight for Bayesian blending.
 *
 * Formula: w = n / (k + n)
 *
 * @param sampleCount - Number of quality observations (n)
 * @param pseudoCount - Collection prior strength (k)
 * @returns Personal weight in [0, 1)
 */
export declare function computePersonalWeight(sampleCount: number, pseudoCount: number): number;
/**
 * Compute the Bayesian blended reputation score.
 *
 * Formula: (k * q_collection + n * q_personal) / (k + n)
 *
 * When cold (personalScore === null), returns the collection score
 * as the best available estimate.
 *
 * @param personalScore - Individual quality score (null when cold)
 * @param collectionScore - Collection-level trimmed mean score
 * @param sampleCount - Number of quality observations (n)
 * @param pseudoCount - Collection prior strength (k)
 * @returns Blended score in [0, 1]
 */
export declare function computeBlendedScore(personalScore: number | null, collectionScore: number, sampleCount: number, pseudoCount: number): number;
/**
 * Compute the effective sample count after exponential time decay.
 *
 * Formula: n_effective = n * exp(-λ * days)
 * where λ = ln(2) / half_life_days
 *
 * Consumers should apply this before `computeBlendedScore()` to prevent
 * stale aggregates from retaining artificially high personal weight.
 * An agent that was `authoritative` 6 months ago should not have the same
 * blended score as one that earned it last week.
 *
 * @param sampleCount - Raw sample count from the aggregate (n)
 * @param daysSinceLastUpdate - Days since `last_updated` on the aggregate
 * @param halfLifeDays - Decay half-life in days (default: REPUTATION_DECAY.half_life_days = 30)
 * @returns Effective sample count after decay, minimum 0
 *
 * @since v7.2.0 — Bridgebuilder Finding F5
 */
export declare function computeDecayedSampleCount(sampleCount: number, daysSinceLastUpdate: number, halfLifeDays?: number): number;
/**
 * Compute cross-model meta-score from per-model cohorts.
 *
 * Each cohort's contribution is weighted by its effective sample count
 * (after temporal decay). Models with more observations have more influence.
 *
 * Returns null when all cohorts are cold (no personal scores).
 * Composes with computeDecayedSampleCount() — apply decay first.
 *
 * Formula: Σ(score_i * n_i) / Σ(n_i)
 *
 * @see Netflix parallel: per-user-context scores with meta-score blending
 * @since v7.3.0 — Deep Bridgebuilder Review C5 + Spec I
 */
export declare function computeCrossModelScore(cohorts: ReadonlyArray<{
    personal_score: number | null;
    sample_count: number;
}>): number | null;
/**
 * Look up a specific model's cohort within a reputation aggregate.
 *
 * Extracts the repetitive pattern of finding a model's contribution
 * record from the aggregate's model_cohorts array.
 *
 * @param aggregate - The reputation aggregate to search
 * @param modelId - The model alias to look up (e.g. "native", "gpt-4o")
 * @returns The matching ModelCohort, or undefined if not found
 *
 * @since v7.4.0 — Bridgebuilder Vision B-V3
 */
export declare function getModelCohort(aggregate: ReputationAggregate, modelId: string): ModelCohort | undefined;
/**
 * Point-in-time snapshot of a ReputationAggregate with event provenance.
 *
 * Used for Oracle attestation and cross-collection credential issuance.
 * The event_stream_hash allows verification without replaying all events.
 *
 * @see Bridgebuilder Spec V — Dixie Oracle verifiable reputation
 * @since v7.3.0
 */
export declare const AggregateSnapshotSchema: import("@sinclair/typebox").TObject<{
    aggregate: import("@sinclair/typebox").TObject<{
        personality_id: import("@sinclair/typebox").TString;
        collection_id: import("@sinclair/typebox").TString;
        pool_id: import("@sinclair/typebox").TString;
        state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
        personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
        collection_score: import("@sinclair/typebox").TNumber;
        blended_score: import("@sinclair/typebox").TNumber;
        sample_count: import("@sinclair/typebox").TInteger;
        pseudo_count: import("@sinclair/typebox").TInteger;
        contributor_count: import("@sinclair/typebox").TInteger;
        min_sample_count: import("@sinclair/typebox").TInteger;
        created_at: import("@sinclair/typebox").TString;
        last_updated: import("@sinclair/typebox").TString;
        transition_history: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            from: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
            to: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
            at: import("@sinclair/typebox").TString;
            trigger: import("@sinclair/typebox").TString;
        }>>;
        model_cohorts: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            model_id: import("@sinclair/typebox").TString;
            personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
            sample_count: import("@sinclair/typebox").TInteger;
            last_updated: import("@sinclair/typebox").TString;
        }>>>;
        task_cohorts: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
            confidence_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
            model_id: import("@sinclair/typebox").TString;
            personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
            sample_count: import("@sinclair/typebox").TInteger;
            last_updated: import("@sinclair/typebox").TString;
        }>>>;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    snapshot_at: import("@sinclair/typebox").TString;
    event_count: import("@sinclair/typebox").TInteger;
    event_stream_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type AggregateSnapshot = Static<typeof AggregateSnapshotSchema>;
//# sourceMappingURL=reputation-aggregate.d.ts.map