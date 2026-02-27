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
import { Type } from '@sinclair/typebox';
// ---------------------------------------------------------------------------
// Proposal Event Type
// ---------------------------------------------------------------------------
export const ProposalEventTypeSchema = Type.Union([
    Type.Literal('proposed'),
    Type.Literal('voting_opened'),
    Type.Literal('vote_cast'),
    Type.Literal('ratified'),
    Type.Literal('rejected'),
    Type.Literal('withdrawn'),
    Type.Literal('execution_started'),
    Type.Literal('execution_completed'),
    Type.Literal('execution_failed'),
], {
    $id: 'ProposalEventType',
    description: 'Type of governance proposal lifecycle event.',
});
// ---------------------------------------------------------------------------
// Proposal Outcome Event
// ---------------------------------------------------------------------------
/**
 * A single event in the lifecycle of a governance proposal.
 *
 * Enables event-sourced reconstruction of any proposal's full history:
 * who proposed it, how the voting went, whether execution succeeded.
 *
 * @since v7.7.0 — DR-S9
 */
export const ProposalOutcomeEventSchema = Type.Object({
    event_id: Type.String({ format: 'uuid' }),
    proposal_id: Type.String({
        format: 'uuid',
        description: 'The governance proposal this event belongs to.',
    }),
    event_type: ProposalEventTypeSchema,
    actor_id: Type.String({
        minLength: 1,
        description: 'Agent who performed the action.',
    }),
    details: Type.Optional(Type.Record(Type.String(), Type.Unknown(), {
        description: 'Event-specific metadata (e.g., vote choice, execution result).',
    })),
    occurred_at: Type.String({ format: 'date-time' }),
    contract_version: Type.String({
        pattern: '^\\d+\\.\\d+\\.\\d+$',
        description: 'Protocol contract version.',
    }),
}, {
    $id: 'ProposalOutcomeEvent',
    additionalProperties: false,
    description: 'Lifecycle event for a governance proposal.',
});
//# sourceMappingURL=proposal-outcome-event.js.map