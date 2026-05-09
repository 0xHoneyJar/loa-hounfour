/**
 * Permission Boundary — MAY semantics for capability-scoped authorization.
 *
 * Defines boundaries within which agents may operate, with reporting
 * requirements and revocation policies.
 *
 * @see SDD §2.5 — PermissionBoundary Schema
 * @since v7.0.0
 */
import { type Static } from '@sinclair/typebox';
export declare const ReportingRequirementSchema: import("@sinclair/typebox").TObject<{
    required: import("@sinclair/typebox").TBoolean;
    report_to: import("@sinclair/typebox").TString;
    frequency: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"per_action">, import("@sinclair/typebox").TLiteral<"per_epoch">, import("@sinclair/typebox").TLiteral<"on_violation">]>;
    format: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"audit_trail">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"detailed">]>;
}>;
export type ReportingRequirement = Static<typeof ReportingRequirementSchema>;
export declare const RevocationPolicySchema: import("@sinclair/typebox").TObject<{
    trigger: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"violation_count">, import("@sinclair/typebox").TLiteral<"governance_vote">, import("@sinclair/typebox").TLiteral<"manual">, import("@sinclair/typebox").TLiteral<"timeout">]>;
    violation_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    timeout_seconds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
}>;
export type RevocationPolicy = Static<typeof RevocationPolicySchema>;
export declare const PermissionBoundarySchema: import("@sinclair/typebox").TObject<{
    boundary_id: import("@sinclair/typebox").TString;
    scope: import("@sinclair/typebox").TString;
    permitted_if: import("@sinclair/typebox").TString;
    reporting: import("@sinclair/typebox").TObject<{
        required: import("@sinclair/typebox").TBoolean;
        report_to: import("@sinclair/typebox").TString;
        frequency: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"per_action">, import("@sinclair/typebox").TLiteral<"per_epoch">, import("@sinclair/typebox").TLiteral<"on_violation">]>;
        format: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"audit_trail">, import("@sinclair/typebox").TLiteral<"summary">, import("@sinclair/typebox").TLiteral<"detailed">]>;
    }>;
    revocation: import("@sinclair/typebox").TObject<{
        trigger: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"violation_count">, import("@sinclair/typebox").TLiteral<"governance_vote">, import("@sinclair/typebox").TLiteral<"manual">, import("@sinclair/typebox").TLiteral<"timeout">]>;
        violation_threshold: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        timeout_seconds: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
    }>;
    severity: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"advisory">, import("@sinclair/typebox").TLiteral<"monitored">]>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type PermissionBoundary = Static<typeof PermissionBoundarySchema>;
//# sourceMappingURL=permission-boundary.d.ts.map