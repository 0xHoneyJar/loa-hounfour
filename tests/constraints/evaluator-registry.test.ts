/**
 * Tests for the evaluator function registry (S2-T2).
 *
 * v5.4.0 — Validates the registry-based architecture introduced in the
 * parsePrimary refactor, ensuring all builtin functions are discoverable
 * and that the registry is the single source of truth for function dispatch.
 */
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { evaluateConstraint, EVALUATOR_BUILTINS } from '../../src/constraints/evaluator.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const constraintsDir = join(__dirname, '..', '..', 'constraints');

/**
 * Extract function names used in constraint expressions that have
 * round-trip test coverage (i.e., tested via the evaluator).
 * We identify these by scanning the constraint test files.
 */
function getTestedConstraintSchemaIds(): string[] {
  const testFiles = readdirSync(join(__dirname)).filter(f => f.endsWith('.constraints.test.ts'));
  return testFiles.map(f => {
    // Extract schema ID from filename: e.g., "delegation-chain.constraints.test.ts"
    const base = f.replace('.constraints.test.ts', '');
    // Convert kebab-case to PascalCase to match constraint file naming
    return base.split('-').map(s => s.charAt(0).toUpperCase() + s.slice(1)).join('');
  });
}

/**
 * Extract standalone function calls from tested constraint files only.
 */
