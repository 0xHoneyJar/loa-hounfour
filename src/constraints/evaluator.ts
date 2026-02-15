/**
 * Minimal constraint expression evaluator for round-trip testing.
 *
 * Supports a small expression language sufficient to evaluate
 * the constraint files in `constraints/`. This is NOT a general-purpose
 * expression engine — it handles exactly the operators used in cross-field
 * constraint expressions.
 *
 * Operators:
 * - `==`, `!=`, `<`, `>`, `<=`, `>=` (comparisons)
 * - `&&`, `||`, `!` (boolean)
 * - `== null`, `!= null` (null/undefined checks)
 * - `=> ` (implication: A => B is equivalent to !A || B)
 * - `'literal'` (string literals)
 * - `field.nested` (dot-access)
 * - `bigint_sum(array, field)` or `bigint_sum([expr1, expr2])` (sum)
 * - `array.length` (length access)
 * - `array.every(expr)` (universal quantification)
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */

type Token = {
  type: 'number' | 'string' | 'ident' | 'op' | 'paren' | 'comma' | 'bracket' | 'dot' | 'arrow';
  value: string;
};

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    // Skip whitespace
    if (/\s/.test(expr[i])) { i++; continue; }

    // Arrow (implication)
    if (expr[i] === '=' && expr[i + 1] === '>') {
      tokens.push({ type: 'arrow', value: '=>' });
      i += 2;
      continue;
    }

    // Two-char operators
    if (i + 1 < expr.length) {
      const two = expr[i] + expr[i + 1];
      if (two === '==' || two === '!=' || two === '<=' || two === '>=' || two === '&&' || two === '||') {
        tokens.push({ type: 'op', value: two });
        i += 2;
        continue;
      }
    }

    // Single-char operators
    if (expr[i] === '<' || expr[i] === '>' || expr[i] === '!') {
      tokens.push({ type: 'op', value: expr[i] });
      i++;
      continue;
    }

    // Parentheses
    if (expr[i] === '(' || expr[i] === ')') {
      tokens.push({ type: 'paren', value: expr[i] });
      i++;
      continue;
    }

    // Brackets
    if (expr[i] === '[' || expr[i] === ']') {
      tokens.push({ type: 'bracket', value: expr[i] });
      i++;
      continue;
    }

    // Comma
    if (expr[i] === ',') {
      tokens.push({ type: 'comma', value: ',' });
      i++;
      continue;
    }

    // Dot
    if (expr[i] === '.' && !(i > 0 && /\d/.test(expr[i - 1]) && i + 1 < expr.length && /\d/.test(expr[i + 1]))) {
      // Check if this is a decimal point in a number
      if (i + 1 < expr.length && /\d/.test(expr[i + 1]) && tokens.length > 0 && tokens[tokens.length - 1].type === 'number') {
        // It's a decimal point — merge with previous number token
        const prev = tokens.pop()!;
        let numStr = prev.value + '.';
        i++;
        while (i < expr.length && /\d/.test(expr[i])) {
          numStr += expr[i];
          i++;
        }
        tokens.push({ type: 'number', value: numStr });
        continue;
      }
      tokens.push({ type: 'dot', value: '.' });
      i++;
      continue;
    }

    // String literal (single-quoted)
    if (expr[i] === "'") {
      let str = '';
      i++; // skip opening quote
      while (i < expr.length && expr[i] !== "'") {
        str += expr[i];
        i++;
      }
      i++; // skip closing quote
      tokens.push({ type: 'string', value: str });
      continue;
    }

    // Number
    if (/\d/.test(expr[i])) {
      let num = '';
      while (i < expr.length && (/\d/.test(expr[i]) || expr[i] === '.')) {
        num += expr[i];
        i++;
      }
      tokens.push({ type: 'number', value: num });
      continue;
    }

    // Identifier (includes null, true, false, bigint_sum, etc.)
    if (/[a-zA-Z_]/.test(expr[i])) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i++;
      }
      tokens.push({ type: 'ident', value: ident });
      continue;
    }

    throw new Error(`Unexpected character: ${expr[i]} at position ${i} in "${expr}"`);
  }
  return tokens;
}

/**
 * Resolve a dotted field path on a data object.
 * Returns undefined for missing paths.
 */
function resolve(data: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = data;
  for (const part of parts) {
    if (current == null || typeof current !== 'object') return undefined;
    current = (current as Record<string, unknown>)[part];
  }
  return current;
}

/**
 * Recursive descent parser and evaluator.
 */
class Parser {
  private tokens: Token[];
  private pos = 0;
  private data: Record<string, unknown>;

  constructor(tokens: Token[], data: Record<string, unknown>) {
    this.tokens = tokens;
    this.data = data;
  }

  private peek(): Token | undefined {
    return this.tokens[this.pos];
  }

  private advance(): Token {
    return this.tokens[this.pos++];
  }

