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
import { type Static } from '@sinclair/typebox';
/**
 * Scope of a governance execution rollback.
 *
 * Tracks which changes need to be reversed and why, providing a complete
 * audit trail for failed progressive executions.
 *
 * @since v7.8.0
 */
export declare const RollbackScopeSchema: import("@sinclair/typebox").TObject<{
    scope_id: import("@sinclair/typebox").TString;
    execution_id: import("@sinclair/typebox").TString;
    changes_to_rollback: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TInteger>;
    reason: import("@sinclair/typebox").TString;
    triggered_by_checkpoint_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    initiated_at: import("@sinclair/typebox").TString;
    completed_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RollbackScope = Static<typeof RollbackScopeSchema>;
//# sourceMappingURL=rollback-scope.d.ts.map