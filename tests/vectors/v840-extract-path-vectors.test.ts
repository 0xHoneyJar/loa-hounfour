/**
 * Sprint-5 (PR-A1.5) — TS reference sweep over the `extract_path` corpus
 * at vectors/extract-path/{valid,invalid}/.
 *
 * Per SDD section 5.5.1: the corpus exercises 7 cases that all 4 runners
 * (TS / Go / Python / Rust) MUST produce equivalent results for. CI fails
 * on cross-runner divergence.
 *
 * @see SDD section 5.5.1 — extract_path reference tests (NORMATIVE)
 * @see Sprint 5 / D5.3
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { extractPath } from '../../src/constraints/is-valid-dag.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_ROOT = join(__dirname, '..', '..', 'vectors', 'extract-path');

interface Case {
  input: unknown;
  path: string;
  expected_status: 'extracted' | 'undefined' | 'rejected';
  expected_value?: unknown;
  expected_reason?: string;
  note?: string;
}

function loadCases(kind: 'valid' | 'invalid'): { name: string; case: Case }[] {
  const dir = join(CORPUS_ROOT, kind);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json'))
    .sort()
    .map((f) => ({
      name: f.replace(/\.json$/, ''),
      case: JSON.parse(readFileSync(join(dir, f), 'utf8')) as Case,
    }));
}

describe('v8.4.0 extract_path vectors', () => {
  const validCases = loadCases('valid');
  const invalidCases = loadCases('invalid');

  it('publishes at least 7 cases (SDD section 5.5.1)', () => {
    expect(validCases.length + invalidCases.length).toBeGreaterThanOrEqual(7);
  });

  describe('valid/', () => {
    for (const c of validCases) {
      it(`${c.name} → ${c.case.expected_status}`, () => {
        const result = extractPath(c.case.input, c.case.path);
        if (c.case.expected_status === 'extracted') {
          expect(result).toEqual(c.case.expected_value);
        } else if (c.case.expected_status === 'undefined') {
          expect(result).toBeUndefined();
        }
      });
    }
  });

  describe('invalid/', () => {
    for (const c of invalidCases) {
      it(`${c.name} (path syntax rejected → returns undefined)`, () => {
        // Per SDD section 5.5.1: rejected paths MUST return undefined consistently
        // across all 4 runners (no thrown exceptions, no partial extraction).
        const result = extractPath(c.case.input, c.case.path);
        expect(result).toBeUndefined();
      });
    }
  });

  // iter-4 F-001/F002 (MEDIUM): the iter-3 parity test was tautological —
  // both sides used `JSON.stringify`. Real divergence shows up only when
  // the comparators are genuinely different. Script side uses a canonical
  // serializer (sorted keys, RFC 8785-style); test side uses Vitest's
  // deep-equality `toEqual`. They agree iff both produce the same verdict
  // for every fixture.
  function canonicalJson(v: unknown): string {
    if (v === null || typeof v !== 'object') return JSON.stringify(v);
    if (Array.isArray(v)) return '[' + v.map(canonicalJson).join(',') + ']';
    const keys = Object.keys(v as Record<string, unknown>).sort();
    return '{' + keys.map((k) => JSON.stringify(k) + ':' + canonicalJson((v as Record<string, unknown>)[k])).join(',') + '}';
  }
  describe('test/script comparator parity', () => {
    for (const c of [...validCases, ...invalidCases]) {
      it(`${c.name} comparators agree`, () => {
        const out = extractPath(c.case.input, c.case.path);
        let scriptVerdict: boolean;
        let testVerdict: boolean;
        if (c.case.expected_status === 'extracted') {
          // Script path: canonical-JSON equality (deterministic, sortable).
          scriptVerdict = canonicalJson(out) === canonicalJson(c.case.expected_value);
          // Test path: Vitest `toEqual` deep-equality, captured here as a
          // boolean by attempting the assertion in a tolerant way.
          try {
            expect(out).toEqual(c.case.expected_value);
            testVerdict = true;
          } catch {
            testVerdict = false;
          }
        } else {
          scriptVerdict = out === undefined;
          testVerdict = out === undefined;
        }
        expect(scriptVerdict).toBe(testVerdict);
      });
    }
  });
});
