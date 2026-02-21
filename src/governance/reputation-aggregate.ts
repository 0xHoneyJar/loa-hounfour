import { Type, type Static } from '@sinclair/typebox';
import { REPUTATION_DECAY } from '../vocabulary/reputation.js';

/**
 * Reputation state machine — 4 states from cold to authoritative.
 *
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
  halfLifeDays: number = REPUTATION_DECAY.half_life_days,
): number {
  if (daysSinceLastUpdate <= 0) return sampleCount;
  if (halfLifeDays <= 0) return 0;
  const lambda = Math.LN2 / halfLifeDays;
  return Math.max(0, sampleCount * Math.exp(-lambda * daysSinceLastUpdate));
}
