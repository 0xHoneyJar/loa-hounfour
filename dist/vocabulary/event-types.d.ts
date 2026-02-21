/**
 * Canonical event type vocabulary registry.
 *
 * Without a registry, multi-model systems produce naming divergence:
 * one model emits `agent.lifecycle.transitioned`, another emits
 * `agent.state.changed` — both valid, both describing the same event.
 *
 * This registry is the IANA HTTP Status Code equivalent for domain events.
 * Consumers SHOULD use registered types. Unknown types are not rejected
 * by the schema (the pattern validates format, not vocabulary), but
 * `isKnownEventType()` enables runtime detection of unregistered types.
 *
 * @see BB-V3-011 — Event type vocabulary registry
 */
/** Canonical domain event types. */
export declare const EVENT_TYPES: {
    readonly 'agent.lifecycle.transitioned': "Agent lifecycle state changed";
    readonly 'agent.descriptor.updated': "Agent descriptor modified";
    readonly 'agent.descriptor.created': "Agent descriptor first created";
    readonly 'billing.entry.created': "New billing entry recorded";
    readonly 'billing.entry.voided': "Billing entry voided";
    readonly 'billing.credit.issued': "Credit note issued against billing entry";
    readonly 'conversation.thread.created': "New conversation thread created";
    readonly 'conversation.thread.sealed': "Conversation sealed during transfer";
    readonly 'conversation.status.changed': "Conversation status updated";
    readonly 'conversation.message.added': "Message added to conversation";
    readonly 'transfer.saga.initiated': "Transfer saga initiated";
    readonly 'transfer.saga.completed': "Transfer completed successfully";
    readonly 'transfer.saga.failed': "Transfer failed";
    readonly 'transfer.saga.rolled_back': "Transfer rolled back after failure";
    readonly 'tool.call.started': "Tool call execution started";
    readonly 'tool.call.completed': "Tool call execution completed";
    readonly 'tool.call.failed': "Tool call execution failed";
    readonly 'message.content.created': "Message content created";
    readonly 'message.content.moderated': "Message content moderated";
    readonly 'message.content.redacted': "Message content redacted for compliance";
    readonly 'performance.record.created': "Performance record created";
    readonly 'performance.record.validated': "Performance record validated by peer";
    readonly 'performance.contribution.submitted': "Contribution submitted for assessment";
    readonly 'performance.contribution.assessed': "Contribution assessment completed";
    readonly 'governance.sanction.imposed': "Sanction imposed on agent";
    readonly 'governance.sanction.appealed': "Sanction appeal submitted";
    readonly 'governance.sanction.lifted': "Sanction lifted or expired";
    readonly 'governance.dispute.filed': "Dispute filed against agent or outcome";
    readonly 'governance.dispute.resolved': "Dispute resolution completed";
    readonly 'governance.vote.started': "Governance vote initiated";
    readonly 'governance.vote.concluded': "Governance vote concluded";
    readonly 'reputation.score.calculated': "Reputation score recalculated";
    readonly 'reputation.score.decayed': "Reputation score decayed over time";
    readonly 'reputation.threshold.breached': "Reputation dropped below threshold";
    readonly 'reputation.state.changed': "Reputation state machine transitioned";
    readonly 'reputation.quality_event.recorded': "Quality observation ingested";
    readonly 'reputation.collection_score.updated': "Collection trimmed mean recalculated";
    readonly 'economy.escrow.created': "Escrow entry created";
    readonly 'economy.escrow.funded': "Escrow entry funded";
    readonly 'economy.escrow.released': "Escrow funds released to payee";
    readonly 'economy.escrow.disputed': "Escrow entry disputed";
    readonly 'economy.escrow.refunded': "Escrow funds refunded to payer";
    readonly 'economy.escrow.expired': "Escrow expired without release";
    readonly 'economy.stake.created': "Stake position created";
    readonly 'economy.stake.slashed': "Stake position slashed";
    readonly 'economy.stake.vested': "Stake vesting milestone reached";
    readonly 'economy.stake.withdrawn': "Stake position withdrawn";
    readonly 'economy.dividend.declared': "Commons dividend declared";
    readonly 'economy.dividend.distributed': "Commons dividend distributed";
    readonly 'economy.credit.extended': "Mutual credit line extended";
    readonly 'economy.credit.settled': "Mutual credit settled";
};
/** Registered event type string. */
export type EventType = keyof typeof EVENT_TYPES;
/** All registered event type values. */
export declare const EVENT_TYPE_VALUES: EventType[];
/**
 * Check whether an event type string is a registered canonical type.
 *
 * Unknown types are NOT invalid — the DomainEvent.type pattern validates
 * format ({aggregate}.{noun}.{verb}), not vocabulary. This guard enables
 * runtime logging/alerting for unregistered types.
 */
export declare function isKnownEventType(type: string): type is EventType;
//# sourceMappingURL=event-types.d.ts.map