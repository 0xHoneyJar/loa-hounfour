/**
 * Aggregate boundary definitions for the protocol's domain model.
 *
 * Each boundary declares which schemas participate in a consistency group,
 * the root entity, the invariant that must hold, and the required
 * consistency model for ordering guarantees.
 *
 * @see S1-T4 — v4.6.0 Formalization Release
 */
export type ConsistencyModel = 'causal' | 'read-your-writes' | 'eventual';
export interface AggregateBoundary {
    id: string;
    root: string;
    members: readonly string[];
    invariant: string;
    ordering: ConsistencyModel;
}
export declare const AGGREGATE_BOUNDARIES: readonly AggregateBoundary[];
//# sourceMappingURL=aggregate-boundaries.d.ts.map