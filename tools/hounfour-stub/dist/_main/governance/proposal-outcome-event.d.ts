/**
 * Proposal Outcome Event — event sourcing for the governance lifecycle.
 *
 * Records every significant action in a governance proposal's lifecycle,
 * from creation through execution. Creates a complete audit trail that
 * connects decision to outcome.
 *
 * @see DR-S9 — Governance execution tracking
 * @since v7.7.0
 */
import { type Static } from '@sinclair/typebox';
export declare const ProposalEventTypeSchema: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"voting_opened">, import("@sinclair/typebox").TLiteral<"vote_cast">, import("@sinclair/typebox").TLiteral<"ratified">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"execution_started">, import("@sinclair/typebox").TLiteral<"execution_completed">, import("@sinclair/typebox").TLiteral<"execution_failed">]>;
export type ProposalEventType = Static<typeof ProposalEventTypeSchema>;
/**
 * A single event in the lifecycle of a governance proposal.
 *
 * Enables event-sourced reconstruction of any proposal's full history:
 * who proposed it, how the voting went, whether execution succeeded.
 *
 * @since v7.7.0 — DR-S9
 */
export declare const ProposalOutcomeEventSchema: import("@sinclair/typebox").TObject<{
    event_id: import("@sinclair/typebox").TString;
    proposal_id: import("@sinclair/typebox").TString;
    event_type: import("@sinclair/typebox").TUnion<[import("@sinclair/typebox").TLiteral<"proposed">, import("@sinclair/typebox").TLiteral<"voting_opened">, import("@sinclair/typebox").TLiteral<"vote_cast">, import("@sinclair/typebox").TLiteral<"ratified">, import("@sinclair/typebox").TLiteral<"rejected">, import("@sinclair/typebox").TLiteral<"withdrawn">, import("@sinclair/typebox").TLiteral<"execution_started">, import("@sinclair/typebox").TLiteral<"execution_completed">, import("@sinclair/typebox").TLiteral<"execution_failed">]>;
    actor_id: import("@sinclair/typebox").TString;
    details: import("@sinclair/typebox").TOptional<import("@sinclair/typebox").TRecord<import("@sinclair/typebox").TString, import("@sinclair/typebox").TUnknown>>;
    occurred_at: import("@sinclair/typebox").TString;
    contract_version: import("@sinclair/typebox").TString;
}>;
export type ProposalOutcomeEvent = Static<typeof ProposalOutcomeEventSchema>;
//# sourceMappingURL=proposal-outcome-event.d.ts.map