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
import { Type } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';
import { SHA256_HEX_PATTERN } from '../integrity/sha256-pattern.js';
/** Circuit-breaker state for the cluster's model-call dispatch path. */
export const ModelCallCircuitBreakerStateSchema = Type.Union([Type.Literal('healthy'), Type.Literal('degraded'), Type.Literal('open')], {
    $id: 'ModelCallCircuitBreakerState',
    description: 'Three-state circuit-breaker enum for the cluster\'s model-call ' +
        'dispatch path. "healthy" = unrestricted dispatch; "degraded" = ' +
        'reduced-rate / fallback; "open" = stop dispatch + drain in-flight. ' +
        'State-to-policy mapping is consumer-side per ADR-010.',
});
export const OracleHealthEnvelopeSchema = Type.Object({
    envelope_kind: Type.Literal('oracle_health'),
    contract_version: Type.Literal('8.6.0'),
    ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    cluster_id: Type.String({ minLength: 1 }),
    wal_size_bytes: Type.String({
        pattern: '^[0-9]+$',
        maxLength: 30,
        description: 'String-encoded ≥0 integer (CT-03; consumer parses to BigInt ' +
            'post-validation). Admits "0" as the empty-WAL sentinel. ' +
            'maxLength: 30 caps inputs well above the 64-bit byte range ' +
            '(2^64 ≈ 20 digits) without permitting megabyte-sized numeric ' +
            'strings that would force downstream BigInt parsers to absorb ' +
            'unbounded allocation cost (PR-A3.5 iter-3 F8).',
    }),
    wal_checksum: Type.String({ pattern: SHA256_HEX_PATTERN }),
    last_emission_consumed_ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    pending_escalations_count: Type.Integer({ minimum: 0 }),
    model_call_circuit_breaker_state: ModelCallCircuitBreakerStateSchema,
    pulse_attention_breakdown: Type.Object({
        strategy: Type.Number({ minimum: 0, maximum: 1 }),
        inter_oracle_conflict: Type.Number({ minimum: 0, maximum: 1 }),
        escalation: Type.Number({ minimum: 0, maximum: 1 }),
    }, { additionalProperties: false }),
}, {
    $id: 'OracleHealthEnvelope',
    additionalProperties: false,
    description: 'Operational health snapshot of an oracle cluster. Heartbeat ' +
        'cadence (typically 60s). Cross-correlates with OracleDigest via ' +
        'shared pulse_attention_breakdown shape.',
});
//# sourceMappingURL=oracle-health-envelope.js.map