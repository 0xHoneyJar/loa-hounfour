/**
 * PR-C3 (FR-C3) — validator-branch and property tests for the
 * separation-of-duties schemas: `validateIrreversibleActionAttestation`,
 * `validateSharedSurfaceDeclaration` and the LOCAL helpers they share.
 */
import { describe, it, expect } from 'vitest';
import fc from 'fast-check';
import { Value } from '@sinclair/typebox/value';
import {
  IrreversibleActionAttestationSchema,
  validateIrreversibleActionAttestation,
  SharedSurfaceDeclarationSchema,
  validateSharedSurfaceDeclaration,
  validate,
  getCrossFieldValidatorSchemas,
} from '../../src/index.js';
import * as governance from '../../src/governance/index.js';
import {
  compareIso8601Utc,
  duplicateStrings,
} from '../../src/governance/separation-of-duties-local.js';

const KEY_P = '3f'.repeat(32);
const KEY_E = 'a1'.repeat(32);

const IAA = {
  envelope_kind: 'irreversible_action_attestation',
  contract_version: '8.8.0',
  attestation_id: '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b',
  action_kind: 'merge',
  target: { schema_id: 'MergeArtifact', record_id: 'acme/widgets#412' },
  proposal: { actor_id: 'user:alice', signer_key_id: KEY_P, proposed_at: '2026-10-01T09:00:00Z' },
  execution: { actor_id: 'bot:merge-queue', signer_key_id: KEY_E, executed_at: '2026-10-01T09:30:00Z' },
  separation_of_duties: { policy: 'proposer_is_not_executor' },
};

const SSD = {
  surface_id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  kind: 'message_board',
  locator: 'board://coordination',
  owner_agent_id: 'agent:owner',
  writer_agent_ids: ['agent:owner', 'agent:w1'],
  reader_agent_ids: ['agent:r1'],
  single_writer: false,
  declared_at: '2026-10-01T00:00:00Z',
  declared_by: 'agent:owner',
  contract_version: '8.8.0',
};

const ruleIds = (errors: string[], prefix: string): string[] =>
  [...new Set(errors.map((e) => new RegExp(`^(${prefix}-\\d+):`).exec(e)?.[1]).filter((x): x is string => !!x))].sort();

describe('exports and registration', () => {
  it('schemas and validators are reachable from the root and governance barrels', () => {
    expect(governance.IrreversibleActionAttestationSchema).toBe(IrreversibleActionAttestationSchema);
    expect(governance.SharedSurfaceDeclarationSchema).toBe(SharedSurfaceDeclarationSchema);
    expect(governance.validateIrreversibleActionAttestation).toBe(validateIrreversibleActionAttestation);
    expect(governance.validateSharedSurfaceDeclaration).toBe(validateSharedSurfaceDeclaration);
    expect(governance.IrreversibleActionKindSchema).toBeDefined();
    expect(governance.SharedSurfaceKindSchema).toBeDefined();
  });
  it('both cross-field validators are registered', () => {
    const ids = getCrossFieldValidatorSchemas();
    expect(ids).toContain('IrreversibleActionAttestation');
    expect(ids).toContain('SharedSurfaceDeclaration');
  });
  it('schema options carry the SDD §2 markers', () => {
    const iaa = IrreversibleActionAttestationSchema as unknown as Record<string, unknown>;
    const ssd = SharedSurfaceDeclarationSchema as unknown as Record<string, unknown>;
    expect(iaa.$id).toBe('IrreversibleActionAttestation');
    expect(iaa['x-crypto-bearing']).toBe(true);
    expect(iaa['x-cross-field-validated']).toBe(true);
    expect(iaa.additionalProperties).toBe(false);
    expect(ssd.$id).toBe('SharedSurfaceDeclaration');
    expect(ssd['x-crypto-bearing']).toBeUndefined();
    expect(ssd['x-cross-field-validated']).toBe(true);
    expect(ssd.additionalProperties).toBe(false);
  });
});

