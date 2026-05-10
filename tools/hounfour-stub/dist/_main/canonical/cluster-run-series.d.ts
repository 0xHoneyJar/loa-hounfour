/**
 * `ClusterRunSeriesSchema` — multi-repo run state envelope (FR-G1, v8.7.0).
 *
 * Captures per-repo EPIC status across a cluster-spanning workstream.
 * Per-repo `epic_status` (`'queued' | 'running' | 'completed' | 'failed'`) +
 * `failure_mode` classification per upstream master-plan §5.0.B is
 * enforceable at the schema level.
 *
 * **In-runtime canonical-form idempotency** (V8 / Node.js scope):
 * within a single Node.js process, `JSON.stringify(JSON.parse(s))`
 * over a valid `ClusterRunSeries` payload `s` returns a string equal
 * to `s` when `s` is the JSON form `JSON.stringify` produced from the
 * canonical-shaped object. This is a determinism pin on V8's stable
 * property-order behaviour, NOT a cross-runtime byte-identity claim.
 *
 * **Cross-runtime byte-identity** (Go / Python / Rust producers
 * agreeing with TS) is the FR-A2 cross-language harness's domain via
 * RFC 8785 JCS canonicalization. Producers MUST emit `ts_started` in
 * Z-only second-precision (`2026-05-09T00:00:00Z`) byte-identical
 * across runtimes — see `vectors/runners/_shared/ts-started-z-only.txt`
 * SSOT for the local override of the broader `ISO8601_UTC_PATTERN`.
 *
 * **NOT crypto-bearing, NOT chain-bearing**: a `ClusterRunSeries` is a
 * join-shape over per-repo phase envelopes. The chain-bearing
 * primitives are the per-repo `PhaseCompletionEnvelope` records
 * (FR-B2, v8.6.0); this envelope references them via lazy-link
 * `phase_envelope_chain_root`.
 *
 * **Schema-level invariants** (constraint file
 * `constraints/ClusterRunSeries.constraints.json` — CRS-1..CRS-4):
 *   - CRS-1: `repos[*].epic_status` is a member of the locked enum
 *     (TypeBox enum + redundant assertion in constraint file for
 *     explicitness) — library-evaluable.
 *   - CRS-2: `failure_mode != null ↔ epic_status = 'failed'` per
 *     element — library-evaluable via LOCAL helper
 *     `failure_mode_iff_failed_status`.
 *   - CRS-3: cross-language conformance — TS + Python + Go + Rust
 *     runners agree on byte-identical canonicalization. Consumer-
 *     state per ADR-010; manifest emits
 *     `CLUSTER_RUN_SERIES_CROSS_RUNTIME_CONTEXT_DEFERRED`.
 *   - CRS-4: `repos[*].repo_slug` distinct within a series —
 *     library-evaluable via LOCAL helper `array_field_distinct`.
 *
 * @see RFC docs/rfcs/v8.7.0-conformance-measurability.md §3.1
 * @see ADR-010 — class-vs-policy boundary (consumers compute
 *      conformance %; hounfour ships shape).
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
import { type Static } from '@sinclair/typebox';
/**
 * `ClusterRunRepoStatusSchema` — locked per-repo EPIC status enum.
 *
 * Promotion to a discriminated union keyed on `epic_status` is deferred
 * to v8.8.0+ pending consumer-corpus signal. v8.7.0 ships the union of
 * literals; CRS-2 (failure_mode iff failed) is enforced at the
 * cross-field tier instead.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export declare const ClusterRunRepoStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"queued">, import("@sinclair/typebox").TLiteral<"running">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">]>;
export type ClusterRunRepoStatus = Static<typeof ClusterRunRepoStatusSchema>;
/**
 * `ClusterRunSeriesRepoEntrySchema` — one entry in
 * `ClusterRunSeriesSchema.repos`. Hoisted so the cross-runner
 * conformance suite can validate per-element shape independently of
 * the parent envelope.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export declare const ClusterRunSeriesRepoEntrySchema: import("@sinclair/typebox").TObject<{
    repo_slug: import("@sinclair/typebox").TString;
    canonical_run_id: import("@sinclair/typebox").TString;
    epic_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"queued">, import("@sinclair/typebox").TLiteral<"running">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">]>;
    failure_mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    phase_envelope_chain_root: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type ClusterRunSeriesRepoEntry = Static<typeof ClusterRunSeriesRepoEntrySchema>;
export declare const ClusterRunSeriesSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"cluster_run_series">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.7.0">;
    run_id: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    ts_started: import("@sinclair/typebox").TString;
    repos: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        repo_slug: import("@sinclair/typebox").TString;
        canonical_run_id: import("@sinclair/typebox").TString;
        epic_status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"queued">, import("@sinclair/typebox").TLiteral<"running">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">]>;
        failure_mode: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
        phase_envelope_chain_root: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>>;
}>;
export type ClusterRunSeries = Static<typeof ClusterRunSeriesSchema>;
/**
 * `validateClusterRunSeries` — pure-function evaluator for the cross-
 * field invariants CRS-2 (failure_mode iff failed status, per element)
 * and CRS-4 (repo_slug distinctness within the series).
 *
 * **Source of truth** for CRS-2 and CRS-4. Registered into the global
 * cross-field validator registry by `src/validators/index.ts`; exported
 * here so:
 *
 *   - tests can exercise the cross-field tier in isolation without
 *     bypassing the structural Value.Check tier;
 *   - cross-language reference implementations (FR-A2 / TS-as-golden-
 *     corpus per AT-1) have a single TS function to mirror.
 *
 * **Defensive contract** (mirrors the CanonicalRun CR-1 precedent): the
 * function MUST NOT throw on malformed input. Direct callers bypassing
 * the structural tier (Value.Check) receive a tagged precondition
 * error rather than a TypeError. Under the standard `validate(...)`
 * pipeline this defensive path is unreachable — Value.Check rejects
 * non-array `repos`, null elements, missing fields, and out-of-vocab
 * `epic_status` at the structural tier first.
 *
 * **Accumulated-error preservation** (CR-1 precedent): if a per-element
 * shape guard trips mid-iteration, the function MUST NOT discard
 * cross-field errors already accumulated against earlier well-shaped
 * entries. Each malformed element emits its own per-element
 * structural-precondition error; well-shaped entries continue to be
 * checked against CRS-2 / CRS-4.
 *
 * **CRS-1 is NOT enforced here** — it is a TypeBox `enum` constraint
 * (Type.Union of literals) handled at the structural tier. The
 * constraint-file entry for CRS-1 is a redundant declaratory record
 * mirroring the cycle-005 cycle-pattern (per CanonicalRun precedent
 * for documenting library-evaluable invariants in the constraint file).
 *
 * **CRS-3 is consumer-state** per ADR-010 — cross-runtime byte-
 * identity is verified by the FR-A2 cross-language harness, not by
 * this validator. Manifest emission is the consumer's responsibility
 * via the `CLUSTER_RUN_SERIES_CROSS_RUNTIME_CONTEXT_DEFERRED` reason.
 *
 * @param data — record to evaluate; the function defends against
 *   malformed input (non-array repos, non-object entries, missing
 *   fields) without throwing.
 * @returns `{ valid, errors, warnings }` — `errors` carries CRS-2 /
 *   CRS-4-tagged strings naming the offending index/value for
 *   actionability.
 *
 * @since v8.7.0 — FR-G1 (PR-A4.1).
 */
export declare function validateClusterRunSeries(data: unknown): {
    valid: boolean;
    errors: string[];
    warnings: string[];
};
//# sourceMappingURL=cluster-run-series.d.ts.map