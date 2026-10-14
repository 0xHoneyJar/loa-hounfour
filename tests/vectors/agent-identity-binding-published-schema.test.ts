/**
 * PR-C5 (FR-C5) — the PUBLISHED JSON Schema for AgentIdentityBinding
 * encodes AIB-1..3 on its own, so consumers that validate with the JSON
 * Schema and never call validate() still reject profile/block mismatches.
 *
 * The clauses are injected by scripts/schema-postprocess.ts. This test
 * checks the generated file in schemas/ (not the TypeBox source) in two
 * ways: the clause shape is pinned exactly, and the clauses are evaluated
 * against the vector corpus. The evaluator below covers only the keywords
 * the injection emits (`if`/`then`, `properties` + `const`, `required`,
 * `not`, `anyOf`), and the shape assertion guarantees no other keyword
 * appears. Full JSON Schema validators (Python jsonschema, Go
 * santhosh-tekuri, Rust jsonschema) exercise the same file through
 * `bash scripts/run-cross-runners.sh`.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..', '..');
const published = JSON.parse(
  readFileSync(join(root, 'schemas', 'agent-identity-binding.schema.json'), 'utf8'),
) as Record<string, unknown>;
const VECTORS = join(root, 'vectors', 'AgentIdentityBinding', 'v8.8.0');

type Clause = Record<string, unknown>;

function holds(clause: Clause, data: Record<string, unknown>): boolean {
  for (const [kw, val] of Object.entries(clause)) {
    if (kw === 'required') {
      if (!(val as string[]).every((k) => k in data)) return false;
    } else if (kw === 'properties') {
      for (const [k, sub] of Object.entries(val as Record<string, Clause>)) {
        if (k in data && 'const' in sub && data[k] !== sub.const) return false;
      }
    } else if (kw === 'not') {
      if (holds(val as Clause, data)) return false;
    } else if (kw === 'anyOf') {
      if (!(val as Clause[]).some((c) => holds(c, data))) return false;
    } else {
      throw new Error(`unexpected keyword ${kw}`);
    }
  }
  return true;
}

function publishedRulesAccept(data: Record<string, unknown>): boolean {
  return (published.allOf as Array<{ if: Clause; then: Clause }>).every(
    (c) => !holds(c.if, data) || holds(c.then, data),
  );
}

function load(bucket: string, f: string): Record<string, unknown> {
  const { _comment, ...data } = JSON.parse(readFileSync(join(VECTORS, bucket, f), 'utf8'));
  void _comment;
  return data;
}

function list(bucket: string): string[] {
  return readdirSync(join(VECTORS, bucket)).filter((f) => f.endsWith('.json')).sort();
}

describe('published agent-identity-binding.schema.json encodes AIB-1..3', () => {
  it('carries exactly one if/then clause per profile', () => {
    const exclusive = (own: string, others: string[]) => ({
      required: [own],
      not: { anyOf: others.map((b) => ({ required: [b] })) },
    });
    const ifProfile = (p: string) => ({ properties: { profile: { const: p } }, required: ['profile'] });
    expect(published.allOf).toEqual([
      { if: ifProfile('a2a-agent-card'), then: exclusive('a2a', ['directory', 'vc']) },
      { if: ifProfile('directory-identity'), then: exclusive('directory', ['a2a', 'vc']) },
      { if: ifProfile('verifiable-credential'), then: exclusive('vc', ['a2a', 'directory']) },
    ]);
  });

  it('pins the card_url HTTP(S) pattern alongside format uri', () => {
    const a2a = (published.properties as Record<string, Record<string, Record<string, Record<string, unknown>>>>).a2a;
    expect(a2a.properties.card_url.format).toBe('uri');
    expect(a2a.properties.card_url.pattern).toBe('^https?://[^\\s/?#]+');
  });

  for (const f of list('valid')) {
    it(`accepts valid ${f}`, () => {
      expect(publishedRulesAccept(load('valid', f))).toBe(true);
    });
  }

  const mismatches = list('invalid').filter((f) => /^aib\d-/.test(f));

  it('covers the three profile/block-mismatch vectors', () => {
    expect(mismatches.filter((f) => f.includes('-profile-with-') && !f.includes('two-blocks') && !f.includes('all-three')).length).toBe(3);
  });

  for (const f of mismatches) {
    it(`rejects ${f} with the published schema alone`, () => {
      expect(publishedRulesAccept(load('invalid', f))).toBe(false);
    });
  }
});
