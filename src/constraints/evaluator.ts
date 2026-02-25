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
 * Optional context for constraint evaluation.
 *
 * Enables deterministic replay by providing a frozen evaluation timestamp
 * that `now()` will use instead of the real clock. Without this, constraints
 * containing `now()` cannot be replayed faithfully — evaluating the same
 * expression tomorrow produces a different result.
 *
 * @see DR-F3 — now() replay non-determinism
 * @since v7.8.0
 */
export interface EvaluationContext {
  /** ISO 8601 timestamp to use for now(). Enables deterministic replay. */
  evaluation_timestamp?: string;
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

// ---------------------------------------------------------------------------
// Type-safe narrowing utilities (F-020 resolution)
// ---------------------------------------------------------------------------

/**
 * Narrow an unknown evaluator expression result to a record type.
 * Returns an empty record if the value is null, undefined, or not an object.
 * This replaces `as any` casts throughout the evaluator, closing the type
 * escape hatch identified in bridge review finding F-020.
 *
 * @see F-020 — parseExpr() return type safety
 */
function asRecord(v: unknown): Record<string, unknown> {
  if (v != null && typeof v === 'object' && !Array.isArray(v)) {
    return v as Record<string, unknown>;
  }
  return {};
}

/**
 * Recursive descent parser and evaluator.
 */
/**
 * Handler signature for registered evaluator functions.
 * Each handler is a thunk that parses its own arguments from the token stream.
 */
type FunctionHandler = () => unknown;

class Parser {
  private tokens: Token[];
  private pos = 0;
  private data: Record<string, unknown>;
  private depth: number;
  private context?: EvaluationContext;
  private readonly functions: ReadonlyMap<string, FunctionHandler>;

