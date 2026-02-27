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
import { tokenize, TokenizerError } from './tokenizer.js';
/** Current expression grammar version. */
export const EXPRESSION_VERSION = '2.0';
/** Maximum nesting depth (mirrors evaluator.ts). */
const MAX_DEPTH = 32;
class SyntaxValidationError extends Error {
    position;
    constructor(message, position) {
        super(message);
        this.name = 'SyntaxValidationError';
        this.position = position;
    }
}
// ── Validation parser (syntax-only, no evaluation) ────────────────────────
class SyntaxValidator {
    tokens;
    pos = 0;
    depth = 0;
    constructor(tokens) {
        this.tokens = tokens;
    }
    peek() {
        return this.tokens[this.pos];
    }
    advance() {
        return this.tokens[this.pos++];
    }
    expect(type, value) {
        const tok = this.peek();
        if (!tok) {
            throw new SyntaxValidationError(`Expected ${type}${value ? ` "${value}"` : ''}, got EOF`, this.lastPos());
        }
        if (tok.type !== type || (value !== undefined && tok.value !== value)) {
            throw new SyntaxValidationError(`Expected ${type}${value ? ` "${value}"` : ''}, got ${tok.type} "${tok.value}"`, tok.pos);
        }
        this.advance();
    }
    lastPos() {
        if (this.pos > 0)
            return this.tokens[this.pos - 1].pos + this.tokens[this.pos - 1].value.length;
        return 0;
    }
    // ── Grammar rules ────────────────────────────────────────────────────
    parseExpr() {
        this.depth++;
        if (this.depth > MAX_DEPTH) {
            const tok = this.peek();
            throw new SyntaxValidationError('Expression nesting exceeds maximum depth', tok ? tok.pos : this.lastPos());
        }
        this.parseOr();
        if (this.peek()?.type === 'arrow') {
            this.advance();
            this.parseOr();
        }
        this.depth--;
    }
    parseOr() {
        this.parseAnd();
        while (this.peek()?.type === 'op' && this.peek()?.value === '||') {
            this.advance();
            this.parseAnd();
        }
    }
    parseAnd() {
        this.parseComparison();
        while (this.peek()?.type === 'op' && this.peek()?.value === '&&') {
            this.advance();
            this.parseComparison();
        }
    }
    parseComparison() {
        this.parseUnary();
        const tok = this.peek();
        if (tok?.type === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(tok.value)) {
            this.advance();
            this.parseUnary();
        }
    }
    parseUnary() {
        if (this.peek()?.type === 'op' && this.peek()?.value === '!') {
            this.advance();
            this.parseUnary();
            return;
        }
        this.parsePrimary();
    }
    parsePrimary() {
        const tok = this.peek();
        if (!tok) {
            throw new SyntaxValidationError('Unexpected end of expression', this.lastPos());
        }
        // Parenthesized expression
        if (tok.type === 'paren' && tok.value === '(') {
            this.advance();
            this.parseExpr();
            this.expect('paren', ')');
            return;
        }
        // Bracket array
        if (tok.type === 'bracket' && tok.value === '[') {
            this.advance();
            while (this.peek() && !(this.peek().type === 'bracket' && this.peek().value === ']')) {
                this.parseFieldPath();
                if (this.peek()?.type === 'comma')
                    this.advance();
            }
            this.expect('bracket', ']');
            return;
        }
        // Number literal
        if (tok.type === 'number') {
            this.advance();
            return;
        }
        // String literal
        if (tok.type === 'string') {
            this.advance();
            return;
        }
        // Null / boolean literals
        if (tok.type === 'ident' && (tok.value === 'null' || tok.value === 'true' || tok.value === 'false')) {
            this.advance();
            return;
        }
        // bigint_sum function call
        if (tok.type === 'ident' && tok.value === 'bigint_sum') {
            this.parseBigintSumCall();
            return;
        }
        // bigint_gte / bigint_gt function calls
        if (tok.type === 'ident' && (tok.value === 'bigint_gte' || tok.value === 'bigint_gt')) {
            this.parseTwoArgCall();
            return;
        }
        // Temporal function calls (v2.0): changed(), previous(), delta()
        if (tok.type === 'ident' && (tok.value === 'changed' || tok.value === 'previous' || tok.value === 'delta')) {
            this.parseOneArgCall();
            return;
        }
        // Identifier (field path)
        if (tok.type === 'ident') {
            this.parseFieldPath();
            return;
        }
        throw new SyntaxValidationError(`Unexpected token: ${tok.type} "${tok.value}"`, tok.pos);
    }
    parseFieldPath() {
        this.expect('ident');
        while (this.peek()?.type === 'dot') {
            this.advance(); // consume '.'
            const next = this.peek();
            if (!next || next.type !== 'ident') {
                throw new SyntaxValidationError('Expected identifier after dot', next ? next.pos : this.lastPos());
            }
            // .length
            if (next.value === 'length') {
                this.advance();
                return;
            }
            // .every(param => expr)
            if (next.value === 'every') {
                this.advance();
                this.expect('paren', '(');
                // Parameter name
                const paramTok = this.peek();
                if (!paramTok || paramTok.type !== 'ident') {
                    throw new SyntaxValidationError('Expected parameter name in .every()', paramTok ? paramTok.pos : this.lastPos());
                }
                this.advance(); // param name
                // Arrow
                if (this.peek()?.type !== 'arrow') {
                    throw new SyntaxValidationError('Expected => in .every() lambda', this.peek() ? this.peek().pos : this.lastPos());
                }
                this.advance(); // =>
                // Inner expression — we parse until the matching close paren
                this.parseExpr();
                this.expect('paren', ')');
                return;
            }
            // Regular dot access
            this.advance();
        }
    }
    parseBigintSumCall() {
        this.advance(); // consume 'bigint_sum'
        this.expect('paren', '(');
        this.parsePrimary(); // first arg
        if (this.peek()?.type === 'comma') {
            this.advance();
            this.parsePrimary(); // second arg
        }
        this.expect('paren', ')');
    }
    /** Parse a two-argument function call: func(expr, expr) */
    parseTwoArgCall() {
        this.advance(); // consume function name
        this.expect('paren', '(');
        this.parseExpr(); // first arg
        this.expect('comma');
        this.parseExpr(); // second arg
        this.expect('paren', ')');
    }
    /** Parse a single-argument function call: func(fieldPath) */
    parseOneArgCall() {
        this.advance(); // consume function name
        this.expect('paren', '(');
        this.parseFieldPath(); // argument (field path)
        this.expect('paren', ')');
    }
    /** Validate that all tokens have been consumed. */
    checkComplete() {
        const remaining = this.peek();
        if (remaining) {
            throw new SyntaxValidationError(`Unexpected token after expression: ${remaining.type} "${remaining.value}"`, remaining.pos);
        }
    }
}
// ── Public API ─────────────────────────────────────────────────────────────
/**
 * Validate that an expression string conforms to the constraint grammar.
 *
 * Performs syntax-only validation — does not evaluate the expression against
 * any data context. Reports the character position of the first syntax error.
 *
 * @param expr - Constraint expression string
 * @returns Validation result with error details on failure
 */
export function validateExpression(expr) {
    try {
        const tokens = tokenize(expr);
        const validator = new SyntaxValidator(tokens);
        validator.parseExpr();
        validator.checkComplete();
        return { valid: true };
    }
    catch (e) {
        if (e instanceof SyntaxValidationError) {
            return { valid: false, error: e.message, position: e.position };
        }
        if (e instanceof TokenizerError) {
            return { valid: false, error: e.message, position: e.position };
        }
        return { valid: false, error: String(e), position: 0 };
    }
}
//# sourceMappingURL=grammar.js.map