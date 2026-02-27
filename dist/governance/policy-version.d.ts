/**
 * Policy Version — versioned policies with migration validation.
 *
 * Tracks policy evolution with effective dates, supersession chains,
 * and migration validation expressions. Enables both planned upgrades
 * and emergency policy changes with rollback capability.
 *
 * In the FAANG framing: Stripe's API versioning model — every change
 * gets a dated version, old versions remain supported. But versioning
 * policies is harder than versioning APIs because policies have economic
 * consequences.
 *
 * @see DR-S8 — Policy versioning and migration
 * @since v7.6.0
 */
import { type Static } from '@sinclair/typebox';
/** @governance registry-extensible */
export declare const PolicyTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"monetary">, import("@sinclair/typebox").TLiteral<"access">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"constraint">]>;
export type PolicyType = Static<typeof PolicyTypeSchema>;
/**
 * A versioned policy record with migration support.
 *
 * @since v7.6.0 — DR-S8
 */
export declare const PolicyVersionSchema: import("@sinclair/typebox").TObject<{
    version_id: import("@sinclair/typebox").TString;
    policy_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"monetary">, import("@sinclair/typebox").TLiteral<"access">, import("@sinclair/typebox").TLiteral<"governance">, import("@sinclair/typebox").TLiteral<"constraint">]>;
    policy_id: import("@sinclair/typebox").TString;
    version: import("@sinclair/typebox").TString;
    effective_at: import("@sinclair/typebox").TString;
    supersedes: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    migration_validation: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    enacted_by_proposal: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type PolicyVersion = Static<typeof PolicyVersionSchema>;
//# sourceMappingURL=policy-version.d.ts.map