  private expect(type: string, value?: string): Token {
    const tok = this.advance();
    if (!tok || tok.type !== type || (value !== undefined && tok.value !== value)) {
      throw new Error(`Expected ${type}${value ? ` "${value}"` : ''}, got ${tok ? `${tok.type} "${tok.value}"` : 'EOF'}`);
    }
    return tok;
  }

  /**
   * Parse top-level: implication or or-expression.
   * Grammar: expr := or_expr ('=>' or_expr)?
   */
  parseExpr(): unknown {
    const left = this.parseOr();
    if (this.peek()?.type === 'arrow') {
      this.advance(); // consume '=>'
      const right = this.parseOr();
      // A => B is !A || B
      return !left || !!right;
    }
    return left;
  }

  private parseOr(): unknown {
    let left = this.parseAnd();
    while (this.peek()?.type === 'op' && this.peek()?.value === '||') {
      this.advance();
      const right = this.parseAnd();
      left = !!left || !!right;
    }
    return left;
  }

  private parseAnd(): unknown {
    let left = this.parseComparison();
    while (this.peek()?.type === 'op' && this.peek()?.value === '&&') {
      this.advance();
      const right = this.parseComparison();
      left = !!left && !!right;
    }
    return left;
  }

  private parseComparison(): unknown {
    const left = this.parseUnary();
    const tok = this.peek();
    if (tok?.type === 'op' && ['==', '!=', '<', '>', '<=', '>='].includes(tok.value)) {
      const op = this.advance().value;
      const right = this.parseUnary();
      return this.compare(left, op, right);
    }
    return left;
  }

  private compare(left: unknown, op: string, right: unknown): boolean {
    // Handle null comparisons
    if (right === null) {
      switch (op) {
        case '==': return left == null;
        case '!=': return left != null;
        default: return false;
      }
    }
    if (left === null) {
      switch (op) {
        case '==': return right == null;
        case '!=': return right != null;
        default: return false;
      }
    }

    // Coerce BigInt/string/number to a common type for comparison.
    // Constraint expressions compare bigint_sum results (BigInt) against
    // field values (strings like "1000000") or literal numbers (10000).
    const [l, r] = this.coerce(left, right);

    if (typeof l === 'bigint' && typeof r === 'bigint') {
      switch (op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        default: return false;
      }
    }

    // Numeric comparisons
    if (typeof l === 'number' && typeof r === 'number') {
      switch (op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        default: return false;
      }
    }

    // String comparisons
    if (typeof l === 'string' && typeof r === 'string') {
      switch (op) {
        case '==': return l === r;
        case '!=': return l !== r;
        case '<': return l < r;
        case '>': return l > r;
        case '<=': return l <= r;
        case '>=': return l >= r;
        default: return false;
      }
    }

    // Boolean
    if (typeof l === 'boolean' && typeof r === 'boolean') {
      switch (op) {
        case '==': return l === r;
        case '!=': return l !== r;
        default: return false;
      }
    }

    // Mixed type — loose equality
    switch (op) {
      case '==': return l === r;
      case '!=': return l !== r;
      default: return false;
    }
  }

  /**
   * Coerce operands to compatible types for comparison.
   * When one side is BigInt and the other is a string or number,
   * convert the non-BigInt side to BigInt.
   */
  private coerce(left: unknown, right: unknown): [unknown, unknown] {
    if (typeof left === 'bigint' && typeof right === 'string') {
      try { return [left, BigInt(right)]; } catch { return [left, right]; }
    }
    if (typeof left === 'string' && typeof right === 'bigint') {
      try { return [BigInt(left), right]; } catch { return [left, right]; }
    }
    if (typeof left === 'bigint' && typeof right === 'number') {
      return [left, BigInt(right)];
    }
    if (typeof left === 'number' && typeof right === 'bigint') {
      return [BigInt(left), right];
    }
    return [left, right];
  }

  private parseUnary(): unknown {
    if (this.peek()?.type === 'op' && this.peek()?.value === '!') {
      this.advance();
      const operand = this.parseUnary();
      return !operand;
    }
    return this.parsePrimary();
  }

