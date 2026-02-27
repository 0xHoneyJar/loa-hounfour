/**
 * Reputation Portability Protocol — cross-collection reputation transfer.
 *
 * Enables personalities to request portability of their reputation
 * between collections/pools. Supports full, score-only, and state-only
 * scopes with governance approval workflow.
 *
 * @see DR-S2 — Deep Bridgebuilder Review SPECULATION finding
 * @since v7.5.0
 */
import { type Static } from '@sinclair/typebox';
export declare const PortabilityScopeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"full">, import("@sinclair/typebox").TLiteral<"score_only">, import("@sinclair/typebox").TLiteral<"state_only">]>;
export type PortabilityScope = Static<typeof PortabilityScopeSchema>;
export declare const ReputationPortabilityRequestSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    personality_id: import("@sinclair/typebox").TString;
    source_collection_id: import("@sinclair/typebox").TString;
    source_pool_id: import("@sinclair/typebox").TString;
    target_collection_id: import("@sinclair/typebox").TString;
    target_pool_id: import("@sinclair/typebox").TString;
    scope: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"full">, import("@sinclair/typebox").TLiteral<"score_only">, import("@sinclair/typebox").TLiteral<"state_only">]>;
    justification: import("@sinclair/typebox").TString;
    requested_at: import("@sinclair/typebox").TString;
    expires_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ReputationPortabilityRequest = Static<typeof ReputationPortabilityRequestSchema>;
export declare const PortabilityResponseSchema: import("@sinclair/typebox").TObject<{
    response_id: import("@sinclair/typebox").TString;
    request_id: import("@sinclair/typebox").TString;
    responder_collection_id: import("@sinclair/typebox").TString;
    decision: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"accepted">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"pending_governance">]>;
    credential_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    rejection_reason: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    governance_proposal_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    responded_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type PortabilityResponse = Static<typeof PortabilityResponseSchema>;
//# sourceMappingURL=reputation-portability.d.ts.map