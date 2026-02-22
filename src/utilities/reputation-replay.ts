/**
 * Event sourcing utilities for the Reputation Protocol.
 *
 * Provides replay, verification, and hashing primitives that enable
 * auditable economic protocol operation. Given the event stream,
 * these functions can reconstruct aggregate state, verify consistency,
 * and produce deterministic hashes for Oracle attestation.
 *
 * @see Bridgebuilder C2 — "Event sourcing isn't optional for an
 *   auditable economic protocol — it's the only way to prove the
 *   aggregate state is correct."
 * @see Dixie Oracle (loa-dixie#2) — Oracle verification requires replay
 * @since v7.3.0
 */
import { sha256 } from '@noble/hashes/sha2.js';
import { bytesToHex } from '@noble/hashes/utils.js';
import _canonicalize from 'canonicalize';

import type { QualityEvent } from '../schemas/quality-event.js';
import type {
  ReputationAggregate,
  ReputationState,
  ReputationTransition,
  ModelCohort,
} from '../governance/reputation-aggregate.js';
import {
  computeBlendedScore,
  computePersonalWeight,
} from '../governance/reputation-aggregate.js';
import { BAYESIAN_BLEND, REPUTATION_STATE_ORDER } from '../vocabulary/reputation.js';
import { CONTRACT_VERSION } from '../version.js';

const canonicalize = _canonicalize as unknown as (input: unknown) => string | undefined;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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

// State ordering imported from vocabulary/reputation.ts as REPUTATION_STATE_ORDER

// ---------------------------------------------------------------------------
// S2-T1: reconstructAggregateFromEvents
// ---------------------------------------------------------------------------

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
export function reconstructAggregateFromEvents(
  events: ReadonlyArray<QualityEvent>,
  collectionScore: number,
  pseudoCount: number = BAYESIAN_BLEND.pseudo_count_k,
  minSampleCount: number = BAYESIAN_BLEND.min_sample_count,
): ReconstructedAggregate {
  if (events.length === 0) {
    return {
      personality_id: '',
      collection_id: '',
      pool_id: '',
      state: 'cold',
      personal_score: null,
      collection_score: collectionScore,
      blended_score: collectionScore,
      sample_count: 0,
      pseudo_count: pseudoCount,
      contributor_count: 0,
      min_sample_count: minSampleCount,
      created_at: '',
      last_updated: '',
      transition_history: [],
      model_cohorts: [],
      contract_version: CONTRACT_VERSION,
      event_count: 0,
    };
  }

  // Sort events chronologically
  const sorted = [...events].sort(
    (a, b) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime(),
  );

  // Identity from first event
  const first = sorted[0];
  const personalityId = first.personality_id;
  const collectionId = first.collection_id;
  const poolId = first.pool_id;

  // Accumulate scores and track contributors
  let scoreSum = 0;
  let sampleCount = 0;
  const contributors = new Set<string>();
  const modelCohortMap = new Map<string, { scoreSum: number; count: number; lastUpdated: string }>();
  const transitionHistory: ReputationTransition[] = [];
  let currentState: ReputationState = 'cold';
  let lastUpdated = first.occurred_at;

  for (const event of sorted) {
    sampleCount++;
    scoreSum += event.composite_score;
    contributors.add(event.evaluator_id);
    lastUpdated = event.occurred_at;

    // Track per-model cohorts
    if (event.model_id) {
      const existing = modelCohortMap.get(event.model_id);
      if (existing) {
        existing.scoreSum += event.composite_score;
        existing.count++;
        existing.lastUpdated = event.occurred_at;
      } else {
        modelCohortMap.set(event.model_id, {
          scoreSum: event.composite_score,
          count: 1,
          lastUpdated: event.occurred_at,
        });
      }
    }

    // Compute state transitions
    const weight = computePersonalWeight(sampleCount, pseudoCount);
    let newState: ReputationState = currentState;

    if (currentState === 'cold' && sampleCount >= 1) {
      newState = 'warming';
    }
    if (currentState === 'warming' && sampleCount >= minSampleCount) {
      newState = 'established';
    }
    if (currentState === 'established' && weight > BAYESIAN_BLEND.authoritative_threshold) {
      newState = 'authoritative';
    }

    if (newState !== currentState) {
      const guards: Record<string, string> = {
        warming: 'First QualityEvent recorded',
        established: 'sample_count >= min_sample_count',
        authoritative: 'personal_weight > AUTHORITATIVE_THRESHOLD',
      };
      transitionHistory.push({
        from: currentState,
        to: newState,
        at: event.occurred_at,
        trigger: guards[newState] ?? `Transition to ${newState}`,
      });
      currentState = newState;
    }
  }

  const personalScore = scoreSum / sampleCount;
  const blendedScore = computeBlendedScore(personalScore, collectionScore, sampleCount, pseudoCount);

  // Build model cohorts array
  const modelCohorts: ModelCohort[] = [];
  for (const [modelId, data] of modelCohortMap) {
    modelCohorts.push({
      model_id: modelId,
      personal_score: data.count > 0 ? data.scoreSum / data.count : null,
      sample_count: data.count,
      last_updated: data.lastUpdated,
    });
  }

  return {
    personality_id: personalityId,
    collection_id: collectionId,
    pool_id: poolId,
    state: currentState,
    personal_score: personalScore,
    collection_score: collectionScore,
    blended_score: blendedScore,
    sample_count: sampleCount,
    pseudo_count: pseudoCount,
    contributor_count: contributors.size,
    min_sample_count: minSampleCount,
    created_at: first.occurred_at,
    last_updated: lastUpdated,
    transition_history: transitionHistory,
    model_cohorts: modelCohorts,
    contract_version: CONTRACT_VERSION,
    event_count: sorted.length,
  };
}

