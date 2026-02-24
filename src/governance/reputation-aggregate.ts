import { Type, type Static } from '@sinclair/typebox';
import { DEFAULT_HALF_LIFE_DAYS } from '../vocabulary/reputation.js';
import { TaskTypeCohortSchema } from './task-type-cohort.js';
import { COHORT_BASE_FIELDS } from './cohort-base-fields.js';

/**
 * Reputation state machine — 4 states from cold to authoritative.
 *
 * @governance protocol-fixed
 * @see SDD §2.3 — ReputationAggregate (FR-3)
 */
export const ReputationStateSchema = Type.Union([
  Type.Literal('cold'),
  Type.Literal('warming'),
  Type.Literal('established'),
  Type.Literal('authoritative'),
], { $id: 'ReputationState' });

export type ReputationState = Static<typeof ReputationStateSchema>;

/**
 * Record of a reputation state transition.
 */
export const ReputationTransitionSchema = Type.Object({
  from: ReputationStateSchema,
  to: ReputationStateSchema,
  at: Type.String({ format: 'date-time' }),
  trigger: Type.String({ minLength: 1 }),
});

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
export const ModelCohortSchema = Type.Object({
  ...COHORT_BASE_FIELDS,
}, {
  $id: 'ModelCohort',
  additionalProperties: false,
});

export type ModelCohort = Static<typeof ModelCohortSchema>;

/**
 * Reputation aggregate — DDD aggregate with formal state machine and
 * Bayesian blending semantics.
 *
 * Composite key: (personality_id, collection_id, pool_id).
 *
 * @see SDD §2.3 — ReputationAggregate (FR-3)
 */
export const ReputationAggregateSchema = Type.Object({
  // Identity keys (composite: personality + collection + pool)
  personality_id: Type.String({ minLength: 1 }),
  collection_id: Type.String({ minLength: 1 }),
  pool_id: Type.String({ minLength: 1 }),

  // State machine
  state: ReputationStateSchema,

  // Bayesian blend components
  personal_score: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()]),
  collection_score: Type.Number({
    minimum: 0, maximum: 1,
    description: 'Collection-level trimmed mean of member blended scores. '
      + 'In the Web4 social monies framing, this represents the institutional credibility '
      + 'of the collection\'s monetary instrument — higher scores indicate more trustworthy social money.',
  }),
  blended_score: Type.Number({ minimum: 0, maximum: 1 }),
  sample_count: Type.Integer({ minimum: 0 }),
  pseudo_count: Type.Integer({ minimum: 1, default: 3 }),

  // Anti-manipulation
  contributor_count: Type.Integer({ minimum: 0 }),
  min_sample_count: Type.Integer({ minimum: 1, default: 5 }),

  // Temporal
  created_at: Type.String({ format: 'date-time' }),
  last_updated: Type.String({ format: 'date-time' }),
  transition_history: Type.Array(ReputationTransitionSchema),

  // Model-aware cohorts (v7.3.0 — Bridgebuilder C5 + Spec I)
  model_cohorts: Type.Optional(Type.Array(ModelCohortSchema, {
    description: 'Per-model reputation cohorts. When present, each entry tracks quality '
      + 'observations for a specific model alias. The top-level personal_score and '
      + 'sample_count represent the cross-model aggregation. Enables model-aware routing '
      + 'decisions per Hounfour RFC #31.',
  })),

  // Task-dimensional cohorts (v7.10.0 — Task-Dimensional Reputation)
  task_cohorts: Type.Optional(Type.Array(TaskTypeCohortSchema, {
    maxItems: 50,
    description: 'Per-(model, task_type) reputation cohorts. Each entry tracks quality '
      + 'observations for a specific (model_id, task_type) pair. Uniqueness invariant: '
      + 'no two entries may share the same (model_id, task_type) key. Max 50 entries '
      + 'to bound storage in hot-path lookups.',
  })),

  // Protocol versioning
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'ReputationAggregate',
  additionalProperties: false,
});

export type ReputationAggregate = Static<typeof ReputationAggregateSchema>;

// ---------------------------------------------------------------------------
// State Machine — Transition Map
// ---------------------------------------------------------------------------