describe('validateIrreversibleActionAttestation — branches', () => {
  it('valid attestation', () => {
    expect(validateIrreversibleActionAttestation(IAA)).toEqual({ valid: true, errors: [], warnings: [] });
  });
  for (const bad of [null, undefined, 42, 'x', [], [IAA]]) {
    it(`non-object input ${JSON.stringify(bad) ?? 'undefined'} returns a precondition error without throwing`, () => {
      const r = validateIrreversibleActionAttestation(bad);
      expect(r.valid).toBe(false);
      expect(r.errors[0]).toMatch(/^IAA: structural shape precondition failed/);
    });
  }
  it('missing proposal or execution returns a precondition error', () => {
    const { proposal: _p, ...noProposal } = IAA;
    void _p;
    expect(validateIrreversibleActionAttestation(noProposal).errors[0]).toMatch(/proposal and execution/);
    expect(validateIrreversibleActionAttestation({ ...IAA, execution: null }).errors[0]).toMatch(/proposal and execution/);
  });
  it('malformed timestamps return an IAA-3 precondition error', () => {
    const r = validateIrreversibleActionAttestation({ ...IAA, execution: { ...IAA.execution, executed_at: 'later' } });
    expect(r.valid).toBe(false);
    expect(r.errors[0]).toMatch(/^IAA-3: structural shape precondition failed/);
  });
  it('non-string actor ids do not trip IAA-1', () => {
    const r = validateIrreversibleActionAttestation({
      ...IAA,
      proposal: { ...IAA.proposal, actor_id: 1 },
      execution: { ...IAA.execution, actor_id: 1 },
    });
    expect(ruleIds(r.errors, 'IAA')).toEqual([]);
  });
  it('a waiver_reference does not suppress IAA-1 / IAA-2 and is named in the message', () => {
    const r = validateIrreversibleActionAttestation({
      ...IAA,
      execution: { ...IAA.execution, actor_id: 'user:alice', signer_key_id: KEY_P },
      separation_of_duties: { policy: 'proposer_is_not_executor', waiver_reference: 'waiver-17' },
    });
    expect(ruleIds(r.errors, 'IAA')).toEqual(['IAA-1', 'IAA-2']);
    for (const e of r.errors) expect(e).toMatch(/waiver_reference is present/);
  });
  it('without a waiver the message does not mention one', () => {
    const r = validateIrreversibleActionAttestation({ ...IAA, execution: { ...IAA.execution, actor_id: 'user:alice' } });
    expect(r.errors[0]).not.toMatch(/waiver/);
  });
  it('reports every violated rule', () => {
    const r = validateIrreversibleActionAttestation({
      ...IAA,
      execution: { actor_id: 'user:alice', signer_key_id: KEY_P, executed_at: '2026-01-01T00:00:00Z' },
    });
    expect(ruleIds(r.errors, 'IAA')).toEqual(['IAA-1', 'IAA-2', 'IAA-3']);
  });
});

describe('validateSharedSurfaceDeclaration — branches', () => {
  it('valid declaration', () => {
    expect(validateSharedSurfaceDeclaration(SSD)).toEqual({ valid: true, errors: [], warnings: [] });
  });
  for (const bad of [null, 7, 'x', [SSD]]) {
    it(`non-object input ${JSON.stringify(bad)} returns a precondition error`, () => {
      expect(validateSharedSurfaceDeclaration(bad).errors[0]).toMatch(/^SSD: structural shape precondition failed/);
    });
  }
  it('non-array writer or reader list returns a precondition error', () => {
    expect(validateSharedSurfaceDeclaration({ ...SSD, writer_agent_ids: 'agent:owner' }).errors[0]).toMatch(/must both be arrays/);
    expect(validateSharedSurfaceDeclaration({ ...SSD, reader_agent_ids: undefined }).errors[0]).toMatch(/must both be arrays/);
  });
  for (const owner of [undefined, null, 7, ['agent:owner'], { id: 'agent:owner' }, '']) {
    it(`owner_agent_id ${JSON.stringify(owner) ?? 'undefined'} returns a precondition error, not SSD-1`, () => {
      const r = validateSharedSurfaceDeclaration({ ...SSD, owner_agent_id: owner, writer_agent_ids: [owner, 'agent:w1'] });
      expect(r.valid).toBe(false);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toMatch(/^SSD: structural shape precondition failed — owner_agent_id must be a non-empty string/);
    });
  }
  for (const flag of ['true', 1, null, undefined]) {
    it(`single_writer ${JSON.stringify(flag) ?? 'undefined'} returns a precondition error, not SSD-2`, () => {
      const r = validateSharedSurfaceDeclaration({ ...SSD, single_writer: flag, writer_agent_ids: ['agent:owner', 'agent:w1'] });
      expect(r.valid).toBe(false);
      expect(r.errors).toHaveLength(1);
      expect(r.errors[0]).toMatch(/^SSD: structural shape precondition failed — single_writer must be a boolean/);
    });
  }
  it('reports SSD-1, SSD-2, SSD-3 and SSD-4 together', () => {
    const r = validateSharedSurfaceDeclaration({
      ...SSD,
      single_writer: true,
      writer_agent_ids: ['agent:w1', 'agent:w1'],
      reader_agent_ids: ['agent:r1', 'agent:r1'],
    });
    expect(ruleIds(r.errors, 'SSD')).toEqual(['SSD-1', 'SSD-2', 'SSD-3', 'SSD-4']);
  });
});

