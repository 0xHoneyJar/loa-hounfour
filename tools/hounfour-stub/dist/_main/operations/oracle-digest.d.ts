/**
 * `OracleDigestSchema` — pulse-time digest of cluster conformance
 * (FR-B3, v8.6.0).
 *
 * Three-pulse-per-day cadence (morning / afternoon / evening); each
 * pulse summarizes the cluster's conformance, attention breakdown,
 * EPIC progress, subscription-pool health, and stale assumptions
 * over the prior 24h window.
 *
 * The `telegram_variant_md_below_4kb` field carries the markdown body
 * shipped to the operator's Telegram channel — capped at 4 KB at the
 * UTF-8 byte level (NFR-4 per-field cap, declared via the new
 * `'x-canonical-size-cap-bytes-of-field'` metadata key). This is
 * distinct from the FR-B2 `'x-canonical-size-cap-bytes': 4096`
 * which caps the whole-envelope canonical-JSON form; here the cap
 * applies to a single string field only.
 *
 * @see SDD §3.5 — FR-B3 spec
 * @since v8.6.0 — FR-B3 (PR-A3.5)
 */
import { type Static } from '@sinclair/typebox';
/** Pulse cadence: three-per-day (morning / afternoon / evening). */
export declare const PulseKindSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"morning">, import("@sinclair/typebox").TLiteral<"afternoon">, import("@sinclair/typebox").TLiteral<"evening">]>;
export type PulseKind = Static<typeof PulseKindSchema>;
export declare const OracleDigestSchema: import("@sinclair/typebox").TObject<{
    envelope_kind: import("@sinclair/typebox").TLiteral<"oracle_digest">;
    contract_version: import("@sinclair/typebox").TLiteral<"8.6.0">;
    pulse_id: import("@sinclair/typebox").TString;
    pulse_kind: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"morning">, import("@sinclair/typebox").TLiteral<"afternoon">, import("@sinclair/typebox").TLiteral<"evening">]>;
    cluster_id: import("@sinclair/typebox").TString;
    ts: import("@sinclair/typebox").TString;
    headline: import("@sinclair/typebox").TObject<{
        conformance_pct_7d: import("@sinclair/typebox").TNumber;
        conformance_pct_7d_delta: import("@sinclair/typebox").TNumber;
        inter_series_last_boolean: import("@sinclair/typebox").TBoolean;
        sosyete_divergence_pp: import("@sinclair/typebox").TNumber;
    }>;
    epic_summary_24h: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        epic_id: import("@sinclair/typebox").TString;
        status: import("@sinclair/typebox").TString;
        conformance_pct: import("@sinclair/typebox").TNumber;
    }>>;
    subscription_pool_summary: import("@sinclair/typebox").TObject<{
        healthy_account_count: import("@sinclair/typebox").TInteger;
        rate_limited_account_count: import("@sinclair/typebox").TInteger;
        exhausted_account_count: import("@sinclair/typebox").TInteger;
    }>;
    stale_assumptions: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    pending_escalations_count: import("@sinclair/typebox").TInteger;
    pulse_attention_breakdown: import("@sinclair/typebox").TObject<{
        strategy: import("@sinclair/typebox").TNumber;
        inter_oracle_conflict: import("@sinclair/typebox").TNumber;
        escalation: import("@sinclair/typebox").TNumber;
    }>;
    telegram_variant_md_below_4kb: import("@sinclair/typebox").TString;
    full_markdown_s3_url: import("@sinclair/typebox").TString;
}>;
export type OracleDigest = Static<typeof OracleDigestSchema>;
//# sourceMappingURL=oracle-digest.d.ts.map