/**
 * Constraint expression grammar metadata and syntax validator.
 *
 * Validates that an expression string conforms to the constraint grammar
 * without evaluating it against data. Useful for tooling, CI checks,
 * and constraint file authoring.
 *
 * @see constraints/GRAMMAR.md — PEG grammar specification
 * @see S3-T5 — PEG Grammar + Grammar Validator
 */
/** Current expression grammar version. */
export declare const EXPRESSION_VERSION = "2.0";
/**
 * Validate that an expression string conforms to the constraint grammar.
 *
 * Performs syntax-only validation — does not evaluate the expression against
 * any data context. Reports the character position of the first syntax error.
 *
 * @param expr - Constraint expression string
 * @returns Validation result with error details on failure
 */
export declare function validateExpression(expr: string): {
    valid: true;
} | {
    valid: false;
    error: string;
    position: number;
};
//# sourceMappingURL=grammar.d.ts.map