describe('compareIso8601Utc', () => {
  const cases: Array<[string, string, -1 | 0 | 1]> = [
    ['2026-10-01T00:00:00Z', '2026-10-01T00:00:00Z', 0],
    ['2026-10-01T00:00:00Z', '2026-10-01T00:00:00.000000000Z', 0],
    ['2026-10-01T00:00:00.5Z', '2026-10-01T00:00:00.500Z', 0],
    ['2026-10-01T00:00:00Z', '2026-10-01T00:00:00.000000001Z', -1],
    ['2026-10-01T00:00:00.9Z', '2026-10-01T00:00:01Z', -1],
    ['2026-10-01T00:00:01Z', '2026-10-01T00:00:00.999999999Z', 1],
    ['2025-12-31T23:59:59Z', '2026-01-01T00:00:00Z', -1],
  ];
  for (const [a, b, want] of cases) {
    it(`${a} vs ${b} → ${want}`, () => {
      expect(compareIso8601Utc(a, b)).toBe(want);
      expect(compareIso8601Utc(b, a)).toBe((-want || 0) as -1 | 0 | 1);
    });
  }
  it('returns null for non-strings and non-UTC forms', () => {
    expect(compareIso8601Utc(1, '2026-10-01T00:00:00Z')).toBeNull();
    expect(compareIso8601Utc('2026-10-01T00:00:00Z', null)).toBeNull();
    expect(compareIso8601Utc('2026-10-01T00:00:00+00:00', '2026-10-01T00:00:00Z')).toBeNull();
  });
});

describe('duplicateStrings', () => {
  it('reports each duplicated value with all indices; ignores non-strings', () => {
    expect(duplicateStrings(['a', 'b', 'a', 1, 1, 'a'])).toEqual([{ value: 'a', indices: [0, 2, 5] }]);
    expect(duplicateStrings('not-an-array')).toEqual([]);
  });
});

// ---------------------------------------------------------------------------
// Property tests
// ---------------------------------------------------------------------------

/** Arbitrary instant as an ISO8601_UTC string with 0..9 fractional digits. */
const instantArb = fc
  .record({
    ms: fc.integer({ min: Date.UTC(2000, 0, 1), max: Date.UTC(2099, 11, 31) }),
    subMs: fc.integer({ min: 0, max: 999_999 }),
    digits: fc.integer({ min: 0, max: 9 }),
  })
  .map(({ ms, subMs, digits }) => {
    const whole = new Date(Math.floor(ms / 1000) * 1000).toISOString().slice(0, 19);
    const nanos = String((ms % 1000) * 1_000_000 + subMs).padStart(9, '0');
    const frac = nanos.slice(0, digits);
    const text = digits === 0 ? `${whole}Z` : `${whole}.${frac}Z`;
    // The value actually represented (truncated to `digits`).
    const value = BigInt(Math.floor(ms / 1000)) * 1_000_000_000n + BigInt(frac.padEnd(9, '0') || '0');
    return { text, value };
  });

describe('property: compareIso8601Utc is a total order consistent with the instant', () => {
  it('agrees with integer-nanosecond comparison', () => {
    fc.assert(
      fc.property(instantArb, instantArb, (a, b) => {
        const want = a.value === b.value ? 0 : a.value < b.value ? -1 : 1;
        expect(compareIso8601Utc(a.text, b.text)).toBe(want);
      }),
    );
  });
  it('is antisymmetric', () => {
    fc.assert(
      fc.property(instantArb, instantArb, (a, b) => {
        expect(compareIso8601Utc(a.text, b.text)).toBe(-(compareIso8601Utc(b.text, a.text) as number) || 0);
      }),
    );
  });
});

const actorArb = fc.string({ minLength: 1, maxLength: 24 });
const keyArb = fc.stringMatching(/^[0-9a-f]{64}$/);

