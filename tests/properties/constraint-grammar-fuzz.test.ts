/**
 * S3-T7 — Grammar Fuzz Tests
 *
 * Property-based tests for the constraint expression grammar using fast-check.
 * Validates syntax validation, evaluation safety, and grammar invariants.
 *
 * @see constraints/GRAMMAR.md — PEG grammar specification
 * @see S3-T7 — Grammar Fuzz Tests
 */
import { describe, it, expect } from 'vitest';
import * as fc from 'fast-check';
import { evaluateConstraint, MAX_EXPRESSION_DEPTH } from '../../src/constraints/evaluator.js';
import { EXPRESSION_VERSION, validateExpression } from '../../src/constraints/grammar.js';
import { evaluateConstraintDetailed } from '../../src/constraints/detailed-evaluator.js';
import type { EvaluationResult } from '../../src/constraints/detailed-evaluator.js';

// ---------------------------------------------------------------------------
// Arbitraries
// ---------------------------------------------------------------------------

/** Valid identifier: starts with letter/underscore, rest alphanumeric/underscore. */
const identArb = fc
  .stringMatching(/^[a-z_][a-z0-9_]{0,8}$/)
  // Avoid collisions with keywords
  .filter((s) => !['null', 'true', 'false', 'bigint_sum', 'every', 'length'].includes(s));

/** Valid single-quoted string literal. */
const stringLitArb = fc
  .stringMatching(/^[a-z0-9_ -]{0,10}$/)
  .map((s) => `'${s}'`);

/** Valid number literal (integer or decimal). */
const numberLitArb = fc.oneof(
  fc.integer({ min: 0, max: 999999 }).map(String),
  fc.tuple(
    fc.integer({ min: 0, max: 999 }),
    fc.integer({ min: 0, max: 99 }),
  ).map(([a, b]) => `${a}.${b}`),
);

/** Comparison operator. */
const compOpArb = fc.constantFrom('==', '!=', '<', '>', '<=', '>=');

/** Boolean operator. */
const boolOpArb = fc.constantFrom('&&', '||');

/** Simple comparison expression: field op value. */
const simpleComparisonArb = fc
  .tuple(identArb, compOpArb, fc.oneof(numberLitArb, stringLitArb, fc.constant('null')))
  .map(([field, op, val]) => `${field} ${op} ${val}`);

/** Simple boolean expression: comparison boolOp comparison. */
const simpleBooleanArb = fc
  .tuple(simpleComparisonArb, boolOpArb, simpleComparisonArb)
  .map(([left, op, right]) => `${left} ${op} ${right}`);

// ---------------------------------------------------------------------------
// Properties
// ---------------------------------------------------------------------------

