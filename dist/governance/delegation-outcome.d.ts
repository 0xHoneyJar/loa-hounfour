/**
 * Delegation Outcome — results of delegated governance decisions.
 *
 * Captures the outcome of a delegation tree node's decision process,
 * including votes, consensus measurement, dissent records, and escalation.
 *
 * @see SDD §2.3 — DelegationOutcome Schema
 * @since v7.0.0
 */
import { type Static } from '@sinclair/typebox';
/** @governance protocol-fixed */
export declare const OutcomeTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"majority">, import("@sinclair/typebox").TLiteral<"deadlock">, import("@sinclair/typebox").TLiteral<"escalation">]>;
export type OutcomeType = Static<typeof OutcomeTypeSchema>;
/** @governance protocol-fixed */
export declare const VoteChoiceSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agree">, import("@sinclair/typebox").TLiteral<"disagree">, import("@sinclair/typebox").TLiteral<"abstain">]>;
export type VoteChoice = Static<typeof VoteChoiceSchema>;
export declare const DelegationVoteSchema: import("@sinclair/typebox").TObject<{
    voter_id: import("@sinclair/typebox").TString;
    vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agree">, import("@sinclair/typebox").TLiteral<"disagree">, import("@sinclair/typebox").TLiteral<"abstain">]>;
    result: import("@sinclair/typebox").TUnknown;
    confidence: import("@sinclair/typebox").TNumber;
    reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type DelegationVote = Static<typeof DelegationVoteSchema>;
export declare const DissentTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minority_report">, import("@sinclair/typebox").TLiteral<"abstention">, import("@sinclair/typebox").TLiteral<"timeout">]>;
export type DissentType = Static<typeof DissentTypeSchema>;
export declare const DissentSeveritySchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"informational">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"blocking">]>;
export type DissentSeverity = Static<typeof DissentSeveritySchema>;
export declare const DissentRecordSchema: import("@sinclair/typebox").TObject<{
    dissenter_id: import("@sinclair/typebox").TString;
    dissent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minority_report">, import("@sinclair/typebox").TLiteral<"abstention">, import("@sinclair/typebox").TLiteral<"timeout">]>;
    proposed_alternative: import("@sinclair/typebox").TUnknown;
    reasoning: import("@sinclair/typebox").TString;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"informational">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"blocking">]>;
    acknowledged: import("@sinclair/typebox").TBoolean;
    acknowledged_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    acknowledged_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    acknowledgment_response: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type DissentRecord = Static<typeof DissentRecordSchema>;
export declare const DelegationOutcomeSchema: import("@sinclair/typebox").TObject<{
    outcome_id: import("@sinclair/typebox").TString;
    tree_node_id: import("@sinclair/typebox").TString;
    outcome_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"unanimous">, import("@sinclair/typebox").TLiteral<"majority">, import("@sinclair/typebox").TLiteral<"deadlock">, import("@sinclair/typebox").TLiteral<"escalation">]>;
    result: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TUnknown, import("@sinclair/typebox").TNull]>;
    votes: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        voter_id: import("@sinclair/typebox").TString;
        vote: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"agree">, import("@sinclair/typebox").TLiteral<"disagree">, import("@sinclair/typebox").TLiteral<"abstain">]>;
        result: import("@sinclair/typebox").TUnknown;
        confidence: import("@sinclair/typebox").TNumber;
        reasoning: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    consensus_achieved: import("@sinclair/typebox").TBoolean;
    consensus_threshold: import("@sinclair/typebox").TNumber;
    dissent_records: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        dissenter_id: import("@sinclair/typebox").TString;
        dissent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minority_report">, import("@sinclair/typebox").TLiteral<"abstention">, import("@sinclair/typebox").TLiteral<"timeout">]>;
        proposed_alternative: import("@sinclair/typebox").TUnknown;
        reasoning: import("@sinclair/typebox").TString;
        severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"informational">, import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"blocking">]>;
        acknowledged: import("@sinclair/typebox").TBoolean;
        acknowledged_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        acknowledged_by: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
        acknowledgment_response: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    }>>;
    escalated_to: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    escalation_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    resolved_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type DelegationOutcome = Static<typeof DelegationOutcomeSchema>;
//# sourceMappingURL=delegation-outcome.d.ts.map