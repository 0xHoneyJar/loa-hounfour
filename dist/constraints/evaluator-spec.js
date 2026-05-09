/**
 * Canonical registry of all 39 evaluator builtin specifications.
 */
export const EVALUATOR_BUILTIN_SPECS = new Map([
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
    ['type_of', {
            name: 'type_of',
            signature: 'type_of(value) → string',
            description: 'Returns runtime type as string. Distinguishes null, array, bigint from typeof.',
            arguments: [
                { name: 'value', type: 'unknown', description: 'Value to inspect' },
            ],
            return_type: 'string',
            short_circuit: false,
            examples: [
                {
                    description: 'String type',
                    context: { name: 'hello' },
                    expression: 'type_of(name) == \'string\'',
                    expected: true,
                },
                {
                    description: 'Array type (not object)',
                    context: { items: [1, 2, 3] },
                    expression: 'type_of(items) == \'array\'',
                    expected: true,
                },
                {
                    description: 'Null type (not object)',
                    context: { val: null },
                    expression: 'type_of(val) == \'null\'',
                    expected: true,
                },
            ],
            edge_cases: ['null returns "null" (not "object")', 'Arrays return "array" (not "object")', 'BigInt returns "bigint"'],
        }],
    ['is_bigint_coercible', {
            name: 'is_bigint_coercible',
            signature: 'is_bigint_coercible(value) → boolean',
            description: 'Returns true if value can be converted to BigInt without error.',
            arguments: [
                { name: 'value', type: 'unknown', description: 'Value to test for BigInt coercion' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Numeric string is coercible',
                    context: { amount: '1000000' },
                    expression: 'is_bigint_coercible(amount)',
                    expected: true,
                },
                {
                    description: 'Non-numeric string is not coercible',
                    context: { name: 'hello' },
                    expression: 'is_bigint_coercible(name)',
                    expected: false,
                },
                {
                    description: 'Integer is coercible',
                    context: { count: 42 },
                    expression: 'is_bigint_coercible(count)',
                    expected: true,
                },
            ],
            edge_cases: ['Floats return false (not integer)', 'null returns false', 'BigInt values return true'],
        }],
    ['unique_values', {
            name: 'unique_values',
            signature: 'unique_values(array, field) → boolean',
            description: 'Returns true if all values of the named field within the array are unique.',
            arguments: [
                { name: 'array', type: 'object[]', description: 'Array of objects to inspect' },
                { name: 'field', type: 'string', description: 'Field name to extract from each element' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Unique field values',
                    context: { items: [{ id: 'a' }, { id: 'b' }, { id: 'c' }] },
                    expression: "unique_values(items, 'id')",
                    expected: true,
                },
                {
                    description: 'Duplicate field values',
                    context: { items: [{ id: 'a' }, { id: 'b' }, { id: 'a' }] },
                    expression: "unique_values(items, 'id')",
                    expected: false,
                },
            ],
            edge_cases: ['Non-array input returns true (vacuously)', 'Missing field on item is skipped', 'Empty array returns true'],
        }],
    ['tree_budget_conserved', {
            name: 'tree_budget_conserved',
            signature: 'tree_budget_conserved(root) → boolean',
            description: 'Iteratively validates sum(children.budget) <= parent.budget at every node. Returns true if conserved, false if violated or if tree exceeds depth/size limits.',
            arguments: [
                { name: 'root', type: 'DelegationTreeNode', description: 'Root node of the delegation tree' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Valid tree with conserved budgets',
                    context: { root: { node_id: '1', budget_allocated_micro: '1000', children: [{ node_id: '2', budget_allocated_micro: '500', children: [] }, { node_id: '3', budget_allocated_micro: '500', children: [] }] } },
                    expression: 'tree_budget_conserved(root)',
                    expected: true,
                },
                {
                    description: 'Invalid tree with overflowing budgets',
                    context: { root: { node_id: '1', budget_allocated_micro: '1000', children: [{ node_id: '2', budget_allocated_micro: '600', children: [] }, { node_id: '3', budget_allocated_micro: '600', children: [] }] } },
                    expression: 'tree_budget_conserved(root)',
                    expected: false,
                },
            ],
            edge_cases: ['Leaf nodes (no children) always valid', 'Returns false for trees exceeding depth (10) or node count (100) limits'],
        }],
    ['tree_authority_narrowing', {
            name: 'tree_authority_narrowing',
            signature: 'tree_authority_narrowing(root) → boolean',
            description: 'Iteratively validates child.authority_scope is a subset of parent.authority_scope (equal scope is valid for full delegation). Normalized lowercase, set semantics.',
            arguments: [
                { name: 'root', type: 'DelegationTreeNode', description: 'Root node of the delegation tree' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Valid tree with narrowing authority',
                    context: { root: { node_id: '1', authority_scope: ['billing', 'inference'], children: [{ node_id: '2', authority_scope: ['billing'], children: [] }] } },
                    expression: 'tree_authority_narrowing(root)',
                    expected: true,
                },
                {
                    description: 'Invalid tree with widening authority',
                    context: { root: { node_id: '1', authority_scope: ['billing'], children: [{ node_id: '2', authority_scope: ['billing', 'inference'], children: [] }] } },
                    expression: 'tree_authority_narrowing(root)',
                    expected: false,
                },
            ],
            edge_cases: ['Empty scope at leaf is valid', 'Duplicate elements deduplicated before comparison'],
        }],
    // -- Coordination builtins (v7.0.0) ----------------------------------------
    ['saga_amount_conserved', {
            name: 'saga_amount_conserved',
            signature: 'saga_amount_conserved(saga) → boolean',
            description: 'Verifies total debited equals total credited across all completed saga steps, and compensation steps balance reversed amounts. Resource limit: 100 steps.',
            arguments: [
                { name: 'saga', type: 'BridgeTransferSaga', description: 'Saga object with steps and compensation_steps arrays' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Balanced transfer steps',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
                                { step_id: 's2', step_type: 'transfer', status: 'completed', amount_micro: '500' },
                            ],
                            compensation_steps: [],
                        },
                    },
                    expression: 'saga_amount_conserved(saga)',
                    expected: true,
                },
                {
                    description: 'Compensation restores balance',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
                            ],
                            compensation_steps: [
                                { step_id: 'c1', step_type: 'transfer', status: 'completed', amount_micro: '1000' },
                            ],
                        },
                    },
                    expression: 'saga_amount_conserved(saga)',
                    expected: true,
                },
            ],
            edge_cases: ['Empty steps array returns true (vacuously)', 'Only completed steps count', 'Exceeding 100 steps returns false'],
        }],
    ['saga_steps_sequential', {
            name: 'saga_steps_sequential',
            signature: 'saga_steps_sequential(saga) → boolean',
            description: 'Verifies all step_id values in the saga are unique. Resource limit: 100 steps.',
            arguments: [
                { name: 'saga', type: 'BridgeTransferSaga', description: 'Saga object with steps array' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Unique step IDs',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1' },
                                { step_id: 's2' },
                                { step_id: 's3' },
                            ],
                        },
                    },
                    expression: 'saga_steps_sequential(saga)',
                    expected: true,
                },
                {
                    description: 'Duplicate step IDs',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1' },
                                { step_id: 's2' },
                                { step_id: 's1' },
                            ],
                        },
                    },
                    expression: 'saga_steps_sequential(saga)',
                    expected: false,
                },
            ],
            edge_cases: ['Empty steps array returns true', 'Single step returns true', 'Exceeding 100 steps returns false'],
        }],
    ['outcome_consensus_valid', {
            name: 'outcome_consensus_valid',
            signature: 'outcome_consensus_valid(outcome) → boolean',
            description: 'Verifies vote counts and consensus threshold match the claimed outcome_type: unanimous requires all agree, majority requires agree >= threshold, deadlock requires agree < threshold, escalation requires escalated_to.',
            arguments: [
                { name: 'outcome', type: 'DelegationOutcome', description: 'Outcome object with votes, outcome_type, consensus_threshold, and optional escalated_to' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Valid unanimous outcome',
                    context: {
                        outcome: {
                            outcome_type: 'unanimous',
                            votes: [
                                { vote: 'agree' },
                                { vote: 'agree' },
                                { vote: 'agree' },
                            ],
                            consensus_threshold: 1.0,
                            consensus_achieved: true,
                        },
                    },
                    expression: 'outcome_consensus_valid(outcome)',
                    expected: true,
                },
                {
                    description: 'Invalid unanimous with disagree',
                    context: {
                        outcome: {
                            outcome_type: 'unanimous',
                            votes: [
                                { vote: 'agree' },
                                { vote: 'disagree' },
                            ],
                            consensus_threshold: 1.0,
                            consensus_achieved: true,
                        },
                    },
                    expression: 'outcome_consensus_valid(outcome)',
                    expected: false,
                },
                {
                    description: 'Valid majority outcome',
                    context: {
                        outcome: {
                            outcome_type: 'majority',
                            votes: [
                                { vote: 'agree' },
                                { vote: 'agree' },
                                { vote: 'disagree' },
                            ],
                            consensus_threshold: 0.5,
                            consensus_achieved: true,
                        },
                    },
                    expression: 'outcome_consensus_valid(outcome)',
                    expected: true,
                },
            ],
            edge_cases: ['Empty votes returns false for non-deadlock', 'Escalation without escalated_to returns false'],
        }],
    // -- Governance builtins (v7.0.0) ------------------------------------------
    ['monetary_policy_solvent', {
            name: 'monetary_policy_solvent',
            signature: 'monetary_policy_solvent(policy, current_supply) → boolean',
            description: 'Verifies current_supply does not exceed policy.conservation_ceiling. Both operands are BigInt-compared.',
            arguments: [
                { name: 'policy', type: 'MonetaryPolicy', description: 'Policy object with conservation_ceiling field' },
                { name: 'current_supply', type: 'string', description: 'Current total supply (string-encoded BigInt)' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Supply below ceiling',
                    context: { policy: { conservation_ceiling: '1000000' }, supply: '500000' },
                    expression: 'monetary_policy_solvent(policy, supply)',
                    expected: true,
                },
                {
                    description: 'Supply at ceiling',
                    context: { policy: { conservation_ceiling: '1000000' }, supply: '1000000' },
                    expression: 'monetary_policy_solvent(policy, supply)',
                    expected: true,
                },
                {
                    description: 'Supply exceeds ceiling',
                    context: { policy: { conservation_ceiling: '1000000' }, supply: '1000001' },
                    expression: 'monetary_policy_solvent(policy, supply)',
                    expected: false,
                },
            ],
            edge_cases: ['Non-numeric strings return false', 'Null policy returns false'],
        }],
    ['permission_boundary_active', {
            name: 'permission_boundary_active',
            signature: 'permission_boundary_active(boundary) → boolean',
            description: 'Validates that a boundary has all required structural components: non-empty scope, permitted_if, reporting, and revocation.',
            arguments: [
                { name: 'boundary', type: 'PermissionBoundary', description: 'Boundary object to validate' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Complete boundary is active',
                    context: {
                        boundary: {
                            scope: 'billing',
                            permitted_if: "trust_level == 'verified'",
                            reporting: { required: true },
                            revocation: { trigger: 'violation_count' },
                        },
                    },
                    expression: 'permission_boundary_active(boundary)',
                    expected: true,
                },
                {
                    description: 'Missing scope is inactive',
                    context: {
                        boundary: {
                            scope: '',
                            permitted_if: "trust_level == 'verified'",
                            reporting: { required: true },
                            revocation: { trigger: 'manual' },
                        },
                    },
                    expression: 'permission_boundary_active(boundary)',
                    expected: false,
                },
            ],
            edge_cases: ['Null boundary returns false', 'Missing reporting returns false'],
        }],
    ['proposal_quorum_met', {
            name: 'proposal_quorum_met',
            signature: 'proposal_quorum_met(proposal) → boolean',
            description: 'Checks whether the weighted votes cast meet or exceed the quorum_required threshold.',
            arguments: [
                { name: 'proposal', type: 'GovernanceProposal', description: 'Proposal object with voting.quorum_required and voting.votes_cast' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Quorum met with sufficient weights',
                    context: {
                        proposal: {
                            voting: {
                                quorum_required: 0.5,
                                votes_cast: [
                                    { voter_id: 'a', weight: 0.3 },
                                    { voter_id: 'b', weight: 0.3 },
                                ],
                            },
                        },
                    },
                    expression: 'proposal_quorum_met(proposal)',
                    expected: true,
                },
                {
                    description: 'Quorum not met',
                    context: {
                        proposal: {
                            voting: {
                                quorum_required: 0.75,
                                votes_cast: [
                                    { voter_id: 'a', weight: 0.3 },
                                    { voter_id: 'b', weight: 0.2 },
                                ],
                            },
                        },
                    },
                    expression: 'proposal_quorum_met(proposal)',
                    expected: false,
                },
            ],
            edge_cases: ['Empty votes returns true only if quorum is 0', 'Max 100 votes (resource limit)'],
        }],
    // -- Bridge iteration 2 builtins (v7.0.0) ----------------------------------
    ['saga_timeout_valid', {
            name: 'saga_timeout_valid',
            signature: 'saga_timeout_valid(saga) → boolean',
            description: 'Validates that completed saga steps have both started_at and completed_at timestamps, and that each step duration does not exceed timeout.per_step_seconds.',
            arguments: [
                { name: 'saga', type: 'BridgeTransferSaga', description: 'Saga object with steps and timeout configuration' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Completed step within timeout',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1', status: 'completed', started_at: '2026-01-15T10:00:00Z', completed_at: '2026-01-15T10:00:30Z', amount_micro: '1000' },
                            ],
                            compensation_steps: [],
                            timeout: { total_seconds: 300, per_step_seconds: 60 },
                        },
                    },
                    expression: 'saga_timeout_valid(saga)',
                    expected: true,
                },
                {
                    description: 'Completed step exceeding per_step timeout',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1', status: 'completed', started_at: '2026-01-15T10:00:00Z', completed_at: '2026-01-15T10:02:00Z', amount_micro: '1000' },
                            ],
                            compensation_steps: [],
                            timeout: { total_seconds: 300, per_step_seconds: 60 },
                        },
                    },
                    expression: 'saga_timeout_valid(saga)',
                    expected: false,
                },
                {
                    description: 'Pending steps are skipped',
                    context: {
                        saga: {
                            steps: [
                                { step_id: 's1', status: 'pending', started_at: null, completed_at: null, amount_micro: '1000' },
                            ],
                            compensation_steps: [],
                            timeout: { total_seconds: 300, per_step_seconds: 60 },
                        },
                    },
                    expression: 'saga_timeout_valid(saga)',
                    expected: true,
                },
            ],
            edge_cases: ['Only completed steps are checked', 'Missing timestamps on completed steps return false', 'Exceeding 100 steps returns false'],
        }],
    ['proposal_weights_normalized', {
            name: 'proposal_weights_normalized',
            signature: 'proposal_weights_normalized(proposal) → boolean',
            description: 'Verifies that the sum of all vote weights in a governance proposal equals 1.0 within floating-point tolerance (0.001).',
            arguments: [
                { name: 'proposal', type: 'GovernanceProposal', description: 'Proposal object with voting.votes_cast containing weight fields' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Weights sum to 1.0',
                    context: {
                        proposal: {
                            voting: {
                                votes_cast: [
                                    { voter_id: 'a', weight: 0.3 },
                                    { voter_id: 'b', weight: 0.4 },
                                    { voter_id: 'c', weight: 0.3 },
                                ],
                            },
                        },
                    },
                    expression: 'proposal_weights_normalized(proposal)',
                    expected: true,
                },
                {
                    description: 'Weights do not sum to 1.0',
                    context: {
                        proposal: {
                            voting: {
                                votes_cast: [
                                    { voter_id: 'a', weight: 0.5 },
                                    { voter_id: 'b', weight: 0.6 },
                                ],
                            },
                        },
                    },
                    expression: 'proposal_weights_normalized(proposal)',
                    expected: false,
                },
                {
                    description: 'Empty votes is vacuously true',
                    context: {
                        proposal: {
                            voting: {
                                votes_cast: [],
                            },
                        },
                    },
                    expression: 'proposal_weights_normalized(proposal)',
                    expected: true,
                },
            ],
            edge_cases: ['Empty votes returns true', 'Tolerance is 0.001', 'Max 100 votes (resource limit)'],
        }],
    // -- Timestamp comparison builtins (v7.4.0) ---------------------------------
    ['is_after', {
            name: 'is_after',
            signature: 'is_after(a, b) → boolean',
            description: 'Returns true if ISO 8601 timestamp a is strictly after timestamp b.',
            arguments: [
                { name: 'a', type: 'string', description: 'ISO 8601 date string (left operand)' },
                { name: 'b', type: 'string', description: 'ISO 8601 date string (right operand)' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Later timestamp is after earlier',
                    context: { a: '2026-02-01T00:00:00Z', b: '2026-01-01T00:00:00Z' },
                    expression: 'is_after(a, b)',
                    expected: true,
                },
                {
                    description: 'Earlier timestamp is not after later',
                    context: { a: '2026-01-01T00:00:00Z', b: '2026-02-01T00:00:00Z' },
                    expression: 'is_after(a, b)',
                    expected: false,
                },
                {
                    description: 'Equal timestamps are not after',
                    context: { a: '2026-01-15T00:00:00Z', b: '2026-01-15T00:00:00Z' },
                    expression: 'is_after(a, b)',
                    expected: false,
                },
            ],
            edge_cases: ['Invalid date strings return false', 'Uses strict greater-than (not >=)'],
        }],
    ['is_before', {
            name: 'is_before',
            signature: 'is_before(a, b) → boolean',
            description: 'Returns true if ISO 8601 timestamp a is strictly before timestamp b.',
            arguments: [
                { name: 'a', type: 'string', description: 'ISO 8601 date string (left operand)' },
                { name: 'b', type: 'string', description: 'ISO 8601 date string (right operand)' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Earlier timestamp is before later',
                    context: { a: '2026-01-01T00:00:00Z', b: '2026-02-01T00:00:00Z' },
                    expression: 'is_before(a, b)',
                    expected: true,
                },
                {
                    description: 'Later timestamp is not before earlier',
                    context: { a: '2026-02-01T00:00:00Z', b: '2026-01-01T00:00:00Z' },
                    expression: 'is_before(a, b)',
                    expected: false,
                },
                {
                    description: 'Equal timestamps are not before',
                    context: { a: '2026-01-15T00:00:00Z', b: '2026-01-15T00:00:00Z' },
                    expression: 'is_before(a, b)',
                    expected: false,
                },
            ],
            edge_cases: ['Invalid date strings return false', 'Uses strict less-than (not <=)'],
        }],
    ['is_between', {
            name: 'is_between',
            signature: 'is_between(value, lower, upper) → boolean',
            description: 'Returns true if lower <= value <= upper for ISO 8601 date strings (inclusive on both bounds).',
            arguments: [
                { name: 'value', type: 'string', description: 'ISO 8601 date string to test' },
                { name: 'lower', type: 'string', description: 'ISO 8601 lower bound (inclusive)' },
                { name: 'upper', type: 'string', description: 'ISO 8601 upper bound (inclusive)' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Value within range',
                    context: { ts: '2026-01-15T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-02-01T00:00:00Z' },
                    expression: 'is_between(ts, lo, hi)',
                    expected: true,
                },
                {
                    description: 'Value outside range (before lower)',
                    context: { ts: '2025-12-01T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-02-01T00:00:00Z' },
                    expression: 'is_between(ts, lo, hi)',
                    expected: false,
                },
                {
                    description: 'Value at lower bound (inclusive)',
                    context: { ts: '2026-01-01T00:00:00Z', lo: '2026-01-01T00:00:00Z', hi: '2026-02-01T00:00:00Z' },
                    expression: 'is_between(ts, lo, hi)',
                    expected: true,
                },
            ],
            edge_cases: ['Invalid date strings return false', 'Inclusive on both bounds (lower <= value <= upper)'],
        }],
    // -- Temporal governance builtins (v7.5.0) ----------------------------------
    ['is_stale', {
            name: 'is_stale',
            signature: 'is_stale(timestamp, max_age_seconds, reference_timestamp) → boolean',
            description: 'Returns true if the elapsed time between timestamp and reference_timestamp exceeds max_age_seconds (strict >). Deterministic — no Date.now().',
            arguments: [
                { name: 'timestamp', type: 'string', description: 'ISO 8601 date string to test for staleness' },
                { name: 'max_age_seconds', type: 'number', description: 'Maximum acceptable age in seconds' },
                { name: 'reference_timestamp', type: 'string', description: 'ISO 8601 reference point (e.g., "now")' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Timestamp older than max age is stale',
                    context: { ts: '2026-01-01T00:00:00Z', ref: '2026-01-02T00:00:00Z' },
                    expression: 'is_stale(ts, 3600, ref)',
                    expected: true,
                },
                {
                    description: 'Timestamp within max age is not stale',
                    context: { ts: '2026-01-01T23:30:00Z', ref: '2026-01-02T00:00:00Z' },
                    expression: 'is_stale(ts, 3600, ref)',
                    expected: false,
                },
                {
                    description: 'Timestamp exactly at max age is not stale (strict >)',
                    context: { ts: '2026-01-01T23:00:00Z', ref: '2026-01-02T00:00:00Z' },
                    expression: 'is_stale(ts, 3600, ref)',
                    expected: false,
                },
            ],
            edge_cases: ['Returns false for invalid timestamps', 'Returns false for negative max_age', 'Uses strict > (exactly at max_age is not stale)', 'Complement of is_within'],
        }],
    ['is_within', {
            name: 'is_within',
            signature: 'is_within(timestamp, max_age_seconds, reference_timestamp) → boolean',
            description: 'Returns true if the elapsed time between timestamp and reference_timestamp is at most max_age_seconds (<=). Deterministic — no Date.now().',
            arguments: [
                { name: 'timestamp', type: 'string', description: 'ISO 8601 date string to test for freshness' },
                { name: 'max_age_seconds', type: 'number', description: 'Maximum acceptable age in seconds' },
                { name: 'reference_timestamp', type: 'string', description: 'ISO 8601 reference point (e.g., "now")' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Timestamp within max age returns true',
                    context: { ts: '2026-01-01T23:30:00Z', ref: '2026-01-02T00:00:00Z' },
                    expression: 'is_within(ts, 3600, ref)',
                    expected: true,
                },
                {
                    description: 'Timestamp older than max age returns false',
                    context: { ts: '2026-01-01T00:00:00Z', ref: '2026-01-02T00:00:00Z' },
                    expression: 'is_within(ts, 3600, ref)',
                    expected: false,
                },
                {
                    description: 'Timestamp exactly at max age returns true (<=)',
                    context: { ts: '2026-01-01T23:00:00Z', ref: '2026-01-02T00:00:00Z' },
                    expression: 'is_within(ts, 3600, ref)',
                    expected: true,
                },
            ],
            edge_cases: ['Returns false for invalid timestamps', 'Returns false for negative max_age', 'Uses <= (exactly at max_age is within)', 'Complement of is_stale'],
        }],
    // ---------------------------------------------------------------------------
    // Constraint lifecycle governance (v7.6.0 — DR-S4)
    // ---------------------------------------------------------------------------
    ['constraint_lifecycle_valid', {
            name: 'constraint_lifecycle_valid',
            signature: 'constraint_lifecycle_valid(event) → boolean',
            description: 'Validates that a constraint lifecycle event follows valid state transitions. '
                + 'Checks from_status → to_status against CONSTRAINT_LIFECYCLE_TRANSITIONS.',
            arguments: [
                { name: 'event', type: 'object', description: 'ConstraintLifecycleEvent with from_status and to_status fields' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'proposed → under_review is valid',
                    context: { event: { from_status: 'proposed', to_status: 'under_review' } },
                    expression: 'constraint_lifecycle_valid(event)',
                    expected: true,
                },
                {
                    description: 'under_review → enacted is valid',
                    context: { event: { from_status: 'under_review', to_status: 'enacted' } },
                    expression: 'constraint_lifecycle_valid(event)',
                    expected: true,
                },
                {
                    description: 'enacted → deprecated is valid',
                    context: { event: { from_status: 'enacted', to_status: 'deprecated' } },
                    expression: 'constraint_lifecycle_valid(event)',
                    expected: true,
                },
                {
                    description: 'rejected is terminal — no transitions allowed',
                    context: { event: { from_status: 'rejected', to_status: 'proposed' } },
                    expression: 'constraint_lifecycle_valid(event)',
                    expected: false,
                },
                {
                    description: 'same-status transition is invalid',
                    context: { event: { from_status: 'enacted', to_status: 'enacted' } },
                    expression: 'constraint_lifecycle_valid(event)',
                    expected: false,
                },
            ],
            edge_cases: ['Returns false for same-status transitions', 'Returns false for unknown statuses', 'Terminal states (rejected, deprecated) have no valid transitions'],
        }],
    // ---------------------------------------------------------------------------
    // Proposal execution builtins (v7.7.0 — DR-S9)
    // ---------------------------------------------------------------------------
    ['proposal_execution_valid', {
            name: 'proposal_execution_valid',
            signature: 'proposal_execution_valid(execution) → boolean',
            description: 'Validates that a proposal execution completed successfully: '
                + 'status is "completed" and all changes_applied have result "success".',
            arguments: [
                { name: 'execution', type: 'object', description: 'ProposalExecution with status and changes_applied fields' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Completed execution with all successes',
                    context: { execution: { status: 'completed', changes_applied: [{ result: 'success' }, { result: 'success' }] } },
                    expression: 'proposal_execution_valid(execution)',
                    expected: true,
                },
                {
                    description: 'Failed execution returns false',
                    context: { execution: { status: 'failed', changes_applied: [{ result: 'success' }, { result: 'failed' }] } },
                    expression: 'proposal_execution_valid(execution)',
                    expected: false,
                },
                {
                    description: 'Completed but with a failed change returns false',
                    context: { execution: { status: 'completed', changes_applied: [{ result: 'success' }, { result: 'failed' }] } },
                    expression: 'proposal_execution_valid(execution)',
                    expected: false,
                },
                {
                    description: 'Empty changes_applied returns false',
                    context: { execution: { status: 'completed', changes_applied: [] } },
                    expression: 'proposal_execution_valid(execution)',
                    expected: false,
                },
            ],
            edge_cases: ['Returns false for non-completed status', 'Returns false for empty changes_applied array', 'Returns false if any change result is not "success"'],
        }],
    ['now', {
            name: 'now',
            signature: 'now() → string',
            description: 'Returns the current time as an ISO 8601 timestamp string. '
                + 'Evaluated once per constraint evaluation. Useful with is_after/is_within for expiry checks.',
            arguments: [],
            return_type: 'string',
            short_circuit: false,
            examples: [
                {
                    description: 'now() returns an ISO 8601 string usable with is_after',
                    context: { expires_at: '2099-12-31T23:59:59Z' },
                    expression: 'is_after(expires_at, now())',
                    expected: true,
                },
                {
                    description: 'now() with is_within for recency checks',
                    context: { last_updated: new Date().toISOString() },
                    expression: 'is_within(last_updated, 86400, now())',
                    expected: true,
                },
            ],
            edge_cases: ['Returns current wall-clock time — not deterministic across evaluations', 'ISO 8601 format includes milliseconds and Z suffix'],
        }],
    ['model_routing_eligible', {
            name: 'model_routing_eligible',
            signature: 'model_routing_eligible(qualifying_state, qualifying_score, current_state, current_score) → boolean',
            description: 'Evaluates whether current reputation meets routing signal requirements. '
                + 'Checks both state ordering (cold < warming < established < authoritative) and score threshold.',
            arguments: [
                { name: 'qualifying_state', type: 'string', description: 'Minimum required reputation state' },
                { name: 'qualifying_score', type: 'number', description: 'Minimum required blended score (0-1)' },
                { name: 'current_state', type: 'string', description: 'Agent current reputation state' },
                { name: 'current_score', type: 'number', description: 'Agent current blended score' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Established agent meets warming requirement',
                    context: { q_state: 'warming', q_score: 0.5, c_state: 'established', c_score: 0.8 },
                    expression: 'model_routing_eligible(q_state, q_score, c_state, c_score)',
                    expected: true,
                },
                {
                    description: 'Cold agent fails established requirement',
                    context: { q_state: 'established', q_score: 0.7, c_state: 'cold', c_score: 0.1 },
                    expression: 'model_routing_eligible(q_state, q_score, c_state, c_score)',
                    expected: false,
                },
                {
                    description: 'Meets state but not score requirement',
                    context: { q_state: 'warming', q_score: 0.8, c_state: 'established', c_score: 0.5 },
                    expression: 'model_routing_eligible(q_state, q_score, c_state, c_score)',
                    expected: false,
                },
            ],
            edge_cases: ['Unknown states return false', 'Exact state/score match returns true'],
        }],
    ['basket_weights_normalized', {
            name: 'basket_weights_normalized',
            signature: 'basket_weights_normalized(composition) → boolean',
            description: 'Validates that a BasketComposition entries weights sum to approximately 1.0 (within 0.001 tolerance).',
            arguments: [
                { name: 'composition', type: 'object', description: 'Object with entries array containing {weight: number} objects.' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Normalized basket',
                    context: { comp: { entries: [{ weight: 0.6 }, { weight: 0.4 }] } },
                    expression: 'basket_weights_normalized(comp)',
                    expected: true,
                },
                {
                    description: 'Non-normalized basket',
                    context: { comp: { entries: [{ weight: 0.6 }, { weight: 0.6 }] } },
                    expression: 'basket_weights_normalized(comp)',
                    expected: false,
                },
            ],
            edge_cases: ['Empty entries returns false', 'Single entry with weight 1.0 returns true'],
        }],
    // Execution checkpoint validation (v7.8.0 — DR-F5)
    ['execution_checkpoint_valid', {
            name: 'execution_checkpoint_valid',
            signature: 'execution_checkpoint_valid(checkpoint) → boolean',
            description: 'Validates that a checkpoint health_status and proceed_decision are consistent: healthy→continue, degraded→continue|pause, failing→rollback.',
            arguments: [
                { name: 'checkpoint', type: 'object', description: 'Object with health_status and proceed_decision fields.' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Healthy checkpoint with continue decision',
                    context: { cp: { health_status: 'healthy', proceed_decision: 'continue' } },
                    expression: 'execution_checkpoint_valid(cp)',
                    expected: true,
                },
                {
                    description: 'Degraded checkpoint with pause decision',
                    context: { cp: { health_status: 'degraded', proceed_decision: 'pause' } },
                    expression: 'execution_checkpoint_valid(cp)',
                    expected: true,
                },
                {
                    description: 'Failing checkpoint with rollback decision',
                    context: { cp: { health_status: 'failing', proceed_decision: 'rollback' } },
                    expression: 'execution_checkpoint_valid(cp)',
                    expected: true,
                },
                {
                    description: 'Invalid: failing checkpoint with continue decision',
                    context: { cp: { health_status: 'failing', proceed_decision: 'continue' } },
                    expression: 'execution_checkpoint_valid(cp)',
                    expected: false,
                },
            ],
            edge_cases: ['Healthy with pause returns false', 'Unknown health_status returns false', 'Missing fields return false'],
        }],
    // Audit trail chain validation (v8.0.0 — Commons Protocol)
    ['audit_trail_chain_valid', {
            name: 'audit_trail_chain_valid',
            signature: 'audit_trail_chain_valid(trail) → boolean',
            description: 'Validates structural chain linkage in an audit trail: entries[0].previous_hash must equal genesis_hash, and entries[i].previous_hash must equal entries[i-1].entry_hash for all i > 0. Does NOT recompute content hashes.',
            arguments: [
                { name: 'trail', type: 'object', description: 'Object with entries (array of {entry_hash, previous_hash, ...}) and genesis_hash fields.' },
            ],
            return_type: 'boolean',
            short_circuit: false,
            examples: [
                {
                    description: 'Empty trail is valid',
                    context: { t: { entries: [], genesis_hash: 'sha256:e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855' } },
                    expression: 'audit_trail_chain_valid(t)',
                    expected: true,
                },
                {
                    description: 'Single entry linked to genesis',
                    context: { t: { entries: [{ entry_hash: 'sha256:aaaa', previous_hash: 'sha256:0000' }], genesis_hash: 'sha256:0000' } },
                    expression: 'audit_trail_chain_valid(t)',
                    expected: true,
                },
                {
                    description: 'Broken genesis link',
                    context: { t: { entries: [{ entry_hash: 'sha256:aaaa', previous_hash: 'sha256:ffff' }], genesis_hash: 'sha256:0000' } },
                    expression: 'audit_trail_chain_valid(t)',
                    expected: false,
                },
            ],
            edge_cases: ['Missing entries field returns false', 'Missing genesis_hash returns false', 'Entry without entry_hash breaks chain for next entry'],
        }],
    ['is_valid_dag', {
            name: 'is_valid_dag',
            signature: 'is_valid_dag(items, id_field, ...ref_fields) → boolean',
            description: 'Post-order DFS DAG validator with explicit op-counter (cap 10⁵). Returns true when items form a valid DAG: no cycles, no dangling refs, all ids present and string-typed, no duplicates, and within size/op budgets. The constraint-DSL surface returns boolean; the standalone evaluateIsValidDag() exposes the structured ErrorEnvelope diagnostic per SDD section 6.5.',
            arguments: [
                { name: 'items', type: 'unknown[]', description: 'Array of records keyed by id_field. Non-array input is treated as vacuously valid (returns true).' },
                { name: 'id_field', type: 'string', description: 'Field name on each item that uniquely identifies the node.' },
                { name: '...ref_fields', type: 'string[]', description: 'Zero or more dotted-path field names that resolve to outgoing-edge node ids on each item.' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Empty array is vacuously valid',
                    context: { items: [] },
                    expression: "is_valid_dag(items, 'id')",
                    expected: true,
                },
                {
                    description: 'Multi-parent DAG (A → B, A → C, B → D, C → D)',
                    context: {
                        items: [
                            { id: 'A', l: 'B', r: 'C' },
                            { id: 'B', l: 'D' },
                            { id: 'C', l: 'D' },
                            { id: 'D' },
                        ],
                    },
                    expression: "is_valid_dag(items, 'id', 'l', 'r')",
                    expected: true,
                },
                {
                    description: 'Cycle (A → B → A) is invalid',
                    context: {
                        items: [
                            { id: 'A', n: 'B' },
                            { id: 'B', n: 'A' },
                        ],
                    },
                    expression: "is_valid_dag(items, 'id', 'n')",
                    expected: false,
                },
            ],
            edge_cases: [
                'Empty items array returns true (vacuous)',
                'Self-loop (item references itself) returns false (DAG_CYCLE_DETECTED)',
                'Dangling ref (id not in items) returns false (DAG_DANGLING_REF)',
                'Missing id_field on any item returns false (DAG_MISSING_ID_FIELD)',
                'Non-string id_field value returns false (DAG_NON_STRING_ID_FIELD)',
                'Duplicate ids return false (DAG_DUPLICATE_ID with collision indices)',
                'Op count exceeding 10⁵ returns false (DAG_OP_CAP_EXCEEDED with phase indicator)',
                'Items count > 10_000 returns false (DAG_INPUT_OVERSIZE { kind: "items_count" })',
                'Serialized payload > 1 MiB returns false (DAG_INPUT_OVERSIZE { kind: "bytes" })',
                'extract_path is dot-only — bracket-syntax `[N]` returns undefined and is treated as no-ref',
            ],
        }],
    // State-bearing protocol builtins (v8.6.0, PR-A3.3 — FR-C1/C2/C3)
    ['nonce_unique_per_signer_window', {
            name: 'nonce_unique_per_signer_window',
            signature: 'nonce_unique_per_signer_window(record, signer_id_field, nonce_field) → boolean',
            description: 'State-bearing replay-detection check. Returns true when the (signer_id, nonce) pair on the record has not been observed within the per-signer sliding window supplied via EvaluationContext.nonce_window. When the window is unset, the standalone evaluator returns NONCE_CONTEXT_DEFERRED and the DSL wrapper passes (true) — consumers wanting the diagnostic surface should call the standalone evaluateNonceUniquePerSignerWindow().',
            arguments: [
                { name: 'record', type: 'object', description: 'The single record under validation. Must contain string-typed signer_id_field and nonce_field values.' },
                { name: 'signer_id_field', type: 'string', description: 'Field name on the record carrying the signer identifier.' },
                { name: 'nonce_field', type: 'string', description: 'Field name on the record carrying the nonce value.' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'No nonce_window state supplied → defers to consumer (returns true)',
                    context: { record: { signer_id: 'agent-a', nonce: 'n1' } },
                    expression: "nonce_unique_per_signer_window(record, 'signer_id', 'nonce')",
                    expected: true,
                },
                {
                    description: 'Non-object record returns false (NONCE_INVALID_INPUT diagnostic)',
                    context: { record: null },
                    expression: "nonce_unique_per_signer_window(record, 'signer_id', 'nonce')",
                    expected: false,
                },
            ],
            edge_cases: [
                'Non-object record returns false (NONCE_INVALID_INPUT)',
                'Missing signer_id_field or nonce_field returns false (NONCE_INVALID_INPUT)',
                'nonce_window state absent returns true with NONCE_CONTEXT_DEFERRED diagnostic (consumer-deferred)',
                'Nonce found in signer\'s set returns false (NONCE_REPLAY_DETECTED)',
                'Signer not in per_signer map → fresh nonce, returns true',
            ],
        }],
    ['sequence_monotonic_per_cluster', {
            name: 'sequence_monotonic_per_cluster',
            signature: 'sequence_monotonic_per_cluster(record, cluster_id_field, signer_id_field, sequence_field, key_version_field) → boolean',
            description: 'State-bearing per-cluster sequence + key-version monotonicity check. CT-08 cluster-id mismatch fires BEFORE any state lookup; CT-03 string→BigInt parsing uses a numeric-regex pre-validator so BigInt() never throws. Reads sequence_state from EvaluationContext.',
            arguments: [
                { name: 'record', type: 'object', description: 'The single record under validation.' },
                { name: 'cluster_id_field', type: 'string', description: 'Field name carrying the cluster identifier.' },
                { name: 'signer_id_field', type: 'string', description: 'Field name carrying the signer identifier.' },
                { name: 'sequence_field', type: 'string', description: 'Field name carrying the string-encoded BigInt sequence number.' },
                { name: 'key_version_field', type: 'string', description: 'Field name carrying the string-encoded BigInt key version.' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'No sequence_state supplied → defers to consumer (returns true)',
                    context: { record: { cluster_id: 'c1', signer_id: 's1', sequence: '1', key_version: '0' } },
                    expression: "sequence_monotonic_per_cluster(record, 'cluster_id', 'signer_id', 'sequence', 'key_version')",
                    expected: true,
                },
                {
                    // Iter-3 MEDIUM F11 mitigation: CT-03 numeric-regex pre-validation
                    // fires BEFORE the state-absent deferral check (Postel's Law
                    // walk-back). Malformed '007' is a data-shape error regardless of
                    // state presence — surfaces SEQUENCE_INVALID_INPUT immediately
                    // rather than deferring on garbage. This example demonstrates
                    // the new ordering: '007' record + no state → standalone
                    // evaluator returns SEQUENCE_INVALID_INPUT, DSL wrapper returns
                    // false. Iter-2 LOW F10 had a related concern about the previous
                    // misleading example pairing — both are resolved by the iter-3
                    // reorder (the deferred-on-garbage case no longer exists).
                    description: 'CT-03 fires before state-absent deferral (iter-3 F11 reorder): ' +
                        'malformed sequence "007" returns SEQUENCE_INVALID_INPUT ' +
                        'regardless of state presence — data-shape errors are not ' +
                        'deferrable per Postel\'s Law walk-back.',
                    context: { record: { cluster_id: 'c1', signer_id: 's1', sequence: '007', key_version: '0' } },
                    expression: "sequence_monotonic_per_cluster(record, 'cluster_id', 'signer_id', 'sequence', 'key_version')",
                    expected: false,
                },
            ],
            edge_cases: [
                'CT-08: cluster_id mismatch returns false (CLUSTER_ID_MISMATCH) — fires BEFORE state lookup',
                'CT-03: malformed sequence/key_version (non-numeric, leading zero, sign) returns false (SEQUENCE_INVALID_INPUT) ONLY when state is present; without state the deferred path returns true with SEQUENCE_CONTEXT_DEFERRED diagnostic',
                'Key-version regression returns false (KEY_VERSION_REGRESSION)',
                'Sequence ≤ last-observed for (signer, key_version) returns false (SEQUENCE_MONOTONIC_VIOLATION)',
                'Key-rotation overlap: same sequence under newer key_version is allowed (separate composite key)',
                'Iter-2 F10 contrast: examples in this spec entry exercise only the deferred path (no sequence_state) because EVALUATOR_BUILTIN_SPECS examples are executed by the test runner without an EvaluationContext; the state-present path is exercised by tests in tests/constraints/sequence-monotonic-per-cluster.test.ts',
            ],
        }],
    ['chain_validator_prev_hash', {
            name: 'chain_validator_prev_hash',
            signature: 'chain_validator_prev_hash(chain, entry_hash_field, previous_hash_field) → boolean',
            description: 'Ledger-style chain validity check. Asserts (1) each record\'s previous_hash equals its predecessor\'s entry_hash, (2) the chain anchors at the configured genesis sentinel, and (3) NA-1: the audit-ledger\'s expected_prior_hash matches the chain\'s on-payload value per index. Distinct from ORD-3 is_valid_dag (which validates the delegation DAG, not a linear ledger chain). Reads chain_ledger from EvaluationContext.',
            arguments: [
                { name: 'chain', type: 'unknown[]', description: 'Array of cluster-event records ordered from genesis-rooted to most-recent.' },
                { name: 'entry_hash_field', type: 'string', description: 'Field name on each record carrying that record\'s own hash.' },
                { name: 'previous_hash_field', type: 'string', description: 'Field name carrying the hash of the predecessor (or genesis sentinel for index 0).' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'No chain_ledger state supplied → defers to consumer (returns true)',
                    context: { chain: [{ entry_hash: 'h1', previous_hash: 'genesis:cluster-ledger' }] },
                    expression: "chain_validator_prev_hash(chain, 'entry_hash', 'previous_hash')",
                    expected: true,
                },
                {
                    description: 'Empty chain returns true (vacuous)',
                    context: { chain: [] },
                    expression: "chain_validator_prev_hash(chain, 'entry_hash', 'previous_hash')",
                    expected: true,
                },
            ],
            edge_cases: [
                'Empty chain returns true (vacuous)',
                'First record\'s previous_hash != genesis sentinel returns false (CHAIN_GENESIS_VIOLATION)',
                'Successor\'s previous_hash != predecessor\'s entry_hash returns false (CHAIN_PREV_HASH_MISMATCH)',
                'NA-1: audit-ledger expected_prior_hash[i] != chain[i].previous_hash returns false (CHAIN_LEDGER_MISMATCH)',
                'Audit-ledger has no entry for index i → no NA-1 cross-check fires (consumer hasn\'t recorded yet)',
                'Custom genesis_hash via state.genesis_hash overrides the default sentinel',
            ],
        }],
    // LOCAL helper builtins (v8.6.0, PR-A3.4 — FR-B2 / NFR-4)
    ['canonical_size_cap', {
            name: 'canonical_size_cap',
            signature: 'canonical_size_cap(value, byte_cap) → boolean',
            description: 'LOCAL pure-shape NFR-4 size-cap check. Returns true when the input value\'s RFC 8785 + NFC-normalized canonical-JSON byte length is ≤ byte_cap; false with CANONICAL_SIZE_CAP_EXCEEDED diagnostic otherwise. No consumer state needed — the cap is a property of the value alone. Used by FR-B2 PhaseCompletionEnvelope (4 KB cap) and any future schema declaring \'x-canonical-size-cap-bytes\' metadata.',
            arguments: [
                { name: 'value', type: 'unknown', description: 'Value whose canonical-JSON form is bounded.' },
                { name: 'byte_cap', type: 'number', description: 'Cap in bytes (FR-B2 default 4096).' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Empty object well within 4 KB cap',
                    context: { value: {} },
                    expression: 'canonical_size_cap(value, 4096)',
                    expected: true,
                },
                {
                    description: 'Tiny payload under 100-byte cap',
                    context: { value: { kind: 'small' } },
                    expression: 'canonical_size_cap(value, 100)',
                    expected: true,
                },
            ],
            edge_cases: [
                'Cap exceeded returns false (CANONICAL_SIZE_CAP_EXCEEDED)',
                'Negative byte_cap rejected as CANONICAL_SIZE_CAP_INVALID_INPUT',
                'Non-integer byte_cap rejected as CANONICAL_SIZE_CAP_INVALID_INPUT',
                'safeCanonicalize rejection (NFC malformed, key collision) surfaces as CANONICAL_SIZE_CAP_INVALID_INPUT',
                'Boundary case: exactly-cap-bytes payload returns true (≤ check, not <)',
            ],
        }],
    ['signer_key_id_matches_derivation', {
            name: 'signer_key_id_matches_derivation',
            signature: 'signer_key_id_matches_derivation(record, cluster_id_field, key_version_field, key_id_field) → boolean',
            description: 'LOCAL pure-shape derivation check. Asserts that the record\'s asserted key_id field equals sha256_hex(cluster_id || ":" || key_version). Closes the FR-B2 schema-side derivation gap so consumers cannot supply a shape-valid but cryptographically-meaningless signer_key_id. No consumer state needed — the derivation is computable from the record alone.',
            arguments: [
                { name: 'record', type: 'object', description: 'The record under validation.' },
                { name: 'cluster_id_field', type: 'string', description: 'Field name carrying the cluster identifier.' },
                { name: 'key_version_field', type: 'string', description: 'Field name carrying the string-encoded key version.' },
                { name: 'key_id_field', type: 'string', description: 'Field name carrying the asserted key_id (sha256 hex).' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Matching derivation: sha256("c1:1") = lowercase hex matches asserted',
                    context: {
                        record: {
                            cid: 'c1',
                            kv: '1',
                            kid: '10ddafe9d244afb4247309479b5719ed5149e05875954896ee58c2539ebe1bb5',
                        },
                    },
                    expression: "signer_key_id_matches_derivation(record, 'cid', 'kv', 'kid')",
                    expected: true,
                },
                {
                    description: 'Mismatching key_id returns false (SIGNER_KEY_ID_MISMATCH)',
                    context: {
                        record: {
                            cid: 'c1',
                            kv: '1',
                            kid: '0000000000000000000000000000000000000000000000000000000000000000',
                        },
                    },
                    expression: "signer_key_id_matches_derivation(record, 'cid', 'kv', 'kid')",
                    expected: false,
                },
            ],
            edge_cases: [
                'Mismatching key_id returns false (SIGNER_KEY_ID_MISMATCH)',
                'Non-string fields return false (SIGNER_KEY_ID_INVALID_INPUT)',
                'Null record returns false (SIGNER_KEY_ID_INVALID_INPUT)',
                'Case-insensitive comparison: uppercase hex on the wire matches lowercase derivation',
                'NFC normalization is applied to BOTH inputs before hashing (homograph-attack mitigation per iter-1 review e0c46b14): String.prototype.normalize("NFC") in TS; equivalent in Go/Python/Rust per the cross-runner conformance contract',
                'Colon delimiter is byte-stable (ASCII 0x3A); cross-runner authors use the same delimiter byte',
            ],
        }],
    // LOCAL helper builtin (v8.6.0, PR-A3.5 — FR-B7 LatencyHistogramEnvelope)
    ['percentiles_monotonic_nondecreasing', {
            name: 'percentiles_monotonic_nondecreasing',
            signature: 'percentiles_monotonic_nondecreasing(measurements) → boolean',
            description: 'LOCAL pure-shape latency-percentile monotonicity check. Asserts p50_ms ≤ p95_ms ≤ p99_ms ≤ max_ms on a LatencyHistogramEnvelope.measurements object. No consumer state needed — the property is evaluable from the envelope content alone. Reports the FIRST violating pair so operators see the specific failing transition.',
            arguments: [
                { name: 'measurements', type: 'object', description: 'Object with finite non-negative number fields p50_ms, p95_ms, p99_ms, max_ms.' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'Strict ascending percentiles pass',
                    context: { measurements: { p50_ms: 10, p95_ms: 50, p99_ms: 100, max_ms: 200 } },
                    expression: 'percentiles_monotonic_nondecreasing(measurements)',
                    expected: true,
                },
                {
                    description: 'All-equal percentiles pass (≤ allows equality)',
                    context: { measurements: { p50_ms: 5, p95_ms: 5, p99_ms: 5, max_ms: 5 } },
                    expression: 'percentiles_monotonic_nondecreasing(measurements)',
                    expected: true,
                },
            ],
            edge_cases: [
                'p50 > p95 returns false (PERCENTILES_MONOTONIC_VIOLATION at p95_ms < p50_ms)',
                'p95 > p99 returns false (PERCENTILES_MONOTONIC_VIOLATION at p99_ms < p95_ms)',
                'p99 > max returns false (PERCENTILES_MONOTONIC_VIOLATION at max_ms < p99_ms)',
                'Equal percentiles allowed (non-strict ≤ check)',
                'Negative percentile (e.g., p50_ms = -1) returns false (PERCENTILES_MONOTONIC_INVALID_INPUT) — latencies are by definition non-negative',
                'Non-finite numeric (NaN, Infinity) returns false (PERCENTILES_MONOTONIC_INVALID_INPUT)',
                'Missing field returns false (PERCENTILES_MONOTONIC_INVALID_INPUT)',
                'Non-object measurements returns false (PERCENTILES_MONOTONIC_INVALID_INPUT)',
            ],
        }],
    // LOCAL helper builtin (v8.6.0, PR-A3.5 iter-1 F-002 — FR-B3 OracleDigest)
    ['utf8_byte_length_max', {
            name: 'utf8_byte_length_max',
            signature: 'utf8_byte_length_max(value, byte_cap) → boolean',
            description: 'LOCAL pure-shape UTF-8 byte-length cap. Returns true when the input string\'s UTF-8 byte length is ≤ byte_cap. DISTINCT from JSON Schema\'s `maxLength` keyword: `maxLength` counts UTF-16 code units (in JS) or codepoints (in some implementations), NOT UTF-8 bytes. A 4096-emoji string is `maxLength: 4096` valid (4096 code units, ~16 KB UTF-8 bytes). Used to enforce downstream-system byte caps (Telegram 4 KB, Twitter pre-2018 280 bytes) where the wire-protocol limit is bytes, not characters.',
            arguments: [
                { name: 'value', type: 'string', description: 'UTF-8 string whose byte length is bounded.' },
                { name: 'byte_cap', type: 'number', description: 'Positive integer byte cap (inclusive — actual_bytes ≤ byte_cap).' },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'ASCII string within cap passes',
                    context: { value: 'hello world' },
                    expression: 'utf8_byte_length_max(value, 4096)',
                    expected: true,
                },
                {
                    description: 'Multi-byte string under code-unit cap but over byte cap fails (the F-002 wire bug)',
                    context: { value: '\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}\u{1F4A9}' },
                    expression: 'utf8_byte_length_max(value, 16)',
                    expected: false,
                },
            ],
            edge_cases: [
                'ASCII length === byte length (1 byte/char)',
                'CJK consume 3 UTF-8 bytes/char; emoji consume 4 bytes/char',
                'Empty string passes any positive cap',
                'Exact-cap (actual_bytes === byte_cap) passes (≤ check)',
                'Non-string value returns false (UTF8_BYTE_LENGTH_INVALID_INPUT)',
                'Non-positive or non-integer byte_cap returns false (UTF8_BYTE_LENGTH_INVALID_INPUT)',
                'Cross-runner: TS new TextEncoder().encode(s).length (web-standard, runs in Node/Workers/Edge/Deno/browsers); Go len([]byte(s)); Python len(s.encode("utf-8")); Rust s.len() — all yield the same byte count for valid UTF-8 input',
            ],
        }],
    // State-bearing plan-binding builtin (v8.6.0, PR-A3.6 — FR-C4)
    ['plan_content_hash_unchanged_since_signoff', {
            name: 'plan_content_hash_unchanged_since_signoff',
            signature: 'plan_content_hash_unchanged_since_signoff(plan_content_hash) → boolean',
            description: 'State-bearing plan-binding check. Asserts the plan_content_hash is present in the consumer-supplied signoff ledger snapshot. On hash-match (PASS), emits a SIGNOFF_TTL_OBSERVED manifest entry surfacing ts_emit + ttl_until_ms (NA-3) so consumers cannot accidentally validate plan-hash without seeing TTL inputs. TTL enforcement is OUT (ADR-010 / NFR-8). Reads plan_signoff_ledger from EvaluationContext. The DSL boolean collapses pass/deferred to true and fail to false; the structured manifest entry is reachable via the standalone evaluator.',
            arguments: [
                {
                    name: 'plan_content_hash',
                    type: 'string',
                    description: 'sha256:<64-hex> hash of the plan content. The schema-level pattern guarantees the format; the builtin compares as a literal string (no case normalization).',
                },
            ],
            return_type: 'boolean',
            short_circuit: true,
            examples: [
                {
                    description: 'No plan_signoff_ledger supplied → defers to consumer (returns true)',
                    context: { plan_content_hash: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' },
                    expression: 'plan_content_hash_unchanged_since_signoff(plan_content_hash)',
                    expected: true,
                },
                {
                    description: 'Non-string plan_content_hash → result: fail (programmer error / schema bypass)',
                    context: { plan_content_hash: 42 },
                    expression: 'plan_content_hash_unchanged_since_signoff(plan_content_hash)',
                    expected: false,
                },
            ],
            edge_cases: [
                'Snapshot absent → result: deferred, manifest LEDGER_CONTEXT_DEFERRED, boolean true',
                'Hash present in snapshot → result: pass, manifest SIGNOFF_TTL_OBSERVED with ts_emit + ttl_until_ms (NA-3), boolean true',
                'Hash absent from snapshot → result: fail, manifest SIGNOFF_PLAN_HASH_MISMATCH, boolean false',
                'Non-string plan_hash argument → result: fail (programmer error / schema bypass)',
                'Malformed snapshot.signoffs (not an array) → result: fail (trust-boundary shape check)',
                'Cross-runner: Date.parse + Number(ttl_seconds_at_emit) * 1000 yields the absolute epoch-ms expiry; consumer compares against ts_snapshot or wall-clock per their policy',
            ],
        }],
]);
//# sourceMappingURL=evaluator-spec.js.map