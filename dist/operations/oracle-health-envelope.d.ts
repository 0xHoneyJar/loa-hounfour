/**
 * `OracleHealthEnvelopeSchema` — operational health snapshot of an
 * oracle cluster (FR-B4, v8.6.0).
 *
 * Emitted on a heartbeat cadence (typically every 60s). Surfaces the
 * write-ahead-log size + checksum, last-emission consumption time,
 * pending-escalations count, the model-call circuit-breaker state,
 * and the same pulse-attention-breakdown as `OracleDigestSchema` for
 * cross-correlation.
 *
 * The `wal_size_bytes` field is string-encoded BigInt per CT-03 — WAL
 * sizes can exceed JS Number's safe-integer range (2^53 - 1 ≈ 9 PB).
 *
 * @see SDD §3.6 — FR-B4 spec
 * @since v8.6.0 — FR-B4 (PR-A3.5)
 */
import { type Static } from '@sinclair/typebox';
/** Circuit-breaker state for the cluster's model-call dispatch path. */
export declare const ModelCallCircuitBreakerStateSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"healthy">, import("@sinclair/typebox").TLiteral<"degraded">, import("@sinclair/typebox").TLiteral<"open">]>;
export type ModelCallCircuitBreakerState = Static<typeof ModelCallCircuitBreakerStateSchema>;
export declare const OracleHealthEnvelopeSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"oracle_health">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    wal_size_bytes: import("@sinclair/typebox").TString;
    wal_checksum: import("@sinclair/typebox").TString;
    last_emission_consumed_ts: import("@sinclair/typebox").TString;
    pending_escalations_count: import("@sinclair/typebox").TInteger;
    model_call_circuit_breaker_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"healthy">, import("@sinclair/typebox").TLiteral<"degraded">, import("@sinclair/typebox").TLiteral<"open">]>;
    pulse_attention_breakdown: import("@sinclair/typebox").TObject<{
        strategy: import("@sinclair/typebox").TNumber;
        inter_oracle_conflict: import("@sinclair/typebox").TNumber;
        escalation: import("@sinclair/typebox").TNumber;
    }>;
}>;
export type OracleHealthEnvelope = Static<typeof OracleHealthEnvelopeSchema>;
//# sourceMappingURL=oracle-health-envelope.d.ts.map