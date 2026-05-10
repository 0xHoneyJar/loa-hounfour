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
 * @since v8.7.0 — FR-G1.
 */
import { type Static } from '@sinclair/typebox';
/**
 * @internal
 * Stub placeholder — replaced with full schema body in PR-A4.1.
 * Validating any payload against this returns `false`.
 */
export declare const ClusterRunSeriesSchema: import("@sinclair/typebox").TNever;
export type ClusterRunSeries = Static<typeof ClusterRunSeriesSchema>;
//# sourceMappingURL=cluster-run-series.d.ts.map