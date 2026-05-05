/**
 * Sprint-5 (PR-A1.5) — TS reference sweep over the `is_valid_dag` corpus
 * at vectors/is-valid-dag/{valid,invalid}/.
 *
 * Each fixture is paired with a `.trace.json` golden file recording the
 * expected op count + phase at terminus per SDD section 5.5.1. The TS
 * implementation in src/constraints/is-valid-dag.ts is the source of truth;
 * other-language runners must produce byte-identical traces.
 *
 * @see SDD section 5.5.1 — Op-counting algorithm (NORMATIVE)
 * @see SDD section 6.3 — Structured diagnostic cases
 * @see Sprint 5 / D5.2 + D5.8
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateIsValidDag } from '../../src/constraints/is-valid-dag.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const CORPUS_ROOT = join(__dirname, '..', '..', 'vectors', 'is-valid-dag');

interface Fixture {
  items: unknown[];
  id_field: string;
  ref_fields: string[];
}

interface Trace {
  expected: 'valid' | 'invalid';
  ops?: number;
  phase?: 'indexing' | 'dfs' | 'ref-resolve' | 'pre-guard';
  diagnostic?: { code: string; context?: Record<string, unknown> };
  note?: string;
}

function loadCases(kind: 'valid' | 'invalid'): { name: string; input: Fixture; trace: Trace }[] {
  const dir = join(CORPUS_ROOT, kind);
  const all = readdirSync(dir);
  const inputs = all.filter((f) => f.endsWith('.json') && !f.endsWith('.trace.json')).sort();
  return inputs.map((f) => {
    const baseName = f.replace(/\.json$/, '');
    const tracePath = join(dir, `${baseName}.trace.json`);
    return {
      name: baseName,
      input: JSON.parse(readFileSync(join(dir, f), 'utf8')) as Fixture,
      trace: JSON.parse(readFileSync(tracePath, 'utf8')) as Trace,
    };
  });
}

describe('v8.4.0 is_valid_dag vectors', () => {
  const validCases = loadCases('valid');
  const invalidCases = loadCases('invalid');

  it('publishes the SDD section 6.3 corpus', () => {
    // SDD section 6.3 lists 9 cases + 2 input-size pre-guards (added pass-3-followup)
    expect(validCases.length + invalidCases.length).toBeGreaterThanOrEqual(9);
  });

  describe('valid/', () => {
    for (const c of validCases) {
      it(`evaluates ${c.name} as valid`, () => {
        const result = evaluateIsValidDag(c.input.items, c.input.id_field, c.input.ref_fields);
        expect(result.valid).toBe(true);
        expect(c.trace.expected).toBe('valid');
      });
    }
  });

  describe('invalid/', () => {
    for (const c of invalidCases) {
      it(`evaluates ${c.name} as invalid (${c.trace.diagnostic?.code ?? 'unspecified'})`, () => {
        const result = evaluateIsValidDag(c.input.items, c.input.id_field, c.input.ref_fields);
        expect(result.valid).toBe(false);
        if (!result.valid) {
          // F-009: assert the structured diagnostic shape, not just `code`.
          // The .trace.json companion is the cross-runner contract — every
          // language runner that touches this corpus MUST emit byte-identical
          // (code, phase, ops-bound) tuples per SDD section 6.5.
          if (c.trace.diagnostic?.code) {
            expect(result.diagnostic.code).toBe(c.trace.diagnostic.code);
          }
          // Per SDD section 6.5 only DAG_OP_CAP_EXCEEDED carries `phase`
          // in its diagnostic context. F12 (iter-2): assert strict equality
          // — no test-side coalescing — so the trace contract is enforced
          // exactly. Traces for other codes intentionally omit `phase`.
          if (c.trace.phase && c.trace.phase !== 'pre-guard') {
            const ctx = result.diagnostic.context as Record<string, unknown>;
            expect(ctx.phase).toBe(c.trace.phase);
          }
        }
      });
    }
  });
});
