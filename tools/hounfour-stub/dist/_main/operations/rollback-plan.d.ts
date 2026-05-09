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
import { type Static } from '@sinclair/typebox';
export declare const RollbackPlanSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"rollback_plan">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    epic_id: import("@sinclair/typebox").TString;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    prs_to_revert: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repo: import("@sinclair/typebox").TString;
        pr_number: import("@sinclair/typebox").TInteger;
        merge_commit_sha: import("@sinclair/typebox").TString;
    }>>;
    beads_to_reopen: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        bead_id: import("@sinclair/typebox").TString;
        desired_status: import("@sinclair/typebox").TString;
    }>>;
    env_changes_to_undo: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        key: import("@sinclair/typebox").TString;
        previous_value: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export type RollbackPlan = Static<typeof RollbackPlanSchema>;
//# sourceMappingURL=rollback-plan.d.ts.map