// ---------------------------------------------------------------------------
// S2-T2: verifyAggregateConsistency
// ---------------------------------------------------------------------------

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
export function verifyAggregateConsistency(
  stored: ReputationAggregate,
  events: ReadonlyArray<QualityEvent>,
  collectionScore: number,
  tolerance: number = 0.001,
): ConsistencyReport {
  const reconstructed = reconstructAggregateFromEvents(
    events,
    collectionScore,
    stored.pseudo_count,
    stored.min_sample_count,
  );

  const drifts: ConsistencyReport['drifts'] = [];

  // Critical checks
  if (stored.state !== reconstructed.state) {
    drifts.push({
      field: 'state',
      stored: stored.state,
      computed: reconstructed.state,
      severity: 'critical',
    });
  }

  if (stored.sample_count !== reconstructed.sample_count) {
    drifts.push({
      field: 'sample_count',
      stored: stored.sample_count,
      computed: reconstructed.sample_count,
      severity: 'critical',
    });
  }

  // Warning checks (floating-point tolerance)
  if (stored.personal_score !== null && reconstructed.personal_score !== null) {
    if (Math.abs(stored.personal_score - reconstructed.personal_score) > tolerance) {
      drifts.push({
        field: 'personal_score',
        stored: stored.personal_score,
        computed: reconstructed.personal_score,
        severity: 'warning',
      });
    }
  } else if (stored.personal_score !== reconstructed.personal_score) {
    // One is null and the other isn't
    drifts.push({
      field: 'personal_score',
      stored: stored.personal_score,
      computed: reconstructed.personal_score,
      severity: 'warning',
    });
  }

  if (Math.abs(stored.blended_score - reconstructed.blended_score) > tolerance) {
    drifts.push({
      field: 'blended_score',
      stored: stored.blended_score,
      computed: reconstructed.blended_score,
      severity: 'warning',
    });
  }

  // Model cohorts check (warning severity — optional field)
  if (stored.model_cohorts && reconstructed.model_cohorts.length > 0) {
    const storedModels = new Set(stored.model_cohorts.map(c => c.model_id));
    const computedModels = new Set(reconstructed.model_cohorts.map(c => c.model_id));

    for (const modelId of computedModels) {
      if (!storedModels.has(modelId)) {
        drifts.push({
          field: `model_cohorts[${modelId}]`,
          stored: undefined,
          computed: 'present',
          severity: 'warning',
        });
      }
    }

    for (const modelId of storedModels) {
      if (!computedModels.has(modelId)) {
        drifts.push({
          field: `model_cohorts[${modelId}]`,
          stored: 'present',
          computed: undefined,
          severity: 'warning',
        });
      }
    }
  }

  return {
    consistent: drifts.length === 0,
    drifts,
    event_count: events.length,
    reconstructed_state: reconstructed.state,
  };
}

// ---------------------------------------------------------------------------
// S2-T5: computeEventStreamHash
// ---------------------------------------------------------------------------

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
export function computeEventStreamHash(
  events: ReadonlyArray<QualityEvent>,
): string {
  const canonical = canonicalize(events);
  if (canonical === undefined) {
    throw new Error('Failed to canonicalize event stream: input contains non-serializable values');
  }
  return bytesToHex(sha256(new TextEncoder().encode(canonical)));
}
