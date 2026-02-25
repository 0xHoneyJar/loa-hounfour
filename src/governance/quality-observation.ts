/**
 * QualityObservation — structured quality result from model performance evaluation.
 *
 * Factored as a standalone schema because it represents Dixie's quality
 * evaluation output — a reusable concept that may appear in batch evaluation
 * reports and other contexts beyond the event pipeline.
 *
 * @see PRD FR-2 — QualityObservation Sub-Schema
 * @see Issue #38 — model_performance variant
 * @since v8.2.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Structured quality observation from a model performance evaluation.
 *
 * The `dimensions` record uses the same pattern constraint as
 * `quality_signal.dimensions` to ensure cross-variant dimension names
 * are comparable (e.g., a consumer can compare `quality_signal.dimensions.coherence`
 * with `model_performance.quality_observation.dimensions.coherence`).
 */
export const QualityObservationSchema = Type.Object(
  {
    score: Type.Number({
      minimum: 0,
      maximum: 1,
      description: 'Overall quality score in [0, 1].',
    }),
    dimensions: Type.Optional(Type.Record(
      Type.String({ pattern: '^[a-z][a-z0-9_]{0,31}$' }),
      Type.Number({ minimum: 0, maximum: 1 }),
      {
        maxProperties: 20,
        additionalProperties: false,
        description: 'Named quality dimensions (e.g., coherence, safety). '
          + 'Same pattern constraint as quality_signal dimensions.',
      },
    )),
    latency_ms: Type.Optional(Type.Integer({
      minimum: 0,
      description: 'End-to-end latency of the evaluated request in milliseconds.',
    })),
    evaluated_by: Type.Optional(Type.String({
      minLength: 1,
      description: 'Agent or system that performed the quality evaluation.',
    })),
  },
  {
    $id: 'QualityObservation',
    additionalProperties: false,
  },
);

export type QualityObservation = Static<typeof QualityObservationSchema>;
