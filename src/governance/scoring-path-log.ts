/**
 * ScoringPathLog — records which scoring path was used for a reputation decision.
 *
 * The scoring cascade: task_cohort → aggregate → tier_default.
 * This log entry records which path was actually taken and why.
 *
 * @see SDD §4.4 — ScoringPathLog
 * @since v7.10.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { TaskTypeSchema } from './task-type.js';

// ---------------------------------------------------------------------------
// ScoringPath — the three-tier cascade
// ---------------------------------------------------------------------------

/**
 * Which tier of the scoring cascade was used.
 *
 * - task_cohort: per-(model, task_type) score was available
 * - aggregate: per-model aggregate score was used (no task-specific data)
 * - tier_default: fallback to collection/pool default
 *
 * @governance protocol-fixed
 */
export const ScoringPathSchema = Type.Union(
  [
    Type.Literal('task_cohort'),
    Type.Literal('aggregate'),
    Type.Literal('tier_default'),
  ],
  {
    $id: 'ScoringPath',
    description: 'Which tier of the scoring cascade was used for a reputation decision.',
  },
);

export type ScoringPath = Static<typeof ScoringPathSchema>;

// ---------------------------------------------------------------------------
// ScoringPathLog — audit record
// ---------------------------------------------------------------------------

/**
 * Audit record of a scoring path decision.
 *
 * Records which path was selected, with optional context about the
 * model and task type (when applicable) and a human-readable reason.
 */
export const ScoringPathLogSchema = Type.Object(
  {
    path: ScoringPathSchema,
    model_id: Type.Optional(Type.String({
      maxLength: 255,
      description: 'Model alias when path is task_cohort or aggregate.',
    })),
    task_type: Type.Optional(TaskTypeSchema),
    reason: Type.Optional(Type.String({
      maxLength: 500,
      description: 'Human-readable explanation of why this path was selected.',
    })),
    // v7.11.0 — Tamper-evident hash chain fields (Bridgebuilder Meditation III)
    scored_at: Type.Optional(Type.String({
      format: 'date-time',
      description: 'Timestamp of the scoring decision.',
    })),
    entry_hash: Type.Optional(Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'SHA-256 hash of canonical JSON of this entry (excluding hash fields).',
    })),
    previous_hash: Type.Optional(Type.String({
      pattern: '^sha256:[a-f0-9]{64}$',
      description: 'Hash of the preceding ScoringPathLog entry in the chain.',
    })),
  },
  {
    $id: 'ScoringPathLog',
    additionalProperties: false,
    description: 'Audit record of which scoring cascade tier was used. Optional hash chain for tamper-evident audit.',
  },
);

export type ScoringPathLog = Static<typeof ScoringPathLogSchema>;
