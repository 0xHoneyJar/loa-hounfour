/**
 * Shared base fields for model cohort schemas.
 *
 * This is a leaf module — it imports ONLY from @sinclair/typebox and has
 * zero dependencies on other governance modules. Both ModelCohortSchema
 * (reputation-aggregate.ts) and TaskTypeCohortSchema (task-type-cohort.ts)
 * spread from these fields, ensuring a single source of truth.
 *
 * @since v7.10.1 — Bridgebuilder Finding 3 (shared field extraction)
 */
import { Type } from '@sinclair/typebox';

/**
 * Base fields shared by all cohort schemas (ModelCohort, TaskTypeCohort).
 *
 * Spread these into Type.Object() definitions to ensure field alignment:
 * ```typescript
 * const MySchema = Type.Object({
 *   ...COHORT_BASE_FIELDS,
 *   // additional fields
 * });
 * ```
 */
export const COHORT_BASE_FIELDS = {
  model_id: Type.String({ minLength: 1, description: 'Model alias (e.g. "native", "gpt-4o")' }),
  personal_score: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()], {
    description: 'Per-model personal score. Null when this cohort is cold (no observations yet).',
  }),
  sample_count: Type.Integer({ minimum: 0, description: 'Number of quality observations for this model' }),
  last_updated: Type.String({ format: 'date-time', description: 'Timestamp of most recent observation for this model' }),
} as const;
