/**
 * DelegationChain schema — authority delegation provenance with depth limits.
 *
 * Models the chain of authority delegation between agents: who delegated
 * what authority to whom, with what budget, and what was the outcome.
 * Conservation invariants ensure no link grants more authority than it received.
 *
 * @see SDD §2.1 — DelegationChain (FR-1)
 * @see "Intelligent AI Delegation" (arXiv:2602.11865)
 */
import { Type } from '@sinclair/typebox';
import { MicroUSDUnsigned } from '../../../vocabulary/currency.js';
/**
 * A single link in a delegation chain.
 */
export const DelegationLinkSchema = Type.Object({
    delegator: Type.String({ minLength: 1, description: 'Agent or system delegating authority' }),
    delegatee: Type.String({ minLength: 1, description: 'Agent receiving the delegation' }),
    task_type: Type.String({ minLength: 1, description: 'Kind of work (inference, review, transfer)' }),
    authority_scope: Type.Array(Type.String({ minLength: 1 }), {
        minItems: 1,
        description: 'Permissions transferred (budget_spend, model_select, etc.)',
    }),
    budget_allocated_micro: Type.Optional(MicroUSDUnsigned),
    timestamp: Type.String({ format: 'date-time' }),
    outcome: Type.Union([
        Type.Literal('pending'),
        Type.Literal('completed'),
        Type.Literal('failed'),
        Type.Literal('re-delegated'),
    ]),
    outcome_timestamp: Type.Optional(Type.String({ format: 'date-time' })),
}, { additionalProperties: false });
/**
 * Authority delegation chain with depth limits and conservation invariants.
 */
export const DelegationChainSchema = Type.Object({
    chain_id: Type.String({ format: 'uuid' }),
    root_delegator: Type.String({ minLength: 1, description: 'Original authority source' }),
    links: Type.Array(DelegationLinkSchema, {
        minItems: 1,
        maxItems: 10,
        description: 'Ordered delegation chain, from root outward',
    }),
    max_depth: Type.Integer({ minimum: 1, maximum: 10, description: 'Protocol-enforced depth limit' }),
    authority_conservation: Type.Boolean({
        description: 'Whether total authority is conserved (no link grants more than it received)',
    }),
    status: Type.Union([
        Type.Literal('active'),
        Type.Literal('completed'),
        Type.Literal('failed'),
        Type.Literal('revoked'),
    ]),
    revocation_policy: Type.Optional(Type.Union([
        Type.Literal('cascade'),
        Type.Literal('non_cascade'),
    ], { description: 'FL-PRD-001: Whether revoking a link invalidates all downstream links' })),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
}, {
    $id: 'DelegationChain',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Authority delegation chain with depth limits and conservation invariants.',
});
//# sourceMappingURL=delegation-chain.js.map