/**
 * DeliberationDissent — mid-deliberation concern, minority verdict, or
 * process objection raised by a juror.
 *
 * Distinct from the governance `DissentRecord` (post-decision formal
 * grievance): a `DeliberationDissent` is an in-flight signal during a
 * single deliberation. Its job is to make a dissent typed and queryable;
 * process semantics live in the consumer runtime.
 *
 * The constraint file (`DeliberationDissent.constraints.json`) holds
 * narrative-length and cited_claim_ids bounds; both are TypeBox-expressible
 * and double up at runtime as belt-and-braces guards.
 *
 * @see SDD section 3.3.3 — Specification frozen (no remaining TBDs)
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-A3, cut-line-eligible to v8.5.0)
 */
import { type Static } from '@sinclair/typebox';
export declare const DeliberationDissentSchema: import("@sinclair/typebox").TObject<{
    dissent_id: import("@sinclair/typebox").TString;
    artifact_id: import("@sinclair/typebox").TString;
    juror: import("@sinclair/typebox").TObject<{
        agent_id: import("@sinclair/typebox").TString;
        display_name: import("@sinclair/typebox").TString;
        agent_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"model">, import("@sinclair/typebox").TLiteral<"orchestrator">, import("@sinclair/typebox").TLiteral<"human">, import("@sinclair/typebox").TLiteral<"service">, import("@sinclair/typebox").TLiteral<"composite">]>;
        capabilities: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        trust_scopes: import("@sinclair/typebox").TObject<{
            scopes: import("@sinclair/typebox").TObject<{
                billing: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                governance: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                inference: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                delegation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                audit: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
                composition: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>>;
            }>;
            default_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"untrusted">, import("@sinclair/typebox").TLiteral<"basic">, import("@sinclair/typebox").TLiteral<"verified">, import("@sinclair/typebox").TLiteral<"trusted">, import("@sinclair/typebox").TLiteral<"sovereign">]>;
            match_strategy: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"exact">, import("@sinclair/typebox").TLiteral<"subset">, import("@sinclair/typebox").TLiteral<"superset">]>>;
            precedence_score: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TInteger>;
        }>;
        delegation_authority: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
        max_delegation_depth: import("@sinclair/typebox").TInteger;
        governance_weight: import("@sinclair/typebox").TNumber;
        metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
        contract_version: import("@sinclair/typebox").TString;
    }>;
    concern_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minority_verdict">, import("@sinclair/typebox").TLiteral<"process_objection">, import("@sinclair/typebox").TLiteral<"mid_deliberation_concern">]>;
    narrative: import("@sinclair/typebox").TString;
    cited_claim_ids: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    raised_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type DeliberationDissent = Static<typeof DeliberationDissentSchema>;
//# sourceMappingURL=deliberation-dissent.d.ts.map