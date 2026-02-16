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
 * - `bigint_gte(a, b)` (BigInt greater-than-or-equal)
 * - `bigint_gt(a, b)` (BigInt greater-than)
 * - `array.length` (length access)
 * - `array.every(expr)` (universal quantification)
 *
 * @see FR-4 v4.6.0 — Cross-Language Constraints
 */

import { tokenize, type Token } from './tokenizer.js';

export const MAX_EXPRESSION_DEPTH = 32;

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
  private depth: number;

  constructor(tokens: Token[], data: Record<string, unknown>, depth = 0) {
    this.tokens = tokens;
    this.data = data;
    this.depth = depth;
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
    this.depth++;
    if (this.depth > MAX_EXPRESSION_DEPTH) {
      throw new Error('Expression nesting exceeds maximum depth');
    }
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
      try { return [left, BigInt(right)]; } catch { return [left, right]; }
    }
    if (typeof left === 'number' && typeof right === 'bigint') {
      try { return [BigInt(left), right]; } catch { return [left, right]; }
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

    // bigint_gte(a, b) — BigInt greater-than-or-equal
    if (tok.type === 'ident' && tok.value === 'bigint_gte') {
      return this.parseBigintCmp('>=');
    }

    // bigint_gt(a, b) — BigInt greater-than
    if (tok.type === 'ident' && tok.value === 'bigint_gt') {
      return this.parseBigintCmp('>');
    }

    // bigint_eq(a, b) — BigInt equality
    if (tok.type === 'ident' && tok.value === 'bigint_eq') {
      return this.parseBigintCmp('==');
    }

    // bigint_sub(a, b) — BigInt subtraction
    if (tok.type === 'ident' && tok.value === 'bigint_sub') {
      return this.parseBigintArith('-');
    }

    // bigint_add(a, b) — BigInt addition
    if (tok.type === 'ident' && tok.value === 'bigint_add') {
      return this.parseBigintArith('+');
    }

    // all_links_subset_authority(links) — delegation chain authority conservation
    if (tok.type === 'ident' && tok.value === 'all_links_subset_authority') {
      return this.parseLinksSubsetAuthority();
    }

    // delegation_budget_conserved(links) — delegation chain budget conservation
    if (tok.type === 'ident' && tok.value === 'delegation_budget_conserved') {
      return this.parseDelegationBudgetConserved();
    }

    // links_temporally_ordered(links) — delegation chain temporal ordering
    if (tok.type === 'ident' && tok.value === 'links_temporally_ordered') {
      return this.parseLinksTemporallyOrdered();
    }

    // links_form_chain(links) — delegation chain link continuity
    if (tok.type === 'ident' && tok.value === 'links_form_chain') {
      return this.parseLinksFormChain();
    }

    // no_emergent_in_individual(emergent, individual) — ensemble emergent capability check
    if (tok.type === 'ident' && tok.value === 'no_emergent_in_individual') {
      return this.parseNoEmergentInIndividual();
    }

    // all_emergent_have_evidence(emergent, evidence) — ensemble evidence check
    if (tok.type === 'ident' && tok.value === 'all_emergent_have_evidence') {
      return this.parseAllEmergentHaveEvidence();
    }

    // object_keys_subset(record, array) — check all keys of record are in array
    if (tok.type === 'ident' && tok.value === 'object_keys_subset') {
      return this.parseObjectKeysSubset();
    }

    // Temporal operators (v2.0): changed(), previous(), delta()
    if (tok.type === 'ident' && tok.value === 'changed') {
      return this.parseChanged();
    }
    if (tok.type === 'ident' && tok.value === 'previous') {
      return this.parsePrevious();
    }
    if (tok.type === 'ident' && tok.value === 'delta') {
      return this.parseDelta();
    }

    // Identifier (field path) with possible dot-access, .length, .every()
    if (tok.type === 'ident') {
      return this.parseFieldPath();
    }

    throw new Error(`Unexpected token: ${tok.type} "${tok.value}"`);
  }

  private parseFieldPath(): unknown {
    let path = this.advance().value; // first ident

    // Array indexing: field[N] — resolve field then index into it
    while (this.peek()?.type === 'bracket' && this.peek()?.value === '[') {
      const val = resolve(this.data, path);
      this.advance(); // consume '['
      const indexTok = this.advance();
      if (indexTok?.type !== 'number') throw new Error('Expected numeric index in array access');
      this.expect('bracket', ']');
      const index = parseInt(indexTok.value, 10);
      if (!Array.isArray(val)) return undefined;
      const element = val[index];
      // If followed by dot-access, resolve remaining path against element
      if (this.peek()?.type === 'dot') {
        this.advance(); // consume '.'
        const restTok = this.peek();
        if (restTok?.type === 'ident') {
          let restPath = this.advance().value;
          while (this.peek()?.type === 'dot') {
            this.advance();
            const nextPart = this.peek();
            if (nextPart?.type === 'ident') {
              restPath += '.' + this.advance().value;
            } else {
              break;
            }
          }
          if (element != null && typeof element === 'object') {
            return resolve(element as Record<string, unknown>, restPath);
          }
          return undefined;
        }
      }
      return element;
    }

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
          const innerParser = new Parser([...innerTokens], scopedData, this.depth);
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
          // Support dot-path field names (e.g., 'usage.cost_micro')
          const val = fieldName.includes('.')
            ? resolve(item as Record<string, unknown>, fieldName)
            : (item as Record<string, unknown>)[fieldName];
          if (val !== undefined && val !== null) {
            try { sum += BigInt(String(val)); } catch { return 0n; }
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
          try { sum += BigInt(String(val)); } catch { return 0n; }
        }
      }
      return sum;
    }

    return BigInt(0);
  }

  /**
   * Parse changed(fieldPath) — returns true if field value differs between
   * _previous context and current context.
   *
   * Note: uses strict identity comparison (`!==`). For nested object fields,
   * structurally equivalent objects with different references will be
   * considered changed. Temporal operators are designed for primitive field
   * transitions (strings, numbers, booleans) in saga workflows.
   */
  private parseChanged(): boolean {
    this.advance(); // consume 'changed'
    this.expect('paren', '(');
    const path = this.parseFieldPathString();
    this.expect('paren', ')');

    const prev = this.data._previous as Record<string, unknown> | undefined;
    if (prev == null) return false;
    const currentVal = resolve(this.data, path);
    const prevVal = resolve(prev, path);
    return currentVal !== prevVal;
  }

  /**
   * Parse previous(fieldPath) — returns the value of field from _previous context.
   */
  private parsePrevious(): unknown {
    this.advance(); // consume 'previous'
    this.expect('paren', '(');
    const path = this.parseFieldPathString();
    this.expect('paren', ')');

    const prev = this.data._previous as Record<string, unknown> | undefined;
    if (prev == null) return undefined;
    return resolve(prev, path);
  }

  /**
   * Parse delta(fieldPath) — returns numeric difference current - previous.
   *
   * Coercion hierarchy:
   * 1. BigInt: if both values convert to BigInt, returns BigInt difference
   * 2. Number: if BigInt fails but both values convert to Number (not NaN),
   *    returns Number difference (handles decimal values like "1.50")
   * 3. Fallback: returns BigInt(0) when values are unresolvable
   *
   * This hierarchy matters for billing protocols where field values may be
   * decimal strings (e.g., price "1.50" → "2.00") that cannot be represented
   * as BigInt but have meaningful numeric deltas.
   */
  private parseDelta(): unknown {
    this.advance(); // consume 'delta'
    this.expect('paren', '(');
    const path = this.parseFieldPathString();
    this.expect('paren', ')');

    const prev = this.data._previous as Record<string, unknown> | undefined;
    if (prev == null) return BigInt(0);

    const currentRaw = resolve(this.data, path) ?? 0;
    const prevRaw = resolve(prev, path) ?? 0;

    // Try BigInt first (preferred for integer financial fields)
    try {
      const currentVal = BigInt(String(currentRaw));
      const prevVal = BigInt(String(prevRaw));
      return currentVal - prevVal;
    } catch {
      // BigInt failed — try Number fallback for decimal values
      const currentNum = Number(String(currentRaw));
      const prevNum = Number(String(prevRaw));
      if (!Number.isNaN(currentNum) && !Number.isNaN(prevNum)) {
        return currentNum - prevNum;
      }
      return BigInt(0);
    }
  }

  /**
   * Parse a field path and return it as a string (not resolved against data).
   * Used by temporal operators to pass the path to resolve() on both current and _previous.
   */
  private parseFieldPathString(): string {
    const tok = this.advance();
    if (tok.type !== 'ident') throw new Error(`Expected identifier, got ${tok.type} "${tok.value}"`);
    let path = tok.value;
    while (this.peek()?.type === 'dot') {
      this.advance(); // consume '.'
      const next = this.peek();
      if (!next || next.type !== 'ident') throw new Error('Expected identifier after dot');
      this.advance();
      path += '.' + next.value;
    }
    return path;
  }

  /**
   * Parse bigint_gte(a, b), bigint_gt(a, b), or bigint_eq(a, b).
   * Converts both operands to BigInt and performs the comparison.
   */
  private parseBigintCmp(op: '>=' | '>' | '=='): boolean {
    this.advance(); // consume 'bigint_gte' or 'bigint_gt'
    this.expect('paren', '(');
    const left = this.parseExpr();
    this.expect('comma');
    const right = this.parseExpr();
    this.expect('paren', ')');

    try {
      const l = BigInt(String(left ?? 0));
      const r = BigInt(String(right ?? 0));
      return op === '>=' ? l >= r : op === '==' ? l === r : l > r;
    } catch {
      return false;
    }
  }

  /**
   * Parse bigint_sub(a, b) or bigint_add(a, b).
   * Converts both operands to BigInt and performs the arithmetic.
   * Returns the result as a string (for further bigint_eq comparison).
   */
  private parseBigintArith(op: '+' | '-'): unknown {
    this.advance(); // consume 'bigint_sub' or 'bigint_add'
    this.expect('paren', '(');
    const left = this.parseExpr();
    this.expect('comma');
    const right = this.parseExpr();
    this.expect('paren', ')');

    try {
      const l = BigInt(String(left ?? 0));
      const r = BigInt(String(right ?? 0));
      return String(op === '+' ? l + r : l - r);
    } catch {
      return '0';
    }
  }

  /**
   * Parse all_links_subset_authority(links).
   * For links[i] where i > 0: links[i].authority_scope is a subset of links[i-1].authority_scope.
   * FL-SDD-005: Empty arrays return true; null/missing fields return true (vacuously).
   */
  private parseLinksSubsetAuthority(): boolean {
    this.advance(); // consume 'all_links_subset_authority'
    this.expect('paren', '(');
    const val = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(val) || val.length <= 1) return true;
    const links = val as Array<Record<string, unknown>>;
    for (let i = 1; i < links.length; i++) {
      const parentScope = links[i - 1]?.authority_scope;
      const childScope = links[i]?.authority_scope;
      if (!Array.isArray(parentScope) || !Array.isArray(childScope)) return false;
      const parentSet = new Set(parentScope as string[]);
      for (const perm of childScope as string[]) {
        if (!parentSet.has(perm)) return false;
      }
    }
    return true;
  }

  /**
   * Parse delegation_budget_conserved(links).
   * For each link with sub-delegations: sum of child budget_allocated_micro <= parent budget_allocated_micro.
   * FL-SDD-005: Null/missing budget fields return true (vacuously — no budget to conserve).
   */
  private parseDelegationBudgetConserved(): boolean {
    this.advance(); // consume 'delegation_budget_conserved'
    this.expect('paren', '(');
    const val = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(val) || val.length <= 1) return true;
    const links = val as Array<Record<string, unknown>>;
    for (let i = 0; i < links.length - 1; i++) {
      const parentBudget = links[i]?.budget_allocated_micro;
      const childBudget = links[i + 1]?.budget_allocated_micro;
      // If either is missing, skip (no budget to conserve)
      if (parentBudget == null || childBudget == null) continue;
      try {
        if (BigInt(String(childBudget)) > BigInt(String(parentBudget))) return false;
      } catch {
        return false;
      }
    }
    return true;
  }

  /**
   * Parse links_temporally_ordered(links).
   * links[i].timestamp <= links[i+1].timestamp for all adjacent pairs.
   * FL-SDD-005: Empty arrays return true; null timestamps return false (timestamps are required).
   */
  private parseLinksTemporallyOrdered(): boolean {
    this.advance(); // consume 'links_temporally_ordered'
    this.expect('paren', '(');
    const val = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(val) || val.length <= 1) return true;
    const links = val as Array<Record<string, unknown>>;
    for (let i = 0; i < links.length - 1; i++) {
      const ts1 = links[i]?.timestamp;
      const ts2 = links[i + 1]?.timestamp;
      if (typeof ts1 !== 'string' || typeof ts2 !== 'string') return false;
      if (ts1 > ts2) return false;
    }
    return true;
  }

  /**
   * Parse links_form_chain(links).
   * links[i].delegatee == links[i+1].delegator for all adjacent pairs.
   * FL-SDD-005: Empty arrays return true.
   */
  private parseLinksFormChain(): boolean {
    this.advance(); // consume 'links_form_chain'
    this.expect('paren', '(');
    const val = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(val) || val.length <= 1) return true;
    const links = val as Array<Record<string, unknown>>;
    for (let i = 0; i < links.length - 1; i++) {
      if (links[i]?.delegatee !== links[i + 1]?.delegator) return false;
    }
    return true;
  }

  /**
   * Parse no_emergent_in_individual(emergent, individual).
   * For each capability in emergent: not present in any array value of individual.
   */
  private parseNoEmergentInIndividual(): boolean {
    this.advance(); // consume 'no_emergent_in_individual'
    this.expect('paren', '(');
    const emergent = this.parseExpr();
    this.expect('comma');
    const individual = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(emergent)) return true;
    if (individual == null || typeof individual !== 'object') return true;

    const record = individual as Record<string, unknown>;
    const allIndividual = new Set<string>();
    for (const caps of Object.values(record)) {
      if (Array.isArray(caps)) {
        for (const c of caps) {
          if (typeof c === 'string') allIndividual.add(c);
        }
      }
    }

    for (const cap of emergent) {
      if (typeof cap === 'string' && allIndividual.has(cap)) return false;
    }
    return true;
  }

  /**
   * Parse all_emergent_have_evidence(emergent, evidence).
   * For each capability in emergent: at least one entry in evidence where
   * evidence[i].capability == capability.
   */
  private parseAllEmergentHaveEvidence(): boolean {
    this.advance(); // consume 'all_emergent_have_evidence'
    this.expect('paren', '(');
    const emergent = this.parseExpr();
    this.expect('comma');
    const evidence = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(emergent) || emergent.length === 0) return true;
    if (!Array.isArray(evidence)) return false;

    const evidencedCaps = new Set<string>();
    for (const e of evidence) {
      if (e != null && typeof e === 'object') {
        const cap = (e as Record<string, unknown>).capability;
        if (typeof cap === 'string') evidencedCaps.add(cap);
      }
    }

    for (const cap of emergent) {
      if (typeof cap === 'string' && !evidencedCaps.has(cap)) return false;
    }
    return true;
  }

  /**
   * Parse object_keys_subset(record, array).
   * All keys of record are present in array.
   */
  private parseObjectKeysSubset(): boolean {
    this.advance(); // consume 'object_keys_subset'
    this.expect('paren', '(');
    const record = this.parseExpr();
    this.expect('comma');
    const array = this.parseExpr();
    this.expect('paren', ')');

    if (record == null || typeof record !== 'object' || Array.isArray(record)) return true;
    if (!Array.isArray(array)) return false;

    const allowed = new Set(array.map(String));
    for (const key of Object.keys(record as Record<string, unknown>)) {
      if (!allowed.has(key)) return false;
    }
    return true;
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
