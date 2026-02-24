/**
 * GovernedReputation — governed reputation schema.
 *
 * Maps to loa-hounfour's ReputationAggregate state machine
 * (cold → warming → established → authoritative).
 *
 * @see SDD §4.5.2 — GovernedReputation
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReputationStateSchema } from '../governance/reputation-aggregate.js';
import { GOVERNED_RESOURCE_FIELDS } from './governed-resource.js';

/**
 * Governed reputation with 4-state machine and Bayesian blending.
 */
export const GovernedReputationSchema = Type.Object(
  {
    personality_id: Type.String({ minLength: 1 }),
    collection_id: Type.String({ minLength: 1 }),
    pool_id: Type.String({ minLength: 1 }),
    reputation_state: ReputationStateSchema,
    personal_score: Type.Union([
      Type.Number({ minimum: 0, maximum: 1 }),
      Type.Null(),
    ]),
    blended_score: Type.Number({ minimum: 0, maximum: 1 }),
    sample_count: Type.Integer({ minimum: 0 }),

    ...GOVERNED_RESOURCE_FIELDS,
  },
  {
    $id: 'GovernedReputation',
    additionalProperties: false,
    description:
      'Governed reputation — maps to ReputationAggregate state machine '
      + '(cold → warming → established → authoritative).',
  },
);

export type GovernedReputation = Static<typeof GovernedReputationSchema>;
