/**
 * Rollback Scope — defines what gets rolled back during failed progressive execution.
 *
 * When a progressive or canary execution encounters a failing checkpoint,
 * the rollback scope captures exactly which changes need to be reversed.
 *
 * @see DR-F5 — Progressive governance execution
 * @see FAANG parallel: AWS CloudFormation stack rollback
 * @since v7.8.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Rollback Scope
// ---------------------------------------------------------------------------

/**
 * Scope of a governance execution rollback.
 *
 * Tracks which changes need to be reversed and why, providing a complete
 * audit trail for failed progressive executions.
 *
 * @since v7.8.0
 */
export const RollbackScopeSchema = Type.Object(
  {
    scope_id: Type.String({ format: 'uuid' }),
    execution_id: Type.String({
      format: 'uuid',
      description: 'The ProposalExecution being rolled back.',
    }),
    changes_to_rollback: Type.Array(Type.Integer({ minimum: 0 }), {
      minItems: 1,
      description: 'Indices into changes_applied[] that must be reversed.',
    }),
    reason: Type.String({
      minLength: 1,
      description: 'Why the rollback was triggered.',
    }),
    triggered_by_checkpoint_id: Type.Optional(Type.String({
      format: 'uuid',
      description: 'The ExecutionCheckpoint that triggered this rollback.',
    })),
    initiated_at: Type.String({ format: 'date-time' }),
    completed_at: Type.Optional(Type.String({
      format: 'date-time',
      description: 'When the rollback finished. Absent if still in progress.',
    })),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'RollbackScope',
    additionalProperties: false,
    description: 'Scope and audit trail for a governance execution rollback.',
  },
);

export type RollbackScope = Static<typeof RollbackScopeSchema>;
