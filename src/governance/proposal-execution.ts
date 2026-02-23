/**
 * Proposal Execution — tracking governance execution lifecycle.
 *
 * Bridges the gap between "a proposal was ratified" and "the changes were
 * actually applied." Without execution tracking, governance is descriptive
 * but not auditable — like CloudFormation without stack events.
 *
 * @see DR-S9 — Governance execution tracking
 * @see FAANG parallel: AWS CloudFormation stack events
 * @since v7.7.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Execution Status
// ---------------------------------------------------------------------------

/**
 * Lifecycle status of a proposal execution.
 *
 * State machine:
 *   pending → executing → completed | failed
 *   failed → rolled_back
 */
export const ExecutionStatusSchema = Type.Union(
  [
    Type.Literal('pending'),
    Type.Literal('executing'),
    Type.Literal('completed'),
    Type.Literal('failed'),
    Type.Literal('rolled_back'),
  ],
  {
    $id: 'ExecutionStatus',
    description: 'Lifecycle status of a governance proposal execution.',
  },
);

export type ExecutionStatus = Static<typeof ExecutionStatusSchema>;

/**
 * Valid execution status transitions.
 */
export const EXECUTION_STATUS_TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]> = {
  pending: ['executing'],
  executing: ['completed', 'failed'],
  completed: [],
  failed: ['rolled_back'],
  rolled_back: [],
} as const;

// ---------------------------------------------------------------------------
// Change Application Result
// ---------------------------------------------------------------------------

/**
 * Result of applying a single proposed change.
 */
export const ChangeApplicationResultSchema = Type.Object(
  {
    change_index: Type.Integer({
      minimum: 0,
      description: 'Index into GovernanceProposal.changes[] array.',
    }),
    target: Type.String({
      minLength: 1,
      description: 'What was changed (field path or constraint ID).',
    }),
    applied_at: Type.String({ format: 'date-time' }),
    result: Type.Union([
      Type.Literal('success'),
      Type.Literal('failed'),
      Type.Literal('skipped'),
    ], {
      description: 'Outcome of applying this change.',
    }),
    error: Type.Optional(Type.String({
      description: 'Failure reason, populated when result is "failed".',
    })),
  },
  {
    $id: 'ChangeApplicationResult',
    additionalProperties: false,
    description: 'Result of applying a single proposed change during execution.',
  },
);

export type ChangeApplicationResult = Static<typeof ChangeApplicationResultSchema>;

// ---------------------------------------------------------------------------
// Proposal Execution
// ---------------------------------------------------------------------------

/**
 * Tracks the execution of a ratified governance proposal.
 *
 * Records what happened after the vote: which changes were applied,
 * which failed, and whether the execution completed or was rolled back.
 *
 * @since v7.7.0 — DR-S9
 */
export const ProposalExecutionSchema = Type.Object(
  {
    execution_id: Type.String({ format: 'uuid' }),
    proposal_id: Type.String({
      format: 'uuid',
      description: 'The ratified GovernanceProposal being executed.',
    }),
    status: ExecutionStatusSchema,
    changes_applied: Type.Array(ChangeApplicationResultSchema, {
      minItems: 1,
      description: 'Results of applying each proposed change.',
    }),
    constraint_lifecycle_events: Type.Optional(Type.Array(Type.String({ format: 'uuid' }), {
      description: 'ConstraintLifecycleEvent IDs created during execution.',
    })),
    started_at: Type.String({ format: 'date-time' }),
    completed_at: Type.Optional(Type.String({
      format: 'date-time',
      description: 'When execution finished. Required when status is completed or rolled_back.',
    })),
    executed_by: Type.String({
      minLength: 1,
      description: 'Agent or system that performed the execution.',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Protocol contract version.',
    }),
  },
  {
    $id: 'ProposalExecution',
    additionalProperties: false,
    description: 'Execution record for a ratified governance proposal.',
  },
);

export type ProposalExecution = Static<typeof ProposalExecutionSchema>;
