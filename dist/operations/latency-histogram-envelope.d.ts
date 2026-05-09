/**
 * `LatencyHistogramEnvelopeSchema` — per-phase per-cluster latency
 * percentile snapshot (FR-B7, v8.6.0).
 *
 * Carries p50 / p95 / p99 / max in milliseconds. The percentile
 * monotonicity invariant (p50 ≤ p95 ≤ p99 ≤ max) is enforced via the
 * NEW LOCAL builtin `percentiles_monotonic_nondecreasing` (see
 * `src/constraints/builtins/percentiles-monotonic-nondecreasing.ts`)
 * referenced from the constraint file. The builtin is LOCAL because
 * the property is evaluable from the envelope content alone (no
 * consumer state).
 *
 * @see SDD §3.9 — FR-B7 spec
 * @since v8.6.0 — FR-B7 (PR-A3.5)
 */
import { type Static } from '@sinclair/typebox';
export declare const LatencyHistogramEnvelopeSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"latency_histogram">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    phase: import("@sinclair/typebox").TString;
    measurements: import("@sinclair/typebox").TObject<{
        p50_ms: import("@sinclair/typebox").TNumber;
        p95_ms: import("@sinclair/typebox").TNumber;
        p99_ms: import("@sinclair/typebox").TNumber;
        max_ms: import("@sinclair/typebox").TNumber;
    }>;
}>;
export type LatencyHistogramEnvelope = Static<typeof LatencyHistogramEnvelopeSchema>;
//# sourceMappingURL=latency-histogram-envelope.d.ts.map