  private parsePrimary(): unknown {
    const tok = this.peek();
    if (!tok) throw new Error('Unexpected end of expression');

    // Parenthesized expression
    if (tok.type === 'paren' && tok.value === '(') {
      this.advance();
      const val = this.parseExpr();
      this.expect('paren', ')');
      return val;
    }

    // Bracket array literal: [expr, expr, ...]
    if (tok.type === 'bracket' && tok.value === '[') {
      this.advance();
      const elements: unknown[] = [];
      while (this.peek() && !(this.peek()!.type === 'bracket' && this.peek()!.value === ']')) {
        elements.push(this.parseFieldPath());
        if (this.peek()?.type === 'comma') this.advance();
      }
      this.expect('bracket', ']');
      return elements;
    }

    // Number literal
    if (tok.type === 'number') {
      this.advance();
      const num = parseFloat(tok.value);
      return num;
    }

    // String literal
    if (tok.type === 'string') {
      this.advance();
      return tok.value;
    }

    // Null literal
    if (tok.type === 'ident' && tok.value === 'null') {
      this.advance();
      return null;
    }

    // Boolean literals
    if (tok.type === 'ident' && tok.value === 'true') {
      this.advance();
      return true;
    }
    if (tok.type === 'ident' && tok.value === 'false') {
      this.advance();
      return false;
    }

    // bigint_sum function
    if (tok.type === 'ident' && tok.value === 'bigint_sum') {
      return this.parseBigintSum();
    }

    // Identifier (field path) with possible dot-access, .length, .every()
    if (tok.type === 'ident') {
      return this.parseFieldPath();
    }

    throw new Error(`Unexpected token: ${tok.type} "${tok.value}"`);
  }

  private parseFieldPath(): unknown {
    let path = this.advance().value; // first ident

    // Collect dot-separated path parts
    while (this.peek()?.type === 'dot') {
      this.advance(); // consume '.'
      const next = this.peek();
      if (!next) throw new Error('Expected identifier after dot');

      // .length
      if (next.type === 'ident' && next.value === 'length') {
        this.advance();
        const val = resolve(this.data, path);
        if (Array.isArray(val)) return val.length;
        if (typeof val === 'string') return val.length;
        return 0;
      }

      // .every(...)
      if (next.type === 'ident' && next.value === 'every') {
        this.advance();
        this.expect('paren', '(');
        // Parse the lambda: r => expr
        // We expect: ident '=>' expr ')'
        const paramTok = this.advance();
        if (paramTok.type !== 'ident') throw new Error('Expected parameter name in .every()');
        const paramName = paramTok.value;
        this.expect('arrow'); // '=>'
        // Save position, we need to parse the inner expression for each element
        const innerStart = this.pos;
        const innerEnd = this.findMatchingParen();
        const innerTokens = this.tokens.slice(innerStart, innerEnd);
        this.pos = innerEnd;
        this.expect('paren', ')');

        const arr = resolve(this.data, path);
        if (!Array.isArray(arr)) return false;
        return arr.every((item) => {
          // Create a scoped data object: the lambda parameter resolves to the item
          const scopedData = { ...this.data, [paramName]: item };
          const innerParser = new Parser([...innerTokens], scopedData);
          return !!innerParser.parseExpr();
        });
      }

      if (next.type === 'ident') {
        this.advance();
        path += '.' + next.value;
      } else {
        break;
      }
    }

    // Resolve the field path from data
    return resolve(this.data, path);
  }

  /**
   * Find the position of the matching closing paren, accounting for nesting.
   */
  private findMatchingParen(): number {
    let depth = 1;
    let p = this.pos;
    while (p < this.tokens.length && depth > 0) {
      if (this.tokens[p].type === 'paren' && this.tokens[p].value === '(') depth++;
      if (this.tokens[p].type === 'paren' && this.tokens[p].value === ')') depth--;
      if (depth > 0) p++;
    }
    return p;
  }

  private parseBigintSum(): unknown {
    this.advance(); // consume 'bigint_sum'
    this.expect('paren', '(');

    // Two forms:
    // 1) bigint_sum([fieldA, fieldB]) — sum of direct field values
    // 2) bigint_sum(arrayField, 'fieldName') — sum a field from each array element

    const first = this.parsePrimary();

    if (this.peek()?.type === 'comma') {
      // Form 2: bigint_sum(arrayField, 'fieldName')
      this.advance(); // consume comma
      const fieldName = this.parsePrimary();
      this.expect('paren', ')');

      if (!Array.isArray(first) || typeof fieldName !== 'string') {
        return BigInt(0);
      }
      let sum = BigInt(0);
      for (const item of first) {
        if (item != null && typeof item === 'object') {
          const val = (item as Record<string, unknown>)[fieldName];
          if (val !== undefined && val !== null) {
            sum += BigInt(String(val));
          }
        }
      }
      return sum;
    }

    this.expect('paren', ')');

    // Form 1: bigint_sum([val1, val2, ...])
    if (Array.isArray(first)) {
      let sum = BigInt(0);
      for (const val of first) {
        if (val !== undefined && val !== null) {
          sum += BigInt(String(val));
        }
      }
      return sum;
    }

    return BigInt(0);
  }
}

/**
 * Evaluate a constraint expression against a data object.
 *
 * Returns `true` when the constraint is satisfied (no violation),
 * `false` when violated.
 *
 * @param data - The document to evaluate against
 * @param expression - Constraint expression string
 * @returns Whether the constraint passes
 */
export function evaluateConstraint(data: Record<string, unknown>, expression: string): boolean {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, data);
  const result = parser.parseExpr();
  return !!result;
}
