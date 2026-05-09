/**
 * PR-A3.6 (FR-C4) — Tests for `plan_content_hash_unchanged_since_signoff` builtin.
 *
 * Acceptance hooks (per sprint.md PR-A3.6):
 *   - FR-C4 hash-success path emits `SIGNOFF_TTL_OBSERVED` with
 *     `ts_emit + ttl_until_ms` (NA-3 verified)
 *   - FR-C4 hash-mismatch emits `SIGNOFF_PLAN_HASH_MISMATCH`
 *   - FR-C4 LEDGER_CONTEXT_DEFERRED on null snapshot
 *   - DSL boolean: pass and deferred map to true; fail maps to false
 *
 * @see src/constraints/builtins/plan-content-hash-unchanged-since-signoff.ts
 */
import { describe, it, expect } from 'vitest';
import {
  evaluatePlanContentHashUnchangedSinceSignoff,
  PLAN_CONTENT_HASH_RULE_ID,
  type PlanSignoffLedgerSnapshot,
  type PlanSignoffLedgerEntry,
} from '../../src/constraints/builtins/plan-content-hash-unchanged-since-signoff.js';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const HASH_A =
  'sha256:aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa';
const HASH_B =
  'sha256:bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb';
const HASH_C =
  'sha256:cccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccccc';

function entry(
  overrides: Partial<PlanSignoffLedgerEntry> = {},
): PlanSignoffLedgerEntry {
  return {
    signoff_id: 'signoff-001',
    plan_content_hash: HASH_A,
    ttl_seconds_at_emit: 3600n,
    ts_emit: '2026-05-09T12:00:00Z',
    ...overrides,
  };
}

function snapshot(
  signoffs: PlanSignoffLedgerEntry[] = [entry()],
  ts_snapshot = '2026-05-09T12:30:00Z',
): PlanSignoffLedgerSnapshot {
  return { ts_snapshot, signoffs };
}