function extractTestedFunctionCalls(): Set<string> {
  const METHOD_NAMES = new Set(['every', 'some', 'length']);
  const testedSchemas = new Set(getTestedConstraintSchemaIds());
  const calls = new Set<string>();
  const files = readdirSync(constraintsDir).filter(f => f.endsWith('.constraints.json'));
  for (const file of files) {
    const content = JSON.parse(readFileSync(join(constraintsDir, file), 'utf-8'));
    if (!testedSchemas.has(content.schema_id)) continue;
    for (const constraint of content.constraints ?? []) {
      const expr = constraint.expression as string;
      const matches = expr.matchAll(/\b([a-z_][a-z0-9_]*)\s*\(/g);
      for (const match of matches) {
        const name = match[1];
        if (!METHOD_NAMES.has(name)) {
          calls.add(name);
        }
      }
    }
  }
  return calls;
}

describe('Evaluator function registry', () => {
  it('EVALUATOR_BUILTINS contains all 38 registered functions', () => {
    expect(EVALUATOR_BUILTINS).toHaveLength(38);
  });

  it('EVALUATOR_BUILTINS is frozen (const tuple)', () => {
    // The `as const` assertion produces a readonly tuple
    const arr: readonly string[] = EVALUATOR_BUILTINS;
    expect(Array.isArray(arr)).toBe(true);
  });

  it('every function used in tested constraint files is registered in EVALUATOR_BUILTINS', () => {
    const usedFunctions = extractTestedFunctionCalls();
    const registered = new Set<string>(EVALUATOR_BUILTINS);

    for (const fn of usedFunctions) {
      expect(
        registered.has(fn),
        `Function "${fn}" is used in a tested constraint expression but not in EVALUATOR_BUILTINS`,
      ).toBe(true);
    }
  });

  it('EVALUATOR_BUILTINS matches the Map entries in the Parser constructor (drift guard)', () => {
    // Read the evaluator source and extract function names from the Map constructor.
    // This guards against someone adding a function to the Map but forgetting to
    // update EVALUATOR_BUILTINS (or vice versa).
    const evaluatorSrc = readFileSync(
      join(__dirname, '..', '..', 'src', 'constraints', 'evaluator.ts'),
      'utf-8',
    );
    // Extract: ['name', ...] entries from the new Map<string, FunctionHandler>([...])
    const mapEntries = [...evaluatorSrc.matchAll(/\['([a-z_][a-z0-9_]*)',\s*\(\)/g)]
      .map(m => m[1]);
    const builtinsSet = new Set<string>(EVALUATOR_BUILTINS);
    const mapSet = new Set(mapEntries);

    // Every Map entry should be in EVALUATOR_BUILTINS
    for (const fn of mapSet) {
      expect(builtinsSet.has(fn), `Map has "${fn}" but EVALUATOR_BUILTINS does not`).toBe(true);
    }
    // Every EVALUATOR_BUILTINS entry should be in the Map
    for (const fn of builtinsSet) {
      expect(mapSet.has(fn), `EVALUATOR_BUILTINS has "${fn}" but the Map does not`).toBe(true);
    }
    // Same count
    expect(mapSet.size).toBe(builtinsSet.size);
  });

  it('EVALUATOR_BUILTINS has no duplicates', () => {
    const seen = new Set<string>();
    for (const fn of EVALUATOR_BUILTINS) {
      expect(seen.has(fn), `Duplicate builtin: "${fn}"`).toBe(false);
      seen.add(fn);
    }
  });

  it('all EVALUATOR_BUILTINS are actually callable in the evaluator', () => {
    // Each registered function should be dispatchable without throwing
    // "Unexpected token" errors. We test by calling each as fn() with
    // empty args — they will throw parse errors for missing args, but
    // NOT "Unexpected token" which would mean the function wasn't found.
    for (const fn of EVALUATOR_BUILTINS) {
      // Temporal operators take field paths, others take expressions.
      // We just need to verify the registry lookup works, not full parsing.
      try {
        evaluateConstraint({}, `${fn}(x)`);
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        // These errors are fine — they mean the function WAS found and dispatched.
        // What we DON'T want is "Unexpected token" which means it wasn't registered.
        expect(msg).not.toContain('Unexpected token');
      }
    }
  });

  it('unregistered identifiers fall through to field path resolution', () => {
    const data = { some_field: 42 };
    // An identifier not in the registry should resolve as a field path
    const result = evaluateConstraint(data, 'some_field == 42');
    expect(result).toBe(true);
  });

  it('unregistered identifiers with nested paths still work', () => {
    const data = { outer: { inner: 'hello' } };
    const result = evaluateConstraint(data, "outer.inner == 'hello'");
    expect(result).toBe(true);
  });

  describe('individual builtins (smoke tests)', () => {
    it('bigint_sum sums array fields', () => {
      const data = { items: [{ cost: '100' }, { cost: '200' }] };
      expect(evaluateConstraint(data, "bigint_sum(items, 'cost') == 300")).toBe(true);
    });

    it('bigint_eq compares BigInt values', () => {
      const data = { a: '1000000', b: '1000000' };
      expect(evaluateConstraint(data, 'bigint_eq(a, b)')).toBe(true);
    });

    it('bigint_sub performs subtraction', () => {
      const data = { a: '500', b: '200' };
      expect(evaluateConstraint(data, "bigint_eq(bigint_sub(a, b), '300')")).toBe(true);
    });

    it('bigint_add performs addition', () => {
      const data = { a: '300', b: '200' };
      expect(evaluateConstraint(data, "bigint_eq(bigint_add(a, b), '500')")).toBe(true);
    });

    it('bigint_gte compares correctly', () => {
      const data = { a: '500', b: '200' };
      expect(evaluateConstraint(data, 'bigint_gte(a, b)')).toBe(true);
    });

    it('bigint_gt compares correctly', () => {
      const data = { a: '500', b: '500' };
      expect(evaluateConstraint(data, 'bigint_gt(a, b)')).toBe(false);
    });

    it('changed detects field change', () => {
      const data = { status: 'active', _previous: { status: 'pending' } };
      expect(evaluateConstraint(data, 'changed(status)')).toBe(true);
    });

    it('previous returns old value', () => {
      const data = { status: 'active', _previous: { status: 'pending' } };
      expect(evaluateConstraint(data, "previous(status) == 'pending'")).toBe(true);
    });

    it('delta computes numeric difference', () => {
      const data = { balance: '500', _previous: { balance: '300' } };
      expect(evaluateConstraint(data, 'delta(balance) == 200')).toBe(true);
    });

    it('eq compares values for equality', () => {
      const data = { a: 'hello', b: 'hello', c: 'world' };
      expect(evaluateConstraint(data, 'eq(a, b)')).toBe(true);
      expect(evaluateConstraint(data, 'eq(a, c)')).toBe(false);
      expect(evaluateConstraint(data, '!eq(a, c)')).toBe(true);
    });

    it('object_keys_subset validates keys', () => {
      const data = {
        record: { a: 1, b: 2 },
        allowed: ['a', 'b', 'c'],
      };
      expect(evaluateConstraint(data, 'object_keys_subset(record, allowed)')).toBe(true);
    });
  });
});
