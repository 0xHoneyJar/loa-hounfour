/**
 * Detailed constraint evaluator with structured error reporting.
 *
 * Wraps the core `evaluateConstraint()` from evaluator.ts to provide
 * richer result types with error messages and optional position info.
 * The original evaluateConstraint API remains unchanged.
 *
 * @see S3-T6 — Expression Versioning + Detailed Evaluator
 */

import { evaluateConstraint } from './evaluator.js';
import { validateExpression } from './grammar.js';

/**
 * Structured evaluation result with success value or error details.
 */
export type EvaluationResult =
  | { valid: true; value: unknown }
  | { valid: false; error: string; position?: number };

/**
 * Evaluate a constraint expression against a data context, returning
 * a detailed result with error information.
 *
 * Steps:
 * 1. Syntax-validate the expression (reports position on failure)
 * 2. Evaluate against data context
 * 3. Return the evaluated value or a structured error
 *
 * @param expression - Constraint expression string
 * @param context - Data object to evaluate against
 * @returns Detailed evaluation result
 */
export function evaluateConstraintDetailed(
  expression: string,
  context: Record<string, unknown>,
): EvaluationResult {
  // Phase 1: syntax validation (gives us position info on parse errors)
  const syntaxResult = validateExpression(expression);
  if (!syntaxResult.valid) {
    return {
      valid: false,
      error: syntaxResult.error,
      position: syntaxResult.position,
    };
  }

  // Phase 2: evaluation
  try {
    const value = evaluateConstraint(context, expression);
    return { valid: true, value };
  } catch (e) {
    // Extract position from the evaluator error message if possible
    const message = e instanceof Error ? e.message : String(e);
    const posMatch = message.match(/at position (\d+)/);
    return {
      valid: false,
      error: message,
      position: posMatch ? parseInt(posMatch[1], 10) : undefined,
    };
  }
}
