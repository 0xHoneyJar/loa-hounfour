/**
 * `EpicCheckpointSchema` — durable EPIC progress checkpoint
 * (FR-B8, v8.6.0).
 *
 * Captures the current execution state of an EPIC: its canonical-run
 * pointer, current phase, last completed gate, in-progress tool
 * call (with input hash for idempotent retry), and retry counter.
 *
 * The `canonical_run_id` field references a known `CanonicalRunSchema`
 * instance per consumer-side registry resolution (manifest emits
 * `CANONICAL_RUN_REF_CONTEXT_DEFERRED` when the consumer hasn't
 * supplied registry context — runtime-deferred per NF-1).
 *
 * @see SDD §3.10 — FR-B8 spec
 * @since v8.6.0 — FR-B8 (PR-A3.5)
 */
import { type Static } from '@sinclair/typebox';
export declare const EpicCheckpointSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"epic_checkpoint">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    epic_id: import("@sinclair/typebox").TString;
    canonical_run_id: import("@sinclair/typebox").TString;
    current_phase: import("@sinclair/typebox").TString;
    last_completed_gate: import("@sinclair/typebox").TString;
    in_progress_tool_call: import("@sinclair/typebox").TObject<{
        tool_id: import("@sinclair/typebox").TString;
        input_hash: import("@sinclair/typebox").TString;
        start_ts: import("@sinclair/typebox").TString;
    }>;
    retry_count: import("@sinclair/typebox").TInteger;
}>;
export type EpicCheckpoint = Static<typeof EpicCheckpointSchema>;
//# sourceMappingURL=epic-checkpoint.d.ts.map