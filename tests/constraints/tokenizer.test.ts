/**
 * Dedicated unit tests for the shared tokenizer.
 *
 * Covers edge cases: empty input, whitespace-only, escape sequences,
 * consecutive operators, long numbers, and error conditions.
 *
 * @see S12-T6 — Bridgebuilder iteration 2 (tokenizer test coverage)
 */
import { describe, it, expect } from 'vitest';
import { tokenize, TokenizerError } from '../../src/constraints/tokenizer.js';

describe('Tokenizer', () => {
  // ── Basic tokenization ──────────────────────────────────────────────

  it('tokenizes a simple field equality', () => {
    const tokens = tokenize("status == 'active'");
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: 'ident', value: 'status', pos: 0 });
    expect(tokens[1]).toEqual({ type: 'op', value: '==', pos: 7 });
    expect(tokens[2]).toEqual({ type: 'string', value: 'active', pos: 10 });
  });

  it('tokenizes dot-path field access', () => {
    const tokens = tokenize('usage.total_tokens');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: 'ident', value: 'usage', pos: 0 });
    expect(tokens[1]).toEqual({ type: 'dot', value: '.', pos: 5 });
    expect(tokens[2]).toEqual({ type: 'ident', value: 'total_tokens', pos: 6 });
  });

  it('tokenizes implication arrow', () => {
    const tokens = tokenize('a => b');
    expect(tokens).toHaveLength(3);
    expect(tokens[1]).toEqual({ type: 'arrow', value: '=>', pos: 2 });
  });

  it('tokenizes all two-char operators', () => {
    for (const op of ['==', '!=', '<=', '>=', '&&', '||']) {
      const tokens = tokenize(`x ${op} y`);
      expect(tokens[1]).toEqual(expect.objectContaining({ type: 'op', value: op }));
    }
  });

  it('tokenizes single-char operators', () => {
    for (const op of ['<', '>', '!']) {
      const tokens = tokenize(`${op}x`);
      expect(tokens[0]).toEqual(expect.objectContaining({ type: 'op', value: op }));
    }
  });

  it('tokenizes parentheses and brackets', () => {
    const tokens = tokenize('([])');
    expect(tokens.map((t) => t.type)).toEqual(['paren', 'bracket', 'bracket', 'paren']);
  });

  it('tokenizes comma separator', () => {
    const tokens = tokenize('a, b');
    expect(tokens[1]).toEqual({ type: 'comma', value: ',', pos: 1 });
  });

  it('tokenizes integer numbers', () => {
    const tokens = tokenize('42');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'number', value: '42', pos: 0 });
  });

  it('tokenizes decimal numbers (dot after number)', () => {
    const tokens = tokenize('3.14');
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'number', value: '3.14', pos: 0 });
  });

  it('tokenizes identifiers with underscores and digits', () => {
    const tokens = tokenize('_previous cost_micro2');
    expect(tokens).toHaveLength(2);
    expect(tokens[0].value).toBe('_previous');
    expect(tokens[1].value).toBe('cost_micro2');
  });

  // ── Edge cases ──────────────────────────────────────────────────────

  it('returns empty array for empty input', () => {
    expect(tokenize('')).toEqual([]);
  });

  it('returns empty array for whitespace-only input', () => {
    expect(tokenize('   \t\n  ')).toEqual([]);
  });

  it('preserves position information across tokens', () => {
    const tokens = tokenize("x == 'hello'");
    expect(tokens[0].pos).toBe(0);
    expect(tokens[1].pos).toBe(2);
    expect(tokens[2].pos).toBe(5);
  });

  it('handles consecutive negation operators', () => {
    const tokens = tokenize('!!x');
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ type: 'op', value: '!', pos: 0 });
    expect(tokens[1]).toEqual({ type: 'op', value: '!', pos: 1 });
    expect(tokens[2]).toEqual({ type: 'ident', value: 'x', pos: 2 });
  });

  it('tokenizes large numbers', () => {
    const tokens = tokenize('999999999999999999999');
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value).toBe('999999999999999999999');
  });

  it('tokenizes null, true, false as identifiers', () => {
    const tokens = tokenize('null true false');
    expect(tokens.map((t) => t.value)).toEqual(['null', 'true', 'false']);
    expect(tokens.every((t) => t.type === 'ident')).toBe(true);
  });

  it('tokenizes built-in function names', () => {
    const tokens = tokenize('bigint_sum bigint_gt bigint_gte changed previous delta');
    const names = tokens.map((t) => t.value);
    expect(names).toEqual(['bigint_sum', 'bigint_gt', 'bigint_gte', 'changed', 'previous', 'delta']);
  });

  // ── String escape sequences ─────────────────────────────────────────

  it('handles escaped single quote in strings', () => {
    const tokens = tokenize("'can\\'t stop'");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('string');
    expect(tokens[0].value).toBe("can't stop");
  });

  it('handles escaped backslash in strings', () => {
    const tokens = tokenize("'path\\\\to'");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].type).toBe('string');
    expect(tokens[0].value).toBe('path\\to');
  });

  it('handles mixed escapes in strings', () => {
    const tokens = tokenize("'it\\'s a \\\\path'");
    expect(tokens).toHaveLength(1);
    expect(tokens[0].value).toBe("it's a \\path");
  });

  it('handles non-escape backslash (not followed by quote or backslash)', () => {
    const tokens = tokenize("'hello\\nworld'");
    expect(tokens).toHaveLength(1);
    // \n is not a recognized escape, so both characters are preserved
    expect(tokens[0].value).toBe('hello\\nworld');
  });

  it('handles empty string literal', () => {
    const tokens = tokenize("''");
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ type: 'string', value: '', pos: 0 });
  });

  // ── Complex expressions ─────────────────────────────────────────────

  it('tokenizes a full constraint expression', () => {
    const tokens = tokenize("strategy != 'dialogue' || (rounds != null && rounds.length > 0)");
    expect(tokens.length).toBeGreaterThan(10);
    // Verify key tokens
    expect(tokens[0].value).toBe('strategy');
    expect(tokens[1].value).toBe('!=');
    expect(tokens[2].value).toBe('dialogue');
    expect(tokens[3].value).toBe('||');
  });

  it('tokenizes bigint_sum with dot-path field', () => {
    const tokens = tokenize("bigint_sum(candidates, 'usage.cost_micro')");
    const values = tokens.map((t) => t.value);
    expect(values).toEqual(['bigint_sum', '(', 'candidates', ',', 'usage.cost_micro', ')']);
  });

  it('tokenizes temporal operator expression', () => {
    const tokens = tokenize('changed(step) => delta(step) > 0');
    const values = tokens.map((t) => t.value);
    expect(values).toEqual(['changed', '(', 'step', ')', '=>', 'delta', '(', 'step', ')', '>', '0']);
  });

  // ── Error conditions ────────────────────────────────────────────────

  it('throws TokenizerError for unterminated string', () => {
    expect(() => tokenize("'unterminated")).toThrow(TokenizerError);
    expect(() => tokenize("'unterminated")).toThrow('Unterminated string literal');
  });

  it('throws TokenizerError for unrecognized character', () => {
    expect(() => tokenize('x @ y')).toThrow(TokenizerError);
    expect(() => tokenize('x @ y')).toThrow('Unexpected character: @');
  });

  it('TokenizerError includes position', () => {
    try {
      tokenize("x == 'bad");
      expect.unreachable('should have thrown');
    } catch (e) {
      expect(e).toBeInstanceOf(TokenizerError);
      expect((e as TokenizerError).position).toBe(5);
    }
  });

  it('throws for unterminated string with escape at end', () => {
    expect(() => tokenize("'end\\")).toThrow(TokenizerError);
  });
});
