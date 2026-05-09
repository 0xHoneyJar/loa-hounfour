/**
 * `EscalationEnvelopeSchema` — operator-bound escalation event with
 * SLA + idempotency surface (FR-B5, v8.6.0).
 *
 * Severity-to-channel routing is consumer-side per ADR-010 — hounfour
 * declares the shape (severity enum, idempotency key, evidence hashes,
 * SLA seconds), the consumer dispatches to the appropriate channel
 * (digest / Telegram / email / SMS / auto-execute). The escalation
 * surface is intentionally minimal so consumer implementations can
 * compose richer policy without schema-side coupling.
 *
 * @see SDD §3.7 — FR-B5 spec
 * @since v8.6.0 — FR-B5 (PR-A3.5)
 */
import { type Static } from '@sinclair/typebox';
export declare const EscalationSeveritySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"info">, import("@sinclair/typebox").TLiteral<"warn">, import("@sinclair/typebox").TLiteral<"critical">, import("@sinclair/typebox").TLiteral<"panic">]>;
export type EscalationSeverity = Static<typeof EscalationSeveritySchema>;
export declare const EscalationEnvelopeSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"escalation">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    escalation_id: import("@sinclair/typebox").TString;
    ts: import("@sinclair/typebox").TString;
    cluster_id: import("@sinclair/typebox").TString;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"info">, import("@sinclair/typebox").TLiteral<"warn">, import("@sinclair/typebox").TLiteral<"critical">, import("@sinclair/typebox").TLiteral<"panic">]>;
    reason_class: import("@sinclair/typebox").TString;
    reason: import("@sinclair/typebox").TString;
    attached_evidence_hashes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    expected_response_sla_seconds: import("@sinclair/typebox").TInteger;
    idempotency_key: import("@sinclair/typebox").TString;
}>;
export type EscalationEnvelope = Static<typeof EscalationEnvelopeSchema>;
//# sourceMappingURL=escalation-envelope.d.ts.map