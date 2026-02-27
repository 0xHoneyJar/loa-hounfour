import { type Static } from '@sinclair/typebox';
/**
 * Schema for agent-authored constraint proposals.
 *
 * Agents propose new constraints as structured data that goes through
 * multi-model adversarial review (Flatline Protocol) before acceptance.
 * The proposal captures the wire format; the review pipeline is a runtime concern.
 */
export declare const ConstraintProposalSchema: import("@sinclair/typebox").TObject<{
    proposal_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    target_schema_id: import("@sinclair/typebox").TString;
    proposed_constraints: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        id: import("@sinclair/typebox").TString;
        expression: import("@sinclair/typebox").TString;
        severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"error">, import("@sinclair/typebox").TLiteral<"warning">]>;
        message: import("@sinclair/typebox").TString;
        fields: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>>;
    rationale: import("@sinclair/typebox").TString;
    expression_version: import("@sinclair/typebox").TString;
    /** Maximum expression grammar version this constraint is valid for. When the grammar evolves beyond this version, the constraint should be re-evaluated or retired. */
    sunset_version: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    review_status: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"under_review">, import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"rejected">]>>;
    review_scores: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        reviewer_model: import("@sinclair/typebox").TString;
        score: import("@sinclair/typebox").TInteger;
        rationale: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>>;
    consensus_category: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"HIGH_CONSENSUS">, import("@sinclair/typebox").TLiteral<"DISPUTED">, import("@sinclair/typebox").TLiteral<"LOW_VALUE">, import("@sinclair/typebox").TLiteral<"BLOCKER">]>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ConstraintProposal = Static<typeof ConstraintProposalSchema>;
//# sourceMappingURL=constraint-proposal.d.ts.map