/**
 * Economic Boundary — the membrane between trust and capital.
 *
 * Captures the boundary conditions at the moment an access decision is made:
 * what was the agent's reputation state, what was their remaining budget,
 * and what was the decision? This is the JWT boundary pipeline (Part 1, §VII)
 * made explicit as a first-class schema.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @see FAANG parallel: Google Zanzibar relationship tuples (trust × policy → decision)
 * @since v7.7.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReputationStateSchema } from '../governance/reputation-aggregate.js';

// ---------------------------------------------------------------------------
// Trust Layer Snapshot
// ---------------------------------------------------------------------------

export const TrustLayerSnapshotSchema = Type.Object(
  {
    reputation_state: ReputationStateSchema,
    blended_score: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Blended reputation score at time of evaluation.',
    }),
    snapshot_at: Type.String({
      format: 'date-time',
      description: 'When the trust layer was evaluated.',
    }),
  },
  {
    $id: 'TrustLayerSnapshot',
    additionalProperties: false,
    description: 'Point-in-time snapshot of the trust layer for access evaluation.',
  },
);

export type TrustLayerSnapshot = Static<typeof TrustLayerSnapshotSchema>;

// ---------------------------------------------------------------------------
// Capital Layer Snapshot
// ---------------------------------------------------------------------------

export const CapitalLayerSnapshotSchema = Type.Object(
  {
    budget_remaining: Type.String({
      pattern: '^[0-9]+$',
      description: 'Remaining budget in micro-USD.',
    }),
    billing_tier: Type.String({
      minLength: 1,
      description: 'Current billing tier of the agent.',
    }),
    budget_period_end: Type.String({
      format: 'date-time',
      description: 'When the current budget period expires.',
    }),
  },
  {
    $id: 'CapitalLayerSnapshot',
    additionalProperties: false,
    description: 'Point-in-time snapshot of the capital layer for access evaluation.',
  },
);

export type CapitalLayerSnapshot = Static<typeof CapitalLayerSnapshotSchema>;

// ---------------------------------------------------------------------------
// Access Decision
// ---------------------------------------------------------------------------

export const AccessDecisionSchema = Type.Object(
  {
    granted: Type.Boolean({ description: 'Whether access was granted.' }),
    policy_id: Type.Optional(Type.String({
      description: 'Which access policy evaluated the request.',
    })),
    denial_reason: Type.Optional(Type.String({
      description: 'Why access was denied, populated when granted is false.',
    })),
  },
  {
    $id: 'AccessDecision',
    additionalProperties: false,
    description: 'Result of an access evaluation at the economic boundary.',
  },
);

export type AccessDecision = Static<typeof AccessDecisionSchema>;

// ---------------------------------------------------------------------------
// Economic Boundary
// ---------------------------------------------------------------------------

/**
 * The economic membrane — captures the complete context of an access decision
 * at the boundary between trust and capital layers.
 *
 * @since v7.7.0 — DR-S10
 */
export const EconomicBoundarySchema = Type.Object(
  {
    boundary_id: Type.String({ format: 'uuid' }),
    personality_id: Type.String({
      minLength: 1,
      description: 'Agent personality being evaluated.',
    }),
    collection_id: Type.String({
      minLength: 1,
      description: 'Collection context for the evaluation.',
    }),
    trust_layer: TrustLayerSnapshotSchema,
    capital_layer: CapitalLayerSnapshotSchema,
    access_decision: AccessDecisionSchema,
    evaluated_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'EconomicBoundary',
    additionalProperties: false,
    description: 'Economic membrane: trust × capital → access decision.',
  },
);

export type EconomicBoundary = Static<typeof EconomicBoundarySchema>;
