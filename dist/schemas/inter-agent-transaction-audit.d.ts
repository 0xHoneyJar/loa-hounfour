/**
 * InterAgentTransactionAudit schema — double-entry audit for agent-to-agent transfers.
 *
 * Every inter-agent economic transaction produces an audit entry. The schema
 * enforces conservation invariants: what the sender loses, the receiver gains.
 * Uses the epistemic tristate (conserved | violated | unverifiable) from
 * ConservationStatus to declare verification state.
 *
 * @see SDD §2.2 — InterAgentTransactionAudit (FR-2)
 * @see "Distributional AGI Safety" (arXiv:2512.16856)
 */
import { type Static } from '@sinclair/typebox';
export declare const InterAgentTransactionAuditSchema: import("@sinclair/typebox").TObject<{
    audit_id: import("@sinclair/typebox").TString;
    transaction_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"peer_transfer">, import("@sinclair/typebox").TLiteral<"delegation_budget">, import("@sinclair/typebox").TLiteral<"service_payment">, import("@sinclair/typebox").TLiteral<"governance_proposal_deposit">]>;
    sender: import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        pre_balance_micro: import("@sinclair/typebox").TString;
        post_balance_micro: import("@sinclair/typebox").TString;
    }>;
    receiver: import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        pre_balance_micro: import("@sinclair/typebox").TString;
        post_balance_micro: import("@sinclair/typebox").TString;
    }>;
    amount_micro: import("@sinclair/typebox").TString;
    conservation_check: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"conserved">, import("@sinclair/typebox").TLiteral<"violated">, import("@sinclair/typebox").TLiteral<"unverifiable">]>;
    idempotency_key: import("@sinclair/typebox").TString;
    delegation_chain_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    governance_context: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TObject<{
        proposal_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        governance_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    sequence_number: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    timestamp: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type InterAgentTransactionAudit = Static<typeof InterAgentTransactionAuditSchema>;
//# sourceMappingURL=inter-agent-transaction-audit.d.ts.map