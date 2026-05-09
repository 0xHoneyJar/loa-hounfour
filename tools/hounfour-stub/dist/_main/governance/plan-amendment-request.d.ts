/**
 * `PlanAmendmentRequestSchema` — plan-amendment proposal envelope
 * (FR-B10, v8.6.0).
 *
 * An amendment request proposes a delta against a previously
 * signed-off plan (identified by `parent_plan_hash`). Distinct
 * from `PlanSignoffEnvelope`: an amendment is a PROPOSAL that may
 * be accepted, rejected, or modified; a signoff is the
 * authoritative seal.
 *
 * Unlike `PlanSignoffEnvelope`, the amendment request is
 * **NOT crypto-bearing** at the schema level — amendments are
 * authored under the cluster's existing trust context and need
 * not carry an additional signature beyond the cluster's
 * envelope-level integrity (which the chained
 * `prev_envelope_hash` provides). The schema is `x-chain-bearing`
 * for chain continuity but omits `x-crypto-bearing` and the
 * `signature` field.
 *
 * **Schema-level invariants**:
 *   - `severity` enum is exhaustive at `{minor, major}`.
 *   - `trigger_class` enum is exhaustive at four members:
 *     `schema_drift`, `ambiguity`, `out_of_scope_dep`,
 *     `observed_failure`.
 *   - **Severity correction is consumer-side policy** per
 *     [`prd.md:289`]: the schema does NOT force
 *     `trigger_class=observed_failure → severity=major`. The
 *     schema admits the looser combination so consumers can
 *     surface the discrepancy explicitly rather than have it
 *     silently rewritten at the structural layer.
 *   - `recommended_paths` `minItems: 1` — an amendment MUST
 *     propose at least one path. Each path object requires
 *     `id`, `summary`, `tradeoff` (no optional fields).
 *   - `jury_recommendation` is nullable. `null` = no jury
 *     consulted; non-null = consulted, the string carries the
 *     recommendation text.
 *   - `parent_plan_hash` content-addresses the plan being
 *     amended; FR-C4 may also be invoked against this field if
 *     the consumer wants to validate that the parent plan is
 *     still on file.
 *
 * @see SDD §3.12 — FR-B10 schema spec
 * @see SDD §4.5 — FR-C4 builtin spec (also applies to
 *      parent_plan_hash if the consumer chooses to bind it)
 * @since v8.6.0 — FR-B10 (PR-A3.6)
 */
import { type Static } from '@sinclair/typebox';
/**
 * Severity of a proposed plan amendment.
 *
 * `minor` = small editorial / scoping deltas; `major` = scope
 * changes, conservation-property tweaks, security-relevant
 * shifts. Consumer-side severity-correction policy (e.g.
 * "observed_failure ⇒ major") lives in the consumer's
 * acceptance gate per ADR-010, NOT in the schema.
 */
export declare const AmendmentSeveritySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minor">, import("@sinclair/typebox").TLiteral<"major">]>;
export type AmendmentSeverity = Static<typeof AmendmentSeveritySchema>;
/**
 * What triggered the amendment proposal.
 *
 * Four exhaustive members:
 *   - `schema_drift` — wire payload doesn't match expected schema
 *   - `ambiguity` — the plan is unclear; clarification proposed
 *   - `out_of_scope_dep` — execution depends on something the plan
 *     doesn't authorize
 *   - `observed_failure` — execution attempted and failed; root
 *     cause requires plan revision
 */
export declare const AmendmentTriggerClassSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"schema_drift">, import("@sinclair/typebox").TLiteral<"ambiguity">, import("@sinclair/typebox").TLiteral<"out_of_scope_dep">, import("@sinclair/typebox").TLiteral<"observed_failure">]>;
export type AmendmentTriggerClass = Static<typeof AmendmentTriggerClassSchema>;
export declare const PlanAmendmentRequestSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"plan_amendment_request">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    actor_id: import("@sinclair/typebox").TString;
    parent_signoff_id: import("@sinclair/typebox").TString;
    parent_plan_hash: import("@sinclair/typebox").TString;
    proposed_delta: import("@sinclair/typebox").TString;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minor">, import("@sinclair/typebox").TLiteral<"major">]>;
    trigger_class: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"schema_drift">, import("@sinclair/typebox").TLiteral<"ambiguity">, import("@sinclair/typebox").TLiteral<"out_of_scope_dep">, import("@sinclair/typebox").TLiteral<"observed_failure">]>;
    rationale: import("@sinclair/typebox").TString;
    recommended_paths: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        summary: import("@sinclair/typebox").TString;
        tradeoff: import("@sinclair/typebox").TString;
    }>>;
    jury_recommendation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    chain_refs: import("@sinclair/typebox").TObject<{
        prev_envelope_hash: import("@sinclair/typebox").TString;
    }>;
}>;
export type PlanAmendmentRequest = Static<typeof PlanAmendmentRequestSchema>;
//# sourceMappingURL=plan-amendment-request.d.ts.map