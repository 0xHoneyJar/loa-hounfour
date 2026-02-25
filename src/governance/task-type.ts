/**
 * TaskType — open taxonomy of task categories for reputation scoring.
 *
 * Defines the 6 task types that partition the work domain into non-overlapping
 * categories. Each type represents a distinct skill axis along which model
 * quality can vary independently.
 *
 * Inclusion semantics:
 * - code_review: automated or human-assisted code review, PR feedback
 * - creative_writing: content generation, copywriting, narrative tasks
 * - analysis: data analysis, research synthesis, structured reasoning
 * - summarization: condensation, TL;DR, meeting notes, digest generation
 * - general: catch-all for tasks that don't fit other categories
 * - unspecified: reserved fallback when task metadata is unavailable;
 *   routes to aggregate-only scoring (no task-type cohort entry)
 *
 * Exclusion semantics:
 * - A task belongs to exactly one category; overlapping semantics resolve
 *   to the most specific type (e.g., "summarize this PR" → summarization,
 *   not code_review).
 *
 * @governance registry-extensible
 *
 * Extension governance (FR-1.4):
 * - Adding a new TaskType is a MINOR version bump (additive to the union).
 * - Removing or renaming a TaskType is a MAJOR version bump (breaking).
 * - Protocol types are validated as literals; community types match namespace:type pattern.
 * - Runtime consumers MAY implement permissive fallback for forward compat.
 * - Community-defined types use `namespace:type` format (ADR-003).
 *
 * @see SDD §4.1 — TaskType
 * @since v7.10.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Open union of task type values.
 *
 * Protocol-defined types are validated as literals.
 * Community-defined types match the `namespace:type` pattern (ADR-003).
 *
 * task_type MUST be assigned by the routing layer, not the scored agent (ADR-004).
 */
export const TaskTypeSchema = Type.Union(
  [
    Type.Literal('code_review'),
    Type.Literal('creative_writing'),
    Type.Literal('analysis'),
    Type.Literal('summarization'),
    Type.Literal('general'),
    // Reserved value for edge cases where task metadata is unavailable (PRD FR-1).
    // Cohort update logic MUST route to aggregate-only scoring; do not create
    // a task-type cohort entry.
    Type.Literal('unspecified'),
    // Community-defined types: namespace:type format (ADR-003)
    Type.String({
      pattern: '^[a-z][a-z0-9_-]+:[a-z][a-z0-9_]+$',
      description: 'Community-defined task type in namespace:type format (e.g., legal-guild:contract_review).',
    }),
  ],
  {
    $id: 'TaskType',
    description: 'Task categories for reputation scoring. Protocol types are literals; community types use namespace:type format.',
  },
);

export type TaskType = Static<typeof TaskTypeSchema>;

/**
 * Canonical array of protocol-defined TaskType values.
 *
 * Lists only the 6 protocol types — community-defined types (namespace:type)
 * are not enumerable at the protocol level.
 * Useful for iteration, validation, and UI rendering.
 */
export const TASK_TYPES = [
  'code_review',
  'creative_writing',
  'analysis',
  'summarization',
  'general',
  'unspecified',
] as const satisfies readonly TaskType[];
