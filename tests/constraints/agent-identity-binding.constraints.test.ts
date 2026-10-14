/**
 * Tests for constraints/AgentIdentityBinding.constraints.json (PR-C5, FR-C5).
 *
 * AIB-1..3 are library-evaluated DSL restatements of the cross-field
 * validator; AIB-4/5 are runtime-deferred consumer obligations.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const file = JSON.parse(
  readFileSync(join(root, 'constraints', 'AgentIdentityBinding.constraints.json'), 'utf-8'),
) as { schema_id: string; contract_version: string; constraints: Array<Record<string, unknown>> };
const VECTORS = join(root, 'vectors', 'AgentIdentityBinding', 'v8.8.0');

function rule(id: string): Record<string, unknown> {
  const r = file.constraints.find((c) => c.id === id);
  if (!r) throw new Error(`rule ${id} not found`);
  return r;
}

function loadBucket(bucket: string): Array<[string, Record<string, unknown>]> {
  return readdirSync(join(VECTORS, bucket))
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => {
      const { _comment, ...data } = JSON.parse(readFileSync(join(VECTORS, bucket, f), 'utf8'));
      void _comment;
      return [f, data];
    });
}

const LIBRARY = ['AIB-1', 'AIB-2', 'AIB-3'];

describe('AgentIdentityBinding constraint file structure', () => {
  it('targets AgentIdentityBinding at contract_version 8.8.0', () => {
    expect(file.schema_id).toBe('AgentIdentityBinding');
    expect(file.contract_version).toBe('8.8.0');
  });

  it('declares AIB-1..5 in order', () => {
    expect(file.constraints.map((c) => c.id)).toEqual(['AIB-1', 'AIB-2', 'AIB-3', 'AIB-4', 'AIB-5']);
  });

  it('marks AIB-1..3 library and AIB-4..5 runtime-deferred with notes', () => {
    for (const id of LIBRARY) expect(rule(id).evaluator).toBe('library');
    for (const id of ['AIB-4', 'AIB-5']) {
      expect(rule(id).evaluator).toBe('runtime-deferred');
      expect(String(rule(id).evaluation_note).length).toBeGreaterThan(40);
    }
  });

  it('AIB-4 names the crypto_deferred obligation reason', () => {
    expect(String(rule('AIB-4').evaluation_note)).toContain('crypto_deferred');
  });
});

describe('AIB-1..3 DSL expressions against the vector corpus', () => {
  for (const [f, data] of loadBucket('valid')) {
    it(`valid ${f} satisfies AIB-1..3`, () => {
      for (const id of LIBRARY) expect(evaluateConstraint(data, rule(id).expression as string)).toBe(true);
    });
  }

  for (const [f, data] of loadBucket('invalid').filter(([name]) => /^aib\d-/.test(name))) {
    const n = /^aib(\d)-/.exec(f)![1];
    it(`invalid ${f} fails exactly AIB-${n}`, () => {
      for (const id of LIBRARY) {
        expect(evaluateConstraint(data, rule(id).expression as string)).toBe(id !== `AIB-${n}`);
      }
    });
  }
});

describe('AIB-1..3 expressions — per-branch truth table', () => {
  const blocks = { a2a: { card_url: 'https://a.example' }, directory: { tenant_id: 't' }, vc: { issuer: 'i' } };
  const cases: Array<[string, string, Array<keyof typeof blocks>, boolean]> = [
    ['AIB-1', 'a2a-agent-card', ['a2a'], true],
    ['AIB-1', 'a2a-agent-card', [], false],
    ['AIB-1', 'a2a-agent-card', ['a2a', 'directory'], false],
    ['AIB-1', 'a2a-agent-card', ['a2a', 'vc'], false],
    ['AIB-1', 'directory-identity', ['vc'], true],
    ['AIB-2', 'directory-identity', ['directory'], true],
    ['AIB-2', 'directory-identity', [], false],
    ['AIB-2', 'directory-identity', ['directory', 'a2a'], false],
    ['AIB-2', 'directory-identity', ['directory', 'vc'], false],
    ['AIB-2', 'verifiable-credential', ['a2a'], true],
    ['AIB-3', 'verifiable-credential', ['vc'], true],
    ['AIB-3', 'verifiable-credential', [], false],
    ['AIB-3', 'verifiable-credential', ['vc', 'a2a'], false],
    ['AIB-3', 'verifiable-credential', ['vc', 'directory'], false],
    ['AIB-3', 'a2a-agent-card', ['directory'], true],
  ];
  for (const [id, profile, present, expected] of cases) {
    it(`${id}: profile=${profile} blocks=[${present.join(',')}] -> ${expected}`, () => {
      const rec: Record<string, unknown> = { profile };
      for (const k of present) rec[k] = blocks[k];
      expect(evaluateConstraint(rec, rule(id).expression as string)).toBe(expected);
    });
  }
});
