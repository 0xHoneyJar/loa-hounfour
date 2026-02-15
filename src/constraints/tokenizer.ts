/**
 * Shared tokenizer for constraint expression parsing.
 *
 * Used by both `evaluator.ts` (evaluation) and `grammar.ts` (syntax validation).
 * Single source of truth for token types, tokenization rules, and lexical analysis.
 *
 * @see constraints/GRAMMAR.md — PEG grammar specification
 * @see S10-T1 — Shared Tokenizer extraction (Bridgebuilder structural debt fix)
 */

// ── Token types ─────────────────────────────────────────────────────────────

export type TokenType = 'number' | 'string' | 'ident' | 'op' | 'paren' | 'comma' | 'bracket' | 'dot' | 'arrow';

export interface Token {
  type: TokenType;
  value: string;
  /** Character offset in original expression. */
  pos: number;
}

// ── Tokenizer ───────────────────────────────────────────────────────────────

/**
 * Tokenize a constraint expression string into a stream of tokens.
 *
 * @param expr - The constraint expression to tokenize
 * @returns Array of tokens with type, value, and position
 * @throws {TokenizerError} On unrecognized characters or unterminated strings
 */
export function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) { i++; continue; }

    // Arrow (implication) — must be checked before '==' operator
    if (expr[i] === '=' && i + 1 < expr.length && expr[i + 1] === '>') {
      tokens.push({ type: 'arrow', value: '=>', pos: i });
      i += 2;
      continue;
    }

    // Two-char operators
    if (i + 1 < expr.length) {
      const two = expr[i] + expr[i + 1];
      if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '&&' || two === '||') {
        tokens.push({ type: 'op', value: two, pos: i });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if (expr[i] === '<' || expr[i] === '>' || expr[i] === '!') {
      tokens.push({ type: 'op', value: expr[i], pos: i });
      i++;
      continue;
    }

    // Parentheses
    if (expr[i] === '(' || expr[i] === ')') {
      tokens.push({ type: 'paren', value: expr[i], pos: i });
      i++;
      continue;
    }

    // Brackets
    if (expr[i] === '[' || expr[i] === ']') {
      tokens.push({ type: 'bracket', value: expr[i], pos: i });
      i++;
      continue;
    }

    // Comma
    if (expr[i] === ',') {
      tokens.push({ type: 'comma', value: ',', pos: i });
      i++;
      continue;
    }

    // Dot
    if (expr[i] === '.') {
      // Decimal point within a number: merge with preceding number token
      if (
        i + 1 < expr.length && /\d/.test(expr[i + 1]) &&
        tokens.length > 0 && tokens[tokens.length - 1].type === 'number'
      ) {
        const prev = tokens.pop()!;
        let numStr = prev.value + '.';
        i++;
        while (i < expr.length && /\d/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'number', value: numStr, pos: prev.pos });
        continue;
      }
      tokens.push({ type: 'dot', value: '.', pos: i });
      i++;
      continue;
    }

    // String literal (single-quoted, supports \' and \\ escape sequences)
    if (expr[i] === "'") {
      const start = i;
      let str = '';
      i++; // skip opening quote
      while (i < expr.length && expr[i] !== "'") {
        if (expr[i] === '\\' && i + 1 < expr.length) {
          const next = expr[i + 1];
          if (next === "'" || next === '\\') {
            str += next;
            i += 2;
            continue;
          }
        }
        str += expr[i];
        i++;
      }
      if (i >= expr.length) {
        throw new TokenizerError('Unterminated string literal', start);
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str, pos: start });
      continue;
    }

    // Number
    if (/\d/.test(expr[i])) {
      const start = i;
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num, pos: start });
      continue;
    }

    // Identifier (includes null, true, false, bigint_sum, changed, etc.)
    if (/[a-zA-Z_]/.test(expr[i])) {
      const start = i;
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: 'ident', value: ident, pos: start });
      continue;
    }

    throw new TokenizerError(`Unexpected character: ${expr[i]}`, i);
  }
  return tokens;
}

/**
 * Error thrown during tokenization for unrecognized characters or malformed literals.
 */
export class TokenizerError extends Error {
  position: number;
  constructor(message: string, position: number) {
    super(message);
    this.name = 'TokenizerError';
    this.position = position;
  }
}
