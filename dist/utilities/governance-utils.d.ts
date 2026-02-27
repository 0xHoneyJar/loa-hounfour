/**
 * Governance utility functions for proposal, voting, and constraint analysis.
 *
 * These utilities provide the computational bridge between governance schemas
 * and application logic — answering "is this actionable?" rather than just
 * "is this valid?"
 *
 * @see DR-S10 — Governance utilities for consumers
 * @since v7.7.0 (Sprint 3)
 */
import type { GovernanceProposal, VotingRecord } from '../governance/governance-proposal.js';
import type { ConstraintLifecycleEvent } from '../governance/constraint-lifecycle.js';
import type { ReputationAggregate } from '../governance/reputation-aggregate.js';
/**
 * Check whether a governance proposal is in a state where action can be taken.
 * A proposal is actionable when it is in 'proposed' or 'voting' status
 * (i.e., not yet terminal: ratified, rejected, withdrawn).
 */
export declare function isProposalActionable(proposal: GovernanceProposal): boolean;
/**
 * Compute the result of a voting record.
 *
 * Returns weighted approve/reject tallies, whether quorum was met,
 * and the overall pass/fail result.
 */
export declare function computeVotingResult(record: VotingRecord): {
    passed: boolean;
    weighted_approve: number;
    weighted_reject: number;
    quorum_met: boolean;
};
/**
 * Check whether a constraint lifecycle event represents an enactable transition.
 * An event is enactable when its from_status → to_status follows valid transitions.
 */
export declare function isConstraintEnactable(event: ConstraintLifecycleEvent): boolean;
/**
 * Derive governance weight from a reputation aggregate.
 *
 * Maps reputation state to a multiplier and combines it with the blended score:
 * - authoritative: 1.0x
 * - established: 0.75x
 * - warming: 0.25x
 * - cold: 0.0x
 *
 * Result is `blended_score * state_multiplier`, clamped to [0, 1].
 */
export declare function computeGovernanceWeight(aggregate: ReputationAggregate): number;
//# sourceMappingURL=governance-utils.d.ts.map