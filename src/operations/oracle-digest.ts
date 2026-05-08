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
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';

/** Pulse cadence: three-per-day (morning / afternoon / evening). */
export const PulseKindSchema = Type.Union(
  [Type.Literal('morning'), Type.Literal('afternoon'), Type.Literal('evening')],
  {
    $id: 'PulseKind',
    description:
      'Three-pulse-per-day cadence enum for OracleDigest. Each cluster ' +
      'emits exactly one OracleDigest per pulse_kind per day; the three ' +
      'literals together establish the diurnal frequency contract.',
  },
);
export type PulseKind = Static<typeof PulseKindSchema>;

export const OracleDigestSchema = Type.Object(
  {
    envelope_kind: Type.Literal('oracle_digest'),
    contract_version: Type.Literal('8.6.0'),
    pulse_id: Type.String({ minLength: 1 }),
    pulse_kind: PulseKindSchema,
    cluster_id: Type.String({ minLength: 1 }),
    ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    headline: Type.Object(
      {
        conformance_pct_7d: Type.Number({ minimum: 0, maximum: 100 }),
        conformance_pct_7d_delta: Type.Number(),
        inter_series_last_boolean: Type.Boolean(),
        sosyete_divergence_pp: Type.Number(),
      },
      { additionalProperties: false },
    ),
    epic_summary_24h: Type.Array(
      Type.Object(
        {
          epic_id: Type.String({ minLength: 1 }),
          status: Type.String({ minLength: 1 }),
          conformance_pct: Type.Number({ minimum: 0, maximum: 100 }),
        },
        { additionalProperties: false },
      ),
    ),
    subscription_pool_summary: Type.Object(
      {
        healthy_account_count: Type.Integer({ minimum: 0 }),
        rate_limited_account_count: Type.Integer({ minimum: 0 }),
        exhausted_account_count: Type.Integer({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
    stale_assumptions: Type.Array(Type.String({ minLength: 1 })),
    pending_escalations_count: Type.Integer({ minimum: 0 }),
    pulse_attention_breakdown: Type.Object(
      {
        strategy: Type.Number({ minimum: 0, maximum: 1 }),
        inter_oracle_conflict: Type.Number({ minimum: 0, maximum: 1 }),
        escalation: Type.Number({ minimum: 0, maximum: 1 }),
      },
      { additionalProperties: false },
    ),
    telegram_variant_md_below_4kb: Type.String({ maxLength: 4096 }),
    full_markdown_s3_url: Type.String({ pattern: '^s3://[a-z0-9.-]+/.+$' }),
  },
  {
    $id: 'OracleDigest',
    additionalProperties: false,
    'x-canonical-size-cap-bytes-of-field': { telegram_variant_md_below_4kb: 4096 },
    description:
      'Pulse-time cluster conformance digest. Three pulses per day per ' +
      'cluster_id. The telegram_variant_md_below_4kb field carries the ' +
      '4 KB-capped markdown body for Telegram delivery; the ' +
      'full_markdown_s3_url points at the unconstrained-length ' +
      's3://-stored full digest.',
  },
);
export type OracleDigest = Static<typeof OracleDigestSchema>;
