/**
 * Delegation Tree — concurrent multi-model orchestration via tree-structured delegation.
 *
 * While DelegationChain represents linear delegation (A → B → C),
 * DelegationTree supports branching: A delegates to B and C concurrently,
 * each with their own sub-delegations.
 *
 * @see SDD §2.6.1-2.6.5 — DelegationTree, Builtins, Conversion
 * @since v6.0.0
 */
import { type Static } from '@sinclair/typebox';
export declare const ForkTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"parallel">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"conditional">]>;
export type ForkType = Static<typeof ForkTypeSchema>;
export declare const TreeNodeStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
export type TreeNodeStatus = Static<typeof TreeNodeStatusSchema>;
export declare const TreeStrategySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"pipeline">]>;
export type TreeStrategy = Static<typeof TreeStrategySchema>;
export declare const BudgetAllocationSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"equal_split">, import("@sinclair/typebox").TLiteral<"weighted">, import("@sinclair/typebox").TLiteral<"on_demand">]>;
export type BudgetAllocation = Static<typeof BudgetAllocationSchema>;
export declare const DelegationTreeNodeSchema: import("@sinclair/typebox").TRecursive<import("@sinclair/typebox").TObject<{
    node_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    authority_scope: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    budget_allocated_micro: import("@sinclair/typebox").TString;
    children: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TThis>;
    fork_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"parallel">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"conditional">]>;
    join_condition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
    version: import("@sinclair/typebox").TInteger;
    last_outcome: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        outcome_id: import("@sinclair/typebox").TString;
        outcome_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"majority">, import("@sinclair/typebox").TLiteral<"deadlock">, import("@sinclair/typebox").TLiteral<"escalation">]>;
        consensus_achieved: import("@sinclair/typebox").TBoolean;
        resolved_at: import("@sinclair/typebox").TString;
    }>>;
    timestamp: import("@sinclair/typebox").TString;
}>>;
export type DelegationTreeNode = Static<typeof DelegationTreeNodeSchema>;
export declare const DelegationTreeSchema: import("@sinclair/typebox").TObject<{
    tree_id: import("@sinclair/typebox").TString;
    root: import("@sinclair/typebox").TRecursive<import("@sinclair/typebox").TObject<{
        node_id: import("@sinclair/typebox").TString;
        agent_id: import("@sinclair/typebox").TString;
        authority_scope: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        budget_allocated_micro: import("@sinclair/typebox").TString;
        children: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TThis>;
        fork_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"parallel">, import("@sinclair/typebox").TLiteral<"sequential">, import("@sinclair/typebox").TLiteral<"conditional">]>;
        join_condition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"pending">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"completed">, import("@sinclair/typebox").TLiteral<"failed">, import("@sinclair/typebox").TLiteral<"cancelled">]>;
        version: import("@sinclair/typebox").TInteger;
        last_outcome: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
            outcome_id: import("@sinclair/typebox").TString;
            outcome_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"majority">, import("@sinclair/typebox").TLiteral<"deadlock">, import("@sinclair/typebox").TLiteral<"escalation">]>;
            consensus_achieved: import("@sinclair/typebox").TBoolean;
            resolved_at: import("@sinclair/typebox").TString;
        }>>;
        timestamp: import("@sinclair/typebox").TString;
    }>>;
    strategy: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"first_complete">, import("@sinclair/typebox").TLiteral<"best_of_n">, import("@sinclair/typebox").TLiteral<"consensus">, import("@sinclair/typebox").TLiteral<"pipeline">]>;
    total_budget_micro: import("@sinclair/typebox").TString;
    budget_allocation: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"equal_split">, import("@sinclair/typebox").TLiteral<"weighted">, import("@sinclair/typebox").TLiteral<"on_demand">]>;
    max_depth: import("@sinclair/typebox").TInteger;
    max_total_nodes: import("@sinclair/typebox").TInteger;
    created_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type DelegationTree = Static<typeof DelegationTreeSchema>;
/**
 * Convert a DelegationChain to a DelegationTree (single-path, strategy: pipeline).
 */
export declare function chainToTree(chain: {
    root_delegator: string;
    links: Array<{
        delegator: string;
        delegatee: string;
        authority_scope: string[];
        budget_allocated_micro?: string;
        timestamp?: string;
    }>;
    max_depth?: number;
}): DelegationTree;
/**
 * Convert a DelegationTree to a DelegationChain if the tree has no branching.
 * Returns null if any node has more than one child.
 */
export declare function treeToChain(tree: DelegationTree): {
    root_delegator: string;
    links: Array<{
        delegator: string;
        delegatee: string;
        authority_scope: string[];
        budget_allocated_micro: string;
        timestamp: string;
    }>;
    max_depth: number;
} | null;
//# sourceMappingURL=delegation-tree.d.ts.map