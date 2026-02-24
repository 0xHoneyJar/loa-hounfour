/**
 * TaskType — closed taxonomy of task categories for reputation scoring.
 *
 * Defines the 5 task types that partition the work domain into non-overlapping
 * categories. Each type represents a distinct skill axis along which model
 * quality can vary independently.
 *
 * Inclusion semantics:
 * - code_review: automated or human-assisted code review, PR feedback
 * - creative_writing: content generation, copywriting, narrative tasks
 * - analysis: data analysis, research synthesis, structured reasoning
 * - summarization: condensation, TL;DR, meeting notes, digest generation
 * - general: catch-all for tasks that don't fit other categories
 *
 * Exclusion semantics:
 * - A task belongs to exactly one category; overlapping semantics resolve
 *   to the most specific type (e.g., "summarize this PR" → summarization,
 *   not code_review).
 *
 * Extension governance (FR-1.4):
 * - Adding a new TaskType is a MINOR version bump (additive to the union).
 * - Removing or renaming a TaskType is a MAJOR version bump (breaking).
 * - Wire-level validation is strict: unknown values MUST be rejected.
 * - Runtime consumers MAY implement permissive fallback for forward compat.
 *
 * @see SDD §4.1 — TaskType
 * @since v7.10.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Closed union of task type literals.
 */
export const TaskTypeSchema = Type.Union(
  [
    Type.Literal('code_review'),
    Type.Literal('creative_writing'),
    Type.Literal('analysis'),
    Type.Literal('summarization'),
    Type.Literal('general'),
  ],
  {
    $id: 'TaskType',
    description: 'Closed taxonomy of task categories for task-dimensional reputation scoring.',
  },
);

export type TaskType = Static<typeof TaskTypeSchema>;

/**
 * Canonical array of all valid TaskType values.
 *
 * Useful for iteration, validation, and UI rendering.
 * Order matches the union definition.
 */
export const TASK_TYPES = [
  'code_review',
  'creative_writing',
  'analysis',
  'summarization',
  'general',
] as const satisfies readonly TaskType[];
