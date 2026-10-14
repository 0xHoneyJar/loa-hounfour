/**
 * v8.8.0 (SDD §3, FR-C4) — every emission site that sets a `reason` also
 * sets `judgement_requested` + `consumer_obligation_level` from the
 * consumer-obligation contract; entries without a reason carry neither.
 *
 * Emission sites covered:
 *   - validate(): CRYPTO_DEFERRED, INTEGRITY_DEFERRED, ORD-3 (context_absent,
 *     pattern_matching, chain_context_provided), ORD-5 (vocabulary_drift).
 *   - plan_content_hash_unchanged_since_signoff builtin: ledger_context_deferred,
 *     signoff_plan_hash_mismatch, signoff_ttl_observed, plus its reason-less
 *     library-evaluator failure entries.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { validate } from '../../src/validators/index.js';
import { OrgRepresentativeDelegationSchema } from '../../src/governance/org-representative-delegation.js';
import { CommitmentRootSchema } from '../../src/governance/commitment-root.js';
import { SubscriptionPoolStateSchema } from '../../src/canonical/subscription-pool-state.js';
import {
  UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT,
  type UnverifiedObligationEntry,
} from '../../src/constraints/unverified-obligations.js';
import { evaluatePlanContentHashUnchangedSinceSignoff } from '../../src/constraints/builtins/plan-content-hash-unchanged-since-signoff.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const VECTORS = join(__dirname, '..', '..', 'vectors');
const NOW = '2026-10-14T00:00:00Z';

function readJson(...parts: string[]): Record<string, unknown> {
  const raw = JSON.parse(readFileSync(join(VECTORS, ...parts), 'utf8')) as Record<string, unknown>;
  delete raw._comment;
  return raw;
}

function expectAnnotated(entry: UnverifiedObligationEntry): void {
  expect(entry.reason, `${entry.rule_id} must carry a reason`).toBeDefined();
  const row = UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[entry.reason!];
  expect(entry.judgement_requested).toBe(row.judgement_requested);
  expect(entry.consumer_obligation_level).toBe(row.level);
}

function expectUnannotated(entry: UnverifiedObligationEntry): void {
  expect(entry.reason).toBeUndefined();
  expect('judgement_requested' in entry).toBe(false);
  expect('consumer_obligation_level' in entry).toBe(false);
}

describe('validate() — x-chain-bearing ORD-3 entries (FR-A4 fixture matrix)', () => {
  const dir = join(VECTORS, 'OrgRepresentativeDelegation', 'v8.6.0-fail-closed');
  const cases = readdirSync(dir).filter((f) => f.endsWith('.json')).sort();
  const seenReasons = new Set<string>();

  for (const f of cases) {
    it(`${f}: every reason-bearing entry carries its judgement`, () => {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8')) as {
        validate_options: Record<string, unknown>;
        data: unknown;
      };
      const result = validate(OrgRepresentativeDelegationSchema, c.data, { ...c.validate_options, now: NOW });
      if (!result.valid) return;
      for (const entry of result.unverified_obligations?.unverified_rules ?? []) {
        if (entry.reason !== undefined) {
          expectAnnotated(entry);
          seenReasons.add(entry.reason);
        } else {
          expectUnannotated(entry);
        }
      }
    });
  }

  it('the matrix exercised context_absent, pattern_matching and chain_context_provided', () => {
    expect(seenReasons).toContain('context_absent');
    expect(seenReasons).toContain('pattern_matching');
    expect(seenReasons).toContain('chain_context_provided');
  });
});

describe('validate() — ORD-5 vocabulary_drift', () => {
  it('annotates each drift entry with the SHOULD row', () => {
    const c = JSON.parse(
      readFileSync(join(VECTORS, 'OrgRepresentativeDelegation', 'v8.6.0-fail-closed', 'case-03-default-present-genesis.json'), 'utf8'),
    ) as { validate_options: Record<string, unknown>; data: Record<string, unknown> };
    const data = {
      ...c.data,
      capability_scope: { ...(c.data.capability_scope as object), zz_custom: 'x', aa_custom: 'y' },
    };
    const result = validate(OrgRepresentativeDelegationSchema, data, { ...c.validate_options, now: NOW });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const drift = result.unverified_obligations!.unverified_rules.filter((e) => e.reason === 'vocabulary_drift');
    expect(drift).toHaveLength(2);
    for (const entry of drift) {
      expectAnnotated(entry);
      expect(entry.consumer_obligation_level).toBe('SHOULD');
    }
  });
});

describe('validate() — x-crypto-bearing (+ x-integrity-bearing) with acceptDeferred', () => {
  it('CRYPTO_DEFERRED entry carries the crypto_deferred judgement', () => {
    const dir = join(VECTORS, 'SubscriptionPoolState', 'v8.7.0', 'valid');
    const f = readdirSync(dir).filter((x) => x.endsWith('.json')).sort()[0];
    const result = validate(SubscriptionPoolStateSchema, readJson('SubscriptionPoolState', 'v8.7.0', 'valid', f), {
      acceptDeferred: true,
      now: NOW,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const entry = result.unverified_obligations!.unverified_rules.find((e) => e.rule_id === 'CRYPTO_DEFERRED');
    expect(entry).toBeDefined();
    expect(entry!.reason).toBe('crypto_deferred');
    expectAnnotated(entry!);
  });

  it('INTEGRITY_DEFERRED entry carries the integrity_deferred judgement', () => {
    const dir = join(VECTORS, 'CommitmentRoot', 'valid');
    const f = readdirSync(dir).filter((x) => x.endsWith('.json')).sort()[0];
    const result = validate(CommitmentRootSchema, readJson('CommitmentRoot', 'valid', f), {
      acceptDeferred: true,
      now: NOW,
    });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const entry = result.unverified_obligations!.unverified_rules.find((e) => e.rule_id === 'INTEGRITY_DEFERRED');
    expect(entry).toBeDefined();
    expect(entry!.reason).toBe('integrity_deferred');
    expectAnnotated(entry!);
  });

  it('without acceptDeferred the crypto-bearing default still fails closed (no manifest)', () => {
    const dir = join(VECTORS, 'SubscriptionPoolState', 'v8.7.0', 'valid');
    const f = readdirSync(dir).filter((x) => x.endsWith('.json')).sort()[0];
    const result = validate(SubscriptionPoolStateSchema, readJson('SubscriptionPoolState', 'v8.7.0', 'valid', f));
    expect(result.valid).toBe(false);
  });
});

describe('plan_content_hash_unchanged_since_signoff builtin', () => {
  const HASH_A = 'sha256:' + 'a'.repeat(64);
  const HASH_B = 'sha256:' + 'b'.repeat(64);
  const signoff = { signoff_id: 's-1', plan_content_hash: HASH_A, ttl_seconds_at_emit: 3600n, ts_emit: '2026-05-09T12:00:00Z' };
  const snap = (signoffs: unknown[]) => ({ ts_snapshot: '2026-05-09T12:30:00Z', signoffs }) as never;

  it('ledger_context_deferred (no snapshot)', () => {
    const r = evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, undefined);
    expect(r.manifestEntry!.reason).toBe('ledger_context_deferred');
    expectAnnotated(r.manifestEntry!);
  });

  it('signoff_plan_hash_mismatch (no matching signoff)', () => {
    const r = evaluatePlanContentHashUnchangedSinceSignoff(HASH_B, snap([signoff]));
    expect(r.result).toBe('fail');
    expect(r.manifestEntry!.reason).toBe('signoff_plan_hash_mismatch');
    expectAnnotated(r.manifestEntry!);
  });

  it('signoff_ttl_observed (pass path)', () => {
    const r = evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, snap([signoff]));
    expect(r.result).toBe('pass');
    expect(r.manifestEntry!.reason).toBe('signoff_ttl_observed');
    expectAnnotated(r.manifestEntry!);
  });

  it('reason-less library entries (non-string plan hash, malformed ts_emit) carry no judgement', () => {
    expectUnannotated(evaluatePlanContentHashUnchangedSinceSignoff(42, undefined).manifestEntry!);
    expectUnannotated(
      evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, snap([{ ...signoff, ts_emit: 'not-a-date' }])).manifestEntry!,
    );
  });
});
