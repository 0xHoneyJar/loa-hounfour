/**
 * PR-C3 (FR-C3) — Tests for `SharedSurfaceDeclaration.constraints.json`.
 *
 * Covers the file structure, every constraint id, and agreement between
 * the DSL restatements (SSD-1, SSD-2) and the registered cross-field
 * validator. SSD-3 / SSD-4 are prose (the DSL has no string-array
 * distinctness builtin) and are exercised through the validator.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';
import type { ConstraintFile } from '../../src/constraints/types.js';
import { SharedSurfaceDeclarationSchema } from '../../src/governance/shared-surface-declaration.js';
import { validate } from '../../src/validators/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const file = JSON.parse(
  readFileSync(
    join(__dirname, '..', '..', 'constraints', 'SharedSurfaceDeclaration.constraints.json'),
    'utf8',
  ),
) as ConstraintFile;

const expr = (id: string): string => file.constraints.find((x) => x.id === id)!.expression;

const BASE = {
  surface_id: '1c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f',
  kind: 'cache',
  locator: 'redis://cache.internal:6379/0/embeddings:',
  owner_agent_id: 'agent:indexer',
  writer_agent_ids: ['agent:indexer'],
  reader_agent_ids: ['agent:retriever'],
  single_writer: true,
  declared_at: '2026-10-01T00:00:00Z',
  declared_by: 'agent:indexer',
  contract_version: '8.8.0',
};

function rules(data: unknown): string[] {
  const r = validate(SharedSurfaceDeclarationSchema, data);
  if (r.valid) return [];
  return [...new Set(r.errors.map((e) => /^(SSD-\d+):/.exec(e)?.[1]).filter((x): x is string => !!x))].sort();
}

describe('SharedSurfaceDeclaration.constraints.json — file structure', () => {
  it('declares schema_id, genesis origin and contract_version 8.8.0', () => {
    expect(file.schema_id).toBe('SharedSurfaceDeclaration');
    expect(file.origin).toBe('genesis');
    expect(file.contract_version).toBe('8.8.0');
  });
  it('publishes exactly SSD-1..SSD-6', () => {
    expect(file.constraints.map((c) => c.id)).toEqual(['SSD-1', 'SSD-2', 'SSD-3', 'SSD-4', 'SSD-5', 'SSD-6']);
  });
  it('SSD-1..SSD-4 are library-evaluated; SSD-5 and SSD-6 are runtime-deferred', () => {
    const ev = Object.fromEntries(file.constraints.map((c) => [c.id, c.evaluator]));
    expect(ev).toEqual({
      'SSD-1': 'library',
      'SSD-2': 'library',
      'SSD-3': 'library',
      'SSD-4': 'library',
      'SSD-5': 'runtime-deferred',
      'SSD-6': 'runtime-deferred',
    });
    for (const c of file.constraints) expect(c.severity).toBe('error');
  });
  it('runtime-deferred rules carry an evaluation note', () => {
    for (const c of file.constraints.filter((x) => x.evaluator === 'runtime-deferred')) {
      expect((c.evaluation_note ?? '').length).toBeGreaterThan(40);
    }
  });
});

describe('SSD-1 — owner is a writer', () => {
  it('owner listed: DSL true, validator silent', () => {
    expect(evaluateConstraint(BASE, expr('SSD-1'))).toBe(true);
    expect(rules(BASE)).toEqual([]);
  });
  it('owner listed second among several writers', () => {
    const d = { ...BASE, single_writer: false, writer_agent_ids: ['agent:x', 'agent:indexer'] };
    expect(evaluateConstraint(d, expr('SSD-1'))).toBe(true);
    expect(rules(d)).toEqual([]);
  });
  it('owner missing: DSL false, validator reports SSD-1', () => {
    const d = { ...BASE, writer_agent_ids: ['agent:x'] };
    expect(evaluateConstraint(d, expr('SSD-1'))).toBe(false);
    expect(rules(d)).toEqual(['SSD-1']);
  });
  it('owner present only as a reader is still a violation', () => {
    const d = { ...BASE, writer_agent_ids: ['agent:x'], reader_agent_ids: ['agent:indexer'] };
    expect(rules(d)).toEqual(['SSD-1']);
  });
});

describe('SSD-2 — single_writer consistency', () => {
  it('single_writer true with one writer passes', () => {
    expect(evaluateConstraint(BASE, expr('SSD-2'))).toBe(true);
  });
  it('single_writer true with two writers fails', () => {
    const d = { ...BASE, writer_agent_ids: ['agent:indexer', 'agent:x'] };
    expect(evaluateConstraint(d, expr('SSD-2'))).toBe(false);
    expect(rules(d)).toEqual(['SSD-2']);
  });
  it('single_writer false admits one or many writers', () => {
    for (const w of [['agent:indexer'], ['agent:indexer', 'agent:x', 'agent:y']]) {
      const d = { ...BASE, single_writer: false, writer_agent_ids: w };
      expect(evaluateConstraint(d, expr('SSD-2'))).toBe(true);
      expect(rules(d)).toEqual([]);
    }
  });
});

describe('SSD-3 / SSD-4 — distinct lists', () => {
  it('duplicate writer reports SSD-3 with indices', () => {
    const d = { ...BASE, single_writer: false, writer_agent_ids: ['agent:indexer', 'agent:x', 'agent:indexer'] };
    const r = validate(SharedSurfaceDeclarationSchema, d);
    expect(r.valid).toBe(false);
    if (!r.valid) expect(r.errors).toContainEqual(expect.stringMatching(/^SSD-3: .*indices 0, 2/));
  });
  it('duplicate reader reports SSD-4', () => {
    expect(rules({ ...BASE, reader_agent_ids: ['a', 'b', 'a', 'b'] })).toEqual(['SSD-4']);
  });
  it('the same agent may be both writer and reader (SSD-N2 / SSD-N3)', () => {
    expect(rules({ ...BASE, reader_agent_ids: ['agent:indexer'] })).toEqual([]);
  });
  it('an empty reader list is admitted', () => {
    expect(rules({ ...BASE, reader_agent_ids: [] })).toEqual([]);
  });
});

describe('SSD-5 / SSD-6 — runtime-deferred', () => {
  it('two declarations with one locator each validate in isolation (SSD-5 needs the registry)', () => {
    const other = { ...BASE, surface_id: '2c2d3e4f-5a6b-4c7d-8e9f-0a1b2c3d4e5f', owner_agent_id: 'agent:x', writer_agent_ids: ['agent:x'], declared_by: 'agent:x' };
    expect(validate(SharedSurfaceDeclarationSchema, BASE).valid).toBe(true);
    expect(validate(SharedSurfaceDeclarationSchema, other).valid).toBe(true);
  });
});