  constructor(tokens: Token[], data: Record<string, unknown>, depth = 0, context?: EvaluationContext) {
    this.tokens = tokens;
    this.data = data;
    this.depth = depth;
    this.context = context;

    // Function registry — maps function names to parse handlers.
    // Each handler consumes the function name token and its arguments
    // from the token stream. Add new builtins here instead of extending
    // the if-chain in parsePrimary.
    this.functions = new Map<string, FunctionHandler>([
      // BigInt aggregation
      ['bigint_sum', () => this.parseBigintSum()],

      // BigInt comparisons
      ['bigint_gte', () => this.parseBigintCmp('>=')],
      ['bigint_gt', () => this.parseBigintCmp('>')],
      ['bigint_eq', () => this.parseBigintCmp('==')],

      // BigInt arithmetic
      ['bigint_sub', () => this.parseBigintArith('-')],
      ['bigint_add', () => this.parseBigintArith('+')],

      // Delegation chain functions
      ['all_links_subset_authority', () => this.parseLinksSubsetAuthority()],
      ['delegation_budget_conserved', () => this.parseDelegationBudgetConserved()],
      ['links_temporally_ordered', () => this.parseLinksTemporallyOrdered()],
      ['links_form_chain', () => this.parseLinksFormChain()],

      // Ensemble capability functions
      ['no_emergent_in_individual', () => this.parseNoEmergentInIndividual()],
      ['all_emergent_have_evidence', () => this.parseAllEmergentHaveEvidence()],

      // General comparison
      ['eq', () => this.parseEq()],

      // Object inspection
      ['object_keys_subset', () => this.parseObjectKeysSubset()],

      // Temporal operators (v2.0)
      ['changed', () => this.parseChanged()],
      ['previous', () => this.parsePrevious()],
      ['delta', () => this.parseDelta()],

      // Length (v5.5.0, FR-1)
      ['len', () => this.parseLen()],

      // Type introspection (v6.0.0, FR-3)
      ['type_of', () => this.parseTypeOf()],
      ['is_bigint_coercible', () => this.parseIsBigintCoercible()],

      // Array uniqueness (v6.0.0, FR-5)
      ['unique_values', () => this.parseUniqueValues()],

      // Delegation tree builtins (v6.0.0, FR-6)
      ['tree_budget_conserved', () => this.parseTreeBudgetConserved()],
      ['tree_authority_narrowing', () => this.parseTreeAuthorityNarrowing()],

      // Coordination builtins (v7.0.0, FR-2/FR-3)
      ['saga_amount_conserved', () => this.parseSagaAmountConserved()],
      ['saga_steps_sequential', () => this.parseSagaStepsSequential()],
      ['outcome_consensus_valid', () => this.parseOutcomeConsensusValid()],

      // Governance builtins (v7.0.0, FR-4/FR-5)
      ['monetary_policy_solvent', () => this.parseMonetaryPolicySolvent()],
      ['permission_boundary_active', () => this.parsePermissionBoundaryActive()],
      ['proposal_quorum_met', () => this.parseProposalQuorumMet()],

      // Bridge iteration 2 builtins (v7.0.0)
      ['saga_timeout_valid', () => this.parseSagaTimeoutValid()],
      ['proposal_weights_normalized', () => this.parseProposalWeightsNormalized()],

      // Timestamp comparison builtins (v7.4.0 — Bridgebuilder Vision)
      ['is_after', () => this.parseTimestampCmp('after')],
      ['is_before', () => this.parseTimestampCmp('before')],
      ['is_between', () => this.parseTimestampBetween()],

      // Temporal governance builtins (v7.5.0 — Deep Bridgebuilder Review GAP)
      ['is_stale', () => this.parseTimestampStaleness('stale')],
      ['is_within', () => this.parseTimestampStaleness('within')],

      // Constraint lifecycle governance (v7.6.0 — DR-S4)
      ['constraint_lifecycle_valid', () => this.parseConstraintLifecycleValid()],
      // Proposal execution (v7.7.0 — DR-S9)
      ['proposal_execution_valid', () => this.parseProposalExecutionValid()],
      // Temporal utility (v7.7.0 — DR-S10)
      ['now', () => this.parseNow()],
      // Model routing eligibility (v7.7.0 — DR-S10)
      ['model_routing_eligible', () => this.parseModelRoutingEligible()],
      // Basket weight normalization (v7.8.0 — DR-F2)
      ['basket_weights_normalized', () => this.parseBasketWeightsNormalized()],
      // Execution checkpoint validation (v7.8.0 — DR-F5)
      ['execution_checkpoint_valid', () => this.parseExecutionCheckpointValid()],

      // Audit trail chain validation (v8.0.0 — Commons Protocol)
      ['audit_trail_chain_valid', () => this.parseAuditTrailChainValid()],
    ]);
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
    // Supports field paths, string literals, and number literals as elements.
    if (tok.type === 'bracket' && tok.value === '[') {
      this.advance();
      const elements: unknown[] = [];
      while (this.peek() && !(this.peek()!.type === 'bracket' && this.peek()!.value === ']')) {
        const elemTok = this.peek()!;
        if (elemTok.type === 'string') {
          // String literal element — return value directly, don't resolve as field path
          this.advance();
          elements.push(elemTok.value);
        } else if (elemTok.type === 'number') {
          // Number literal element
          this.advance();
          elements.push(parseFloat(elemTok.value));
        } else {
          // Field path — resolve against data context
          elements.push(this.parseFieldPath());
        }
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

    // Registered function call — lookup in the function registry
    if (tok.type === 'ident') {
      const handler = this.functions.get(tok.value);
      if (handler) {
        return handler();
      }
      // Not a registered function — treat as field path with possible dot-access, .length, .every()
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
          const innerParser = new Parser([...innerTokens], scopedData, this.depth, this.context);
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
   * Parse eq(a, b) — strict equality comparison.
   * Used by AuditTrailEntry constraints for distinct-ID checks.
   */
  private parseEq(): boolean {
    this.advance(); // consume 'eq'
    this.expect('paren', '(');
    const left = this.parseExpr();
    this.expect('comma');
    const right = this.parseExpr();
    this.expect('paren', ')');
    return left === right;
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

  /**
   * len(value) — returns length of array, object keys, or string.
   * @see SDD §2.1.5 — New evaluator builtin for conservation constraints
   */
  private parseLen(): unknown {
    this.advance(); // consume 'len'
    this.expect('paren', '(');
    const value = this.parseExpr();
    this.expect('paren', ')');

    if (Array.isArray(value)) return value.length;
    if (typeof value === 'string') return value.length;
    if (value != null && typeof value === 'object') return Object.keys(value).length;
    return 0;
  }

  /**
   * type_of(value) — returns runtime type as string.
   * @see SDD §2.3.4 — Type introspection builtins (FR-3)
   */
  private parseTypeOf(): string {
    this.advance(); // consume 'type_of'
    this.expect('paren', '(');
    const value = this.parseExpr();
    this.expect('paren', ')');

    if (value === null) return 'null';
    if (Array.isArray(value)) return 'array';
    if (typeof value === 'bigint') return 'bigint';
    return typeof value; // 'boolean', 'string', 'number', 'object', 'undefined'
  }

  /**
   * is_bigint_coercible(value) — returns true if value can be converted to BigInt.
   * @see SDD §2.3.4 — Type introspection builtins (FR-3)
   */
  private parseIsBigintCoercible(): boolean {
    this.advance(); // consume 'is_bigint_coercible'
    this.expect('paren', '(');
    const value = this.parseExpr();
    this.expect('paren', ')');

    if (typeof value === 'bigint') return true;
    if (typeof value === 'number') {
      return Number.isInteger(value);
    }
    if (typeof value === 'string') {
      try { BigInt(value); return true; } catch { return false; }
    }
    return false;
  }

  /**
   * unique_values(array, field) — returns true if all values of field
   * within the array are unique.
   * @see SDD §2.5.4 — Registry composition constraints (FR-5)
   */
  private parseUniqueValues(): boolean {
    this.advance(); // consume 'unique_values'
    this.expect('paren', '(');
    const arr = this.parseExpr();
    this.expect('comma');
    const field = this.parseExpr();
    this.expect('paren', ')');

    if (!Array.isArray(arr) || typeof field !== 'string') return true;
    const seen = new Set<unknown>();
    for (const item of arr) {
      if (item != null && typeof item === 'object') {
        const val = field.includes('.')
          ? resolve(item as Record<string, unknown>, field)
          : (item as Record<string, unknown>)[field];
        if (val !== undefined) {
          if (seen.has(val)) return false;
          seen.add(val);
        }
      }
    }
    return true;
  }

  /**
   * tree_budget_conserved(root) — iteratively validates that
   * sum(children.budget) <= parent.budget at every node.
   * Uses explicit stack (not recursion) per SDD FL-SDD-002.
   * Enforces max_depth and max_total_nodes limits. Cycle detection via visited set.
   */
  private parseTreeBudgetConserved(): boolean {
    this.advance(); // consume 'tree_budget_conserved'
    this.expect('paren', '(');
    const root = asRecord(this.parseExpr());
    this.expect('paren', ')');

    // asRecord returns {} for null/non-object; empty root means no children → vacuously true
    if (Object.keys(root).length === 0) return true;

    const maxDepth = 10;
    const maxNodes = 100;
    const visited = new Set<string>();
    const stack: Array<{ node: Record<string, unknown>; depth: number }> = [{ node: root, depth: 0 }];
    let nodeCount = 0;

    while (stack.length > 0) {
      const { node, depth } = stack.pop()!;
      if (node == null || typeof node !== 'object') continue;

      nodeCount++;
      if (depth > maxDepth) return false;
      if (nodeCount > maxNodes) return false;

      const nodeId = String(node.node_id ?? nodeCount);
      if (visited.has(nodeId)) continue; // cycle protection
      visited.add(nodeId);

      const children = Array.isArray(node.children) ? node.children : [];
      if (children.length === 0) continue;

      const parentBudget = BigInt(String(node.budget_allocated_micro ?? '0'));
      let childSum = 0n;
      for (const child of children) {
        childSum += BigInt(String((child as Record<string, unknown>)?.budget_allocated_micro ?? '0'));
      }

      if (childSum > parentBudget) return false;

      for (const child of children) {
        stack.push({ node: child, depth: depth + 1 });
      }
    }

    return true;
  }

  /**
   * tree_authority_narrowing(root) — iteratively validates that
   * child.authority_scope is a subset of parent.authority_scope.
   * A child may have equal scope (full delegation) or narrower scope.
   * Authority scopes are normalized lowercase strings with set semantics.
   */
  private parseTreeAuthorityNarrowing(): boolean {
    this.advance(); // consume 'tree_authority_narrowing'
    this.expect('paren', '(');
    const root = asRecord(this.parseExpr());
    this.expect('paren', ')');

    // asRecord returns {} for null/non-object; empty root means no children → vacuously true
    if (Object.keys(root).length === 0) return true;

    const maxDepth = 10;
    const maxNodes = 100;
    const visited = new Set<string>();
    const stack: Array<{ node: Record<string, unknown>; parentScope: Set<string>; depth: number }> = [{
      node: root,
      parentScope: new Set((Array.isArray(root.authority_scope) ? root.authority_scope as unknown[] : []).map((s) => String(s).toLowerCase())),
      depth: 0,
    }];
    let nodeCount = 0;

    while (stack.length > 0) {
      const { node, parentScope, depth } = stack.pop()!;
      if (node == null || typeof node !== 'object') continue;

      nodeCount++;
      if (depth > maxDepth) return false;
      if (nodeCount > maxNodes) return false;

      const nodeId = String(node.node_id ?? nodeCount);
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);

      const children = Array.isArray(node.children) ? node.children : [];
      for (const child of children) {
        const childScopeArr: string[] = (Array.isArray(child?.authority_scope) ? child.authority_scope : [])
          .map((s: unknown) => String(s).toLowerCase());
        const childScopes = new Set<string>(childScopeArr);

        // Empty scope at leaf is valid (fully delegated)
        if (childScopes.size === 0) {
          stack.push({ node: child, parentScope: childScopes, depth: depth + 1 });
          continue;
        }

        // Check subset: every child scope must be in parent scope (equal scope is valid)
        for (const scope of childScopes) {
          if (!parentScope.has(scope)) return false;
        }

        stack.push({ node: child, parentScope: childScopes, depth: depth + 1 });
      }
    }

    return true;
  }

  /**
   * saga_amount_conserved(saga) — verifies total debited equals total credited
   * across all completed steps, adjusting by exchange rate where present.
   * Resource limit: max 100 steps.
   * @see SDD §2.2.8 — Saga evaluator builtins (FR-2)
   */
  private parseSagaAmountConserved(): boolean {
    this.advance(); // consume 'saga_amount_conserved'
    this.expect('paren', '(');
    const saga = asRecord(this.parseExpr());
    this.expect('paren', ')');

    if (!Array.isArray(saga.steps)) return false;
    const steps = saga.steps;
    if (steps.length > 100) return false;

    let totalAmount = 0n;
    let completedCount = 0;

    for (const step of steps) {
      if (step?.status !== 'completed') continue;
      completedCount++;
      const amount = step?.amount_micro;
      if (amount == null) continue;
      try {
        totalAmount += BigInt(String(amount));
      } catch {
        return false;
      }
    }

    // If no completed steps, conservation is vacuously true
    if (completedCount === 0) return true;

    // For compensation: check compensation steps sum against main steps
    const compSteps = Array.isArray(saga.compensation_steps) ? saga.compensation_steps : [];
    if (compSteps.length > 100) return false;

    let compAmount = 0n;
    for (const step of compSteps) {
      if (step?.status !== 'completed') continue;
      const amount = step?.amount_micro;
      if (amount == null) continue;
      try {
        compAmount += BigInt(String(amount));
      } catch {
        return false;
      }
    }

    // If no compensation steps, just verify main steps have consistent amounts
    // (all steps should sum to a consistent total — basic conservation)
    if (compSteps.length === 0) return totalAmount >= 0n;

    // If compensation is active, compensated amount should equal debited amount
    return compAmount <= totalAmount;
  }

  /**
   * saga_steps_sequential(saga) — verifies step_id values are unique.
   * Resource limit: max 100 steps.
   * @see SDD §2.2.8 — Saga evaluator builtins (FR-2)
   */
  private parseSagaStepsSequential(): boolean {
    this.advance(); // consume 'saga_steps_sequential'
    this.expect('paren', '(');
    const saga = asRecord(this.parseExpr());
    this.expect('paren', ')');

    if (!Array.isArray(saga.steps)) return false;
    const steps = saga.steps;
    if (steps.length > 100) return false;

    const ids = new Set<string>();
    for (const step of steps) {
      const id = step?.step_id;
      if (typeof id !== 'string' || id === '') return false;
      if (ids.has(id)) return false;
      ids.add(id);
    }
    return true;
  }

  /**
   * outcome_consensus_valid(outcome) — verifies vote counts match
   * the claimed outcome_type:
   * - unanimous: all votes are 'agree'
   * - majority: agree count >= ceil(total * consensus_threshold)
   * - deadlock: agree count < ceil(total * threshold)
   * - escalation: has escalated_to field
   * Resource limit: max 100 votes.
   * @see SDD §2.3.7 — Outcome evaluator builtin (FR-3)
   */
  private parseOutcomeConsensusValid(): boolean {
    this.advance(); // consume 'outcome_consensus_valid'
    this.expect('paren', '(');
    const outcome = asRecord(this.parseExpr());
    this.expect('paren', ')');

    if (!Array.isArray(outcome.votes)) return false;
    const votes = outcome.votes;
    if (votes.length > 100) return false;
    if (votes.length === 0) return false;

    const outcomeType = outcome.outcome_type;
    const threshold = typeof outcome.consensus_threshold === 'number' ? outcome.consensus_threshold : 0;

    const agreeCount = votes.filter((v: unknown) => (v as Record<string, unknown>)?.vote === 'agree').length;
    const requiredAgree = Math.ceil(votes.length * threshold);

    switch (outcomeType) {
      case 'unanimous':
        return agreeCount === votes.length;
      case 'majority':
        return agreeCount >= requiredAgree && agreeCount < votes.length;
      case 'deadlock':
        return agreeCount < requiredAgree;
      case 'escalation':
        return typeof outcome.escalated_to === 'string' && outcome.escalated_to.length > 0;
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // monetary_policy_solvent(policy, current_supply) — v7.0.0
  // ---------------------------------------------------------------------------

  /**
   * monetary_policy_solvent(policy, current_supply) — verifies current_supply
   * does not exceed conservation_ceiling. Both operands treated as BigInt.
   */
  private parseMonetaryPolicySolvent(): boolean {
    this.advance(); // consume 'monetary_policy_solvent'
    this.expect('paren', '(');
    const policy = asRecord(this.parseExpr());
    this.expect('comma');
    const currentSupply = this.parseExpr();
    this.expect('paren', ')');

    const ceiling = policy.conservation_ceiling;
    if (typeof ceiling !== 'string' || typeof currentSupply !== 'string') return false;

    try {
      return BigInt(currentSupply) <= BigInt(ceiling);
    } catch {
      return false;
    }
  }

  // ---------------------------------------------------------------------------
  // permission_boundary_active(boundary) — v7.0.0
  // ---------------------------------------------------------------------------

  /**
   * permission_boundary_active(boundary) — validates that a boundary has all
   * required structural components: non-empty scope, permitted_if expression,
   * reporting configuration, and revocation policy.
   */
  private parsePermissionBoundaryActive(): boolean {
    this.advance(); // consume 'permission_boundary_active'
    this.expect('paren', '(');
    const boundary = asRecord(this.parseExpr());
    this.expect('paren', ')');

    // asRecord returns {} for null/non-object, so check structural properties
    const rec = boundary;

    // Must have non-empty scope
    if (typeof rec.scope !== 'string' || rec.scope.length === 0) return false;
    // Must have non-empty permitted_if
    if (typeof rec.permitted_if !== 'string' || rec.permitted_if.length === 0) return false;
    // Must have reporting object
    if (rec.reporting == null || typeof rec.reporting !== 'object') return false;
    // Must have revocation object
    if (rec.revocation == null || typeof rec.revocation !== 'object') return false;

    return true;
  }

  // ---------------------------------------------------------------------------
  // proposal_quorum_met(proposal) — v7.0.0
  // ---------------------------------------------------------------------------

  /**
   * proposal_quorum_met(proposal) — checks whether the weighted votes cast
   * meet or exceed the quorum_required threshold.
   */
  private parseProposalQuorumMet(): boolean {
    this.advance(); // consume 'proposal_quorum_met'
    this.expect('paren', '(');
    const proposal = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const rec = proposal;
    const voting = rec.voting;
    if (voting == null || typeof voting !== 'object') return false;
    const vr = voting as Record<string, unknown>;
    const quorum = vr.quorum_required;
    if (typeof quorum !== 'number') return false;

    const votes = vr.votes_cast;
    if (!Array.isArray(votes)) return false;

    // Resource limit: max 100 votes
    if (votes.length > 100) return false;

    // Sum weights
    let totalWeight = 0;
    for (const vote of votes) {
      if (vote == null || typeof vote !== 'object') continue;
      const v = vote as Record<string, unknown>;
      if (typeof v.weight === 'number') {
        totalWeight += v.weight;
      }
    }

    return totalWeight >= quorum;
  }

  // ---------------------------------------------------------------------------
  // saga_timeout_valid(saga) — v7.0.0 bridge iteration 2
  // ---------------------------------------------------------------------------

  /**
   * saga_timeout_valid(saga) — checks that completed steps have timestamps
   * and that step durations do not exceed per_step_seconds timeout.
   * Returns true if all completed steps satisfy the timeout constraint.
   */
  private parseSagaTimeoutValid(): boolean {
    this.advance(); // consume 'saga_timeout_valid'
    this.expect('paren', '(');
    const saga = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const steps = saga.steps;
    if (!Array.isArray(steps)) return false;
    const timeout = saga.timeout;
    if (timeout == null || typeof timeout !== 'object') return false;
    const to = timeout as Record<string, unknown>;
    const perStepSeconds = to.per_step_seconds;
    if (typeof perStepSeconds !== 'number' || perStepSeconds <= 0) return false;

    // Resource limit: max 100 steps
    if (steps.length > 100) return false;

    for (const step of steps) {
      if (step == null || typeof step !== 'object') continue;
      const s = step as Record<string, unknown>;
      if (s.status !== 'completed') continue;

      // Completed steps must have both timestamps
      if (typeof s.started_at !== 'string' || typeof s.completed_at !== 'string') return false;

      // Verify duration <= per_step_seconds
      try {
        const started = new Date(s.started_at as string).getTime();
        const completed = new Date(s.completed_at as string).getTime();
        if (isNaN(started) || isNaN(completed)) return false;
        const durationSeconds = (completed - started) / 1000;
        if (durationSeconds > perStepSeconds) return false;
      } catch {
        return false;
      }
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // proposal_weights_normalized(proposal) — v7.0.0 bridge iteration 2
  // ---------------------------------------------------------------------------

  /**
   * proposal_weights_normalized(proposal) — checks that the sum of all
   * vote weights in a governance proposal equals 1.0 (within floating-point
   * tolerance of 0.001).
   */
  private parseProposalWeightsNormalized(): boolean {
    this.advance(); // consume 'proposal_weights_normalized'
    this.expect('paren', '(');
    const proposal = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const rec = proposal;
    const voting = rec.voting;
    if (voting == null || typeof voting !== 'object') return false;
    const vr = voting as Record<string, unknown>;

    const votes = vr.votes_cast;
    if (!Array.isArray(votes)) return false;

    // Resource limit: max 100 votes
    if (votes.length > 100) return false;

    // Empty votes are trivially normalized (0.0, no voters yet)
    if (votes.length === 0) return true;

    // Sum weights
    let totalWeight = 0;
    for (const vote of votes) {
      if (vote == null || typeof vote !== 'object') continue;
      const v = vote as Record<string, unknown>;
      if (typeof v.weight === 'number') {
        totalWeight += v.weight;
      }
    }

    // Check within tolerance of 1.0
    return Math.abs(totalWeight - 1.0) <= 0.001;
  }

  // ---------------------------------------------------------------------------
  // Constraint lifecycle governance (v7.6.0 — DR-S4)
  // ---------------------------------------------------------------------------

  /**
   * Validate constraint_lifecycle_valid(event).
   *
   * Checks that from_status → to_status follows CONSTRAINT_LIFECYCLE_TRANSITIONS.
   *
   * Valid transitions:
   *   proposed → under_review, rejected
   *   under_review → enacted, rejected
   *   enacted → deprecated
   *   rejected → (none)
   *   deprecated → (none)
   */
  private parseConstraintLifecycleValid(): boolean {
    this.advance(); // consume 'constraint_lifecycle_valid'
    this.expect('paren', '(');
    const event = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const fromStatus = event.from_status;
    const toStatus = event.to_status;
    if (typeof fromStatus !== 'string' || typeof toStatus !== 'string') return false;

    // Same-status transition is never valid
    if (fromStatus === toStatus) return false;

    const transitions: Record<string, readonly string[]> = {
      proposed: ['under_review', 'rejected'],
      under_review: ['enacted', 'rejected'],
      enacted: ['deprecated'],
      rejected: [],
      deprecated: [],
    };

    const allowed = transitions[fromStatus];
    if (!allowed) return false;

    return allowed.includes(toStatus);
  }

  /**
   * Validate proposal_execution_valid(execution).
   *
   * Checks that a ProposalExecution is internally consistent:
   * - All changes_applied have result 'success'
   * - Status is 'completed'
   *
   * @since v7.7.0 — DR-S9
   */
  private parseProposalExecutionValid(): boolean {
    this.advance(); // consume 'proposal_execution_valid'
    this.expect('paren', '(');
    const execution = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const status = execution.status;
    if (typeof status !== 'string' || status !== 'completed') return false;

    const changesApplied = execution.changes_applied;
    if (!Array.isArray(changesApplied) || changesApplied.length === 0) return false;

    for (const change of changesApplied) {
      const rec = asRecord(change);
      if (rec.result !== 'success') return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Temporal utility builtins (v7.7.0 — DR-S10)
  // ---------------------------------------------------------------------------

  /**
   * now() → current ISO 8601 timestamp string.
   * If an EvaluationContext with evaluation_timestamp is provided,
   * returns the frozen timestamp for deterministic replay (DR-F3).
   * Otherwise falls back to the real clock.
   */
  private parseNow(): string {
    this.advance(); // consume 'now'
    this.expect('paren', '(');
    this.expect('paren', ')');
    if (this.context?.evaluation_timestamp && Parser.ISO_8601_RE.test(this.context.evaluation_timestamp)) {
      return this.context.evaluation_timestamp;
    }
    return new Date().toISOString();
  }

  /**
   * model_routing_eligible(qualifying_state, qualifying_score, current_state, current_score)
   * Evaluates whether current reputation meets routing signal requirements
   * using REPUTATION_STATE_ORDER comparison.
   */
  private parseModelRoutingEligible(): boolean {
    this.advance(); // consume 'model_routing_eligible'
    this.expect('paren', '(');
    const qualifyingState = this.parseExpr();
    this.expect('comma', ',');
    const qualifyingScore = this.parseExpr();
    this.expect('comma', ',');
    const currentState = this.parseExpr();
    this.expect('comma', ',');
    const currentScore = this.parseExpr();
    this.expect('paren', ')');

    if (typeof qualifyingState !== 'string' || typeof currentState !== 'string') return false;
    if (typeof qualifyingScore !== 'number' || typeof currentScore !== 'number') return false;

    // State ordering: cold=0, warming=1, established=2, authoritative=3
    const stateOrder: Record<string, number> = {
      cold: 0, warming: 1, established: 2, authoritative: 3,
    };

    const currentOrder = stateOrder[currentState] ?? -1;
    const requiredOrder = stateOrder[qualifyingState] ?? -1;

    if (currentOrder < requiredOrder) return false;
    return currentScore >= qualifyingScore;
  }

  // ---------------------------------------------------------------------------
  // Basket weight normalization (v7.8.0 — DR-F2)
  // ---------------------------------------------------------------------------

  /**
   * basket_weights_normalized(composition) — checks that a BasketComposition's
   * entries weights sum to approximately 1.0 (within 0.001 tolerance).
   */
  private parseBasketWeightsNormalized(): boolean {
    this.advance(); // consume 'basket_weights_normalized'
    this.expect('paren', '(');
    const composition = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const entries = composition.entries;
    if (!Array.isArray(entries)) return false;

    // Resource limit: max 100 entries
    if (entries.length > 100) return false;

    // Empty basket is not normalized (must have at least one entry)
    if (entries.length === 0) return false;

    let totalWeight = 0;
    for (const entry of entries) {
      if (entry == null || typeof entry !== 'object') continue;
      const e = entry as Record<string, unknown>;
      if (typeof e.weight === 'number') {
        totalWeight += e.weight;
      }
    }

    return Math.abs(totalWeight - 1.0) <= 0.001;
  }

  /**
   * execution_checkpoint_valid(checkpoint) — validates that health_status and
   * proceed_decision are consistent:
   *   healthy → must be continue
   *   degraded → may be continue or pause
   *   failing → must be rollback
   */
  private parseExecutionCheckpointValid(): boolean {
    this.advance(); // consume 'execution_checkpoint_valid'
    this.expect('paren', '(');
    const checkpoint = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const health = checkpoint.health_status;
    const decision = checkpoint.proceed_decision;

    if (typeof health !== 'string' || typeof decision !== 'string') return false;

    switch (health) {
      case 'healthy':
        return decision === 'continue';
      case 'degraded':
        return decision === 'continue' || decision === 'pause';
      case 'failing':
        return decision === 'rollback';
      default:
        return false;
    }
  }

  // ---------------------------------------------------------------------------
  // Audit trail chain validation (v8.0.0 — Commons Protocol)
  // ---------------------------------------------------------------------------

  /**
   * Parse audit_trail_chain_valid(trail).
   * Structural validation: verifies previous_hash linkage across entries.
   *
   * - entries[0].previous_hash must equal trail.genesis_hash
   * - entries[i].previous_hash must equal entries[i-1].entry_hash for all i > 0
   *
   * Does NOT recompute content hashes (that's verifyAuditTrailIntegrity).
   *
   * @since v8.0.0
   */
  private parseAuditTrailChainValid(): boolean {
    this.advance(); // consume 'audit_trail_chain_valid'
    this.expect('paren', '(');
    const trail = asRecord(this.parseExpr());
    this.expect('paren', ')');

    const entries = trail.entries;
    const genesisHash = trail.genesis_hash;

    if (!Array.isArray(entries) || typeof genesisHash !== 'string') return false;
    if (entries.length === 0) return true;

    // First entry must link to genesis
    const first = asRecord(entries[0]);
    if (first.previous_hash !== genesisHash) return false;

    // Each subsequent entry must link to the previous entry's hash
    for (let i = 1; i < entries.length; i++) {
      const curr = asRecord(entries[i]);
      const prev = asRecord(entries[i - 1]);
      if (typeof curr.previous_hash !== 'string' || typeof prev.entry_hash !== 'string') {
        return false;
      }
      if (curr.previous_hash !== prev.entry_hash) return false;
    }

    return true;
  }

  // ---------------------------------------------------------------------------
  // Timestamp comparison builtins (v7.4.0 — Bridgebuilder Vision)
  // ---------------------------------------------------------------------------

  /** ISO 8601 date-time prefix pattern for cross-language consistency. */
  private static readonly ISO_8601_RE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/;

  /** Parse an ISO 8601 string to epoch ms. Returns NaN for non-conforming input. */
  private parseIso8601Ms(value: unknown): number {
    const s = String(value);
    if (!Parser.ISO_8601_RE.test(s)) return NaN;
    return new Date(s).getTime();
  }

  /**
   * Parse is_after(a, b) or is_before(a, b).
   * Compares two ISO 8601 date strings.
   *
   * @since v7.4.0
   */
  private parseTimestampCmp(op: 'after' | 'before'): boolean {
    this.advance(); // consume 'is_after' or 'is_before'
    this.expect('paren', '(');
    const left = this.parseExpr();
    this.expect('comma');
    const right = this.parseExpr();
    this.expect('paren', ')');

    const leftMs = this.parseIso8601Ms(left);
    const rightMs = this.parseIso8601Ms(right);

    if (isNaN(leftMs) || isNaN(rightMs)) return false;

    return op === 'after' ? leftMs > rightMs : leftMs < rightMs;
  }

  /**
   * Parse is_between(value, lower, upper).
   * Checks that lower <= value <= upper for ISO 8601 date strings.
   *
   * @since v7.4.0
   */
  private parseTimestampBetween(): boolean {
    this.advance(); // consume 'is_between'
    this.expect('paren', '(');
    const value = this.parseExpr();
    this.expect('comma');
    const lower = this.parseExpr();
    this.expect('comma');
    const upper = this.parseExpr();
    this.expect('paren', ')');

    const valueMs = this.parseIso8601Ms(value);
    const lowerMs = this.parseIso8601Ms(lower);
    const upperMs = this.parseIso8601Ms(upper);

    if (isNaN(valueMs) || isNaN(lowerMs) || isNaN(upperMs)) return false;

    return lowerMs <= valueMs && valueMs <= upperMs;
  }

  // ---------------------------------------------------------------------------
  // Temporal governance builtins (v7.5.0 — Deep Bridgebuilder Review GAP)
  // ---------------------------------------------------------------------------

  /**
   * Parse is_stale(timestamp, max_age_seconds, reference_timestamp) or
   * is_within(timestamp, max_age_seconds, reference_timestamp).
   *
   * Deterministic — uses an explicit reference timestamp instead of Date.now().
   *
   * - is_stale: (referenceMs - timestampMs) / 1000 > maxAge  (strict >)
   * - is_within: (referenceMs - timestampMs) / 1000 <= maxAge (inclusive <=)
   *
   * Returns false for invalid timestamps or negative max_age.
   *
   * @since v7.5.0
   */
  private parseTimestampStaleness(op: 'stale' | 'within'): boolean {
    this.advance(); // consume 'is_stale' or 'is_within'
    this.expect('paren', '(');
    const timestamp = this.parseExpr();
    this.expect('comma');
    const maxAgeExpr = this.parseExpr();
    this.expect('comma');
    const referenceTimestamp = this.parseExpr();
    this.expect('paren', ')');

    const timestampMs = this.parseIso8601Ms(timestamp);
    const referenceMs = this.parseIso8601Ms(referenceTimestamp);
    const maxAge = Number(maxAgeExpr);

    if (isNaN(timestampMs) || isNaN(referenceMs) || isNaN(maxAge) || maxAge < 0) return false;

    const elapsedSeconds = (referenceMs - timestampMs) / 1000;

    return op === 'stale' ? elapsedSeconds > maxAge : elapsedSeconds <= maxAge;
  }
}

/**
 * Canonical list of registered evaluator builtin functions.
 *
 * This is derived from the Parser constructor's function registry.
 * Useful for introspection, documentation, and conformance testing.
 */
export const EVALUATOR_BUILTINS = [
  // BigInt aggregation
  'bigint_sum',
  // BigInt comparisons
  'bigint_gte',
  'bigint_gt',
  'bigint_eq',
  // BigInt arithmetic
  'bigint_sub',
  'bigint_add',
  // General comparison
  'eq',
  // Delegation chain
  'all_links_subset_authority',
  'delegation_budget_conserved',
  'links_temporally_ordered',
  'links_form_chain',
  // Ensemble capability
  'no_emergent_in_individual',
  'all_emergent_have_evidence',
  // Object inspection
  'object_keys_subset',
  // Temporal operators
  'changed',
  'previous',
  'delta',
  // Length (v5.5.0)
  'len',
  // Type introspection (v6.0.0)
  'type_of',
  'is_bigint_coercible',
  // Array uniqueness (v6.0.0)
  'unique_values',
  // Delegation tree (v6.0.0)
  'tree_budget_conserved',
  'tree_authority_narrowing',
  // Coordination builtins (v7.0.0)
  'saga_amount_conserved',
  'saga_steps_sequential',
  'outcome_consensus_valid',
  // Governance builtins (v7.0.0)
  'monetary_policy_solvent',
  'permission_boundary_active',
  'proposal_quorum_met',
  // Bridge iteration 2 builtins (v7.0.0)
  'saga_timeout_valid',
  'proposal_weights_normalized',
  // Timestamp comparison (v7.4.0)
  'is_after',
  'is_before',
  'is_between',
  // Temporal governance (v7.5.0)
  'is_stale',
  'is_within',
  // Constraint lifecycle (v7.6.0)
  'constraint_lifecycle_valid',
  // Proposal execution (v7.7.0)
  'proposal_execution_valid',
  // Temporal utility (v7.7.0)
  'now',
  // Model routing (v7.7.0)
  'model_routing_eligible',
  // Basket composition (v7.8.0)
  'basket_weights_normalized',
  // Execution checkpoint (v7.8.0)
  'execution_checkpoint_valid',
  // Audit trail chain (v8.0.0)
  'audit_trail_chain_valid',
] as const;

export type EvaluatorBuiltin = typeof EVALUATOR_BUILTINS[number];

/**
 * Reserved names in the evaluator namespace.
 *
 * Includes all builtin function names plus language keywords that cannot be
 * used as constraint field names without risking collision. Consumer schemas
 * should validate that their field names do not appear in this set.
 *
 * @see DR-F4 — Namespace collision surface
 * @since v7.8.0
 */
export const RESERVED_EVALUATOR_NAMES: ReadonlySet<string> = new Set([
  ...EVALUATOR_BUILTINS,
  // Language keywords used by the constraint expression parser
  'true',
  'false',
  'null',
  'undefined',
  'every',
  'length',
]);

/**
 * Evaluate a constraint expression against a data object.
 *
 * Returns `true` when the constraint is satisfied (no violation),
 * `false` when violated.
 *
 * @param data - The document to evaluate against
 * @param expression - Constraint expression string
 * @param context - Optional evaluation context for deterministic replay (DR-F3)
 * @returns Whether the constraint passes
 */
export function evaluateConstraint(
  data: Record<string, unknown>,
  expression: string,
  context?: EvaluationContext,
): boolean {
  const tokens = tokenize(expression);
  const parser = new Parser(tokens, data, 0, context);
  const result = parser.parseExpr();
  return !!result;
}
