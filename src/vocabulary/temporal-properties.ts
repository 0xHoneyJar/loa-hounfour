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
export const TEMPORAL_PROPERTIES: readonly TemporalProperty[] = [
  // ---------------------------------------------------------------------------
  // Safety properties — "nothing bad ever happens"
  // ---------------------------------------------------------------------------
  {
    id: 'S1',
    name: 'Financial conservation',
    type: 'safety',
    scope: 'escrow',
    description: 'The sum of released and refunded amounts must never exceed the sum of held amounts across all escrow entries.',
    formal: 'always(sum_released + sum_refunded <= sum_held)',
    testable: true,
    test_strategy: 'Random escrow event sequences verified against ProtocolLedger and ProtocolStateTracker oracles',
  },
  {
    id: 'S2',
    name: 'Reputation bounded',
    type: 'safety',
    scope: 'reputation',
    description: 'Reputation scores must always remain within the configured floor and ceiling bounds.',
    formal: 'always(floor <= score <= ceiling)',
    testable: true,
    test_strategy: 'Random reputation score generation verified against REPUTATION_DECAY bounds',
  },
  {
    id: 'S3',
    name: 'Non-negative amounts',
    type: 'safety',
    scope: 'economy',
    description: 'All economic event amounts (amount_micro) must be non-negative.',
    formal: 'always(amount_micro >= 0)',
    testable: true,
    test_strategy: 'Random economy event generation with non-negativity assertion on all amount_micro values',
  },
  {
    id: 'S4',
    name: 'Escalation monotonicity',
    type: 'safety',
    scope: 'sanction',
    description: 'For the same violation type, successive sanctions must have non-decreasing severity per the SANCTION_SEVERITY_ORDER.',
    formal: 'always(severity[n+1] >= severity[n]) for same violation_type',
    testable: true,
    test_strategy: 'Random sanction sequences for a single violation type verified against SANCTION_SEVERITY_ORDER',
  },
  {
    id: 'S5',
    name: 'Terminal state absorbing',
    type: 'safety',
    scope: 'escrow, stake, credit',
    description: 'Once a state machine reaches a terminal state, no further outbound transitions are accepted.',
    formal: 'always(terminal_state → no outbound transitions)',
    testable: true,
    test_strategy: 'After reaching terminal state in tracker, verify all subsequent transition attempts are rejected',
  },
  {
    id: 'S6',
    name: 'Share conservation',
    type: 'safety',
    scope: 'commons-dividend',
    description: 'The sum of all recipient share_bps in a dividend distribution must equal exactly 10000 basis points.',
    formal: 'always(sum(share_bps) == 10000)',
    testable: true,
    test_strategy: 'Random dividend distributions with share_bps arrays verified to sum to 10000',
  },

  // ---------------------------------------------------------------------------
  // Liveness properties — "something good eventually happens"
  // ---------------------------------------------------------------------------
  {
    id: 'L1',
    name: 'Escrow termination',
    type: 'liveness',
    scope: 'escrow',
    description: 'For any non-terminal escrow state, at least one terminal state (released, refunded, expired) is reachable via valid transitions.',
    formal: 'eventually(state ∈ terminal) when expires_at set',
    testable: true,
    test_strategy: 'BFS reachability from every non-terminal escrow state to at least one terminal state',
  },
  {
    id: 'L2',
    name: 'Dispute resolution',
    type: 'liveness',
    scope: 'dispute',
    description: 'For any dispute, there exists a valid path to a resolved or withdrawn terminal state.',
    formal: 'eventually(state ∈ {resolved, withdrawn})',
    testable: true,
    test_strategy: 'Verify reachability of terminal states from all non-terminal dispute states via state machine transitions',
  },
  {
    id: 'L3',
    name: 'Stake maturation',
    type: 'liveness',
    scope: 'stake',
    description: 'For any active stake, there exists a valid path to a terminal state (vested→withdrawn, slashed, or direct withdrawal).',
    formal: 'eventually(state ∈ {vested, slashed, withdrawn})',
    testable: true,
    test_strategy: 'BFS reachability from every non-terminal stake state to at least one terminal state',
  },
] as const;
