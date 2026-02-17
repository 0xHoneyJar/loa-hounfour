/**
 * Liveness Properties — F_t-bounded temporal logic for forward progress.
 *
 * Each liveness property complements a corresponding safety invariant (I-*),
 * proving that the system doesn't just avoid bad states, but eventually
 * reaches good ones within bounded time. The F_t operator guarantees
 * "eventually within t seconds".
 *
 * Together with conservation properties (safety), liveness properties form
 * the complete correctness guarantee: safety says "nothing bad happens",
 * liveness says "something good eventually happens".
 *
 * @see SDD §2.1.1–§2.1.6 — Liveness Properties (FR-1)
 * @see arXiv:2512.16856 — Distributional AGI Safety
 * @since v6.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

/**
 * Universe (scope) of a liveness property — same as InvariantUniverse.
 * Defined locally to avoid circular import with conservation-properties.ts.
 */
const LivenessUniverseSchema = Type.Union(
  [
    Type.Literal('single_lot'),
    Type.Literal('account'),
    Type.Literal('platform'),
    Type.Literal('bilateral'),
  ],
  {
    description: 'Scope boundary for liveness property verification.',
  },
);

/**
 * Timeout behavior when a liveness property's F_t bound expires.
 *
 * - reaper: Automated cleanup/forced termination of the pending operation.
 * - escalation: Alert raised to a higher authority (operator, governance).
 * - reconciliation: Drift detected and queued for reconciliation pass.
 * - manual: Requires human intervention to resolve.
 */
export const TimeoutBehaviorSchema = Type.Union(
  [
    Type.Literal('reaper'),
    Type.Literal('escalation'),
    Type.Literal('reconciliation'),
    Type.Literal('manual'),
  ],
  {
    $id: 'TimeoutBehavior',
    description: 'Action taken when a liveness property timeout expires.',
  },
);

export type TimeoutBehavior = Static<typeof TimeoutBehaviorSchema>;

export const TIMEOUT_BEHAVIORS: readonly TimeoutBehavior[] = [
  'reaper', 'escalation', 'reconciliation', 'manual',
] as const;

/**
 * A single liveness property with F_t-bounded temporal logic specification.
 *
 * Each liveness property pairs with a companion safety invariant (I-*),
 * together forming a complete correctness envelope:
 *   Safety (G): "the bad thing never happens"
 *   Liveness (F_t): "the good thing happens within t seconds"
 */
export const LivenessPropertySchema = Type.Object(
  {
    liveness_id: Type.String({
      pattern: '^L-\\d{1,2}$',
      description: 'Canonical identifier (L-1 through L-N).',
    }),
    name: Type.String({ minLength: 1, description: 'Human-readable liveness property name.' }),
    description: Type.String({ minLength: 1, description: 'What forward progress this guarantees.' }),
    ltl_formula: Type.String({
      minLength: 1,
      description: 'LTL specification with F_t operator. F_t(t, P) = P holds within t seconds.',
    }),
    companion_safety: Type.String({
      pattern: '^I-\\d{1,2}$',
      description: 'The companion safety invariant ID this liveness property complements.',
    }),
    universe: LivenessUniverseSchema,
    timeout_behavior: TimeoutBehaviorSchema,
    timeout_seconds: Type.Integer({
      minimum: 1,
      description: 'Maximum seconds before the liveness bound expires and timeout_behavior triggers.',
    }),
    error_codes: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Error codes emitted when the liveness bound is violated.',
    }),
    severity: Type.Union([
      Type.Literal('critical'),
      Type.Literal('error'),
      Type.Literal('warning'),
    ]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'LivenessProperty',
    additionalProperties: false,
    description: 'F_t-bounded liveness property with companion safety invariant reference.',
  },
);

export type LivenessProperty = Static<typeof LivenessPropertySchema>;

/**
 * Canonical 6 liveness properties for v6.0.0.
 *
 * Each complements an existing safety invariant, closing the
 * safety-liveness duality for the 6 most critical forward-progress
 * requirements in the protocol.
 *
 * @see SDD §2.1.3 — Canonical liveness properties
 */
export const CANONICAL_LIVENESS_PROPERTIES: readonly LivenessProperty[] = [
  {
    liveness_id: 'L-1',
    name: 'Reservation resolution liveness',
    description: 'A pending reservation must resolve (commit or rollback) within the bounded time.',
    ltl_formula: 'G(reservation.pending => F_t(3600, reservation.terminal))',
    companion_safety: 'I-11',
    universe: 'single_lot',
    timeout_behavior: 'reaper',
    timeout_seconds: 3600,
    error_codes: ['RESERVATION_RESOLUTION_TIMEOUT'],
    severity: 'error',
    contract_version: '6.0.0',
  },
  {
    liveness_id: 'L-2',
    name: 'Expiration reclamation liveness',
    description: 'An expired lot must have its credits reclaimed within the bounded time.',
    ltl_formula: 'G(lot.expired => F_t(7200, lot.reclaimed))',
    companion_safety: 'I-12',
    universe: 'single_lot',
    timeout_behavior: 'reaper',
    timeout_seconds: 7200,
    error_codes: ['EXPIRATION_RECLAMATION_TIMEOUT'],
    severity: 'error',
    contract_version: '6.0.0',
  },
  {
    liveness_id: 'L-3',
    name: 'Budget replenishment liveness',
    description: 'A depleted budget must be replenished or escalated within the bounded time.',
    ltl_formula: 'G(budget.depleted => F_t(86400, budget.replenished || budget.escalated))',
    companion_safety: 'I-5',
    universe: 'account',
    timeout_behavior: 'escalation',
    timeout_seconds: 86400,
    error_codes: ['BUDGET_REPLENISHMENT_TIMEOUT'],
    severity: 'warning',
    contract_version: '6.0.0',
  },
  {
    liveness_id: 'L-4',
    name: 'Reconciliation completion liveness',
    description: 'A pending reconciliation must complete or flag discrepancy within the bounded time.',
    ltl_formula: 'G(reconciliation.pending => F_t(14400, reconciliation.complete || reconciliation.flagged))',
    companion_safety: 'I-4',
    universe: 'platform',
    timeout_behavior: 'reconciliation',
    timeout_seconds: 14400,
    error_codes: ['RECONCILIATION_COMPLETION_TIMEOUT'],
    severity: 'error',
    contract_version: '6.0.0',
  },
  {
    liveness_id: 'L-5',
    name: 'Dispute resolution liveness',
    description: 'An open dispute must reach resolution within the bounded time.',
    ltl_formula: 'G(dispute.open => F_t(604800, dispute.resolved))',
    companion_safety: 'I-14',
    universe: 'bilateral',
    timeout_behavior: 'manual',
    timeout_seconds: 604800,
    error_codes: ['DISPUTE_RESOLUTION_TIMEOUT'],
    severity: 'warning',
    contract_version: '6.0.0',
  },
  {
    liveness_id: 'L-6',
    name: 'Transfer settlement liveness',
    description: 'A pending bilateral transfer must settle or fail within the bounded time.',
    ltl_formula: 'G(transfer.pending => F_t(3600, transfer.settled || transfer.failed))',
    companion_safety: 'I-14',
    universe: 'bilateral',
    timeout_behavior: 'reaper',
    timeout_seconds: 3600,
    error_codes: ['TRANSFER_SETTLEMENT_TIMEOUT'],
    severity: 'error',
    contract_version: '6.0.0',
  },
] as const;
