/**
 * `AgentEstate` — estate-as-container primitive.
 *
 * Binds a controller agent (the signer-of-record) to a `Keyring` (the
 * key material container) and a lifecycle `status`. Novel for
 * hounfour — no v8.4.0 precedent — and the foundation for the
 * cycle-005 `EstateTransition` / `TransitionReceipt` surface (which
 * carries handoff between estates, deferred per the cycle-005
 * commitment).
 *
 * The `keyring_id` foreign-keys to `Keyring.keyring_id` (Layer 2 of
 * the authority cascade); resolution is consumer-side per ADR-010.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see KeyringSchema
 * @see AgentEstateStatusSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const AgentEstateSchema: import("@sinclair/typebox").TObject<{
    estate_id: import("@sinclair/typebox").TString;
    controller_agent_id: import("@sinclair/typebox").TString;
    keyring_id: import("@sinclair/typebox").TString;
    status: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provisioning">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"paused">, import("@sinclair/typebox").TLiteral<"transferring">, import("@sinclair/typebox").TLiteral<"dissolved">]>;
    created_at: import("@sinclair/typebox").TString;
    updated_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type AgentEstate = Static<typeof AgentEstateSchema>;
//# sourceMappingURL=agent-estate.d.ts.map