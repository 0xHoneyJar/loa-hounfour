/**
 * Execution Checkpoint — health checks during progressive governance execution.
 *
 * During progressive or canary execution, checkpoints record the health of
 * the system after each batch of changes. This enables informed proceed/pause/
 * rollback decisions rather than all-or-nothing execution.
 *
 * @see DR-F5 — Progressive governance execution
 * @see FAANG parallel: Kubernetes rolling update health checks
 * @since v7.8.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Checkpoint Health
// ---------------------------------------------------------------------------

/**
 * Health assessment at a checkpoint during progressive execution.
 */
export const CheckpointHealthSchema = Type.Union(
  [
    Type.Literal('healthy'),
    Type.Literal('degraded'),
    Type.Literal('failing'),
  ],
  {
    $id: 'CheckpointHealth',
    description: 'Health assessment at a governance execution checkpoint.',
  },
);

export type CheckpointHealth = Static<typeof CheckpointHealthSchema>;

// ---------------------------------------------------------------------------
// Proceed Decision
// ---------------------------------------------------------------------------

/**
 * Decision made at a checkpoint based on health assessment.
 *
 * Consistency rules:
 * - healthy → must be continue
 * - degraded → may be continue or pause
 * - failing → must be rollback
 */
export const ProceedDecisionSchema = Type.Union(
  [
    Type.Literal('continue'),
    Type.Literal('pause'),
    Type.Literal('rollback'),
  ],
  {
    $id: 'ProceedDecision',
    description: 'Decision made at a governance execution checkpoint.',
  },
);

export type ProceedDecision = Static<typeof ProceedDecisionSchema>;

// ---------------------------------------------------------------------------
// Execution Checkpoint
// ---------------------------------------------------------------------------

/**
 * A health check recorded during progressive or canary execution.
 *
 * Checkpoints form a sequence (checkpoint_index) within an execution,
 * recording how many changes have been applied and whether to proceed.
 *
 * @since v7.8.0
 */
export const ExecutionCheckpointSchema = Type.Object(
  {
    checkpoint_id: Type.String({ format: 'uuid' }),
    execution_id: Type.String({
      format: 'uuid',
      description: 'The ProposalExecution this checkpoint belongs to.',
    }),
    checkpoint_index: Type.Integer({
      minimum: 0,
      description: 'Order in the checkpoint sequence (0-based).',
    }),
    changes_applied_count: Type.Integer({
      minimum: 0,
      description: 'Number of changes applied so far.',
    }),
    changes_remaining_count: Type.Integer({
      minimum: 0,
      description: 'Number of changes remaining.',
    }),
    health_status: CheckpointHealthSchema,
    proceed_decision: ProceedDecisionSchema,
    health_details: Type.Optional(Type.String({
      description: 'Human-readable description of health observation.',
    })),
    checkpoint_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'ExecutionCheckpoint',
    additionalProperties: false,
    description: 'Health check recorded during progressive or canary governance execution.',
  },
);

export type ExecutionCheckpoint = Static<typeof ExecutionCheckpointSchema>;
