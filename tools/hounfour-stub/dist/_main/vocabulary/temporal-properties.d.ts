/**
 * Temporal property specifications for protocol state machines.
 *
 * Declares safety and liveness properties that must hold across all
 * economy aggregate state machines (escrow, stake, credit) and related
 * schemas (reputation, sanction, commons-dividend).
 *
 * Safety properties assert that "nothing bad ever happens" — invariants
 * that hold at every reachable state. Liveness properties assert that
 * "something good eventually happens" — progress guarantees.
 *
 * **FAANG parallel**: Amazon uses TLA+ to specify safety and liveness
 * properties for distributed systems (DynamoDB, S3, EBS). Their 2014
 * paper "How Amazon Web Services Uses Formal Methods" demonstrated
 * that combining model checking with property-based testing catches
 * subtle bugs that unit tests miss. This vocabulary brings the same
 * discipline to protocol contract verification.
 *
 * @see S2-T1 — v4.6.0 Formalization Release, Sprint 2
 */
/** Discriminant for temporal property classification. */
export type PropertyType = 'safety' | 'liveness';
/**
 * A temporal property specification for protocol verification.
 *
 * Each property declares a quasi-formal expression that can be
 * mechanically tested via fast-check property-based tests.
 */
export interface TemporalProperty {
    /** Unique property identifier (e.g., 'S1', 'L1'). */
    id: string;
    /** Human-readable property name. */
    name: string;
    /** Safety or liveness classification. */
    type: PropertyType;
    /** References STATE_MACHINES id or schema name this property covers. */
    scope: string;
    /** Description of what the property guarantees. */
    description: string;
    /** Quasi-formal temporal logic expression. */
    formal: string;
    /** Whether this property can be mechanically tested. */
    testable: boolean;
    /** Strategy for testing this property (e.g., 'random event sequences'). */
    test_strategy: string;
}
/**
 * Temporal property specifications for the protocol's economy layer.
 *
 * 6 safety properties (S1-S6) + 3 liveness properties (L1-L3).
 */
export declare const TEMPORAL_PROPERTIES: readonly TemporalProperty[];
//# sourceMappingURL=temporal-properties.d.ts.map