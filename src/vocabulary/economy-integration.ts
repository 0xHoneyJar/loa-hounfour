/**
 * Three-economy integration flow vocabulary.
 *
 * Describes how the three economies (Reputation, Routing, Billing) connect:
 *   Performance -> Reputation -> Routing -> Billing
 *
 * This is a vocabulary (descriptive), not a runtime enforcer.
 * Consumers use this to understand the intended data flow.
 *
 * @see BB-V4-DEEP-005
 */

export interface EconomyFlowEntry {
  source_schema: string;
  target_schema: string;
  linking_field: string;
  description: string;
  verify?: (source: Record<string, unknown>, target: Record<string, unknown>) => { valid: boolean; reason?: string };
}

export const ECONOMY_FLOW: readonly EconomyFlowEntry[] = [
  {
    source_schema: 'PerformanceRecord',
    target_schema: 'ReputationScore',
    linking_field: 'components',
    description: 'Performance outcomes feed reputation score components (quality, speed, cost)',
    verify: (source, target) => {
      const valid = target.agent_id === source.agent_id;
      return valid ? { valid } : { valid, reason: 'target.agent_id must equal source.agent_id' };
    },
  },
  {
    source_schema: 'ReputationScore',
    target_schema: 'RoutingConstraint',
    linking_field: 'min_reputation',
    description: 'Reputation scores gate routing eligibility via minimum threshold',
    verify: (source, target) => {
      const valid = target.min_reputation !== undefined && source.score !== undefined;
      return valid ? { valid } : { valid, reason: 'target.min_reputation and source.score must be defined' };
    },
  },
  {
    source_schema: 'RoutingConstraint',
    target_schema: 'BillingEntry',
    // Semantic link: routing decisions influence which pool_id is selected in
    // the billing entry. There is no direct foreign key — the link is causal
    // (routing → agent selection → billing pool assignment).
    linking_field: 'pool_id',
    description: 'Routing decisions determine which agent handles work, producing billing entries',
    verify: (_source, target) => {
      const valid = target.pool_id !== undefined;
      return valid ? { valid } : { valid, reason: 'target.pool_id must be defined' };
    },
  },
  {
    source_schema: 'Sanction',
    target_schema: 'RoutingConstraint',
    linking_field: 'trust_level',
    description: 'Governance sanctions affect routing trust level, restricting agent availability',
    verify: (_source, target) => {
      const valid = target.trust_level !== undefined;
      return valid ? { valid } : { valid, reason: 'target.trust_level must be defined' };
    },
  },
  {
    source_schema: 'PerformanceRecord',
    target_schema: 'CommonsDividend',
    linking_field: 'source_performance_ids',
    description: 'Performance records link to commons dividends for transparent redistribution',
    verify: (source, target) => {
      const valid = Array.isArray(target.source_performance_ids) &&
        (target.source_performance_ids as unknown[]).includes(source.record_id);
      return valid
        ? { valid }
        : { valid, reason: 'target.source_performance_ids must be an array containing source.record_id' };
    },
  },
] as const;

/**
 * Verify a source/target record pair against a specific economy flow entry.
 *
 * If the flow entry has no verify function, returns `{ valid: true }` (open-world assumption).
 */
export function verifyEconomyFlow(
  source: Record<string, unknown>,
  target: Record<string, unknown>,
  flowEntry: EconomyFlowEntry,
): { valid: boolean; reason?: string } {
  if (!flowEntry.verify) return { valid: true };
  return flowEntry.verify(source, target);
}
