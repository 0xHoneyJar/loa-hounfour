/**
 * ProtocolStateTracker — Test infrastructure for L2 temporal property testing.
 *
 * Tracks agent lifecycle state transitions, governance/sanction events,
 * economy aggregate events (escrow, stake, credit), and event deduplication
 * across random event sequences.
 *
 * This is test-only infrastructure and is NOT exported from the main barrel.
 *
 * @see S6-T1
 * @see S1-T3 — Refactored to data-driven core via STATE_MACHINES vocabulary
 */
import { isValidTransition, type AgentLifecycleState } from '../schemas/agent-lifecycle.js';
import { STATE_MACHINES, isValidTransition as isValidStateMachineTransition } from '../vocabulary/state-machines.js';
import type { DomainEvent } from '../schemas/domain-event.js';

/** Canonical reasons why an event application might be rejected. */
export const VALID_REJECTION_REASONS = [
  'duplicate_event_id',
  'invalid_lifecycle_transition',
  'missing_lifecycle_from_state',
  'missing_lifecycle_to_state',
  'unknown_lifecycle_from_state',
  'unknown_lifecycle_to_state',
  'lifecycle_from_state_mismatch',
  'agent_not_found_for_transition',
  'sanction_missing_evidence',
  'invalid_escrow_transition',
  'escrow_not_found',
  'invalid_stake_transition',
  'stake_not_found',
  'invalid_credit_transition',
  'credit_not_found',
] as const;

export type RejectionReason = (typeof VALID_REJECTION_REASONS)[number];

export interface ApplyResult {
  applied: boolean;
  reason?: RejectionReason;
}

/** All valid agent lifecycle states as a set for fast membership checks. */
const LIFECYCLE_STATES = new Set<string>([
  'DORMANT',
  'PROVISIONING',
  'ACTIVE',
  'SUSPENDED',
  'TRANSFERRED',
  'ARCHIVED',
]);

/**
 * Tracks protocol state consistency across random event sequences.
 *
 * Invariants checked:
 * - Agent lifecycle transitions are valid per the state machine
 * - Events are deduplicated by event_id
 * - Sanction events require evidence_event_ids in their payload
 * - Economy transitions follow the unified STATE_MACHINES vocabulary
 */
export class ProtocolStateTracker {
  /** Map of agent_id -> current lifecycle state. */
  private readonly agentStates = new Map<string, AgentLifecycleState>();

  /** Set of seen event_ids for deduplication. */
  private readonly seenEventIds = new Set<string>();

  /** Map of escrow_id -> current escrow state. */
  private readonly escrowStates = new Map<string, string>();

  /** Map of stake_id -> current stake state. */
  private readonly stakeStates = new Map<string, string>();

  /** Map of credit_id -> current credit state. */
  private readonly creditStates = new Map<string, string>();

  /** Tracks whether any invariant violation has been detected. */
  private invariantViolated = false;

  /**
   * Apply a domain event to the tracker.
   *
   * Returns `{ applied: true }` if the event was successfully processed,
   * or `{ applied: false, reason }` if it was rejected.
   */
  apply(event: DomainEvent): ApplyResult {
    // --- Deduplication ---
    if (this.seenEventIds.has(event.event_id)) {
      return { applied: false, reason: 'duplicate_event_id' };
    }
    this.seenEventIds.add(event.event_id);

    // --- Agent lifecycle transitions ---
    if (event.aggregate_type === 'agent' && event.type === 'agent.lifecycle.transitioned') {
      return this.applyLifecycleTransition(event);
    }

    // --- Governance/sanction events ---
    if (event.aggregate_type === 'governance') {
      return this.applyGovernanceEvent(event);
    }

    // --- Economy aggregate events ---
    if (event.aggregate_type === 'economy') {
      return this.applyEconomyEvent(event);
    }

    // All other event types are accepted without additional invariant checks
    return { applied: true };
  }

  /**
   * Returns true if no invariant violations have been detected.
   */
  isConsistent(): boolean {
    return !this.invariantViolated;
  }

  /**
   * Returns escrow IDs that are still in 'held' state (no release/refund/expiry).
   * Advisory — orphaned escrows may be expected during in-progress sequences.
   */
  getOrphanedEscrows(): string[] {
    const orphaned: string[] = [];
    for (const [escrowId, state] of this.escrowStates) {
      if (state === 'held') {
        orphaned.push(escrowId);
      }
    }
    return orphaned;
  }

  // --- Private helpers ---

