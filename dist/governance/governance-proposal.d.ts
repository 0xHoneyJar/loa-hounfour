/**
 * Governance Proposal — collective voice for protocol parameter changes.
 *
 * Implements the formal proposal lifecycle: propose -> vote -> ratify/reject.
 * Ensures every protocol parameter change has an audit trail with votes.
 *
 * @see SDD §2.6 — GovernanceProposal Schema
 * @since v7.0.0
 */
import { type Static } from '@sinclair/typebox';
/** @governance protocol-fixed */
export declare const ProposalStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"voting">, import("@sinclair/typebox").TLiteral<"ratified">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
export type ProposalStatus = Static<typeof ProposalStatusSchema>;
export declare const PROPOSAL_STATUS_TRANSITIONS: Record<ProposalStatus, readonly ProposalStatus[]>;
export declare const ProposedChangeSchema: import("@sinclair/typebox").TObject<{
    change_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"parameter_update">, import("@sinclair/typebox").TLiteral<"constraint_addition">, import("@sinclair/typebox").TLiteral<"constraint_removal">, import("@sinclair/typebox").TLiteral<"policy_change">]>;
    target: import("@sinclair/typebox").TString;
    current_value: import("@sinclair/typebox").TUnknown;
    proposed_value: import("@sinclair/typebox").TUnknown;
    justification: import("@sinclair/typebox").TString;
}>;
export type ProposedChange = Static<typeof ProposedChangeSchema>;
export declare const GovernanceVoteSchema: import("@sinclair/typebox").TObject<{
    voter_id: import("@sinclair/typebox").TString;
    vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"approve">, import("@sinclair/typebox").TLiteral<"reject">, import("@sinclair/typebox").TLiteral<"abstain">]>;
    weight: import("@sinclair/typebox").TNumber;
    reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type GovernanceVote = Static<typeof GovernanceVoteSchema>;
export declare const VotingRecordSchema: import("@sinclair/typebox").TObject<{
    quorum_required: import("@sinclair/typebox").TNumber;
    votes_cast: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        voter_id: import("@sinclair/typebox").TString;
        vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"approve">, import("@sinclair/typebox").TLiteral<"reject">, import("@sinclair/typebox").TLiteral<"abstain">]>;
        weight: import("@sinclair/typebox").TNumber;
        reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    voting_opened_at: import("@sinclair/typebox").TString;
    voting_closed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
}>;
export type VotingRecord = Static<typeof VotingRecordSchema>;
export declare const GovernanceProposalSchema: import("@sinclair/typebox").TObject<{
    proposal_id: import("@sinclair/typebox").TString;
    registry_id: import("@sinclair/typebox").TString;
    proposer_id: import("@sinclair/typebox").TString;
    title: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    changes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        change_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"parameter_update">, import("@sinclair/typebox").TLiteral<"constraint_addition">, import("@sinclair/typebox").TLiteral<"constraint_removal">, import("@sinclair/typebox").TLiteral<"policy_change">]>;
        target: import("@sinclair/typebox").TString;
        current_value: import("@sinclair/typebox").TUnknown;
        proposed_value: import("@sinclair/typebox").TUnknown;
        justification: import("@sinclair/typebox").TString;
    }>>;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"voting">, import("@sinclair/typebox").TLiteral<"ratified">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"withdrawn">]>;
    voting: import("@sinclair/typebox").TObject<{
        quorum_required: import("@sinclair/typebox").TNumber;
        votes_cast: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
            voter_id: import("@sinclair/typebox").TString;
            vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"approve">, import("@sinclair/typebox").TLiteral<"reject">, import("@sinclair/typebox").TLiteral<"abstain">]>;
            weight: import("@sinclair/typebox").TNumber;
            reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        }>>;
        voting_opened_at: import("@sinclair/typebox").TString;
        voting_closed_at: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TString, import("@sinclair/typebox").TNull]>;
    }>;
    ratified_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    execution_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    collection_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type GovernanceProposal = Static<typeof GovernanceProposalSchema>;
//# sourceMappingURL=governance-proposal.d.ts.map