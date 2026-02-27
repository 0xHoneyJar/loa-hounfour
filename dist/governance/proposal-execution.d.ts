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
import { type Static } from '@sinclair/typebox';
/**
 * Lifecycle status of a proposal execution.
 *
 * State machine:
 *   pending → executing → completed | failed
 *   failed → rolled_back
 *
 * @governance protocol-fixed
 */
export declare const ExecutionStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"executing">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"rolled_back">]>;
export type ExecutionStatus = Static<typeof ExecutionStatusSchema>;
/**
 * Valid execution status transitions.
 */
export declare const EXECUTION_STATUS_TRANSITIONS: Record<ExecutionStatus, readonly ExecutionStatus[]>;
/**
 * Result of applying a single proposed change.
 */
export declare const ChangeApplicationResultSchema: import("@sinclair/typebox").TObject<{
    change_index: import("@sinclair/typebox").TInteger;
    target: import("@sinclair/typebox").TString;
    applied_at: import("@sinclair/typebox").TString;
    result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"success">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"skipped">]>;
    error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type ChangeApplicationResult = Static<typeof ChangeApplicationResultSchema>;
/**
 * Tracks the execution of a ratified governance proposal.
 *
 * Records what happened after the vote: which changes were applied,
 * which failed, and whether the execution completed or was rolled back.
 *
 * @since v7.7.0 — DR-S9
 */
export declare const ProposalExecutionSchema: import("@sinclair/typebox").TObject<{
    execution_id: import("@sinclair/typebox").TString;
    proposal_id: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"executing">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"rolled_back">]>;
    changes_applied: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        change_index: import("@sinclair/typebox").TInteger;
        target: import("@sinclair/typebox").TString;
        applied_at: import("@sinclair/typebox").TString;
        result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"success">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"skipped">]>;
        error: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    constraint_lifecycle_events: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    started_at: import("@sinclair/typebox").TString;
    completed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    executed_by: import("@sinclair/typebox").TString;
    execution_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"progressive">, import("@sinclair/typebox").TLiteral<"canary">]>>;
    checkpoints: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    rollback_scope_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ProposalExecution = Static<typeof ProposalExecutionSchema>;
/**
 * Strategy for executing governance proposal changes.
 *
 * - `atomic`: all changes applied or none (default, current behavior)
 * - `progressive`: changes applied in order with checkpoints between
 * - `canary`: changes applied to a subset first, then expanded on success
 *
 * @governance protocol-fixed
 * @see DR-F5 — Progressive governance execution
 * @since v7.8.0
 */
export declare const ExecutionStrategySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"atomic">, import("@sinclair/typebox").TLiteral<"progressive">, import("@sinclair/typebox").TLiteral<"canary">]>;
export type ExecutionStrategy = Static<typeof ExecutionStrategySchema>;
//# sourceMappingURL=proposal-execution.d.ts.map