describe('property: IrreversibleActionAttestation rule algebra', () => {
  it('IAA-1/2/3 fire exactly when their predicate holds', () => {
    fc.assert(
      fc.property(actorArb, actorArb, keyArb, keyArb, instantArb, instantArb, (pa, ea, pk, ek, pt, et) => {
        const data = {
          ...IAA,
          proposal: { actor_id: pa, signer_key_id: pk, proposed_at: pt.text },
          execution: { actor_id: ea, signer_key_id: ek, executed_at: et.text },
        };
        const expected: string[] = [];
        if (pa === ea) expected.push('IAA-1');
        if (pk === ek) expected.push('IAA-2');
        if (et.value < pt.value) expected.push('IAA-3');
        const r = validateIrreversibleActionAttestation(data);
        expect(ruleIds(r.errors, 'IAA')).toEqual(expected);
        expect(r.valid).toBe(expected.length === 0);
      }),
    );
  });
  it('monotonicity: moving execution later never introduces an IAA-3 violation', () => {
    fc.assert(
      fc.property(instantArb, instantArb, instantArb, (pt, a, b) => {
        const [earlier, later] = a.value <= b.value ? [a, b] : [b, a];
        const at = (t: string) =>
          validateIrreversibleActionAttestation({ ...IAA, proposal: { ...IAA.proposal, proposed_at: pt.text }, execution: { ...IAA.execution, executed_at: t } });
        if (at(earlier.text).valid) expect(at(later.text).valid).toBe(true);
      }),
    );
  });
  it('separated duties with ordered instants always validate end-to-end', () => {
    fc.assert(
      fc.property(actorArb, actorArb, instantArb, instantArb, (pa, ea, a, b) => {
        fc.pre(pa !== ea);
        const [pt, et] = a.value <= b.value ? [a, b] : [b, a];
        const data = {
          ...IAA,
          proposal: { actor_id: pa, signer_key_id: KEY_P, proposed_at: pt.text },
          execution: { actor_id: ea, signer_key_id: KEY_E, executed_at: et.text },
        };
        expect(Value.Check(IrreversibleActionAttestationSchema, data)).toBe(true);
        expect(validate(IrreversibleActionAttestationSchema, data, { acceptDeferred: true }).valid).toBe(true);
      }),
    );
  });
});

describe('property: SharedSurfaceDeclaration rule algebra', () => {
  const idArb = fc.constantFrom('a', 'b', 'c', 'd', 'e');
  it('rule set matches the set-theoretic definition', () => {
    fc.assert(
      fc.property(idArb, fc.array(idArb, { minLength: 1, maxLength: 6 }), fc.array(idArb, { maxLength: 6 }), fc.boolean(), (owner, writers, readers, single) => {
        const expected: string[] = [];
        if (!writers.includes(owner)) expected.push('SSD-1');
        if (single && writers.length !== 1) expected.push('SSD-2');
        if (new Set(writers).size !== writers.length) expected.push('SSD-3');
        if (new Set(readers).size !== readers.length) expected.push('SSD-4');
        const r = validateSharedSurfaceDeclaration({ ...SSD, owner_agent_id: owner, writer_agent_ids: writers, reader_agent_ids: readers, single_writer: single });
        expect(ruleIds(r.errors, 'SSD')).toEqual(expected);
      }),
    );
  });
  it('the verdict is invariant under permutation of the writer and reader lists', () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArb, { minLength: 1, maxLength: 5 }), fc.uniqueArray(idArb, { maxLength: 5 }), fc.boolean(), (writers, readers, single) => {
        const owner = writers[0]!;
        const base = { ...SSD, owner_agent_id: owner, single_writer: single };
        const a = validateSharedSurfaceDeclaration({ ...base, writer_agent_ids: writers, reader_agent_ids: readers });
        const b = validateSharedSurfaceDeclaration({ ...base, writer_agent_ids: [...writers].reverse(), reader_agent_ids: [...readers].reverse() });
        expect(b.valid).toBe(a.valid);
      }),
    );
  });
  it('subset: removing a non-owner writer from a valid multi-writer declaration keeps it valid', () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArb, { minLength: 2, maxLength: 5 }), fc.nat(), (writers, pick) => {
        const owner = writers[0]!;
        const decl = { ...SSD, owner_agent_id: owner, writer_agent_ids: writers, single_writer: false };
        expect(validateSharedSurfaceDeclaration(decl).valid).toBe(true);
        const drop = 1 + (pick % (writers.length - 1));
        const smaller = writers.filter((_, i) => i !== drop);
        expect(validateSharedSurfaceDeclaration({ ...decl, writer_agent_ids: smaller }).valid).toBe(true);
      }),
    );
  });
  it('adding a duplicate writer always produces SSD-3', () => {
    fc.assert(
      fc.property(fc.uniqueArray(idArb, { minLength: 1, maxLength: 5 }), fc.nat(), (writers, pick) => {
        const dup = writers[pick % writers.length]!;
        const r = validateSharedSurfaceDeclaration({ ...SSD, owner_agent_id: writers[0]!, writer_agent_ids: [...writers, dup], single_writer: false });
        expect(ruleIds(r.errors, 'SSD')).toContain('SSD-3');
      }),
    );
  });
});