describe('S3-T7: Constraint Grammar Fuzz Tests', () => {
  // ── Property 1: Valid simple comparisons always parse ──────────────────

  it('P1: valid simple comparisons always parse', () => {
    fc.assert(
      fc.property(simpleComparisonArb, (expr) => {
        const result = validateExpression(expr);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // ── Property 2: Valid boolean expressions always parse ─────────────────

  it('P2: valid boolean expressions (&&, ||) always parse', () => {
    fc.assert(
      fc.property(simpleBooleanArb, (expr) => {
        const result = validateExpression(expr);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // ── Property 3: Invalid tokens are rejected with position ──────────────

  it('P3: invalid tokens are rejected with position', () => {
    // Characters that are not part of the grammar
    const invalidCharArb = fc.constantFrom('@', '#', '$', '%', '~', '`', '\\', ';', ':', '"');

    fc.assert(
      fc.property(
        fc.tuple(identArb, invalidCharArb),
        ([prefix, badChar]) => {
          const expr = `${prefix} ${badChar}`;
          const result = validateExpression(expr);
          expect(result.valid).toBe(false);
          if (!result.valid) {
            expect(typeof result.position).toBe('number');
            expect(result.position).toBeGreaterThanOrEqual(0);
            expect(result.error.length).toBeGreaterThan(0);
          }
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 4: Depth limit enforcement ────────────────────────────────

  it('P4: depth limit enforcement (MAX_EXPRESSION_DEPTH = 32)', () => {
    // Build deeply nested expressions that exceed MAX_EXPRESSION_DEPTH
    fc.assert(
      fc.property(
        fc.integer({ min: MAX_EXPRESSION_DEPTH + 1, max: MAX_EXPRESSION_DEPTH + 10 }),
        (depth) => {
          const open = '('.repeat(depth);
          const close = ')'.repeat(depth);
          const expr = `${open}true${close}`;
          // Both the validator and the evaluator should reject
          const valResult = validateExpression(expr);
          expect(valResult.valid).toBe(false);
          if (!valResult.valid) {
            expect(valResult.error).toContain('maximum depth');
          }
          expect(() => evaluateConstraint({}, expr)).toThrow('maximum depth');
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 5: Bracket array syntax acceptance ────────────────────────

  it('P5: bracket array syntax [a, b, c] acceptance', () => {
    const bracketArrayArb = fc
      .array(identArb, { minLength: 1, maxLength: 5 })
      .map((fields) => `[${fields.join(', ')}]`);

    fc.assert(
      fc.property(bracketArrayArb, (arrayExpr) => {
        // Bracket arrays are valid as a primary expression
        // Wrapping in bigint_sum to make it a complete expression
        const expr = `bigint_sum(${arrayExpr})`;
        const result = validateExpression(expr);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // ── Property 6: Implication operator truth table ───────────────────────

  it('P6: implication operator => truth table', () => {
    // A => B is !A || B
    const boolPairs: Array<[boolean, boolean]> = [
      [true, true],
      [true, false],
      [false, true],
      [false, false],
    ];

    fc.assert(
      fc.property(
        fc.constantFrom(...boolPairs),
        ([a, b]) => {
          const expr = `a => b`;
          const result = evaluateConstraint({ a, b }, expr);
          const expected = !a || b;
          expect(result).toBe(expected);
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 7: every quantifier with empty arrays ─────────────────────

  it('P7: every quantifier with empty arrays returns true (vacuous truth)', () => {
    fc.assert(
      fc.property(identArb, identArb, (arrName, paramName) => {
        // Avoid name collision between array and param
        const safeName = arrName === paramName ? paramName + '2' : paramName;
        const expr = `${arrName}.every(${safeName} => ${safeName} != null)`;
        const data = { [arrName]: [] };
        // JavaScript [].every(fn) === true (vacuous truth)
        const result = evaluateConstraint(data, expr);
        expect(result).toBe(true);
      }),
      { numRuns: 100 },
    );
  });

  // ── Property 8: Null coercion safety ───────────────────────────────────

  it('P8: null coercion safety — null comparisons never throw', () => {
    fc.assert(
      fc.property(
        identArb,
        compOpArb,
        fc.constantFrom(null, undefined, 0, '', false),
        (field, op, value) => {
          const expr = `${field} ${op} null`;
          const data: Record<string, unknown> = { [field]: value };
          // Should never throw, regardless of the value
          expect(() => evaluateConstraint(data, expr)).not.toThrow();
        },
      ),
      { numRuns: 100 },
    );
  });

  // ── Property 9: BigInt overflow safety ─────────────────────────────────

  it('P9: BigInt overflow safety — non-numeric strings in bigint_sum do not throw', () => {
    const nonNumericArb = fc.constantFrom(
      'not-a-number',
      'abc',
      '',
      'NaN',
      'Infinity',
      '-Infinity',
      '1.5e308',
      '99999999999999999999999999999999999999999999999999',
    );

    fc.assert(
      fc.property(nonNumericArb, (badValue) => {
        const data = { field_a: badValue, field_b: '100' };
        // bigint_sum catches BigInt conversion errors — must not throw
        expect(() =>
          evaluateConstraint(data, "bigint_sum([field_a, field_b]) == 100"),
        ).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  // ── Property 10: Grammar version exported correctly ────────────────────

  it('P10: grammar version exported correctly', () => {
    fc.assert(
      fc.property(fc.constant(null), () => {
        expect(EXPRESSION_VERSION).toBe('1.0');
        expect(typeof EXPRESSION_VERSION).toBe('string');
        // Version must match semver-ish format (major.minor)
        expect(EXPRESSION_VERSION).toMatch(/^\d+\.\d+$/);
      }),
      { numRuns: 100 },
    );
  });

  // ── Bonus properties ───────────────────────────────────────────────────

  it('P11: validateExpression agrees with evaluateConstraint on valid expressions', () => {
    // Expressions that are syntactically valid should pass validateExpression
    // AND not throw during evaluateConstraint (they may return true or false)
    fc.assert(
      fc.property(simpleComparisonArb, (expr) => {
        const syntaxResult = validateExpression(expr);
        expect(syntaxResult.valid).toBe(true);
        // Evaluation with empty context should not throw
        expect(() => evaluateConstraint({}, expr)).not.toThrow();
      }),
      { numRuns: 100 },
    );
  });

  it('P12: evaluateConstraintDetailed returns structured errors for invalid syntax', () => {
    const invalidExprArb = fc.constantFrom(
      '== ==',
      '( unclosed',
      'field @@ value',
      '!!!',
      '',
    );

    fc.assert(
      fc.property(invalidExprArb, (expr) => {
        const result: EvaluationResult = evaluateConstraintDetailed(expr, {});
        if (expr === '') {
          // Empty string: parsePrimary will fail
          expect(result.valid).toBe(false);
        }
        // For clearly invalid expressions, should get an error
        if (!result.valid) {
          expect(typeof result.error).toBe('string');
          expect(result.error.length).toBeGreaterThan(0);
        }
      }),
      { numRuns: 100 },
    );
  });

  it('P13: implication expressions always validate syntactically', () => {
    fc.assert(
      fc.property(
        simpleComparisonArb,
        simpleComparisonArb,
        (antecedent, consequent) => {
          const expr = `${antecedent} => ${consequent}`;
          const result = validateExpression(expr);
          expect(result.valid).toBe(true);
        },
      ),
      { numRuns: 100 },
    );
  });

  it('P14: negation of any valid expression is also valid', () => {
    fc.assert(
      fc.property(simpleComparisonArb, (expr) => {
        const negated = `!(${expr})`;
        const result = validateExpression(negated);
        expect(result.valid).toBe(true);
      }),
      { numRuns: 100 },
    );
  });
});
