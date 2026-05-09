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
import { type Static } from '@sinclair/typebox';
/**
 * Per-(model, task_type) reputation cohort.
 *
 * Base fields sourced from COHORT_BASE_FIELDS (shared with ModelCohortSchema).
 * The superset guard test in task-type-cohort.test.ts verifies field alignment.
 */
export declare const TaskTypeCohortSchema: import("@sinclair/typebox").TObject<{
    task_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
    confidence_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    model_id: import("@sinclair/typebox").TString;
    personal_score: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TNumber, import("@sinclair/typebox").TNull]>;
    sample_count: import("@sinclair/typebox").TInteger;
    last_updated: import("@sinclair/typebox").TString;
}>;
export type TaskTypeCohort = Static<typeof TaskTypeCohortSchema>;
/**
 * Find duplicate (model_id, task_type) pairs in a TaskTypeCohort array.
 *
 * Returns an array of duplicate keys. Empty array means no duplicates.
 *
 * @param cohorts - Array of TaskTypeCohort entries to check
 * @returns Array of `"model_id:task_type"` strings that appear more than once
 */
export declare function validateTaskCohortUniqueness(cohorts: ReadonlyArray<{
    model_id: string;
    task_type: string;
}>): string[];
//# sourceMappingURL=task-type-cohort.d.ts.map