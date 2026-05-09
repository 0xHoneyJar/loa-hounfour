/**
 * Aggregate boundary definitions for the protocol's domain model.
 *
 * Each boundary declares which schemas participate in a consistency group,
 * the root entity, the invariant that must hold, and the required
 * consistency model for ordering guarantees.
 *
 * @see S1-T4 — v4.6.0 Formalization Release
 */
export const AGGREGATE_BOUNDARIES = [
    {
        id: 'escrow_settlement',
        root: 'EscrowEntry',
        members: ['BillingEntry', 'TransferEvent'],
        invariant: 'Escrow release and billing creation must be causally ordered — billing entry is only created after escrow reaches a terminal state',
        ordering: 'causal',
    },
    {
        id: 'dividend_distribution',
        root: 'CommonsDividend',
        members: ['PerformanceRecord'],
        invariant: 'All source_performance_ids must reference finalized performance records before dividend distribution',
        ordering: 'read-your-writes',
    },
    {
        id: 'reputation_computation',
        root: 'ReputationScore',
        members: ['PerformanceRecord', 'Sanction'],
        invariant: 'Reputation score reflects latest available performance and sanction data with eventual consistency',
        ordering: 'eventual',
    },
    {
        id: 'dispute_lifecycle',
        root: 'DisputeRecord',
        members: ['EscrowEntry', 'Sanction'],
        invariant: 'Dispute resolution must causally precede escrow release or sanction imposition arising from the dispute',
        ordering: 'causal',
    },
    {
        id: 'governance_enforcement',
        root: 'Sanction',
        members: ['RoutingConstraint'],
        invariant: 'Sanction imposition must causally precede any routing constraint update reflecting the sanction',
        ordering: 'causal',
    },
];
//# sourceMappingURL=aggregate-boundaries.js.map