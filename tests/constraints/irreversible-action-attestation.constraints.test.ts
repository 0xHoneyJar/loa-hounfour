/**
 * PR-C3 (FR-C3) — Tests for `IrreversibleActionAttestation.constraints.json`.
 *
 * Covers the file structure, every constraint id, and agreement between
 * the DSL restatements (IAA-1..IAA-4) and the registered cross-field
 * validator / structural tier.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import type { ConstraintFile } from '../../src/constraints/types.js';
import { IrreversibleActionAttestationSchema } from '../../src/governance/irreversible-action-attestation.js';
import { validate } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', 'constraints', 'IrreversibleActionAttestation.constraints.json'),
    'utf8',
  ),
) as ConstraintFile;

const expr = (id: string): string => {
  const c = file.constraints.find((x) => x.id === id);
  if (!c) throw new Error(`missing ${id}`);
  return c.expression;
};

const BASE = {
  envelope_kind: 'irreversible_action_attestation',
  contract_version: '8.8.0',
  attestation_id: '6f1d2c3b-4a5e-4f60-8a7b-9c0d1e2f3a4b',
  action_kind: 'merge',
  target: { schema_id: 'MergeArtifact', record_id: 'acme/widgets#412' },
  proposal: { actor_id: 'user:alice', signer_key_id: '3f'.repeat(32), proposed_at: '2026-10-01T09:00:00Z' },
  execution: { actor_id: 'bot:merge-queue', signer_key_id: 'a1'.repeat(32), executed_at: '2026-10-01T09:30:00Z' },
  separation_of_duties: { policy: 'proposer_is_not_executor' },
};

function variant(patch: { proposal?: object; execution?: object; target?: object }) {
  return {
    ...BASE,
    target: { ...BASE.target, ...(patch.target ?? {}) },
    proposal: { ...BASE.proposal, ...(patch.proposal ?? {}) },
    execution: { ...BASE.execution, ...(patch.execution ?? {}) },
  };
}

function hasRule(data: unknown, id: string): boolean {
  const r = validate(IrreversibleActionAttestationSchema, data, { acceptDeferred: true });
  return !r.valid && r.errors.some((e) => e.startsWith(`${id}:`));
}

describe('IrreversibleActionAttestation.constraints.json — file structure', () => {
  it('declares schema_id, genesis origin and contract_version 8.8.0', () => {
    expect(file.schema_id).toBe('IrreversibleActionAttestation');
    expect(file.origin).toBe('genesis');
    expect(file.contract_version).toBe('8.8.0');
    expect(file.expression_version).toBe('1.0');
  });

  it('publishes exactly IAA-1..IAA-5', () => {
    expect(file.constraints.map((c) => c.id)).toEqual(['IAA-1', 'IAA-2', 'IAA-3', 'IAA-4', 'IAA-5']);
  });

  it('IAA-1..IAA-4 are library-evaluated errors', () => {
    for (const id of ['IAA-1', 'IAA-2', 'IAA-3', 'IAA-4']) {
      const c = file.constraints.find((x) => x.id === id)!;
      expect(c.evaluator).toBe('library');
      expect(c.severity).toBe('error');
    }
  });

  it('IAA-5 is runtime-deferred with a crypto_deferred evaluation note', () => {
    const c = file.constraints.find((x) => x.id === 'IAA-5')!;
    expect(c.evaluator).toBe('runtime-deferred');
    expect(c.evaluation_note).toMatch(/crypto_deferred/);
    expect(c.evaluation_note).toMatch(/CRYPTO_DEFERRED/);
  });

  it('every constraint names fields and a type_signature', () => {
    for (const c of file.constraints) {
      expect(c.fields.length).toBeGreaterThan(0);
      expect((c as { type_signature?: object }).type_signature).toBeDefined();
    }
  });
});

describe('IAA-1 — distinct actors (DSL agrees with validator)', () => {
  it('distinct actors: DSL true, validator silent', () => {
    expect(evaluateConstraint(BASE, expr('IAA-1'))).toBe(true);
    expect(hasRule(BASE, 'IAA-1')).toBe(false);
  });
  it('same actor: DSL false, validator reports IAA-1', () => {
    const bad = variant({ execution: { actor_id: 'user:alice' } });
    expect(evaluateConstraint(bad, expr('IAA-1'))).toBe(false);
    expect(hasRule(bad, 'IAA-1')).toBe(true);
  });
  it('comparison is exact: case-different actors are distinct (IAA-N3)', () => {
    const d = variant({ execution: { actor_id: 'USER:ALICE' } });
    expect(evaluateConstraint(d, expr('IAA-1'))).toBe(true);
    expect(hasRule(d, 'IAA-1')).toBe(false);
  });
});

describe('IAA-2 — distinct signer keys (DSL agrees with validator)', () => {
  it('distinct keys pass', () => {
    expect(evaluateConstraint(BASE, expr('IAA-2'))).toBe(true);
    expect(hasRule(BASE, 'IAA-2')).toBe(false);
  });
  it('same key fails', () => {
    const bad = variant({ execution: { signer_key_id: '3f'.repeat(32) } });
    expect(evaluateConstraint(bad, expr('IAA-2'))).toBe(false);
    expect(hasRule(bad, 'IAA-2')).toBe(true);
  });
  it('uppercase key ids are rejected structurally, closing the case-bypass', () => {
    const bad = variant({ execution: { signer_key_id: '3F'.repeat(32) } });
    const r = validate(IrreversibleActionAttestationSchema, bad, { acceptDeferred: true });
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors.some((e) => e.includes('/execution/signer_key_id'))).toBe(true);
  });
});

describe('IAA-3 — execution not before proposal (DSL agrees with validator)', () => {
  const cases: Array<[string, string, string, boolean]> = [
    ['later', '2026-10-01T09:00:00Z', '2026-10-01T09:30:00Z', true],
    ['equal', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00Z', true],
    ['equal, mixed precision', '2026-10-01T09:00:00Z', '2026-10-01T09:00:00.000Z', true],
    ['one second earlier', '2026-10-01T09:00:00Z', '2026-10-01T08:59:59Z', false],
    ['one millisecond earlier', '2026-10-01T09:00:00.001Z', '2026-10-01T09:00:00Z', false],
    ['across a day boundary', '2026-10-02T00:00:00Z', '2026-10-01T23:59:59.999Z', false],
  ];
  for (const [label, proposed, executed, ok] of cases) {
    it(`${label}: ${ok ? 'admitted' : 'rejected'}`, () => {
      const d = variant({ proposal: { proposed_at: proposed }, execution: { executed_at: executed } });
      expect(evaluateConstraint(d, expr('IAA-3'))).toBe(ok);
      expect(hasRule(d, 'IAA-3')).toBe(!ok);
    });
  }
  it('sub-millisecond inversion: validator is authoritative (DSL is millisecond-granular)', () => {
    const d = variant({
      proposal: { proposed_at: '2026-10-01T09:00:00.000000002Z' },
      execution: { executed_at: '2026-10-01T09:00:00.000000001Z' },
    });
    expect(hasRule(d, 'IAA-3')).toBe(true);
    expect(evaluateConstraint(d, expr('IAA-3'))).toBe(true);
  });
});

describe('IAA-4 — PascalCase target.schema_id', () => {
  it('documents that the PascalCase predicate is structural-only and the DSL row is not equivalent', () => {
    const c = file.constraints.find((x) => x.id === 'IAA-4')!;
    for (const text of [c.message, c.evaluation_note ?? '']) {
      expect(text).toContain('enforced only by the structural tier');
      expect(text).toContain('NOT equivalent to the structural check');
    }
  });
  it('a DSL-only evaluation accepts a non-PascalCase id that the structural tier rejects', () => {
    const d = variant({ target: { schema_id: 'merge-artifact' } });
    expect(evaluateConstraint(d, expr('IAA-4'))).toBe(true);
    expect(validate(IrreversibleActionAttestationSchema, d, { acceptDeferred: true }).valid).toBe(false);
  });
  it('DSL length bounds hold for valid ids', () => {
    expect(evaluateConstraint(BASE, expr('IAA-4'))).toBe(true);
    expect(evaluateConstraint(variant({ target: { schema_id: 'X' } }), expr('IAA-4'))).toBe(true);
    expect(evaluateConstraint(variant({ target: { schema_id: 'A'.repeat(128) } }), expr('IAA-4'))).toBe(true);
  });
  it('DSL rejects empty and over-long ids', () => {
    expect(evaluateConstraint(variant({ target: { schema_id: '' } }), expr('IAA-4'))).toBe(false);
    expect(evaluateConstraint(variant({ target: { schema_id: 'A'.repeat(129) } }), expr('IAA-4'))).toBe(false);
  });
  for (const bad of ['', 'mergeArtifact', 'merge-artifact', 'Merge_Artifact', '1Merge', 'Merge Artifact', 'A'.repeat(129)]) {
    it(`structural tier rejects ${JSON.stringify(bad.length > 20 ? `${bad.slice(0, 8)}…(${bad.length})` : bad)}`, () => {
      const r = validate(IrreversibleActionAttestationSchema, variant({ target: { schema_id: bad } }), {
        acceptDeferred: true,
      });
      expect(r.valid).toBe(false);
    });
  }
});

describe('IAA-5 — signature verification is deferred', () => {
  it('a structurally valid attestation fails closed without acceptDeferred', () => {
    const r = validate(IrreversibleActionAttestationSchema, BASE);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors[0]).toMatch(/^CRYPTO_DEFERRED:/);
  });
  it('acceptDeferred surfaces the CRYPTO_DEFERRED obligation in the manifest', () => {
    const r = validate(IrreversibleActionAttestationSchema, BASE, { acceptDeferred: true });
    expect(r.valid).toBe(true);
    const rules = r.unverified_obligations?.unverified_rules.map((u) => u.rule_id) ?? [];
    expect(rules).toContain('CRYPTO_DEFERRED');
  });
});
