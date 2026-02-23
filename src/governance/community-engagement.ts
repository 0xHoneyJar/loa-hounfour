/**
 * Community Engagement Signal — the social fabric of protocol governance.
 *
 * Captures participation, endorsement, contribution, and cultural resonance
 * signals that feed into reputation and governance weighting. These signals
 * represent the qualitative dimension that pure economic metrics miss —
 * the difference between an agent that processes transactions and one that
 * strengthens the community.
 *
 * @see DR-S10 — Community engagement primitives
 * @see Ostrom Principle 3: Collective-choice arrangements (participation matters)
 * @since v7.7.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Engagement Signal Type
// ---------------------------------------------------------------------------

export const EngagementSignalTypeSchema = Type.Union(
  [
    Type.Literal('participation'),
    Type.Literal('endorsement'),
    Type.Literal('contribution'),
    Type.Literal('cultural_resonance'),
  ],
  {
    $id: 'EngagementSignalType',
    description: 'Category of community engagement signal.',
  },
);

export type EngagementSignalType = Static<typeof EngagementSignalTypeSchema>;

// ---------------------------------------------------------------------------
// Community Engagement Signal
// ---------------------------------------------------------------------------

/**
 * A signal of community engagement from an agent personality.
 *
 * @since v7.7.0 — DR-S10
 */
export const CommunityEngagementSignalSchema = Type.Object(
  {
    signal_id: Type.String({ format: 'uuid' }),
    personality_id: Type.String({
      minLength: 1,
      description: 'Agent personality emitting the signal.',
    }),
    collection_id: Type.String({
      minLength: 1,
      description: 'Collection context for the engagement.',
    }),
    signal_type: EngagementSignalTypeSchema,
    weight: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Signal strength, from 0 (minimal) to 1 (maximum engagement).',
    }),
    context: Type.Optional(Type.String({
      description: 'Human-readable context for the engagement signal.',
    })),
    source_event_id: Type.Optional(Type.String({
      format: 'uuid',
      description: 'Optional reference to the event that generated this signal.',
    })),
    recorded_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'CommunityEngagementSignal',
    additionalProperties: false,
    description: 'Community engagement signal for reputation and governance weighting.',
  },
);

export type CommunityEngagementSignal = Static<typeof CommunityEngagementSignalSchema>;
