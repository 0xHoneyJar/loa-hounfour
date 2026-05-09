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
export const ECONOMY_FLOW = [
    {
        source_schema: 'PerformanceRecord',
        target_schema: 'ReputationScore',
        linking_field: 'components',
        description: 'Performance outcomes feed reputation score components (quality, speed, cost)',
        /** @semantic Validates agent_id match and that source has a defined outcome. */
        verify: (source, target) => {
            if (target.agent_id !== source.agent_id) {
                return { valid: false, reason: 'target.agent_id must equal source.agent_id' };
            }
            if (source.outcome === undefined) {
                return { valid: false, reason: 'source.outcome must be defined to feed reputation' };
            }
            return { valid: true };
        },
    },
    {
        source_schema: 'ReputationScore',
        target_schema: 'RoutingConstraint',
        linking_field: 'min_reputation',
        description: 'Reputation scores gate routing eligibility via minimum threshold',
        /** @semantic Validates field presence and that score meets minimum reputation threshold. */
        verify: (source, target) => {
            if (target.min_reputation === undefined || source.score === undefined) {
                return { valid: false, reason: 'target.min_reputation and source.score must be defined' };
            }
            if (typeof source.score === 'number' && typeof target.min_reputation === 'number') {
                if (source.score < target.min_reputation) {
                    return { valid: false, reason: `source.score (${source.score}) is below target.min_reputation (${target.min_reputation})` };
                }
            }
            return { valid: true };
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
        /** @semantic Validates pool_id presence on both sides and causal consistency. */
        verify: (source, target) => {
            if (target.pool_id === undefined) {
                return { valid: false, reason: 'target.pool_id must be defined' };
            }
            if (source.pool_id !== undefined && target.pool_id !== source.pool_id) {
                return { valid: false, reason: 'target.pool_id must match source.pool_id when source specifies a pool' };
            }
            return { valid: true };
        },
    },
    {
        source_schema: 'Sanction',
        target_schema: 'RoutingConstraint',
        linking_field: 'trust_level',
        description: 'Governance sanctions affect routing trust level, restricting agent availability',
        /** @semantic Validates trust_level presence and that sanction has a severity. */
        verify: (source, target) => {
            if (target.trust_level === undefined) {
                return { valid: false, reason: 'target.trust_level must be defined' };
            }
            if (source.severity === undefined) {
                return { valid: false, reason: 'source.severity must be defined for sanction-based routing' };
            }
            return { valid: true };
        },
    },
    {
        source_schema: 'PerformanceRecord',
        target_schema: 'CommonsDividend',
        linking_field: 'source_performance_ids',
        description: 'Performance records link to commons dividends for transparent redistribution',
        /** @semantic Validates that target references the source record_id in its provenance list. */
        verify: (source, target) => {
            if (!Array.isArray(target.source_performance_ids)) {
                return { valid: false, reason: 'target.source_performance_ids must be an array containing source.record_id' };
            }
            if (!target.source_performance_ids.includes(source.record_id)) {
                return { valid: false, reason: 'target.source_performance_ids must be an array containing source.record_id' };
            }
            return { valid: true };
        },
    },
];
/**
 * Verify a source/target record pair against a specific economy flow entry.
 *
 * If the flow entry has no verify function, returns `{ valid: true }` (open-world assumption).
 */
export function verifyEconomyFlow(source, target, flowEntry) {
    if (!flowEntry.verify)
        return { valid: true };
    return flowEntry.verify(source, target);
}
//# sourceMappingURL=economy-integration.js.map