  /**
   * Generic state machine event handler. Validates that the transition from
   * the entity's current state to the target state is permitted by the
   * STATE_MACHINES vocabulary, then applies the transition.
   */
  private applyStateMachineEvent(
    machineId: string,
    stateMap: Map<string, string>,
    entityId: string,
    targetState: string,
    notFoundReason: RejectionReason,
    invalidTransitionReason: RejectionReason,
  ): ApplyResult {
    const currentState = stateMap.get(entityId);
    if (currentState === undefined) {
      return { applied: false, reason: notFoundReason };
    }
    if (!isValidStateMachineTransition(machineId, currentState, targetState)) {
      return { applied: false, reason: invalidTransitionReason };
    }
    stateMap.set(entityId, targetState);
    return { applied: true };
  }

  private applyLifecycleTransition(event: DomainEvent): ApplyResult {
    const payload = event.payload as Record<string, unknown>;
    const fromState = payload.from_state as string | undefined;
    const toState = payload.to_state as string | undefined;

    // Validate payload contains required fields
    if (fromState === undefined || fromState === null) {
      return { applied: false, reason: 'missing_lifecycle_from_state' };
    }
    if (toState === undefined || toState === null) {
      return { applied: false, reason: 'missing_lifecycle_to_state' };
    }

    // Validate states are known lifecycle states
    if (!LIFECYCLE_STATES.has(fromState)) {
      return { applied: false, reason: 'unknown_lifecycle_from_state' };
    }
    if (!LIFECYCLE_STATES.has(toState)) {
      return { applied: false, reason: 'unknown_lifecycle_to_state' };
    }

    const from = fromState as AgentLifecycleState;
    const to = toState as AgentLifecycleState;

    // Validate the transition is valid per the state machine
    if (!isValidTransition(from, to)) {
      return { applied: false, reason: 'invalid_lifecycle_transition' };
    }

    // If we already track this agent, the from_state must match current state
    const agentId = event.aggregate_id;
    const currentState = this.agentStates.get(agentId);

    if (currentState !== undefined && currentState !== from) {
      return { applied: false, reason: 'lifecycle_from_state_mismatch' };
    }

    // Apply the transition
    this.agentStates.set(agentId, to);
    return { applied: true };
  }

  private applyGovernanceEvent(event: DomainEvent): ApplyResult {
    // Sanction-imposition events must include evidence
    if (event.type === 'governance.sanction.imposed') {
      const payload = event.payload as Record<string, unknown>;
      const evidenceIds = payload.evidence_event_ids;

      if (
        !Array.isArray(evidenceIds) ||
        evidenceIds.length === 0
      ) {
        return { applied: false, reason: 'sanction_missing_evidence' };
      }
    }

    return { applied: true };
  }

  private applyEconomyEvent(event: DomainEvent): ApplyResult {
    const payload = event.payload as Record<string, unknown>;

    // --- Escrow events ---
    if (event.type === 'economy.escrow.created') {
      const escrowId = (payload.escrow_id as string) || event.aggregate_id;
      this.escrowStates.set(escrowId, STATE_MACHINES.escrow.initial);
      return { applied: true };
    }

    if (event.type === 'economy.escrow.funded') {
      // Funded is informational — escrow stays 'held'
      return { applied: true };
    }

    if (event.type.startsWith('economy.escrow.')) {
      const escrowId = (payload.escrow_id as string) || event.aggregate_id;
      const targetState = event.type.split('.')[2];
      return this.applyStateMachineEvent(
        'escrow', this.escrowStates, escrowId, targetState,
        'escrow_not_found', 'invalid_escrow_transition',
      );
    }

    // --- Stake events ---
    if (event.type === 'economy.stake.created') {
      const stakeId = (payload.stake_id as string) || event.aggregate_id;
      this.stakeStates.set(stakeId, STATE_MACHINES.stake.initial);
      return { applied: true };
    }

    if (event.type.startsWith('economy.stake.')) {
      const stakeId = (payload.stake_id as string) || event.aggregate_id;
      const targetState = event.type.split('.')[2];
      return this.applyStateMachineEvent(
        'stake', this.stakeStates, stakeId, targetState,
        'stake_not_found', 'invalid_stake_transition',
      );
    }

    // --- Credit events ---
    if (event.type === 'economy.credit.extended') {
      const creditId = (payload.credit_id as string) || event.aggregate_id;
      this.creditStates.set(creditId, STATE_MACHINES.credit.initial);
      return { applied: true };
    }

    if (event.type === 'economy.credit.settled') {
      const creditId = (payload.credit_id as string) || event.aggregate_id;
      return this.applyStateMachineEvent(
        'credit', this.creditStates, creditId, 'settled',
        'credit_not_found', 'invalid_credit_transition',
      );
    }

    // Unknown economy events are accepted without state changes
    return { applied: true };
  }
}