export const REPUTATION_TRANSITIONS: Record<string, {
  from: ReputationState | '*';
  to: ReputationState;
  guard: string;
}> = {
  warm: {
    from: 'cold',
    to: 'warming',
    guard: 'First QualityEvent recorded',
  },
  establish: {
    from: 'warming',
    to: 'established',
    guard: 'sample_count >= min_sample_count',
  },
  authorize: {
    from: 'established',
    to: 'authoritative',
    guard: 'personal_weight > AUTHORITATIVE_THRESHOLD',
  },
  reset: {
    from: '*',
    to: 'cold',
    guard: 'Admin action',
  },
};

/**
 * Validate a reputation state transition.
 *
 * Allowed transitions:
 * - cold → warming
 * - warming → established
 * - established → authoritative
 * - * → cold (reset from any state)
 */
export function isValidReputationTransition(
  from: ReputationState,
  to: ReputationState,
): boolean {
  // Reset to cold is always allowed
  if (to === 'cold') return true;

  for (const transition of Object.values(REPUTATION_TRANSITIONS)) {
    if (transition.to === to && (transition.from === from || transition.from === '*')) {
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Bayesian Computation
// ---------------------------------------------------------------------------

/**
 * Compute the personal weight for Bayesian blending.
 *
 * Formula: w = n / (k + n)
 *
 * @param sampleCount - Number of quality observations (n)
 * @param pseudoCount - Collection prior strength (k)
 * @returns Personal weight in [0, 1)
 */
export function computePersonalWeight(
  sampleCount: number,
  pseudoCount: number,
): number {
  return sampleCount / (pseudoCount + sampleCount);
}

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
export function computeBlendedScore(
  personalScore: number | null,
  collectionScore: number,
  sampleCount: number,
  pseudoCount: number,
): number {
  if (personalScore === null) return collectionScore;
  return (pseudoCount * collectionScore + sampleCount * personalScore)
    / (pseudoCount + sampleCount);
}

// ---------------------------------------------------------------------------
// Temporal Decay (v7.2.0 — Bridgebuilder Finding F5)
// ---------------------------------------------------------------------------

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
export function computeDecayedSampleCount(
  sampleCount: number,
  daysSinceLastUpdate: number,
  halfLifeDays: number = DEFAULT_HALF_LIFE_DAYS,
): number {
  if (daysSinceLastUpdate <= 0) return sampleCount;
  if (halfLifeDays <= 0) return 0;
  const lambda = Math.LN2 / halfLifeDays;
  return Math.max(0, sampleCount * Math.exp(-lambda * daysSinceLastUpdate));
}

// ---------------------------------------------------------------------------
// Cross-Model Meta-Scoring (v7.3.0 — Bridgebuilder C5 + Spec I)
// ---------------------------------------------------------------------------

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
export function computeCrossModelScore(
  cohorts: ReadonlyArray<{
    personal_score: number | null;
    sample_count: number;
  }>,
): number | null {
  let weightedSum = 0;
  let totalWeight = 0;

  for (const cohort of cohorts) {
    if (cohort.personal_score === null) continue;
    weightedSum += cohort.personal_score * cohort.sample_count;
    totalWeight += cohort.sample_count;
  }

  if (totalWeight === 0) return null;
  return weightedSum / totalWeight;
}

// ---------------------------------------------------------------------------
// Model Cohort Lookup (v7.4.0 — Bridgebuilder Vision B-V3)
// ---------------------------------------------------------------------------

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
export function getModelCohort(
  aggregate: ReputationAggregate,
  modelId: string,
): ModelCohort | undefined {
  return aggregate.model_cohorts?.find(c => c.model_id === modelId);
}

// ---------------------------------------------------------------------------
// Aggregate Snapshot (v7.3.0 — Bridgebuilder C2 + Spec V)
// ---------------------------------------------------------------------------

/**
 * Point-in-time snapshot of a ReputationAggregate with event provenance.
 *
 * Used for Oracle attestation and cross-collection credential issuance.
 * The event_stream_hash allows verification without replaying all events.
 *
 * @see Bridgebuilder Spec V — Dixie Oracle verifiable reputation
 * @since v7.3.0
 */
export const AggregateSnapshotSchema = Type.Object({
  aggregate: ReputationAggregateSchema,
  snapshot_at: Type.String({ format: 'date-time' }),
  event_count: Type.Integer({ minimum: 0 }),
  event_stream_hash: Type.Optional(Type.String({
    pattern: '^[a-f0-9]{64}$',
    description: 'SHA-256 hash of the ordered event stream. '
      + 'Enables verification without full replay.',
  })),
  contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
  $id: 'AggregateSnapshot',
  additionalProperties: false,
});

export type AggregateSnapshot = Static<typeof AggregateSnapshotSchema>;
