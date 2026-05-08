/**
 * PR-A3.5 iter-2 F-002 — Integration test for OracleDigest byte-cap
 * dispatch through `validate()`.
 *
 * The structural schema declares `maxLength: 4096` on
 * `telegram_variant_md_below_4kb`, but `maxLength` counts UTF-16 code
 * units (in JS) — not UTF-8 bytes. A 1500-emoji string is 3000 code
 * units (each surrogate pair) and 6000 UTF-8 bytes; it would pass
 * `Value.Check` against the schema but breach Telegram's 4 KB wire cap.
 *
 * iter-2 wires the OD-2 byte cap through the cross-field validator
 * registry so that `validate(OracleDigestSchema, x)` runs both layers
 * and rejects the bypass. This test documents the fix and is the
 * regression guard against re-introduction.
 *
 * @since v8.6.0 — FR-B3 (PR-A3.5 iter-2 F-002)
 */
import { describe, it, expect } from 'vitest';
import { Value } from '@sinclair/typebox/value';
import { OracleDigestSchema } from '../../src/operations/oracle-digest.js';
import { validate } from '../../src/validators/index.js';

function makeBaseDigest(telegramBody: string): Record<string, unknown> {
  return {
    envelope_kind: 'oracle_digest',
    contract_version: '8.6.0',
    pulse_id: 'pulse-byte-cap-regression',
    pulse_kind: 'morning',
    cluster_id: 'cluster-001',
    ts: '2026-05-09T12:00:00Z',
    headline: {
      conformance_pct_7d: 92.5,
      conformance_pct_7d_delta: 0.8,
      inter_series_last_boolean: true,
      sosyete_divergence_pp: 1.2,
    },
    epic_summary_24h: [
      { epic_id: 'epic-001', status: 'in-progress', conformance_pct: 88 },
    ],
    subscription_pool_summary: {
      healthy_account_count: 3,
      rate_limited_account_count: 0,
      exhausted_account_count: 0,
    },
    stale_assumptions: ['cache-warmup-on-restart'],
    pending_escalations_count: 0,
    pulse_attention_breakdown: {
      strategy: 0.5,
      inter_oracle_conflict: 0.3,
      escalation: 0.2,
    },
    telegram_variant_md_below_4kb: telegramBody,
    full_markdown_s3_url: 's3://oracle-pulses/2026/05/09/cluster-001-pulse.md',
  };
}

describe('OracleDigest byte-cap bypass (PR-A3.5 iter-2 F-002)', () => {
  it('schema-only validation (Value.Check) ACCEPTS a 1500-emoji multi-byte digest', () => {
    // 1500 pile-of-poo emoji × 4 UTF-8 bytes each = 6000 bytes (> 4096 cap).
    // In JS, each emoji is a surrogate pair, so .length === 3000 (< 4096
    // maxLength). Schema validation alone cannot catch this.
    const telegramBody = '\u{1F4A9}'.repeat(1500);
    expect(telegramBody.length).toBe(3000);
    expect(new TextEncoder().encode(telegramBody).length).toBe(6000);

    const digest = makeBaseDigest(telegramBody);
    expect(Value.Check(OracleDigestSchema, digest)).toBe(true);
  });

  it('integrated validate() REJECTS the same digest via OD-2 cross-field byte cap', () => {
    const telegramBody = '\u{1F4A9}'.repeat(1500);
    const digest = makeBaseDigest(telegramBody);
    const result = validate(OracleDigestSchema, digest);
    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors!.some((e) => e.includes('OD-2'))).toBe(true);
    expect(result.errors!.some((e) => e.includes('UTF-8 byte length 6000'))).toBe(true);
    expect(result.errors!.some((e) => e.includes('cap 4096'))).toBe(true);
  });

  it('integrated validate() ACCEPTS a multi-byte digest within the byte cap', () => {
    // 1023 emoji × 4 bytes = 4092 bytes, just under 4096.
    const telegramBody = '\u{1F4A9}'.repeat(1023);
    expect(new TextEncoder().encode(telegramBody).length).toBe(4092);
    const digest = makeBaseDigest(telegramBody);
    const result = validate(OracleDigestSchema, digest);
    expect(result.valid).toBe(true);
  });

  it('integrated validate() ACCEPTS exact-byte-cap (≤ inclusive)', () => {
    // 1024 emoji × 4 bytes = 4096 bytes (exact cap).
    const telegramBody = '\u{1F4A9}'.repeat(1024);
    expect(new TextEncoder().encode(telegramBody).length).toBe(4096);
    const digest = makeBaseDigest(telegramBody);
    const result = validate(OracleDigestSchema, digest);
    expect(result.valid).toBe(true);
  });

  it('integrated validate() ACCEPTS plain ASCII within both caps', () => {
    const digest = makeBaseDigest('## Pulse 001\n\nConformance: 92.5%');
    const result = validate(OracleDigestSchema, digest);
    expect(result.valid).toBe(true);
  });

  it('schema rejects byte-equal-but-codeunit-overflow (sanity: maxLength still bounds 1-byte chars)', () => {
    // 4097 ASCII chars: 4097 code units (> maxLength 4096) AND 4097 bytes.
    // Schema layer catches this first; validate() short-circuits at the
    // schema layer without invoking the cross-field byte-cap.
    const telegramBody = 'a'.repeat(4097);
    const digest = makeBaseDigest(telegramBody);
    expect(Value.Check(OracleDigestSchema, digest)).toBe(false);
    const result = validate(OracleDigestSchema, digest);
    expect(result.valid).toBe(false);
  });
});
