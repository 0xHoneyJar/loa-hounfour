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
import { type Static } from '@sinclair/typebox';
/**
 * Health assessment at a checkpoint during progressive execution.
 */
export declare const CheckpointHealthSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"healthy">, import("@sinclair/typebox").TLiteral<"degraded">, import("@sinclair/typebox").TLiteral<"failing">]>;
export type CheckpointHealth = Static<typeof CheckpointHealthSchema>;
/**
 * Decision made at a checkpoint based on health assessment.
 *
 * Consistency rules:
 * - healthy → must be continue
 * - degraded → may be continue or pause
 * - failing → must be rollback
 */
export declare const ProceedDecisionSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"continue">, import("@sinclair/typebox").TLiteral<"pause">, import("@sinclair/typebox").TLiteral<"rollback">]>;
export type ProceedDecision = Static<typeof ProceedDecisionSchema>;
/**
 * A health check recorded during progressive or canary execution.
 *
 * Checkpoints form a sequence (checkpoint_index) within an execution,
 * recording how many changes have been applied and whether to proceed.
 *
 * @since v7.8.0
 */
export declare const ExecutionCheckpointSchema: import("@sinclair/typebox").TObject<{
    checkpoint_id: import("@sinclair/typebox").TString;
    execution_id: import("@sinclair/typebox").TString;
    checkpoint_index: import("@sinclair/typebox").TInteger;
    changes_applied_count: import("@sinclair/typebox").TInteger;
    changes_remaining_count: import("@sinclair/typebox").TInteger;
    health_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"healthy">, import("@sinclair/typebox").TLiteral<"degraded">, import("@sinclair/typebox").TLiteral<"failing">]>;
    proceed_decision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"continue">, import("@sinclair/typebox").TLiteral<"pause">, import("@sinclair/typebox").TLiteral<"rollback">]>;
    health_details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    checkpoint_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ExecutionCheckpoint = Static<typeof ExecutionCheckpointSchema>;
//# sourceMappingURL=execution-checkpoint.d.ts.map