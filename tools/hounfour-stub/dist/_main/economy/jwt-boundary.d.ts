/**
 * JWT Boundary Verification Spec — cross-system economic verification protocol.
 *
 * Defines the 6-step verification pipeline that runs at every service boundary
 * in the agent economy. This is the protocol's equivalent of the TLS handshake —
 * trust establishment before any economic data is exchanged.
 *
 * @see SDD §2.2 — JWT Boundary Verification (FR-2)
 * @see Issue #13 §2 — 6-step JWT boundary from arrakis
 */
import { type Static } from '@sinclair/typebox';
/**
 * A single step in the JWT boundary verification pipeline.
 */
export declare const JwtVerificationStepSchema: import("@sinclair/typebox").TObject<{
    step_number: import("@sinclair/typebox").TInteger;
    name: import("@sinclair/typebox").TString;
    description: import("@sinclair/typebox").TString;
    error_code: import("@sinclair/typebox").TString;
    is_blocking: import("@sinclair/typebox").TBoolean;
}>;
export type JwtVerificationStep = Static<typeof JwtVerificationStepSchema>;
/**
 * Cross-system JWT boundary verification protocol specification.
 */
export declare const JwtBoundarySpecSchema: import("@sinclair/typebox").TObject<{
    spec_id: import("@sinclair/typebox").TString;
    boundary_name: import("@sinclair/typebox").TString;
    steps: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TObject<{
        step_number: import("@sinclair/typebox").TInteger;
        name: import("@sinclair/typebox").TString;
        description: import("@sinclair/typebox").TString;
        error_code: import("@sinclair/typebox").TString;
        is_blocking: import("@sinclair/typebox").TBoolean;
    }>>;
    algorithm_whitelist: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    claims_schema_ref: import("@sinclair/typebox").TString;
    replay_window_seconds: import("@sinclair/typebox").TInteger;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type JwtBoundarySpec = Static<typeof JwtBoundarySpecSchema>;
/**
 * JWT claims for outbound economic requests (service → service).
 */
export declare const OutboundClaimsSchema: import("@sinclair/typebox").TObject<{
    sub: import("@sinclair/typebox").TString;
    iss: import("@sinclair/typebox").TString;
    aud: import("@sinclair/typebox").TString;
    jti: import("@sinclair/typebox").TString;
    iat: import("@sinclair/typebox").TInteger;
    exp: import("@sinclair/typebox").TInteger;
    reservation_id: import("@sinclair/typebox").TString;
    budget_remaining_micro: import("@sinclair/typebox").TString;
    authority_scope: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
}>;
export type OutboundClaims = Static<typeof OutboundClaimsSchema>;
/**
 * JWT claims for inbound economic responses (service → service).
 */
export declare const InboundClaimsSchema: import("@sinclair/typebox").TObject<{
    sub: import("@sinclair/typebox").TString;
    iss: import("@sinclair/typebox").TString;
    aud: import("@sinclair/typebox").TString;
    jti: import("@sinclair/typebox").TString;
    iat: import("@sinclair/typebox").TInteger;
    exp: import("@sinclair/typebox").TInteger;
    reservation_id: import("@sinclair/typebox").TString;
    budget_remaining_micro: import("@sinclair/typebox").TString;
    authority_scope: import("@sinclair/typebox").TArray<import("@sinclair/typebox").TString>;
    actual_cost_micro: import("@sinclair/typebox").TString;
    model_used: import("@sinclair/typebox").TString;
    tokens_used: import("@sinclair/typebox").TInteger;
}>;
export type InboundClaims = Static<typeof InboundClaimsSchema>;
/**
 * Canonical 6-step JWT boundary verification pipeline.
 *
 * @see Issue #13 §2 — original arrakis jwt-boundary.ts
 */
export declare const CANONICAL_JWT_BOUNDARY_STEPS: readonly JwtVerificationStep[];
//# sourceMappingURL=jwt-boundary.d.ts.map