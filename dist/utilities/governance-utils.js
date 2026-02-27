import { CONSTRAINT_LIFECYCLE_TRANSITIONS } from '../governance/constraint-lifecycle.js';
/**
 * State multipliers for governance weight derivation.
 * Authoritative agents carry full weight; cold agents carry none.
 */
const STATE_WEIGHT_MULTIPLIERS = {
    authoritative: 1.0,
    established: 0.75,
    warming: 0.25,
    cold: 0.0,
};
/**
 * Check whether a governance proposal is in a state where action can be taken.
 * A proposal is actionable when it is in 'proposed' or 'voting' status
 * (i.e., not yet terminal: ratified, rejected, withdrawn).
 */
export function isProposalActionable(proposal) {
    return proposal.status === 'proposed' || proposal.status === 'voting';
}
/**
 * Compute the result of a voting record.
 *
 * Returns weighted approve/reject tallies, whether quorum was met,
 * and the overall pass/fail result.
 */
export function computeVotingResult(record) {
    let weighted_approve = 0;
    let weighted_reject = 0;
    let total_weight = 0;
    for (const vote of record.votes_cast) {
        total_weight += vote.weight;
        if (vote.vote === 'approve') {
            weighted_approve += vote.weight;
        }
        else if (vote.vote === 'reject') {
            weighted_reject += vote.weight;
        }
        // abstain contributes to participation but not approve/reject
    }
    const quorum_met = total_weight >= record.quorum_required;
    const passed = quorum_met && weighted_approve > weighted_reject;
    return { passed, weighted_approve, weighted_reject, quorum_met };
}
/**
 * Check whether a constraint lifecycle event represents an enactable transition.
 * An event is enactable when its from_status → to_status follows valid transitions.
 */
export function isConstraintEnactable(event) {
    const validTargets = CONSTRAINT_LIFECYCLE_TRANSITIONS[event.from_status];
    if (!validTargets)
        return false;
    return validTargets.includes(event.to_status);
}
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
export function computeGovernanceWeight(aggregate) {
    const multiplier = STATE_WEIGHT_MULTIPLIERS[aggregate.state] ?? 0;
    return Math.min(1, Math.max(0, aggregate.blended_score * multiplier));
}
//# sourceMappingURL=governance-utils.js.map