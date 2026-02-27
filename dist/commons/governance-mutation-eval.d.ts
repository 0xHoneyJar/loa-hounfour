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
import { type AccessPolicyContext, type AccessPolicyResult } from '../utilities/access-policy.js';
import type { AccessPolicy } from '../schemas/conversation.js';
import type { GovernanceMutation } from './governed-resource.js';
/**
 * Result of evaluating a governance mutation for authorization.
 */
export interface GovernanceMutationEvalResult {
    /** Whether the mutation is authorized. */
    authorized: boolean;
    /** Whether an access policy was evaluated (false = authorized by default). */
    policy_evaluated: boolean;
    /** Human-readable reason for the decision. */
    reason: string;
    /** The actor_id from the mutation envelope. */
    actor_id: string;
    /** The access policy evaluation result (when a policy was provided). */
    policy_result?: AccessPolicyResult;
}
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
export declare function evaluateGovernanceMutation(mutation: GovernanceMutation, accessPolicy?: AccessPolicy, context?: Partial<Pick<AccessPolicyContext, 'role' | 'reputation_state' | 'reputation_score' | 'previously_granted'>>): GovernanceMutationEvalResult;
//# sourceMappingURL=governance-mutation-eval.d.ts.map