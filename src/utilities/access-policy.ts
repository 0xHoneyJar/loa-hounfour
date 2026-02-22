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
 * @see SDD §2.8 — AccessPolicy Evaluation Helper
 */
import { type AccessPolicy } from '../schemas/conversation.js';
import { type ReputationState } from '../governance/reputation-aggregate.js';

/** Ordered reputation states for comparison. */
const STATE_ORDER: Record<string, number> = {
  cold: 0,
  warming: 1,
  established: 2,
  authoritative: 3,
};

/** Runtime context for evaluating an access policy. */
export interface AccessPolicyContext {
  role?: string;
  timestamp: string; // ISO 8601
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
 */
export function evaluateAccessPolicy(
  policy: AccessPolicy,
  context: AccessPolicyContext,
): AccessPolicyResult {
  switch (policy.type) {
    case 'none':
      return { allowed: false, reason: 'Access type is none' };

    case 'read_only':
      return context.action === 'read'
        ? { allowed: true, reason: 'Read-only access granted' }
        : { allowed: false, reason: `Action '${context.action}' not permitted under read_only` };

    case 'time_limited': {
      if (context.action !== 'read') {
        return { allowed: false, reason: `Action '${context.action}' not permitted under time_limited` };
      }

      // Opt-in expiry enforcement (v7.2.0)
      if (context.policy_created_at && policy.duration_hours !== undefined) {
        const createdMs = new Date(context.policy_created_at).getTime();
        const nowMs = new Date(context.timestamp).getTime();
        const expiryMs = createdMs + policy.duration_hours * 3600_000;

        if (nowMs >= expiryMs) {
          return {
            allowed: false,
            reason: `Time-limited access expired (created: ${context.policy_created_at}, `
              + `duration: ${policy.duration_hours}h, checked: ${context.timestamp})`,
          };
        }

        const expiresAt = new Date(expiryMs).toISOString();
        return {
          allowed: true,
          reason: `Time-limited read access granted (expires: ${expiresAt})`,
        };
      }

      // Fallback: consumer responsibility (v7.1.0 behavior)
      return { allowed: true, reason: 'Time-limited read access (expiry check is consumer responsibility)' };
    }

    case 'role_based': {
      if (!context.role) {
        return { allowed: false, reason: 'No role provided for role_based policy' };
      }
      const hasRole = policy.roles?.includes(context.role) ?? false;
      return hasRole
        ? { allowed: true, reason: `Role '${context.role}' matched` }
        : { allowed: false, reason: `Role '${context.role}' not in permitted roles` };
    }

    case 'reputation_gated': {
      if (context.reputation_state === undefined && context.reputation_score === undefined) {
        return { allowed: false, reason: 'No reputation context provided for reputation_gated policy' };
      }

      // Check min_reputation_score
      if (policy.min_reputation_score !== undefined && context.reputation_score !== undefined) {
        if (context.reputation_score < policy.min_reputation_score) {
          return {
            allowed: false,
            reason: `Reputation score ${context.reputation_score} below minimum ${policy.min_reputation_score}`,
          };
        }
      }

      // Check min_reputation_state
      if (policy.min_reputation_state !== undefined && context.reputation_state !== undefined) {
        const contextOrder = STATE_ORDER[context.reputation_state] ?? 0;
        const requiredOrder = STATE_ORDER[policy.min_reputation_state] ?? 0;
        if (contextOrder < requiredOrder) {
          return {
            allowed: false,
            reason: `Reputation state '${context.reputation_state}' below minimum '${policy.min_reputation_state}'`,
          };
        }
      }

      return { allowed: true, reason: 'Reputation-gated access granted' };
    }
  }
}
