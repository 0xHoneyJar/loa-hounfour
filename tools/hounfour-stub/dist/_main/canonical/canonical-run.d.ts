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
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid `CanonicalRun` payload `s` returns a string equal to
 * `s` when `s` is the JSON form `JSON.stringify` produced from the
 * canonical-shaped object. This is a determinism pin on V8's
 * stable property-order behaviour, NOT a cross-runtime byte-identity
 * claim.
 *
 * **Cross-runtime byte-identity** (Go / Python / Rust producers
 * agreeing with TS) is the FR-A2 cross-language harness's domain per
 * AT-1 (PR-A3.9 follow-up). Producers MUST emit `required_phases[*]`
 * field order matching the schema's authored sequence (phase_id,
 * phase_kind, required_gates, ordered_index) and `ts_authored`
 * fractional-second precision per their consumer's
 * conformance-scoring contract — see CR-3 and the constraint file's
 * evaluation_note for the per-runtime canonical-emission obligations.
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
/**
 * `validateCanonicalRunCR1` — pure-function evaluator for the CR-1
 * cross-field invariant: `required_phases[*].ordered_index` forms a
 * 0-based contiguous monotonic sequence with no duplicates and no gaps.
 *
 * **Source of truth** for CR-1. Registered into the global cross-field
 * validator registry by `src/validators/index.ts`; exported here so:
 *
 *   - tests can exercise the cross-field tier in isolation without
 *     bypassing the structural Value.Check tier (the iter-2 F2+F7
 *     accumulated-error-preservation contract verification path);
 *   - cross-language reference implementations (FR-A2 / PR-A3.9 Go /
 *     Python / Rust runners) have a single TS function to mirror per
 *     AT-1 (reference-TS-implementation-is-the-golden-corpus).
 *
 * **Accumulated-error preservation contract** (iter-2 F2+F7
 * mitigation): if a per-element shape guard trips mid-iteration, the
 * function MUST NOT discard CR-1 errors already accumulated against
 * earlier well-shaped phases. The malformed element's structural
 * failure surfaces via TypeBox / Value.Check; the cross-field tier
 * reports whatever CR-1 violations it actually observed before
 * reaching the bad element. Pattern parallel: AWS IAM policy
 * evaluator (2019 incident) — partial evaluators must preserve
 * accumulated state, not return clean from a truncated pass.
 *
 * **Defensive-guard contract** (iter-3 F-001 mitigation): per-element
 * type guards are nested rather than collapsed into a single
 * short-circuit chain. Symbol-typed `ordered_index` would not throw
 * under the JS `||` short-circuit (the `typeof !== 'number'` clause
 * fires first), but the nested form makes the protection explicit so
 * future refactors that reorder or merge the guards do not silently
 * lose defense-in-depth.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input (non-array `required_phases`, non-object phase
 *   entries, non-integer `ordered_index`) without throwing.
 * @returns `{ valid, errors, warnings }` — `errors` carries CR-1-tagged
 *   strings naming the offending index for actionability.
 *
 * @since v8.6.0 — FR-B1 (PR-A3.8); refactored from inline-validator
 *   form per iter-3 F1 + F-002 + F11 (Hyrum's-Law footprint reduction).
 */
export declare function validateCanonicalRunCR1(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=canonical-run.d.ts.map