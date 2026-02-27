import { type Static } from '@sinclair/typebox';
export declare const SanctionSchema: import("@sinclair/typebox").TObject<{
    sanction_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    severity: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"warning" | "rate_limited" | "pool_restricted" | "suspended" | "terminated">[]>;
    trigger: import("@sinclair/typebox").TObject<{
        violation_type: import("@sinclair/typebox").TUnion<import("@sinclair/typebox").TLiteral<"content_policy" | "rate_abuse" | "billing_fraud" | "identity_spoofing" | "resource_exhaustion" | "community_guideline" | "safety_violation">[]>;
        occurrence_count: import("@sinclair/typebox").TInteger;
        evidence_event_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    }>;
    imposed_by: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"automatic">, import("@sinclair/typebox").TLiteral<"moderator">, import("@sinclair/typebox").TLiteral<"governance_vote">]>;
    imposed_at: import("@sinclair/typebox").TString;
    appeal_available: import("@sinclair/typebox").TBoolean;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    escalation_rule_applied: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
    severity_level: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"warning">, import("@sinclair/typebox").TLiteral<"rate_limited">, import("@sinclair/typebox").TLiteral<"pool_restricted">, import("@sinclair/typebox").TLiteral<"suspended">]>>;
    duration_seconds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    appeal_dispute_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    escalated_from: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
}>;
export type Sanction = Static<typeof SanctionSchema>;
//# sourceMappingURL=sanction.d.ts.map