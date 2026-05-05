/**
 * GovernedFreshness — governed freshness schema.
 *
 * Wire shape for the adaptive-decay ResourceGovernor<T> pattern used by
 * scoring-agent consumers. Conservation law: freshness_score >=
 * minimum_freshness while not expired.
 *
 * @see SDD §4.5.3 — GovernedFreshness
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { GOVERNED_RESOURCE_FIELDS } from './governed-resource.js';

/**
 * Governed freshness with adaptive decay and minimum threshold.
 *
 * State machine: fresh → decaying → stale → expired
 * (monotonic progression + refresh reset to fresh).
 */
export const GovernedFreshnessSchema = Type.Object(
  {
    source_id: Type.String({ minLength: 1 }),
    freshness_score: Type.Number({ minimum: 0, maximum: 1 }),
    decay_rate: Type.Number({
      minimum: 0,
      description: 'Exponential decay coefficient (λ). Score decreases as exp(-λt).',
    }),
    last_refresh: Type.String({ format: 'date-time' }),
    minimum_freshness: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Below this threshold, resource transitions to stale.',
    }),

    ...GOVERNED_RESOURCE_FIELDS,
  },
  {
    $id: 'GovernedFreshness',
    additionalProperties: false,
    description:
      'Governed freshness — wire shape for adaptive-decay weights. '
      + 'Conservation law: freshness_score >= minimum_freshness while not expired.',
  },
);

export type GovernedFreshness = Static<typeof GovernedFreshnessSchema>;
