/**
 * Tests for evaluator builtin specifications (S3-T1, S3-T2).
 *
 * Verifies:
 * 1. Registry completeness (keys match EVALUATOR_BUILTINS)
 * 2. Spec structural integrity (all fields present)
 * 3. Every example executes correctly against the actual evaluator
 */
import { describe, it, expect } from 'vitest';
import {
  EVALUATOR_BUILTIN_SPECS,
  type EvaluatorBuiltinSpec,
} from '../../src/constraints/evaluator-spec.js';
import { EVALUATOR_BUILTINS, evaluateConstraint } from '../../src/constraints/evaluator.js';

describe('EvaluatorBuiltinSpec registry', () => {
  it('has exactly the same keys as EVALUATOR_BUILTINS', () => {
    const specKeys = [...EVALUATOR_BUILTIN_SPECS.keys()].sort();
    const builtinKeys = [...EVALUATOR_BUILTINS].sort();
    expect(specKeys).toEqual(builtinKeys);
  });

  it('has 39 entries', () => {
    expect(EVALUATOR_BUILTIN_SPECS.size).toBe(39);
  });

  for (const builtin of EVALUATOR_BUILTINS) {
    describe(`spec for "${builtin}"`, () => {
      let spec: EvaluatorBuiltinSpec;

      it('exists in registry', () => {
        spec = EVALUATOR_BUILTIN_SPECS.get(builtin)!;
        expect(spec).toBeDefined();
      });

      it('has required structural fields', () => {
        spec = EVALUATOR_BUILTIN_SPECS.get(builtin)!;
        expect(spec.name).toBe(builtin);
        expect(spec.signature).toBeTruthy();
        expect(spec.description).toBeTruthy();
        expect(spec.arguments.length).toBeGreaterThanOrEqual(0); // now() has zero args
        expect(spec.return_type).toBeTruthy();
        expect(typeof spec.short_circuit).toBe('boolean');
        expect(spec.examples.length).toBeGreaterThanOrEqual(2);
        expect(spec.edge_cases.length).toBeGreaterThanOrEqual(1);
      });

      it('examples have required fields', () => {
        spec = EVALUATOR_BUILTIN_SPECS.get(builtin)!;
        for (const example of spec.examples) {
          expect(example.description).toBeTruthy();
          expect(example.context).toBeDefined();
          expect(example.expression).toBeTruthy();
          expect(example.expected).toBeDefined();
        }
      });
    });
  }
});

describe('EvaluatorBuiltinSpec example verification', () => {
  for (const [name, spec] of EVALUATOR_BUILTIN_SPECS) {
    describe(`${name} examples`, () => {
      for (const example of spec.examples) {
        it(example.description, () => {
          const result = evaluateConstraint(example.context, example.expression);
          expect(result).toBe(example.expected);
        });
      }
    });
  }
});
