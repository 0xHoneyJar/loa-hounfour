/**
 * v8.8.0 (SDD §3, FR-C4) — consumer-obligation contract table, lookup and
 * annotation helpers.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  FAIL_CLOSED_DEFAULT_FLIP_VERSION,
  UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT,
  UNVERIFIED_OBLIGATION_REASONS,
  describeConsumerObligation,
  withConsumerObligation,
  buildUnverifiedObligationsManifest,
  type UnverifiedObligationEntry,
  type UnverifiedObligationReason,
} from '../../src/constraints/index.js';
import * as root from '../../src/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const SOURCE = readFileSync(
  join(__dirname, '..', '..', 'src', 'constraints', 'unverified-obligations.ts'),
  'utf8',
);

/** Parse the union literal members straight out of the source file. */
function unionMembersFromSource(): string[] {
  const m = SOURCE.match(/export type UnverifiedObligationReason =([\s\S]*?);/);
  if (!m) throw new Error('UnverifiedObligationReason union not found');
  return [...m[1].matchAll(/'([a-z0-9_]+)'/g)].map((x) => x[1]).sort();
}

describe('UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT — completeness', () => {
  it('has exactly one row per union member (parsed from source)', () => {
    expect([...UNVERIFIED_OBLIGATION_REASONS]).toEqual(unionMembersFromSource());
    expect(unionMembersFromSource().length).toBeGreaterThanOrEqual(23);
    expect(Object.keys(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT).sort()).toEqual(unionMembersFromSource());
  });

  it('includes the two ScopeOfAutonomy reasons (SDD §1)', () => {
    expect(UNVERIFIED_OBLIGATION_REASONS).toContain('scope_parent_context_deferred');
    expect(UNVERIFIED_OBLIGATION_REASONS).toContain('scope_inheritance_violation');
  });

  it('UNVERIFIED_OBLIGATION_REASONS is sorted and frozen', () => {
    expect([...UNVERIFIED_OBLIGATION_REASONS]).toEqual([...UNVERIFIED_OBLIGATION_REASONS].sort());
    expect(Object.isFrozen(UNVERIFIED_OBLIGATION_REASONS)).toBe(true);
  });

  it('the table and every row are frozen', () => {
    expect(Object.isFrozen(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT)).toBe(true);
    for (const reason of UNVERIFIED_OBLIGATION_REASONS) {
      expect(Object.isFrozen(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason])).toBe(true);
    }
  });

  for (const reason of unionMembersFromSource() as UnverifiedObligationReason[]) {
    describe(reason, () => {
      const row = UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason];
      it('has a MUST or SHOULD level', () => {
        expect(['MUST', 'SHOULD']).toContain(row.level);
      });
      it('has a non-empty action', () => {
        expect(row.action.trim().length).toBeGreaterThan(0);
      });
      it('judgement is one question: ends with "?", <= 200 chars, no inner sentence break', () => {
        const j = row.judgement_requested;
        expect(j.endsWith('?')).toBe(true);
        expect(j.length).toBeLessThanOrEqual(200);
        expect(j.slice(0, -1)).not.toMatch(/[.?!](\s|$)/);
        expect(j[0]).toBe(j[0].toUpperCase());
      });
      it('has a boolean affected_by_fail_closed_flip', () => {
        expect(typeof row.affected_by_fail_closed_flip).toBe('boolean');
      });
    });
  }
});

describe('affected_by_fail_closed_flip semantics', () => {
  it('only context_absent changes validate() outcome at the v9.0.0 flip', () => {
    const affected = UNVERIFIED_OBLIGATION_REASONS.filter(
      (r) => UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[r].affected_by_fail_closed_flip,
    );
    expect(affected).toEqual(['context_absent']);
  });

  it('crypto_deferred and integrity_deferred are unaffected (crypto-bearing already fails closed)', () => {
    expect(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT.crypto_deferred.affected_by_fail_closed_flip).toBe(false);
    expect(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT.integrity_deferred.affected_by_fail_closed_flip).toBe(false);
  });

  it('FAIL_CLOSED_DEFAULT_FLIP_VERSION is 9.0.0', () => {
    expect(FAIL_CLOSED_DEFAULT_FLIP_VERSION).toBe('9.0.0');
  });

  it('vocabulary_drift is the only SHOULD row', () => {
    const should = UNVERIFIED_OBLIGATION_REASONS.filter(
      (r) => UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[r].level === 'SHOULD',
    );
    expect(should).toEqual(['vocabulary_drift']);
  });
});

