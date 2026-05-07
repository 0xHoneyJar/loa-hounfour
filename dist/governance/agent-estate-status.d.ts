/**
 * `AgentEstateStatus` — lifecycle vocabulary for `AgentEstate`.
 *
 * Five substrate-agnostic states covering the spectrum from
 * provisioning to fully transferred / dissolved. The state machine
 * itself (which transitions are valid) is consumer-side per ADR-010;
 * hounfour ships only the vocabulary.
 *
 * Member set is normalized to substrate-agnostic from Eileen's
 * wedge-fitted `EstateStatus` enum and locked in PR-A2.3 reuse-audit
 * (per `prd.md:438-441`).
 *
 * @see AgentEstateSchema
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.3)
 */
import { type Static } from '@sinclair/typebox';
export declare const AgentEstateStatusSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"provisioning">, import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"paused">, import("@sinclair/typebox").TLiteral<"transferring">, import("@sinclair/typebox").TLiteral<"dissolved">]>;
export type AgentEstateStatus = Static<typeof AgentEstateStatusSchema>;
//# sourceMappingURL=agent-estate-status.d.ts.map