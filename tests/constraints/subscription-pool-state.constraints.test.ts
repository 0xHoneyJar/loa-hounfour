/**
 * PR-A4.3 (FR-G3) — Tests for `SubscriptionPoolState.constraints.json`
 * + the LOCAL helpers `stringMicroUsdLe` and `iso8601GeField` from
 * `src/constraints/builtins/subscription-pool-state-local.ts`.
 *
 * The LOCAL helpers are NOT registered as DSL evaluator builtins per
 * SDD §4.6 — these tests exercise them directly to lock the per-
 * helper contract.
 *
 * `arrayFieldDistinct` is reused from PR-A4.1 and has its own
 * dedicated suite at
 * `tests/constraints/cluster-run-series.constraints.test.ts`; this
 * file does not duplicate that coverage.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  stringMicroUsdLe,
  iso8601GeField,
} from '../../src/constraints/builtins/subscription-pool-state-local.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CONSTRAINT_FILE = join(
  __dirname,
  '..',
  '..',
  'constraints',
  'SubscriptionPoolState.constraints.json',
);

describe('stringMicroUsdLe (LOCAL helper, FR-G3)', () => {
  it('returns valid:true on consumed == allocated', () => {
    expect(stringMicroUsdLe('100', '100')).toEqual({ valid: true });
  });

  it('returns valid:true on consumed < allocated', () => {
    expect(stringMicroUsdLe('99', '100')).toEqual({ valid: true });
  });

  it('returns valid:false on consumed > allocated', () => {
    const r = stringMicroUsdLe('101', '100');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('"101"');
    expect(r.reason).toContain('"100"');
  });

  it('handles bigint-stress values beyond Number.MAX_SAFE_INTEGER (50-digit)', () => {
    const big = '1' + '0'.repeat(50);
    const bigger = '1' + '0'.repeat(51);
    expect(stringMicroUsdLe(big, bigger)).toEqual({ valid: true });
    const r = stringMicroUsdLe(bigger, big);
    expect(r.valid).toBe(false);
  });

  it('handles zero on both sides', () => {
    expect(stringMicroUsdLe('0', '0')).toEqual({ valid: true });
  });

  it('handles leading zeros (^[0-9]+$ admits them per BigInt parsing)', () => {
    expect(stringMicroUsdLe('007', '010')).toEqual({ valid: true });
  });

  it('flags non-string consumed_units precondition', () => {
    const r = stringMicroUsdLe(100, '200');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('consumed_units precondition failed');
  });

  it('flags non-string allocated_units precondition', () => {
    const r = stringMicroUsdLe('100', null);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('allocated_units precondition failed');
  });

  it('flags malformed consumed_units (non-numeric chars)', () => {
    const r = stringMicroUsdLe('100abc', '200');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('does not match');
  });

  it('flags malformed allocated_units (decimal point)', () => {
    const r = stringMicroUsdLe('100', '200.50');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('does not match');
  });

  it('flags negative consumed_units', () => {
    const r = stringMicroUsdLe('-100', '200');
    expect(r.valid).toBe(false);
  });

  it('does not throw on adversarial inputs (defensive contract)', () => {
    expect(() => stringMicroUsdLe(undefined, undefined)).not.toThrow();
    expect(() => stringMicroUsdLe({}, [])).not.toThrow();
    expect(() => stringMicroUsdLe('', '')).not.toThrow();
  });
});

describe('iso8601GeField (LOCAL helper, FR-G3)', () => {
  it('returns valid:true when stable_until > ts', () => {
    expect(
      iso8601GeField('2026-05-09T01:00:00Z', '2026-05-09T00:00:00Z'),
    ).toEqual({ valid: true });
  });

  it('returns valid:true when stable_until == ts (boundary)', () => {
    expect(
      iso8601GeField('2026-05-09T00:00:00Z', '2026-05-09T00:00:00Z'),
    ).toEqual({ valid: true });
  });

  it('returns valid:false when stable_until < ts', () => {
    const r = iso8601GeField('2026-05-08T00:00:00Z', '2026-05-09T00:00:00Z');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('before ts');
  });

  it('flags non-string stable_until precondition', () => {
    const r = iso8601GeField(null, '2026-05-09T00:00:00Z');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('stable_until precondition failed');
  });

  it('flags non-string ts precondition', () => {
    const r = iso8601GeField('2026-05-09T00:00:00Z', 0);
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('ts precondition failed');
  });

  it('flags JCS-canonical-form precondition on stable_until (non-UTC offset)', () => {
    const r = iso8601GeField(
      '2026-05-09T00:00:00+02:00',
      '2026-05-09T00:00:00Z',
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('JCS-canonical');
    expect(r.reason).toContain('SDD §2.0.1');
  });

  it('flags JCS-canonical-form precondition on ts (free-form date)', () => {
    const r = iso8601GeField('2026-05-09T00:00:00Z', '2026/05/09 00:00:00');
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('JCS-canonical');
  });

  it('handles cross-millennium ordering correctly', () => {
    expect(
      iso8601GeField('3000-01-01T00:00:00Z', '2026-05-09T00:00:00Z'),
    ).toEqual({ valid: true });
    const r = iso8601GeField('1999-12-31T23:59:59Z', '2026-05-09T00:00:00Z');
    expect(r.valid).toBe(false);
  });

  it('does not throw on adversarial inputs (defensive contract)', () => {
    expect(() => iso8601GeField(undefined, undefined)).not.toThrow();
    expect(() => iso8601GeField({}, [])).not.toThrow();
    expect(() => iso8601GeField('', '')).not.toThrow();
  });

  // iter-1 bridge review MEDIUM #1 (three-model consensus): fixed-
  // fractional-precision precondition. ISO8601_UTC_PATTERN admits
  // optional fractional seconds with 1-9 digits; pattern conformance
  // alone is not sufficient for lexicographic monotonicity because
  // '.' (0x2E) < 'Z' (0x5A) — naive lex-compare inverts ordering for
  // mixed-precision pairs.
  it('flags JCS-canonical-form precondition: fractional precision present on later but absent on earlier (iter-1 MEDIUM mitigation)', () => {
    const r = iso8601GeField(
      '2026-05-09T00:00:00.5Z',
      '2026-05-09T00:00:00Z',
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('fractional-precision mismatch');
    expect(r.reason).toContain('includes');
    expect(r.reason).toContain('omits');
  });

  it('flags JCS-canonical-form precondition: fractional precision present on earlier but absent on later (iter-1 MEDIUM mitigation)', () => {
    const r = iso8601GeField(
      '2026-05-09T00:00:00Z',
      '2026-05-09T00:00:00.0Z',
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('fractional-precision mismatch');
  });

  it('flags JCS-canonical-form precondition: fractional-digit-count mismatch (iter-1 MEDIUM mitigation)', () => {
    const r = iso8601GeField(
      '2026-05-09T00:00:01.5Z',
      '2026-05-09T00:00:00.000000Z',
    );
    expect(r.valid).toBe(false);
    expect(r.reason).toContain('fractional-digit-count mismatch');
  });

  it('admits matching fractional precision: both with 3-digit milliseconds', () => {
    expect(
      iso8601GeField('2026-05-09T01:00:00.000Z', '2026-05-09T00:00:00.000Z'),
    ).toEqual({ valid: true });
  });

  it('admits matching fractional precision: both with 9-digit nanoseconds', () => {
    expect(
      iso8601GeField(
        '2026-05-09T01:00:00.000000001Z',
        '2026-05-09T00:00:00.000000000Z',
      ),
    ).toEqual({ valid: true });
  });
});

describe('SubscriptionPoolState.constraints.json — file structure', () => {
  const constraintFile = JSON.parse(
    readFileSync(CONSTRAINT_FILE, 'utf8'),
  ) as {
    schema_id: string;
    contract_version: string;
    expression_version: string;
    constraints: Array<{
      id: string;
      severity: string;
      evaluator: string;
      fields: string[];
    }>;
  };

  it('declares schema_id SubscriptionPoolState', () => {
    expect(constraintFile.schema_id).toBe('SubscriptionPoolState');
  });

  it('pins contract_version to 8.7.0', () => {
    expect(constraintFile.contract_version).toBe('8.7.0');
  });

  it('publishes exactly the SPS-1..SPS-4 constraint set', () => {
    const ids = constraintFile.constraints.map((c) => c.id);
    expect(ids).toEqual(['SPS-1', 'SPS-2', 'SPS-3', 'SPS-4']);
  });

  it('marks SPS-1, SPS-2, SPS-4 as runtime-deferred (LOCAL helpers, not DSL)', () => {
    const lookup = (id: string) =>
      constraintFile.constraints.find((c) => c.id === id);
    expect(lookup('SPS-1')?.evaluator).toBe('runtime-deferred');
    expect(lookup('SPS-2')?.evaluator).toBe('runtime-deferred');
    expect(lookup('SPS-4')?.evaluator).toBe('runtime-deferred');
  });

  it('marks SPS-3 as runtime-deferred warning (consumer-side ed25519 verification)', () => {
    const sps3 = constraintFile.constraints.find((c) => c.id === 'SPS-3');
    expect(sps3?.evaluator).toBe('runtime-deferred');
    expect(sps3?.severity).toBe('warning');
  });

  it('SPS-1 fields reference accounts', () => {
    const sps1 = constraintFile.constraints.find((c) => c.id === 'SPS-1');
    expect(sps1?.fields).toEqual(['accounts']);
  });

  it('SPS-4 fields reference accounts and ts', () => {
    const sps4 = constraintFile.constraints.find((c) => c.id === 'SPS-4');
    expect(sps4?.fields).toEqual(['accounts', 'ts']);
  });
});
