/**
 * AgentCapacityReservation schema — enshrined agent-owned inference capacity.
 *
 * Guarantees that an agent with earned trust (via conformance level) has a
 * minimum fraction of budget capacity reserved and protected from exhaustion.
 * The protocol enforces this as an inviolable floor on the agent's budget.
 *
 * @see SDD §3.8 — AgentCapacityReservation
 * @see Issue #9 — Enshrined agent-owned inference capacity
 */
import { type Static } from '@sinclair/typebox';
export declare const AgentCapacityReservationSchema: import("@sinclair/typebox").TObject<{
    reservation_id: import("@sinclair/typebox").TString;
    agent_id: import("@sinclair/typebox").TString;
    conformance_level: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"self_declared">, import("@sinclair/typebox").TLiteral<"community_verified">, import("@sinclair/typebox").TLiteral<"protocol_certified">]>;
    reserved_capacity_bps: import("@sinclair/typebox").TInteger;
    state: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"active">, import("@sinclair/typebox").TLiteral<"expired">, import("@sinclair/typebox").TLiteral<"revoked">]>;
    effective_from: import("@sinclair/typebox").TString;
    effective_until: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TString>;
    budget_scope_id: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
    metadata: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
}>;
export type AgentCapacityReservation = Static<typeof AgentCapacityReservationSchema>;
//# sourceMappingURL=agent-capacity-reservation.d.ts.map