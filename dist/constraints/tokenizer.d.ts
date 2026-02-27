/**
 * Shared tokenizer for constraint expression parsing.
 *
 * Used by both `evaluator.ts` (evaluation) and `grammar.ts` (syntax validation).
 * Single source of truth for token types, tokenization rules, and lexical analysis.
 *
 * @see constraints/GRAMMAR.md — PEG grammar specification
 * @see S10-T1 — Shared Tokenizer extraction (Bridgebuilder structural debt fix)
 */
export type TokenType = 'number' | 'string' | 'ident' | 'op' | 'paren' | 'comma' | 'bracket' | 'dot' | 'arrow';
export interface Token {
    type: TokenType;
    value: string;
    /** Character offset in original expression. */
    pos: number;
}
/**
 * Tokenize a constraint expression string into a stream of tokens.
 *
 * @param expr - The constraint expression to tokenize
 * @returns Array of tokens with type, value, and position
 * @throws {TokenizerError} On unrecognized characters or unterminated strings
 */
export declare function tokenize(expr: string): Token[];
/**
 * Error thrown during tokenization for unrecognized characters or malformed literals.
 */
export declare class TokenizerError extends Error {
    position: number;
    constructor(message: string, position: number);
}
//# sourceMappingURL=tokenizer.d.ts.map