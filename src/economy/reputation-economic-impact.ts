/**
 * Reputation Economic Impact — the feedback loop from trust to capital.
 *
 * When an agent's reputation changes, economic consequences follow:
 * tier upgrades, access revocations, budget adjustments, routing changes.
 * This schema records those consequences, completing the Conway Automaton
 * survival chain: existence → compute → money → value creation → write access.
 *
 * @see DR-S10 — Economic membrane cross-layer schemas
 * @see loa-finn #80 — Conway Automaton survival chain comparison
 * @since v7.7.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReputationStateSchema } from '../governance/reputation-aggregate.js';

// ---------------------------------------------------------------------------
// Economic Impact Type
// ---------------------------------------------------------------------------

export const EconomicImpactTypeSchema = Type.Union(
  [
    Type.Literal('tier_upgrade'),
    Type.Literal('tier_downgrade'),
    Type.Literal('access_granted'),
    Type.Literal('access_revoked'),
    Type.Literal('budget_adjusted'),
    Type.Literal('routing_changed'),
  ],
  {
    $id: 'EconomicImpactType',
    description: 'Category of economic consequence from a reputation change.',
  },
);

export type EconomicImpactType = Static<typeof EconomicImpactTypeSchema>;

// ---------------------------------------------------------------------------
// Trigger Event
// ---------------------------------------------------------------------------

export const ReputationTriggerEventSchema = Type.Object(
  {
    event_type: Type.Union([
      Type.Literal('state_transition'),
      Type.Literal('score_change'),
      Type.Literal('demotion'),
      Type.Literal('decay'),
    ], {
      description: 'What kind of reputation change triggered the economic impact.',
    }),
    from_state: Type.Optional(ReputationStateSchema),
    to_state: Type.Optional(ReputationStateSchema),
    score_delta: Type.Optional(Type.Number({
      description: 'Change in blended score (positive = improvement).',
    })),
  },
  {
    $id: 'ReputationTriggerEvent',
    additionalProperties: false,
    description: 'The reputation event that triggered economic consequences.',
  },
);

export type ReputationTriggerEvent = Static<typeof ReputationTriggerEventSchema>;

// ---------------------------------------------------------------------------
// Impact Entry
// ---------------------------------------------------------------------------

export const EconomicImpactEntrySchema = Type.Object(
  {
    impact_type: EconomicImpactTypeSchema,
    description: Type.String({
      minLength: 1,
      description: 'Human-readable description of the economic impact.',
    }),
    policy_version_id: Type.Optional(Type.String({
      format: 'uuid',
      description: 'Which PolicyVersion governed this impact.',
    })),
  },
  {
    $id: 'EconomicImpactEntry',
    additionalProperties: false,
    description: 'A single economic consequence of a reputation change.',
  },
);

export type EconomicImpactEntry = Static<typeof EconomicImpactEntrySchema>;

// ---------------------------------------------------------------------------
// Reputation Economic Impact
// ---------------------------------------------------------------------------

/**
 * Records the economic consequences of a reputation change.
 *
 * @since v7.7.0 — DR-S10
 */
export const ReputationEconomicImpactSchema = Type.Object(
  {
    impact_id: Type.String({ format: 'uuid' }),
    personality_id: Type.String({
      minLength: 1,
      description: 'Agent whose reputation changed.',
    }),
    collection_id: Type.String({
      minLength: 1,
      description: 'Collection context.',
    }),
    trigger_event: ReputationTriggerEventSchema,
    impacts: Type.Array(EconomicImpactEntrySchema, {
      minItems: 1,
      description: 'Economic consequences (at least one required).',
    }),
    occurred_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'ReputationEconomicImpact',
    additionalProperties: false,
    description: 'Economic consequences of a reputation change.',
  },
);

export type ReputationEconomicImpact = Static<typeof ReputationEconomicImpactSchema>;
