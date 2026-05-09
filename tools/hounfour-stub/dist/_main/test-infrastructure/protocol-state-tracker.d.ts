import type { DomainEvent } from '../schemas/domain-event.js';
/** Canonical reasons why an event application might be rejected. */
export declare const VALID_REJECTION_REASONS: readonly ["duplicate_event_id", "invalid_lifecycle_transition", "missing_lifecycle_from_state", "missing_lifecycle_to_state", "unknown_lifecycle_from_state", "unknown_lifecycle_to_state", "lifecycle_from_state_mismatch", "agent_not_found_for_transition", "sanction_missing_evidence", "invalid_escrow_transition", "escrow_not_found", "invalid_stake_transition", "stake_not_found", "invalid_credit_transition", "credit_not_found"];
export type RejectionReason = (typeof VALID_REJECTION_REASONS)[number];
export interface ApplyResult {
    applied: boolean;
    reason?: RejectionReason;
}
/**
 * Tracks protocol state consistency across random event sequences.
 *
 * Invariants checked:
 * - Agent lifecycle transitions are valid per the state machine
 * - Events are deduplicated by event_id
 * - Sanction events require evidence_event_ids in their payload
 * - Economy transitions follow the unified STATE_MACHINES vocabulary
 */
export declare class ProtocolStateTracker {
    /** Map of agent_id -> current lifecycle state. */
    private readonly agentStates;
    /** Set of seen event_ids for deduplication. */
    private readonly seenEventIds;
    /** Map of escrow_id -> current escrow state. */
    private readonly escrowStates;
    /** Map of stake_id -> current stake state. */
    private readonly stakeStates;
    /** Map of credit_id -> current credit state. */
    private readonly creditStates;
    /** Tracks whether any invariant violation has been detected. */
    private invariantViolated;
    /**
     * Apply a domain event to the tracker.
     *
     * Returns `{ applied: true }` if the event was successfully processed,
     * or `{ applied: false, reason }` if it was rejected.
     */
    apply(event: DomainEvent): ApplyResult;
    /**
     * Returns true if no invariant violations have been detected.
     */
    isConsistent(): boolean;
    /**
     * Returns escrow IDs that are still in 'held' state (no release/refund/expiry).
     * Advisory — orphaned escrows may be expected during in-progress sequences.
     */
    getOrphanedEscrows(): string[];
    /**
     * Generic state machine event handler. Validates that the transition from
     * the entity's current state to the target state is permitted by the
     * STATE_MACHINES vocabulary, then applies the transition.
     */
    private applyStateMachineEvent;
    private applyLifecycleTransition;
    private applyGovernanceEvent;
    private applyEconomyEvent;
}
//# sourceMappingURL=protocol-state-tracker.d.ts.map