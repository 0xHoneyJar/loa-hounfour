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
import { Type, type Static } from '@sinclair/typebox';
import { ISO8601_UTC_PATTERN } from '../utilities/iso8601-utc-pattern.js';

export const LatencyHistogramEnvelopeSchema = Type.Object(
  {
    envelope_kind: Type.Literal('latency_histogram'),
    contract_version: Type.Literal('8.6.0'),
    ts: Type.String({ pattern: ISO8601_UTC_PATTERN }),
    cluster_id: Type.String({ minLength: 1 }),
    phase: Type.String({ minLength: 1 }),
    measurements: Type.Object(
      {
        p50_ms: Type.Number({ minimum: 0 }),
        p95_ms: Type.Number({ minimum: 0 }),
        p99_ms: Type.Number({ minimum: 0 }),
        max_ms: Type.Number({ minimum: 0 }),
      },
      { additionalProperties: false },
    ),
  },
  {
    $id: 'LatencyHistogramEnvelope',
    additionalProperties: false,
    description:
      'Per-phase per-cluster latency percentile snapshot. The ' +
      'p50 ≤ p95 ≤ p99 ≤ max invariant is enforced via the LOCAL builtin ' +
      'percentiles_monotonic_nondecreasing(measurements) referenced from ' +
      'the constraint file.',
  },
);
export type LatencyHistogramEnvelope = Static<typeof LatencyHistogramEnvelopeSchema>;
