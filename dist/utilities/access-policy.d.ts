/**
 * AccessPolicy evaluation helper (v7.2.0, FR-6 + Bridgebuilder F1).
 *
 * Evaluates an AccessPolicy against a runtime context to determine
 * whether an action is permitted.
 *
 * v7.2.0: Added opt-in expiry enforcement for `time_limited` policies
 * via `policy_created_at` context field. When provided alongside
 * `duration_hours`, the evaluator computes and enforces expiry.
 *
 * v7.4.0: Added hysteresis for `reputation_gated` (dead-band control),
 * and `compound` policy type with AND/OR composition.
 *
 * @see SDD §2.8 — AccessPolicy Evaluation Helper
 */
import { type AccessPolicy } from '../schemas/conversation.js';
import { type ReputationState } from '../governance/reputation-aggregate.js';
/** Runtime context for evaluating an access policy. */
export interface AccessPolicyContext {
    role?: string;
    timestamp: string;
    action: 'read' | 'write' | 'delete';
    /**
     * When the access policy was created (ISO 8601). Enables the evaluator
     * to enforce `time_limited` expiry when paired with `duration_hours`.
     * When absent, expiry enforcement falls back to consumer responsibility.
     *
     * @since v7.2.0 — Bridgebuilder Finding F1
     */
    policy_created_at?: string;
    /** Current reputation state of the requesting personality (v7.3.0). */
    reputation_state?: ReputationState;
    /** Current blended reputation score of the requesting personality (v7.3.0). */
    reputation_score?: number;
    /**
     * Whether the requesting personality was previously granted access
     * under this policy. When true and the policy has `revoke_below_score`
     * or `revoke_below_state`, the evaluator uses the lower revoke threshold
     * instead of the grant threshold — preventing oscillation (hysteresis).
     *
     * @since v7.4.0 — Bridgebuilder Vision B-V1
     */
    previously_granted?: boolean;
}
/** Result of evaluating an access policy. */
export interface AccessPolicyResult {
    allowed: boolean;
    reason: string;
}
/**
 * Evaluate an AccessPolicy against a runtime context.
 *
 * Design notes:
 * - `time_limited` enforces expiry when `context.policy_created_at` is provided
 *   and `policy.duration_hours` is defined. When `policy_created_at` is absent,
 *   expiry enforcement falls back to consumer responsibility (v7.1.0 behavior).
 * - `role_based` checks context.role against policy.roles[] via string inclusion.
 * - `reputation_gated` supports hysteresis via `revoke_below_score`/`revoke_below_state` (v7.4.0).
 * - `compound` evaluates sub-policies with AND/OR semantics (v7.4.0).
 */
export declare function evaluateAccessPolicy(policy: AccessPolicy, context: AccessPolicyContext): AccessPolicyResult;
//# sourceMappingURL=access-policy.d.ts.map