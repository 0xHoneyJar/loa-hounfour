/**
 * Detailed constraint evaluator with structured error reporting.
 *
 * Wraps the core `evaluateConstraint()` from evaluator.ts to provide
 * richer result types with error messages and optional position info.
 * The original evaluateConstraint API remains unchanged.
 *
 * @see S3-T6 — Expression Versioning + Detailed Evaluator
 */
/**
 * Structured evaluation result with success value or error details.
 */
export type EvaluationResult = {
    valid: true;
    value: unknown;
} | {
    valid: false;
    error: string;
    position?: number;
};
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
export declare function evaluateConstraintDetailed(expression: string, context: Record<string, unknown>, options?: {
    expressionVersion?: string;
}): EvaluationResult;
//# sourceMappingURL=detailed-evaluator.d.ts.map