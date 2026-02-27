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
import { type Static } from '@sinclair/typebox';
/**
 * Open union of task type values.
 *
 * Protocol-defined types are validated as literals.
 * Community-defined types match the `namespace:type` pattern (ADR-003).
 *
 * task_type MUST be assigned by the routing layer, not the scored agent (ADR-004).
 */
export declare const TaskTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>;
export type TaskType = Static<typeof TaskTypeSchema>;
/**
 * Canonical array of protocol-defined TaskType values.
 *
 * Lists only the 6 protocol types — community-defined types (namespace:type)
 * are not enumerable at the protocol level.
 * Useful for iteration, validation, and UI rendering.
 */
export declare const TASK_TYPES: readonly ["code_review", "creative_writing", "analysis", "summarization", "general", "unspecified"];
//# sourceMappingURL=task-type.d.ts.map