describe('evaluatePlanContentHashUnchangedSinceSignoff (standalone)', () => {
  describe('LEDGER_CONTEXT_DEFERRED', () => {
    it('fires when snapshot is undefined; result deferred', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        undefined,
      );
      expect(result.result).toBe('deferred');
      expect(result.manifestEntry?.reason).toBe('ledger_context_deferred');
      expect(result.manifestEntry?.evaluator).toBe('consumer');
      expect(result.manifestEntry?.rule_id).toBe(PLAN_CONTENT_HASH_RULE_ID);
      expect(result.manifestEntry?.consumer_acknowledgment_required).toBe(true);
    });

    it('fires when snapshot is null; result deferred', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, null);
      expect(result.result).toBe('deferred');
      expect(result.manifestEntry?.reason).toBe('ledger_context_deferred');
    });
  });

  describe('SIGNOFF_PLAN_HASH_MISMATCH', () => {
    it('fires when snapshot exists but hash absent; result fail', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_B,
        snapshot([entry({ plan_content_hash: HASH_A })]),
      );
      expect(result.result).toBe('fail');
      expect(result.manifestEntry?.reason).toBe('signoff_plan_hash_mismatch');
      expect(result.manifestEntry?.evaluator).toBe('consumer');
      expect(result.manifestEntry?.evaluation_note).toContain(HASH_B);
      expect(result.manifestEntry?.evaluation_note).toContain('1 entries');
    });

    it('fires on empty signoffs array', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        snapshot([]),
      );
      expect(result.result).toBe('fail');
      expect(result.manifestEntry?.reason).toBe('signoff_plan_hash_mismatch');
      expect(result.manifestEntry?.evaluation_note).toContain('0 entries');
    });

  });

  describe('case-insensitive matching (iter-1 F-002)', () => {
    it('mixed-case wire payload matches lowercase ledger entry', () => {
      const mixedHash = 'sha256:AbCdEf0123456789aBcDeF0123456789AbCdEf0123456789aBcDeF0123456789';
      const lowerHash = mixedHash.toLowerCase();
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        mixedHash,
        snapshot([entry({ plan_content_hash: lowerHash })]),
      );
      expect(result.result).toBe('pass');
      expect(result.manifestEntry?.reason).toBe('signoff_ttl_observed');
    });

    it('lowercase wire payload matches mixed-case ledger entry', () => {
      const mixedHash = 'sha256:AbCdEf0123456789aBcDeF0123456789AbCdEf0123456789aBcDeF0123456789';
      const lowerHash = mixedHash.toLowerCase();
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        lowerHash,
        snapshot([entry({ plan_content_hash: mixedHash })]),
      );
      expect(result.result).toBe('pass');
    });
  });

  describe('malformed ts_emit guard (iter-1 F-003)', () => {
    it('returns fail with library-evaluator entry when matched ts_emit is unparseable', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        snapshot([entry({ ts_emit: 'not-a-real-timestamp' })]),
      );
      expect(result.result).toBe('fail');
      expect(result.manifestEntry?.evaluator).toBe('library');
      expect(result.manifestEntry?.evaluation_note).toContain(
        'unparseable ts_emit',
      );
    });

    it('does not surface ttl_until_ms=NaN as a computed field on fail path', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        snapshot([entry({ ts_emit: 'gibberish' })]),
      );
      // The fail-path evaluation_note may mention "NaN" as documentation
      // (explaining what the library guards against), but it MUST NOT
      // emit a computed `ttl_until_ms=NaN` value field — the F-003 fix
      // surfaces a FAIL before the TTL math runs.
      expect(result.manifestEntry?.evaluation_note).not.toContain(
        'ttl_until_ms=NaN',
      );
    });
  });

  describe('SIGNOFF_TTL_OBSERVED (NA-3)', () => {
    it('fires on hash-match; result pass; manifest carries TTL inputs', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        snapshot([
          entry({
            plan_content_hash: HASH_A,
            ts_emit: '2026-05-09T12:00:00Z',
            ttl_seconds_at_emit: 3600n,
          }),
        ]),
      );
      expect(result.result).toBe('pass');
      expect(result.manifestEntry?.reason).toBe('signoff_ttl_observed');
      expect(result.manifestEntry?.evaluator).toBe('consumer');

      const note = result.manifestEntry?.evaluation_note ?? '';
      expect(note).toContain('signoff_id=signoff-001');
      expect(note).toContain('ts_emit=2026-05-09T12:00:00Z');
      expect(note).toContain('ttl_seconds_at_emit=3600');

      // Verify ttl_until_ms is the absolute epoch-ms expiry, NOT the TTL count.
      const ts_emit_ms = Date.parse('2026-05-09T12:00:00Z');
      const expected_ttl_until_ms = ts_emit_ms + 3600 * 1000;
      expect(note).toContain(`ttl_until_ms=${expected_ttl_until_ms}`);
    });

    it('finds the matching entry when there are multiple signoffs', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_B,
        snapshot([
          entry({ signoff_id: 'so-a', plan_content_hash: HASH_A }),
          entry({ signoff_id: 'so-b', plan_content_hash: HASH_B }),
          entry({ signoff_id: 'so-c', plan_content_hash: HASH_C }),
        ]),
      );
      expect(result.result).toBe('pass');
      expect(result.manifestEntry?.evaluation_note).toContain('signoff_id=so-b');
    });

    it('handles minimum TTL value (1 second)', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        snapshot([entry({ ttl_seconds_at_emit: 1n })]),
      );
      expect(result.result).toBe('pass');
      expect(result.manifestEntry?.evaluation_note).toContain(
        'ttl_seconds_at_emit=1',
      );
    });

    it('handles large TTL up to safe-integer ceiling', () => {
      // 2^53-1 - small offset to keep arithmetic exact.
      const safe_ttl = BigInt(Number.MAX_SAFE_INTEGER) - 1000n;
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        snapshot([entry({ ttl_seconds_at_emit: safe_ttl })]),
      );
      expect(result.result).toBe('pass');
      expect(result.manifestEntry?.evaluation_note).toContain(
        `ttl_seconds_at_emit=${safe_ttl}`,
      );
    });
  });

  describe('Trust-boundary input validation', () => {
    it('returns fail with informative manifest when planHash is not a string', () => {
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        42 as unknown as string,
        snapshot(),
      );
      expect(result.result).toBe('fail');
      expect(result.manifestEntry?.evaluator).toBe('library');
      expect(result.manifestEntry?.evaluation_note).toContain('non-string');
    });

    it('returns fail when ledger snapshot is not Array (consumer-supplied malformation)', () => {
      const malformed = {
        ts_snapshot: '2026-05-09T12:30:00Z',
        signoffs: 'not-an-array' as unknown,
      } as unknown as PlanSignoffLedgerSnapshot;
      const result = evaluatePlanContentHashUnchangedSinceSignoff(
        HASH_A,
        malformed,
      );
      expect(result.result).toBe('fail');
      expect(result.manifestEntry?.evaluator).toBe('library');
      expect(result.manifestEntry?.evaluation_note).toContain(
        'malformed ledger snapshot',
      );
    });
  });
});

describe('DSL wrapper (constraint expression)', () => {
  it('returns true when ledger snapshot is absent (vacuous-pass-with-deferral)', () => {
    const ok = evaluateConstraint(
      { plan_content_hash: HASH_A },
      'plan_content_hash_unchanged_since_signoff(plan_content_hash)',
    );
    expect(ok).toBe(true);
  });

  it('returns true on hash-match with snapshot supplied via context', () => {
    const ok = evaluateConstraint(
      { plan_content_hash: HASH_A },
      'plan_content_hash_unchanged_since_signoff(plan_content_hash)',
      { plan_signoff_ledger: snapshot() },
    );
    expect(ok).toBe(true);
  });

  it('returns false on hash-mismatch with snapshot supplied', () => {
    const ok = evaluateConstraint(
      { plan_content_hash: HASH_B },
      'plan_content_hash_unchanged_since_signoff(plan_content_hash)',
      { plan_signoff_ledger: snapshot([entry({ plan_content_hash: HASH_A })]) },
    );
    expect(ok).toBe(false);
  });

  it('returns false when planHash field is non-string (programmer error)', () => {
    const ok = evaluateConstraint(
      { plan_content_hash: 42 },
      'plan_content_hash_unchanged_since_signoff(plan_content_hash)',
      { plan_signoff_ledger: snapshot() },
    );
    expect(ok).toBe(false);
  });
});
