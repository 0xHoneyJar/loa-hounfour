/**
 * Evaluator Builtin Specification Registry.
 *
 * Canonical specifications for all 18 evaluator builtins. Each spec includes
 * signature, description, argument types, return type, and executable examples
 * that serve as the cross-language test harness.
 *
 * @see SDD §2.5 — Evaluator Specification (FR-5)
 * @since v5.5.0
 */
import { type EvaluatorBuiltin, EVALUATOR_BUILTINS } from './evaluator.js';

/**
 * Argument specification for a builtin function.
 */
export interface ArgumentSpec {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}

/**
 * Executable example for a builtin function.
 * The expression is evaluated against context and must produce expected.
 */
export interface EvaluatorExample {
  readonly description: string;
  readonly context: Record<string, unknown>;
  readonly expression: string;
  readonly expected: unknown;
}

/**
 * Full specification of a single evaluator builtin.
 */
export interface EvaluatorBuiltinSpec {
  readonly name: EvaluatorBuiltin;
  readonly signature: string;
  readonly description: string;
  readonly arguments: readonly ArgumentSpec[];
  readonly return_type: string;
  readonly short_circuit: boolean;
  readonly examples: readonly EvaluatorExample[];
  readonly edge_cases: readonly string[];
}

/**
 * Canonical registry of all 18 evaluator builtin specifications.
 */
