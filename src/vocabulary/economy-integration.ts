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
}

export const ECONOMY_FLOW: readonly EconomyFlowEntry[] = [
  {
    source_schema: 'PerformanceRecord',
    target_schema: 'ReputationScore',
    linking_field: 'components',
    description: 'Performance outcomes feed reputation score components (quality, speed, cost)',
  },
  {
    source_schema: 'ReputationScore',
    target_schema: 'RoutingConstraint',
    linking_field: 'min_reputation',
    description: 'Reputation scores gate routing eligibility via minimum threshold',
  },
  {
    source_schema: 'RoutingConstraint',
    target_schema: 'BillingEntry',
    linking_field: 'routing_policy_id',
    description: 'Routing decisions determine which agent handles work, producing billing entries',
  },
  {
    source_schema: 'Sanction',
    target_schema: 'RoutingConstraint',
    linking_field: 'trust_level',
    description: 'Governance sanctions affect routing trust level, restricting agent availability',
  },
  {
    source_schema: 'PerformanceRecord',
    target_schema: 'CommonsDividend',
    linking_field: 'source_performance_ids',
    description: 'Performance records link to commons dividends for transparent redistribution',
  },
] as const;
