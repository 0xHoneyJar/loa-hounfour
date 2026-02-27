/**
 * Portable reputation credential for cross-collection trust.
 *
 * Issued by a source collection's governance, attesting to a personality's
 * reputation at a point in time. Destination collections can accept or
 * reject credentials — if accepted, the credential contributes to the
 * Bayesian prior (informed start instead of cold start).
 *
 * Architectural parallel: TLS Certificate Authority trust model.
 * A CA with strong reputation issues more trustworthy credentials.
 *
 * @see Bridgebuilder C1 — cross-collection reputation portability
 * @see Bridgebuilder Spec IV — the reputation portable credential
 * @see W3C Verifiable Credentials — standard for signed portable claims
 * @since v7.3.0
 */
import { type Static } from '@sinclair/typebox';
export declare const ReputationCredentialSchema: import("@sinclair/typebox").TObject<{
    credential_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    source_collection_id: import("@sinclair/typebox").TString;
    source_pool_id: import("@sinclair/typebox").TString;
    source_state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"cold">, import("@sinclair/typebox").TLiteral<"warming">, import("@sinclair/typebox").TLiteral<"established">, import("@sinclair/typebox").TLiteral<"authoritative">]>;
    source_blended_score: import("@sinclair/typebox").TNumber;
    source_sample_count: import("@sinclair/typebox").TInteger;
    source_collection_score: import("@sinclair/typebox").TNumber;
    issued_at: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    attestation_hash: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ReputationCredential = Static<typeof ReputationCredentialSchema>;
//# sourceMappingURL=reputation-credential.d.ts.map