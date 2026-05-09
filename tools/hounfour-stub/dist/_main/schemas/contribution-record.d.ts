import { type Static } from '@sinclair/typebox';
export declare const ContributionRecordSchema: import("@sinclair/typebox").TObject<{
    contribution_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    contribution_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"curation">, import("@sinclair/typebox").TLiteral<"training">, import("@sinclair/typebox").TLiteral<"validation">, import("@sinclair/typebox").TLiteral<"moderation">, import("@sinclair/typebox").TLiteral<"infrastructure">, import("@sinclair/typebox").TLiteral<"capital">]>;
    value_micro: import("@sinclair/typebox").TString;
    assessed_by: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self">, import("@sinclair/typebox").TLiteral<"peer">, import("@sinclair/typebox").TLiteral<"algorithmic">, import("@sinclair/typebox").TLiteral<"governance_vote">]>;
    assessed_at: import("@sinclair/typebox").TString;
    evidence_event_ids: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ContributionRecord = Static<typeof ContributionRecordSchema>;
//# sourceMappingURL=contribution-record.d.ts.map