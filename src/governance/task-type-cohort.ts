/**
 * TaskTypeCohort — per-(model, task_type) reputation state.
 *
 * Extends ModelCohort semantics with task_type to enable task-dimensional scoring.
 * Uses explicit Type.Object with duplicated fields (Flatline SKP-002 fallback)
 * to avoid circular import with reputation-aggregate.ts. A superset guard test
 * in task-type-cohort.test.ts verifies all ModelCohort fields remain in sync.
 *
 * Uniqueness invariant: within a single ReputationAggregate, no two
 * TaskTypeCohort entries may share the same (model_id, task_type) pair.
 * This is enforced at the constraint level, not the schema level.
 *
 * @see SDD §4.2 — TaskTypeCohort
 * @since v7.10.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { TaskTypeSchema } from './task-type.js';

/**
 * Per-(model, task_type) reputation cohort.
 *
 * Fields model_id, personal_score, sample_count, last_updated are
 * duplicated from ModelCohortSchema to break the circular dependency.
 * The superset guard test ensures these stay aligned.
 */
export const TaskTypeCohortSchema = Type.Object(
  {
    // Duplicated from ModelCohortSchema
    model_id: Type.String({ minLength: 1, description: 'Model alias (e.g. "native", "gpt-4o")' }),
    personal_score: Type.Union([Type.Number({ minimum: 0, maximum: 1 }), Type.Null()], {
      description: 'Per-(model, task_type) personal score. Null when this cohort is cold.',
    }),
    sample_count: Type.Integer({ minimum: 0, description: 'Number of quality observations for this (model, task_type) pair' }),
    last_updated: Type.String({ format: 'date-time', description: 'Timestamp of most recent observation' }),
    // New field
    task_type: TaskTypeSchema,
  },
  {
    $id: 'TaskTypeCohort',
    additionalProperties: false,
  },
);

export type TaskTypeCohort = Static<typeof TaskTypeCohortSchema>;

/**
 * Find duplicate (model_id, task_type) pairs in a TaskTypeCohort array.
 *
 * Returns an array of duplicate keys. Empty array means no duplicates.
 *
 * @param cohorts - Array of TaskTypeCohort entries to check
 * @returns Array of `"model_id:task_type"` strings that appear more than once
 */
export function validateTaskCohortUniqueness(
  cohorts: ReadonlyArray<{ model_id: string; task_type: string }>,
): string[] {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const cohort of cohorts) {
    const key = `${cohort.model_id}:${cohort.task_type}`;
    if (seen.has(key)) {
      if (!duplicates.includes(key)) {
        duplicates.push(key);
      }
    } else {
      seen.add(key);
    }
  }

  return duplicates;
}
