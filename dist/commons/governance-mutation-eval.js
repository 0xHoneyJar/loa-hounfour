/**
 * GovernanceMutation evaluation utility.
 *
 * Evaluates a GovernanceMutation envelope against an access policy
 * to determine whether the mutation actor is authorized.
 *
 * Bridges the existing AccessPolicy evaluation (v7.2.0) with the
 * Commons Protocol GovernanceMutation boundary.
 *
 * @see Bridgebuilder Finding F6 — Authorization at the mutation boundary
 * @since v8.1.0
 */
import { evaluateAccessPolicy } from '../utilities/access-policy.js';
/**
 * Evaluate a GovernanceMutation for authorization against an optional access policy.
 *
 * When no access policy is provided, the mutation is authorized (policy enforcement
 * is opt-in per resource — resources without access_policy_ref allow all actors).
 *
 * When an access policy is provided, the mutation actor is checked against the policy
 * using the existing `evaluateAccessPolicy()` utility.
 *
 * @param mutation - The GovernanceMutation envelope to evaluate
 * @param accessPolicy - Optional AccessPolicy to evaluate against
 * @param context - Additional context for policy evaluation (action defaults to 'write')
 * @returns Authorization result with reason
 */
export function evaluateGovernanceMutation(mutation, accessPolicy, context) {
    // No access policy means open access (policy enforcement is opt-in)
    if (!accessPolicy) {
        return {
            authorized: true,
            policy_evaluated: false,
            reason: 'No access policy configured — mutation authorized by default',
            actor_id: mutation.actor_id,
        };
    }
    // Build the access policy context from mutation envelope + caller context
    const policyContext = {
        role: context?.role,
        timestamp: mutation.mutated_at,
        action: 'write', // Mutations are always write actions
        reputation_state: context?.reputation_state,
        reputation_score: context?.reputation_score,
        previously_granted: context?.previously_granted,
    };
    const policyResult = evaluateAccessPolicy(accessPolicy, policyContext);
    return {
        authorized: policyResult.allowed,
        policy_evaluated: true,
        reason: policyResult.allowed
            ? `Mutation authorized: ${policyResult.reason}`
            : `Mutation denied for actor '${mutation.actor_id}': ${policyResult.reason}`,
        actor_id: mutation.actor_id,
        policy_result: policyResult,
    };
}
//# sourceMappingURL=governance-mutation-eval.js.map