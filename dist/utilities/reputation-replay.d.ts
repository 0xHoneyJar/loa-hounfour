import type { QualityEvent } from '../schemas/quality-event.js';
import type { ReputationAggregate, ReputationState, ReputationTransition, ModelCohort } from '../governance/reputation-aggregate.js';
/** Reconstructed aggregate with event provenance metadata. */
export interface ReconstructedAggregate {
    personality_id: string;
    collection_id: string;
    pool_id: string;
    state: ReputationState;
    personal_score: number | null;
    collection_score: number;
    blended_score: number;
    sample_count: number;
    pseudo_count: number;
    contributor_count: number;
    min_sample_count: number;
    created_at: string;
    last_updated: string;
    transition_history: ReputationTransition[];
    model_cohorts: ModelCohort[];
    contract_version: string;
    event_count: number;
}
/** Consistency verification report. */
export interface ConsistencyReport {
    consistent: boolean;
    drifts: Array<{
        field: string;
        stored: unknown;
        computed: unknown;
        severity: 'critical' | 'warning';
    }>;
    event_count: number;
    reconstructed_state: ReputationState;
}
/**
 * Reconstruct a ReputationAggregate from an ordered sequence of QualityEvents.
 *
 * This is the event sourcing primitive for the reputation protocol.
 * Given the complete event stream for an aggregate, produces the
 * expected aggregate state. Used for verification (compare against
 * stored aggregate) and audit (prove the aggregate is correct).
 *
 * @param events - Ordered sequence of quality events (chronological)
 * @param collectionScore - Collection-level trimmed mean for blended score computation
 * @param pseudoCount - Bayesian prior strength (default: BAYESIAN_BLEND.pseudo_count_k)
 * @param minSampleCount - Threshold for established state (default: BAYESIAN_BLEND.min_sample_count)
 * @returns Reconstructed aggregate with event provenance
 *
 * @since v7.3.0
 */
export declare function reconstructAggregateFromEvents(events: ReadonlyArray<QualityEvent>, collectionScore: number, pseudoCount?: number, minSampleCount?: number): ReconstructedAggregate;
/**
 * Verify that a stored ReputationAggregate is consistent with its
 * event source — the event stream that should produce it.
 *
 * Returns a detailed consistency report identifying any drift
 * between the stored state and the reconstructed state.
 *
 * @param stored - The stored aggregate to verify
 * @param events - The event stream that should produce the stored state
 * @param collectionScore - Collection-level trimmed mean
 * @param tolerance - Floating-point comparison tolerance (default 0.001)
 * @returns Consistency report with drift details
 *
 * @see Dixie Oracle attestation — "trust, but verify"
 * @since v7.3.0
 */
export declare function verifyAggregateConsistency(stored: ReputationAggregate, events: ReadonlyArray<QualityEvent>, collectionScore: number, tolerance?: number): ConsistencyReport;
/**
 * Compute a deterministic SHA-256 hash of an ordered event stream.
 *
 * Uses JSON canonical serialization (RFC 8785 via canonicalize) + SHA-256
 * (via @noble/hashes). The hash enables event stream verification
 * without storing or transmitting all events.
 *
 * @param events - Ordered sequence of quality events
 * @returns Lowercase hex64 SHA-256 hash
 *
 * @since v7.3.0
 */
export declare function computeEventStreamHash(events: ReadonlyArray<QualityEvent>): string;
//# sourceMappingURL=reputation-replay.d.ts.map