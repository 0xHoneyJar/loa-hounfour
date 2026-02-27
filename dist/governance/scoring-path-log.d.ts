/**
 * ScoringPathLog — records which scoring path was used for a reputation decision.
 *
 * The scoring cascade: task_cohort → aggregate → tier_default.
 * This log entry records which path was actually taken and why.
 *
 * @see SDD §4.4 — ScoringPathLog
 * @since v7.10.0
 */
import { type Static } from '@sinclair/typebox';
/**
 * Which tier of the scoring cascade was used.
 *
 * - task_cohort: per-(model, task_type) score was available
 * - aggregate: per-model aggregate score was used (no task-specific data)
 * - tier_default: fallback to collection/pool default
 *
 * @governance protocol-fixed
 */
export declare const ScoringPathSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"task_cohort">, import("@sinclair/typebox").TLiteral<"aggregate">, import("@sinclair/typebox").TLiteral<"tier_default">]>;
export type ScoringPath = Static<typeof ScoringPathSchema>;
/**
 * Audit record of a scoring path decision.
 *
 * Records which path was selected, with optional context about the
 * model and task type (when applicable) and a human-readable reason.
 */
export declare const ScoringPathLogSchema: import("@sinclair/typebox").TObject<{
    path: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"task_cohort">, import("@sinclair/typebox").TLiteral<"aggregate">, import("@sinclair/typebox").TLiteral<"tier_default">]>;
    model_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    task_type: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"code_review">, import("@sinclair/typebox").TLiteral<"creative_writing">, import("@sinclair/typebox").TLiteral<"analysis">, import("@sinclair/typebox").TLiteral<"summarization">, import("@sinclair/typebox").TLiteral<"general">, import("@sinclair/typebox").TLiteral<"unspecified">, import("@sinclair/typebox").TString]>>;
    reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    scored_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    entry_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    previous_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ScoringPathLog = Static<typeof ScoringPathLogSchema>;
//# sourceMappingURL=scoring-path-log.d.ts.map