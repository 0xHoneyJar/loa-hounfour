/**
 * `RollbackPlanSchema` — declarative rollback recipe for an EPIC
 * (FR-B6, v8.6.0).
 *
 * Each EPIC carries a rollback plan listing PRs to revert (with
 * 40-hex git merge-commit SHAs), task records to reopen (consumer-
 * shaped task-tracker IDs), and environment-variable changes to undo.
 * Empty arrays are valid — an EPIC with no rollback steps is a valid
 * rollback plan; consumers interpret the empty case as "no-op
 * rollback".
 *
 * @see SDD §3.8 — FR-B6 spec
 * @since v8.6.0 — FR-B6 (PR-A3.5)
 */
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';

export const RollbackPlanSchema = Type.Object(
  {
    envelope_kind: Type.Literal('rollback_plan'),
    contract_version: Type.Literal('8.6.0'),
    epic_id: Type.String({ minLength: 1 }),
    ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    cluster_id: Type.String({ minLength: 1 }),
    prs_to_revert: Type.Array(
      Type.Object(
        {
          repo: Type.String({ minLength: 1 }),
          pr_number: Type.Integer({ minimum: 1 }),
          merge_commit_sha: Type.String({
            pattern: '^[A-Fa-f0-9]{40}$',
            description:
              '40-hex git commit SHA (SHA-1; distinct from the 64-hex sha256 used elsewhere).',
          }),
        },
        { additionalProperties: false },
      ),
    ),
    beads_to_reopen: Type.Array(
      Type.Object(
        {
          bead_id: Type.String({
            minLength: 1,
            description:
              'Generic identifier referencing a consumer-side task tracker. ' +
              'Hounfour does not import any framework-internal task system; ' +
              'consumers may use any task-tracking convention.',
          }),
          desired_status: Type.String({ minLength: 1 }),
        },
        { additionalProperties: false },
      ),
    ),
    env_changes_to_undo: Type.Array(
      Type.Object(
        {
          key: Type.String({ minLength: 1 }),
          previous_value: Type.Union([Type.String(), Type.Null()], {
            description:
              'Nullable string. null = the env var was unset before the change ' +
              'and should be unset on rollback.',
          }),
        },
        { additionalProperties: false },
      ),
    ),
  },
  {
    $id: 'RollbackPlan',
    additionalProperties: false,
    description:
      'Declarative rollback recipe for an EPIC. Empty arrays are valid ' +
      '(consumer interprets empty plan as no-op rollback). The 40-hex ' +
      'merge_commit_sha is git SHA-1, distinct from the 64-hex sha256 ' +
      'used in evidence-hash fields elsewhere.',
  },
);
export type RollbackPlan = Static<typeof RollbackPlanSchema>;
