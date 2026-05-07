/**
 * `RecallRequest` — input record for the recall machinery.
 *
 * Carries the subject agent, the surface context the recall is
 * scoped to, and the receipt detail level the requester wants on
 * the matching `RecallReceipt`. Crypto is consumer-side: an
 * `Optional` `requestor_signer_id` lets the consumer sign the
 * request via their own envelope; the request itself is shape-only.
 *
 * Per ADR-010 hounfour ships the shape (request envelope + scoping
 * fields) and consumers ship the policy (which agents are
 * recall-eligible, which signers may issue requests, what
 * `surface_context` namespace expansions are accepted).
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see SurfaceContextSchema
 * @see ReceiptDetailLevelSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const RecallRequestSchema: import("@sinclair/typebox").TObject<{
    request_id: import("@sinclair/typebox").TString;
    subject_agent_id: import("@sinclair/typebox").TString;
    surface_context: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"public">, import("@sinclair/typebox").TLiteral<"private">, import("@sinclair/typebox").TLiteral<"system">, import("@sinclair/typebox").TLiteral<"demo">, import("@sinclair/typebox").TLiteral<"test">, import("@sinclair/typebox").TString]>;
    detail_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"minimal">, import("@sinclair/typebox").TLiteral<"standard">, import("@sinclair/typebox").TLiteral<"debug">]>;
    requested_at: import("@sinclair/typebox").TString;
    requestor_signer_id: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type RecallRequest = Static<typeof RecallRequestSchema>;
//# sourceMappingURL=recall-request.d.ts.map