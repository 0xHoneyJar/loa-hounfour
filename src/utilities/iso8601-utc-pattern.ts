/**
 * ISO 8601 UTC timestamp pattern with `Z` suffix.
 *
 * The pattern admits the exact form `YYYY-MM-DDTHH:MM:SS(.sss)?Z` —
 * date with `T` separator, time, optional 1-9 digit fractional
 * seconds, and a `Z` suffix indicating UTC. Other timezone offsets
 * (`+05:30`, `-08:00`) are NOT accepted; producers MUST use UTC.
 *
 * Why UTC-only: cross-language runners (FR-A2) need byte-stable
 * timestamps for the canonical-JSON conformance corpus. Different
 * languages serialize timezone offsets differently (Java omits the
 * colon by default; Python's `isoformat` requires explicit `tzinfo`).
 * Pinning to UTC + literal `Z` removes the cross-runner serialization
 * variance.
 *
 * Used by FR-B2 `PhaseCompletionEnvelopeTier1Schema.timestamp`,
 * `PhaseCompletionEnvelopeSchema.ingest_timestamp`, and the rest of
 * cycle-005's wire-time fields.
 *
 * @since v8.6.0 — FR-B2 (PR-A3.4)
 */
export const ISO8601_UTC_PATTERN =
  '^\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}(\\.\\d{1,9})?Z$';