describe('describeConsumerObligation', () => {
  it('returns the table row for every reason', () => {
    for (const reason of UNVERIFIED_OBLIGATION_REASONS) {
      expect(describeConsumerObligation(reason)).toBe(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason]);
    }
  });

  it('throws TypeError on an unknown reason', () => {
    expect(() => describeConsumerObligation('not_a_reason' as UnverifiedObligationReason)).toThrow(TypeError);
  });

  it('throws on inherited Object.prototype keys', () => {
    expect(() => describeConsumerObligation('toString' as UnverifiedObligationReason)).toThrow(TypeError);
    expect(() => describeConsumerObligation('__proto__' as UnverifiedObligationReason)).toThrow(TypeError);
  });
});

describe('withConsumerObligation', () => {
  const base: UnverifiedObligationEntry = {
    rule_id: 'X-1',
    rule: 'r',
    evaluator: 'consumer',
    evaluation_note: 'n',
    consumer_acknowledgment_required: true,
  };

  it('returns a reason-less entry unchanged (same reference, no judgement)', () => {
    const out = withConsumerObligation(base);
    expect(out).toBe(base);
    expect('judgement_requested' in out).toBe(false);
    expect('consumer_obligation_level' in out).toBe(false);
  });

  it('adds judgement_requested and consumer_obligation_level from the row', () => {
    for (const reason of UNVERIFIED_OBLIGATION_REASONS) {
      const entry = { ...base, reason };
      const out = withConsumerObligation(entry);
      expect(out.judgement_requested).toBe(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason].judgement_requested);
      expect(out.consumer_obligation_level).toBe(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT[reason].level);
      expect(out).toMatchObject(entry);
    }
  });

  it('does not mutate its input', () => {
    const entry: UnverifiedObligationEntry = { ...base, reason: 'crypto_deferred' };
    const snapshot = JSON.stringify(entry);
    withConsumerObligation(entry);
    expect(JSON.stringify(entry)).toBe(snapshot);
  });

  it('is idempotent', () => {
    const once = withConsumerObligation({ ...base, reason: 'context_absent' });
    expect(withConsumerObligation(once)).toEqual(once);
  });

  it('throws on an unknown reason rather than emitting an entry without judgement', () => {
    expect(() =>
      withConsumerObligation({ ...base, reason: 'bogus' as UnverifiedObligationReason }),
    ).toThrow(TypeError);
  });
});

describe('buildUnverifiedObligationsManifest (reason-less emission site)', () => {
  it('emits no judgement on runtime-deferred entries, which carry no reason', () => {
    const manifest = buildUnverifiedObligationsManifest(
      {
        schema_id: 'X',
        contract_version: '8.8.0',
        expression_version: '1.0',
        constraints: [
          {
            id: 'X-1',
            expression: 'consumer checks',
            severity: 'error',
            message: 'm',
            fields: [],
            evaluator: 'runtime-deferred',
            evaluation_note: 'n',
          },
        ],
      } as unknown as Parameters<typeof buildUnverifiedObligationsManifest>[0],
      '2026-10-14T00:00:00Z',
    );
    const entry = manifest!.unverified_rules[0];
    expect(entry.reason).toBeUndefined();
    expect('judgement_requested' in entry).toBe(false);
    expect('consumer_obligation_level' in entry).toBe(false);
  });
});

describe('root barrel reachability', () => {
  it('exports the contract surface from the package root', () => {
    expect(root.UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT).toBe(UNVERIFIED_OBLIGATION_CONSUMER_CONTRACT);
    expect(root.describeConsumerObligation).toBe(describeConsumerObligation);
    expect(root.withConsumerObligation).toBe(withConsumerObligation);
    expect(root.FAIL_CLOSED_DEFAULT_FLIP_VERSION).toBe('9.0.0');
    expect(root.UNVERIFIED_OBLIGATION_REASONS).toBe(UNVERIFIED_OBLIGATION_REASONS);
    expect(typeof root.joinReceiptToManifest).toBe('function');
    expect(root.ManifestConsumptionReceiptSchema.$id).toBe('ManifestConsumptionReceipt');
  });
});
