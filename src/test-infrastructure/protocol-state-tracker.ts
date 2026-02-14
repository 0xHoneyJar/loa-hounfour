/**
 * ProtocolStateTracker — Test infrastructure for L2 temporal property testing.
 *
 * Tracks agent lifecycle state transitions, governance/sanction events,
 * and event deduplication across random event sequences.
 *
 * This is test-only infrastructure and is NOT exported from the main barrel.
 *
 * @see S6-T1
 */
import { isValidTransition, type AgentLifecycleState } from '../schemas/agent-lifecycle.js';
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
 */
export class ProtocolStateTracker {
  /** Map of agent_id -> current lifecycle state. */
  private readonly agentStates = new Map<string, AgentLifecycleState>();

  /** Set of seen event_ids for deduplication. */
  private readonly seenEventIds = new Set<string>();

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

    // All other event types are accepted without additional invariant checks
    return { applied: true };
  }

  /**
   * Returns true if no invariant violations have been detected.
   */
  isConsistent(): boolean {
    return !this.invariantViolated;
  }

  // --- Private helpers ---

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
}
