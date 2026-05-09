/**
 * OrgIdentity — cold-storage org public key + current representatives + constitutional hash.
 *
 * Carries the long-lived cryptographic root of an organization (`org_public_key`),
 * the snapshot of currently-active representative `AgentIdentity` records, and a
 * `constitutional_hash` binding the org to its founding constraint set.
 *
 * The minimum-representative invariant (`current_representatives.length >= 1`,
 * SP-007) is enforced both as a TypeBox `minItems: 1` field constraint and as
 * the OI-1 rule in `constraints/OrgIdentity.constraints.json`. The constraint
 * file binds cross-runner conformance; this schema enforces it at the
 * library/structural level.
 *
 * @see SDD section 3.4.1 — OrgIdentity required fields
 * @see Issue #61 — Source RFC
 * @since v8.4.0 (FR-B1)
 */
import { type Static } from '@sinclair/typebox';
export declare const OrgIdentitySchema: import("@sinclair/typebox").TObject<{
    org_id: import("@sinclair/typebox").TString;
    org_public_key: import("@sinclair/typebox").TString;
    current_representatives: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
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
    }>>;
    constitutional_hash: import("@sinclair/typebox").TString;
    created_at: import("@sinclair/typebox").TString;
    updated_at: import("@sinclair/typebox").TString;
}>;
export type OrgIdentity = Static<typeof OrgIdentitySchema>;
//# sourceMappingURL=org-identity.d.ts.map