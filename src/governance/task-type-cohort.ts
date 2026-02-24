/**
 * TaskTypeCohort — per-(model, task_type) reputation state.
 *
 * Extends ModelCohort semantics with task_type to enable task-dimensional scoring.
 * Base cohort fields (model_id, personal_score, sample_count, last_updated) are
 * sourced from COHORT_BASE_FIELDS — the single source of truth shared with
 * ModelCohortSchema. This eliminates the field duplication synchronization risk.
 *
 * Uniqueness invariant: within a single ReputationAggregate, no two
 * TaskTypeCohort entries may share the same (model_id, task_type) pair.
 * This is enforced at the constraint level via native_enforcement, not schema level.
 *
 * @see SDD §4.2 — TaskTypeCohort
 * @since v7.10.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { TaskTypeSchema } from './task-type.js';
import { COHORT_BASE_FIELDS } from './cohort-base-fields.js';

/**
 * Per-(model, task_type) reputation cohort.
 *
 * Base fields sourced from COHORT_BASE_FIELDS (shared with ModelCohortSchema).
 * The superset guard test in task-type-cohort.test.ts verifies field alignment.
 */
export const TaskTypeCohortSchema = Type.Object(
  {
    ...COHORT_BASE_FIELDS,
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
