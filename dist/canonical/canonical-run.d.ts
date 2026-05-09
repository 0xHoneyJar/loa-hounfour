/**
 * `CanonicalRunSchema` — required-phases-per-EPIC source-of-truth
 * for conformance evaluation (FR-B1, v8.6.0).
 *
 * A `CanonicalRun` defines, for a given `epic_kind`, the ordered
 * sequence of phases a producer must complete. Consumers compare
 * incoming `PhaseCompletionEnvelope` records (FR-B2) against the
 * `CanonicalRun` for the EPIC's `epic_kind` to compute conformance
 * percentages — hounfour ships only the **shape**; conformance
 * computation is consumer-side per ADR-010.
 *
 * **Round-trip bit-identity contract**: `JSON.stringify(JSON.parse(s))`
 * over a valid `CanonicalRun` payload `s` returns a string equal to
 * `s` byte-for-byte when `s` is itself the JSON form produced by
 * `JSON.stringify(payload)` from the canonical-shaped object. This
 * is the cross-language conformance pre-condition: every runner
 * MUST produce identical canonical bytes for identical input
 * objects so conformance scoring across runners is deterministic.
 *
 * **NOT crypto-bearing, NOT chain-bearing**: a `CanonicalRun` is a
 * deterministic shape definition with no signature, nonce, or
 * `prev_envelope_hash`. It is referenced by other schemas (FR-B2,
 * FR-B8, FR-E1) via the lazy-link `canonical_run_id` string —
 * resolution is consumer-state per ADR-010 and is NOT manifested by
 * hounfour.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/CanonicalRun.constraints.json` — CR-1..CR-3):
 *   - `required_phases[*].ordered_index` is a 0-based contiguous
 *     monotonic sequence (no gaps, no duplicates) — CR-1, library-
 *     evaluable.
 *   - `canonical_run_id` is unique within a `cluster_id` — CR-2,
 *     consumer-state (registry); manifest emits
 *     `CANONICAL_RUN_ID_UNIQUENESS_CONTEXT_DEFERRED` when the
 *     consumer has not supplied registry context.
 *   - Cross-language conformance (TS + Python at minimum, all four
 *     runners if FR-A2 lands) — CR-3, consumer per ADR-010.
 *     Hounfour ships the schema; consumers compute conformance %.
 *
 * @see SDD §3.3 — full FR-B1 spec.
 * @see PRD §9.2 — rename ledger (renamed from coord master-plan
 *      name per pollution-invariant compliance).
 * @since v8.6.0 — FR-B1 (PR-A3.8).
 */
import { type Static } from '@sinclair/typebox';
/**
 * `RequiredPhaseSchema` — one entry in
 * `CanonicalRunSchema.required_phases`. Hoisted for clarity and so
 * the cross-runner conformance suite can validate per-element
 * shape independently of the parent envelope.
 */
export declare const RequiredPhaseSchema: import("@sinclair/typebox").TObject<{
    phase_id: import("@sinclair/typebox").TString;
    phase_kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"audit" | "discovery" | "design" | "implement" | "ship">[]>;
    required_gates: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    ordered_index: import("@sinclair/typebox").TInteger;
}>;
export type RequiredPhase = Static<typeof RequiredPhaseSchema>;
export declare const CanonicalRunSchema: import("@sinclair/typebox").TObject<{
    canonical_run_id: import("@sinclair/typebox").TString;
    canonical_run_version: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    epic_kind: import("@sinclair/typebox").TString;
    required_phases: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        phase_id: import("@sinclair/typebox").TString;
        phase_kind: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"audit" | "discovery" | "design" | "implement" | "ship">[]>;
        required_gates: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        ordered_index: import("@sinclair/typebox").TInteger;
    }>>;
    ts_authored: import("@sinclair/typebox").TString;
}>;
export type CanonicalRun = Static<typeof CanonicalRunSchema>;
//# sourceMappingURL=canonical-run.d.ts.map