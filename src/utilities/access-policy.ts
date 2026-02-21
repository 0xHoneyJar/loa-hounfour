/**
 * AccessPolicy evaluation helper (v7.1.0, FR-6).
 *
 * Evaluates an AccessPolicy against a runtime context to determine
 * whether an action is permitted.
 *
 * @see SDD §2.8 — AccessPolicy Evaluation Helper
 */
import { type AccessPolicy } from '../schemas/conversation.js';

/** Runtime context for evaluating an access policy. */
export interface AccessPolicyContext {
  role?: string;
  timestamp: string; // ISO 8601
  action: 'read' | 'write' | 'delete';
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
 * - `time_limited` does NOT enforce expiry — duration_hours defines the window
 *   but the policy creation timestamp is not stored on the schema. Expiry
 *   enforcement is the consumer's responsibility.
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
  }
}
