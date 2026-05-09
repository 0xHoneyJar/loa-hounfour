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
import { type Static } from '@sinclair/typebox';
/**
 * A single link in a delegation chain.
 */
export declare const DelegationLinkSchema: import("@sinclair/typebox").TObject<{
    delegator: import("@sinclair/typebox").TString;
    delegatee: import("@sinclair/typebox").TString;
    task_type: import("@sinclair/typebox").TString;
    authority_scope: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    budget_allocated_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    timestamp: import("@sinclair/typebox").TString;
    outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"re-delegated">]>;
    outcome_timestamp: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type DelegationLink = Static<typeof DelegationLinkSchema>;
/**
 * Authority delegation chain with depth limits and conservation invariants.
 */
export declare const DelegationChainSchema: import("@sinclair/typebox").TObject<{
    chain_id: import("@sinclair/typebox").TString;
    root_delegator: import("@sinclair/typebox").TString;
    links: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        delegator: import("@sinclair/typebox").TString;
        delegatee: import("@sinclair/typebox").TString;
        task_type: import("@sinclair/typebox").TString;
        authority_scope: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        budget_allocated_micro: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        timestamp: import("@sinclair/typebox").TString;
        outcome: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"re-delegated">]>;
        outcome_timestamp: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    max_depth: import("@sinclair/typebox").TInteger;
    authority_conservation: import("@sinclair/typebox").TBoolean;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"revoked">]>;
    revocation_policy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cascade">, import("@sinclair/typebox").TLiteral<"non_cascade">]>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type DelegationChain = Static<typeof DelegationChainSchema>;
//# sourceMappingURL=delegation-chain.d.ts.map