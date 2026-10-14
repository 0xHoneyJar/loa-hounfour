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
  withConsumerObligation,
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

  it('validate() output is a fixed point of the annotation (no double application drift)', () => {
    const c = JSON.parse(readFileSync(join(dir, 'case-03-default-present-genesis.json'), 'utf8')) as {
      validate_options: Record<string, unknown>;
      data: unknown;
    };
    const result = validate(OrgRepresentativeDelegationSchema, c.data, { ...c.validate_options, now: NOW });
    expect(result.valid).toBe(true);
    if (!result.valid) return;
    const rules = result.unverified_obligations!.unverified_rules;
    expect(rules.length).toBeGreaterThan(0);
    for (const e of rules) {
      expect(JSON.stringify(withConsumerObligation(e))).toBe(JSON.stringify(e));
      expect(withConsumerObligation(e)).toBe(e);
    }
  });

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

describe('plan_content_hash_unchanged_since_signoff builtin (emitter: unannotated)', () => {
  const HASH_A = 'sha256:' + 'a'.repeat(64);
  const HASH_B = 'sha256:' + 'b'.repeat(64);
  const signoff = { signoff_id: 's-1', plan_content_hash: HASH_A, ttl_seconds_at_emit: 3600n, ts_emit: '2026-05-09T12:00:00Z' };
  const snap = (signoffs: unknown[]) => ({ ts_snapshot: '2026-05-09T12:30:00Z', signoffs }) as never;

  const cases: Array<[string, () => UnverifiedObligationEntry, string | undefined]> = [
    ['ledger_context_deferred (no snapshot)', () => evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, undefined).manifestEntry!, 'ledger_context_deferred'],
    ['signoff_plan_hash_mismatch', () => evaluatePlanContentHashUnchangedSinceSignoff(HASH_B, snap([signoff])).manifestEntry!, 'signoff_plan_hash_mismatch'],
    ['signoff_ttl_observed (pass path)', () => evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, snap([signoff])).manifestEntry!, 'signoff_ttl_observed'],
    ['non-string plan hash (library, no reason)', () => evaluatePlanContentHashUnchangedSinceSignoff(42, undefined).manifestEntry!, undefined],
    ['malformed ts_emit (library, no reason)', () => evaluatePlanContentHashUnchangedSinceSignoff(HASH_A, snap([{ ...signoff, ts_emit: 'not-a-date' }])).manifestEntry!, undefined],
  ];

  for (const [name, run, reason] of cases) {
    it(`${name}: emits an unannotated entry; withConsumerObligation attaches the row once`, () => {
      const e = run();
      expect(e.reason).toBe(reason);
      expect('judgement_requested' in e).toBe(false);
      expect('consumer_obligation_level' in e).toBe(false);
      const annotated = withConsumerObligation(e);
      if (reason === undefined) {
        expect(annotated).toBe(e);
      } else {
        expectAnnotated(annotated);
        expect(JSON.stringify(withConsumerObligation(annotated))).toBe(JSON.stringify(annotated));
      }
    });
  }
});

describe('single annotation layer invariant (validate() aggregation)', () => {
  /** Strip the two annotation fields, i.e. recover the emitter's raw entry. */
  function raw(e: UnverifiedObligationEntry): UnverifiedObligationEntry {
    const { judgement_requested: _j, consumer_obligation_level: _l, ...rest } = e;
    void _j;
    void _l;
    return rest;
  }

  function validateResults(): UnverifiedObligationEntry[] {
    const out: UnverifiedObligationEntry[] = [];
    const dir = join(VECTORS, 'OrgRepresentativeDelegation', 'v8.6.0-fail-closed');
    for (const f of readdirSync(dir).filter((x) => x.endsWith('.json'))) {
      const c = JSON.parse(readFileSync(join(dir, f), 'utf8')) as { validate_options: Record<string, unknown>; data: Record<string, unknown> };
      const data = { ...c.data, capability_scope: { ...(c.data.capability_scope as object), zz_custom: 'x' } };
      const r = validate(OrgRepresentativeDelegationSchema, data, { ...c.validate_options, now: NOW });
      if (r.valid) out.push(...(r.unverified_obligations?.unverified_rules ?? []));
    }
    const sps = readdirSync(join(VECTORS, 'SubscriptionPoolState', 'v8.7.0', 'valid')).filter((x) => x.endsWith('.json')).sort()[0];
    const crs = readdirSync(join(VECTORS, 'CommitmentRoot', 'valid')).filter((x) => x.endsWith('.json')).sort()[0];
    for (const r of [
      validate(SubscriptionPoolStateSchema, readJson('SubscriptionPoolState', 'v8.7.0', 'valid', sps), { acceptDeferred: true, now: NOW }),
      validate(CommitmentRootSchema, readJson('CommitmentRoot', 'valid', crs), { acceptDeferred: true, now: NOW }),
    ]) {
      if (r.valid) out.push(...(r.unverified_obligations?.unverified_rules ?? []));
    }
    return out;
  }

  it('every reason-bearing validate() entry equals exactly one annotation of its raw form', () => {
    const entries = validateResults();
    const reasons = new Set(entries.map((e) => e.reason).filter(Boolean));
    expect([...reasons].sort()).toEqual(
      ['chain_context_provided', 'context_absent', 'crypto_deferred', 'integrity_deferred', 'pattern_matching', 'vocabulary_drift'],
    );
    for (const e of entries) {
      if (e.reason === undefined) {
        expectUnannotated(e);
        continue;
      }
      expectAnnotated(e);
      // Exactly once: the entry is byte-identical to a single annotation of
      // the raw emitter entry, and a further pass is a no-op.
      expect(JSON.stringify(e)).toBe(JSON.stringify(withConsumerObligation(raw(e))));
      expect(withConsumerObligation(e)).toBe(e);
      // The two fields appear once, after the emitter's own keys.
      const keys = Object.keys(e);
      expect(keys.slice(-2)).toEqual(['judgement_requested', 'consumer_obligation_level']);
    }
  });

  it('the plan-signoff builtin module no longer imports the annotation helper', () => {
    const src = readFileSync(
      join(__dirname, '..', '..', 'src', 'constraints', 'builtins', 'plan-content-hash-unchanged-since-signoff.ts'),
      'utf8',
    );
    expect(src).not.toMatch(/import[^;]*withConsumerObligation/);
    expect(src).not.toMatch(/withConsumerObligation\(/);
  });
});