export const EVALUATOR_BUILTIN_SPECS: ReadonlyMap<EvaluatorBuiltin, EvaluatorBuiltinSpec> = new Map<EvaluatorBuiltin, EvaluatorBuiltinSpec>([
  ['bigint_sum', {
    name: 'bigint_sum',
    signature: 'bigint_sum(array, field?) → BigInt',
    description: 'Sum values as BigInt. Form 1: bigint_sum([val1, val2]). Form 2: bigint_sum(arrayField, fieldName).',
    arguments: [
      { name: 'source', type: 'unknown[] | string', description: 'Array literal or field path resolving to array' },
      { name: 'field', type: 'string?', description: 'Optional field name to extract from each array element' },
    ],
    return_type: 'BigInt',
    short_circuit: false,
    examples: [
      {
        description: 'Sum array literal fields',
        context: { a: '100', b: '200' },
        expression: 'bigint_sum([a, b]) == 300',
        expected: true,
      },
      {
        description: 'Sum field from array of objects',
        context: { items: [{ cost: '10' }, { cost: '20' }, { cost: '30' }] },
        expression: 'bigint_sum(items, \'cost\') == 60',
        expected: true,
      },
    ],
    edge_cases: ['Returns 0n for empty arrays', 'Null/undefined values are skipped', 'Non-numeric strings cause 0n return'],
  }],

  ['bigint_gte', {
    name: 'bigint_gte',
    signature: 'bigint_gte(a, b) → boolean',
    description: 'Returns true if a >= b after BigInt conversion.',
    arguments: [
      { name: 'a', type: 'unknown', description: 'Left operand (converted to BigInt)' },
      { name: 'b', type: 'unknown', description: 'Right operand (converted to BigInt)' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Greater value passes',
        context: { budget: '1000', cost: '500' },
        expression: 'bigint_gte(budget, cost)',
        expected: true,
      },
      {
        description: 'Equal values pass',
        context: { a: '100', b: '100' },
        expression: 'bigint_gte(a, b)',
        expected: true,
      },
      {
        description: 'Lesser value fails',
        context: { a: '50', b: '100' },
        expression: 'bigint_gte(a, b)',
        expected: false,
      },
    ],
    edge_cases: ['Null/undefined converted to 0', 'Non-numeric strings return false'],
  }],

  ['bigint_gt', {
    name: 'bigint_gt',
    signature: 'bigint_gt(a, b) → boolean',
    description: 'Returns true if a > b after BigInt conversion.',
    arguments: [
      { name: 'a', type: 'unknown', description: 'Left operand (converted to BigInt)' },
      { name: 'b', type: 'unknown', description: 'Right operand (converted to BigInt)' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Strictly greater passes',
        context: { a: '200', b: '100' },
        expression: 'bigint_gt(a, b)',
        expected: true,
      },
      {
        description: 'Equal values fail',
        context: { a: '100', b: '100' },
        expression: 'bigint_gt(a, b)',
        expected: false,
      },
    ],
    edge_cases: ['Same semantics as bigint_gte but strict'],
  }],

  ['bigint_eq', {
    name: 'bigint_eq',
    signature: 'bigint_eq(a, b) → boolean',
    description: 'Returns true if a == b after BigInt conversion.',
    arguments: [
      { name: 'a', type: 'unknown', description: 'Left operand (converted to BigInt)' },
      { name: 'b', type: 'unknown', description: 'Right operand (converted to BigInt)' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Equal numeric strings',
        context: { a: '1000000', b: '1000000' },
        expression: 'bigint_eq(a, b)',
        expected: true,
      },
      {
        description: 'Different values',
        context: { a: '100', b: '200' },
        expression: 'bigint_eq(a, b)',
        expected: false,
      },
    ],
    edge_cases: ['String "0" equals number 0'],
  }],

  ['bigint_sub', {
    name: 'bigint_sub',
    signature: 'bigint_sub(a, b) → string',
    description: 'Returns a - b as a string after BigInt conversion.',
    arguments: [
      { name: 'a', type: 'unknown', description: 'Minuend (converted to BigInt)' },
      { name: 'b', type: 'unknown', description: 'Subtrahend (converted to BigInt)' },
    ],
    return_type: 'string',
    short_circuit: false,
    examples: [
      {
        description: 'Simple subtraction',
        context: { total: '1000', part: '300' },
        expression: 'bigint_eq(bigint_sub(total, part), 700)',
        expected: true,
      },
      {
        description: 'Subtraction to zero',
        context: { a: '500', b: '500' },
        expression: 'bigint_eq(bigint_sub(a, b), 0)',
        expected: true,
      },
    ],
    edge_cases: ['Can produce negative results', 'Returns "0" for null inputs'],
  }],

  ['bigint_add', {
    name: 'bigint_add',
    signature: 'bigint_add(a, b) → string',
    description: 'Returns a + b as a string after BigInt conversion.',
    arguments: [
      { name: 'a', type: 'unknown', description: 'First addend (converted to BigInt)' },
      { name: 'b', type: 'unknown', description: 'Second addend (converted to BigInt)' },
    ],
    return_type: 'string',
    short_circuit: false,
    examples: [
      {
        description: 'Simple addition',
        context: { a: '100', b: '200' },
        expression: 'bigint_eq(bigint_add(a, b), 300)',
        expected: true,
      },
      {
        description: 'Addition with zero',
        context: { a: '500', b: '0' },
        expression: 'bigint_eq(bigint_add(a, b), 500)',
        expected: true,
      },
    ],
    edge_cases: ['Returns "0" for null inputs'],
  }],

  ['eq', {
    name: 'eq',
    signature: 'eq(a, b) → boolean',
    description: 'Strict equality comparison (===). Used for identity checks.',
    arguments: [
      { name: 'a', type: 'unknown', description: 'Left operand' },
      { name: 'b', type: 'unknown', description: 'Right operand' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Equal strings',
        context: { status: 'active' },
        expression: 'eq(status, \'active\')',
        expected: true,
      },
      {
        description: 'Different strings',
        context: { status: 'active' },
        expression: 'eq(status, \'expired\')',
        expected: false,
      },
    ],
    edge_cases: ['Uses JavaScript strict equality', 'null !== undefined'],
  }],

  ['all_links_subset_authority', {
    name: 'all_links_subset_authority',
    signature: 'all_links_subset_authority(links) → boolean',
    description: 'For links[i] where i > 0: links[i].authority_scope is a subset of links[i-1].authority_scope.',
    arguments: [
      { name: 'links', type: 'DelegationLink[]', description: 'Array of delegation links' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Child has subset of parent authority',
        context: { links: [{ authority_scope: ['read', 'write'] }, { authority_scope: ['read'] }] },
        expression: 'all_links_subset_authority(links)',
        expected: true,
      },
      {
        description: 'Child has authority not in parent',
        context: { links: [{ authority_scope: ['read'] }, { authority_scope: ['read', 'write'] }] },
        expression: 'all_links_subset_authority(links)',
        expected: false,
      },
    ],
    edge_cases: ['Empty arrays return true', 'Single-element arrays return true'],
  }],

  ['delegation_budget_conserved', {
    name: 'delegation_budget_conserved',
    signature: 'delegation_budget_conserved(links) → boolean',
    description: 'For each link with sub-delegations: child budget <= parent budget.',
    arguments: [
      { name: 'links', type: 'DelegationLink[]', description: 'Array of delegation links' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Budget decreases down chain',
        context: { links: [{ budget_allocated_micro: '1000' }, { budget_allocated_micro: '500' }] },
        expression: 'delegation_budget_conserved(links)',
        expected: true,
      },
      {
        description: 'Child exceeds parent budget',
        context: { links: [{ budget_allocated_micro: '500' }, { budget_allocated_micro: '1000' }] },
        expression: 'delegation_budget_conserved(links)',
        expected: false,
      },
    ],
    edge_cases: ['Null budget fields are skipped (vacuously true)', 'Empty arrays return true'],
  }],

  ['links_temporally_ordered', {
    name: 'links_temporally_ordered',
    signature: 'links_temporally_ordered(links) → boolean',
    description: 'links[i].timestamp <= links[i+1].timestamp for all adjacent pairs.',
    arguments: [
      { name: 'links', type: 'DelegationLink[]', description: 'Array of delegation links with timestamps' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Timestamps are ordered',
        context: { links: [{ timestamp: '2026-01-01T00:00:00Z' }, { timestamp: '2026-01-02T00:00:00Z' }] },
        expression: 'links_temporally_ordered(links)',
        expected: true,
      },
      {
        description: 'Timestamps are reversed',
        context: { links: [{ timestamp: '2026-01-02T00:00:00Z' }, { timestamp: '2026-01-01T00:00:00Z' }] },
        expression: 'links_temporally_ordered(links)',
        expected: false,
      },
    ],
    edge_cases: ['Null timestamps return false', 'Empty arrays return true'],
  }],

  ['links_form_chain', {
    name: 'links_form_chain',
    signature: 'links_form_chain(links) → boolean',
    description: 'links[i].delegatee == links[i+1].delegator for all adjacent pairs.',
    arguments: [
      { name: 'links', type: 'DelegationLink[]', description: 'Array of delegation links' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Chain forms correctly',
        context: { links: [{ delegatee: 'B' }, { delegator: 'B', delegatee: 'C' }] },
        expression: 'links_form_chain(links)',
        expected: true,
      },
      {
        description: 'Chain is broken',
        context: { links: [{ delegatee: 'B' }, { delegator: 'X', delegatee: 'C' }] },
        expression: 'links_form_chain(links)',
        expected: false,
      },
    ],
    edge_cases: ['Empty arrays return true', 'Single-element arrays return true'],
  }],

  ['no_emergent_in_individual', {
    name: 'no_emergent_in_individual',
    signature: 'no_emergent_in_individual(emergent, individual) → boolean',
    description: 'For each capability in emergent: not present in any array value of individual.',
    arguments: [
      { name: 'emergent', type: 'string[]', description: 'Array of emergent capabilities' },
      { name: 'individual', type: 'Record<string, string[]>', description: 'Record of individual model capabilities' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Emergent capability not in any individual',
        context: { emergent: ['consensus'], individual: { m1: ['reasoning'], m2: ['coding'] } },
        expression: 'no_emergent_in_individual(emergent, individual)',
        expected: true,
      },
      {
        description: 'Emergent capability found in individual',
        context: { emergent: ['reasoning'], individual: { m1: ['reasoning'], m2: ['coding'] } },
        expression: 'no_emergent_in_individual(emergent, individual)',
        expected: false,
      },
    ],
    edge_cases: ['Empty emergent array returns true', 'Null individual returns true'],
  }],

  ['all_emergent_have_evidence', {
    name: 'all_emergent_have_evidence',
    signature: 'all_emergent_have_evidence(emergent, evidence) → boolean',
    description: 'For each capability in emergent: at least one entry in evidence where evidence[i].capability == capability.',
    arguments: [
      { name: 'emergent', type: 'string[]', description: 'Array of emergent capabilities' },
      { name: 'evidence', type: 'CapabilityEvidence[]', description: 'Array of evidence records' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'All emergent capabilities have evidence',
        context: {
          emergent: ['consensus'],
          evidence: [{ capability: 'consensus', test_name: 'test-1', score: 0.9 }],
        },
        expression: 'all_emergent_have_evidence(emergent, evidence)',
        expected: true,
      },
      {
        description: 'Missing evidence for emergent capability',
        context: {
          emergent: ['consensus', 'synthesis'],
          evidence: [{ capability: 'consensus', test_name: 'test-1', score: 0.9 }],
        },
        expression: 'all_emergent_have_evidence(emergent, evidence)',
        expected: false,
      },
    ],
    edge_cases: ['Empty emergent array returns true', 'Non-array evidence returns false'],
  }],

  ['object_keys_subset', {
    name: 'object_keys_subset',
    signature: 'object_keys_subset(record, array) → boolean',
    description: 'All keys of record are present in array.',
    arguments: [
      { name: 'record', type: 'Record<string, unknown>', description: 'Object whose keys to check' },
      { name: 'array', type: 'string[]', description: 'Allowed key names' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'All keys in allowed list',
        context: { rec: { a: 1, b: 2 }, allowed: ['a', 'b', 'c'] },
        expression: 'object_keys_subset(rec, allowed)',
        expected: true,
      },
      {
        description: 'Key not in allowed list',
        context: { rec: { a: 1, d: 2 }, allowed: ['a', 'b', 'c'] },
        expression: 'object_keys_subset(rec, allowed)',
        expected: false,
      },
    ],
    edge_cases: ['Null record returns true (vacuously)', 'Non-array allowed returns false'],
  }],

  ['changed', {
    name: 'changed',
    signature: 'changed(fieldPath) → boolean',
    description: 'Returns true if field value differs between _previous context and current context.',
    arguments: [
      { name: 'fieldPath', type: 'string', description: 'Dot-separated field path' },
    ],
    return_type: 'boolean',
    short_circuit: false,
    examples: [
      {
        description: 'Field changed',
        context: { status: 'active', _previous: { status: 'pending' } },
        expression: 'changed(status)',
        expected: true,
      },
      {
        description: 'Field unchanged',
        context: { status: 'active', _previous: { status: 'active' } },
        expression: 'changed(status)',
        expected: false,
      },
    ],
    edge_cases: ['No _previous returns false', 'Uses strict identity comparison'],
  }],

  ['previous', {
    name: 'previous',
    signature: 'previous(fieldPath) → unknown',
    description: 'Returns the value of field from _previous context.',
    arguments: [
      { name: 'fieldPath', type: 'string', description: 'Dot-separated field path' },
    ],
    return_type: 'unknown',
    short_circuit: false,
    examples: [
      {
        description: 'Get previous value',
        context: { status: 'active', _previous: { status: 'pending' } },
        expression: 'previous(status) == \'pending\'',
        expected: true,
      },
      {
        description: 'No previous context',
        context: { status: 'active' },
        expression: 'previous(status) == null',
        expected: true,
      },
    ],
    edge_cases: ['No _previous returns undefined', 'Missing path returns undefined'],
  }],

  ['delta', {
    name: 'delta',
    signature: 'delta(fieldPath) → BigInt | number',
    description: 'Returns numeric difference current - previous. Tries BigInt first, falls back to Number.',
    arguments: [
      { name: 'fieldPath', type: 'string', description: 'Dot-separated field path' },
    ],
    return_type: 'BigInt | number',
    short_circuit: false,
    examples: [
      {
        description: 'Numeric delta',
        context: { balance: '1000', _previous: { balance: '800' } },
        expression: 'bigint_eq(delta(balance), 200)',
        expected: true,
      },
      {
        description: 'No previous returns zero',
        context: { balance: '500' },
        expression: 'bigint_eq(delta(balance), 0)',
        expected: true,
      },
    ],
    edge_cases: ['No _previous returns 0n immediately (current value is not accessed — short-circuit)', 'Decimal strings use Number fallback', 'Non-numeric returns 0n'],
  }],

  ['len', {
    name: 'len',
    signature: 'len(value) → number',
    description: 'Returns length of array, object keys, or string.',
    arguments: [
      { name: 'value', type: 'unknown', description: 'Value to measure (array, object, or string)' },
    ],
    return_type: 'number',
    short_circuit: false,
    examples: [
      {
        description: 'Array length',
        context: { items: ['a', 'b', 'c'] },
        expression: 'len(items) == 3',
        expected: true,
      },
      {
        description: 'Object key count',
        context: { rec: { x: 1, y: 2 } },
        expression: 'len(rec) == 2',
        expected: true,
      },
      {
        description: 'String length',
        context: { name: 'hello' },
        expression: 'len(name) == 5',
        expected: true,
      },
    ],
    edge_cases: ['Null/undefined returns 0', 'Numbers return 0'],
  }],
]);
