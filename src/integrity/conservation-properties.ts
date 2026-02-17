/**
 * Conservation Properties — formalized invariants with LTL temporal logic.
 *
 * Each property specifies an economic truth that must hold across all system
 * states. The LTL formula provides a machine-verifiable specification;
 * the enforcement field classifies how the runtime ensures compliance.
 *
 * Extracted from arrakis conservation-properties.ts (the Linux→POSIX pattern).
 *
 * @see SDD §2.1 — Conservation Properties (FR-1)
 * @see Issue #13 §1 — 14 conservation properties from arrakis
 * @see arXiv:2512.16856 — Distributional AGI Safety
 */
import { Type, type Static } from '@sinclair/typebox';
import { LivenessPropertySchema } from './liveness-properties.js';

/**
 * Enforcement mechanism for a conservation invariant.
 */
export const EnforcementMechanismSchema = Type.Union(
  [
    Type.Literal('db_check'),
    Type.Literal('application'),
    Type.Literal('reconciliation'),
    Type.Literal('db_unique'),
  ],
  {
    $id: 'EnforcementMechanism',
    description: 'How a conservation invariant is enforced at runtime.',
  },
);

export type EnforcementMechanism = Static<typeof EnforcementMechanismSchema>;

export const ENFORCEMENT_MECHANISMS: readonly EnforcementMechanism[] = [
  'db_check', 'application', 'reconciliation', 'db_unique',
] as const;

/**
 * Universe (scope) of a conservation invariant.
 */
export const InvariantUniverseSchema = Type.Union(
  [
    Type.Literal('single_lot'),
    Type.Literal('account'),
    Type.Literal('platform'),
    Type.Literal('bilateral'),
  ],
  {
    $id: 'InvariantUniverse',
    description: 'Scope boundary for conservation property verification.',
  },
);

export type InvariantUniverse = Static<typeof InvariantUniverseSchema>;

/**
 * A single conservation invariant with LTL temporal logic specification.
 */
export const ConservationPropertySchema = Type.Object(
  {
    invariant_id: Type.String({
      pattern: '^I-\\d{1,2}$',
      description: 'Canonical identifier (I-1 through I-14). FL-PRD-001.',
    }),
    name: Type.String({ minLength: 1, description: 'Human-readable invariant name.' }),
    description: Type.String({ minLength: 1, description: 'What this invariant guarantees.' }),
    ltl_formula: Type.String({
      minLength: 1,
      description: 'Linear Temporal Logic specification. G = globally, F = eventually, X = next, U = until.',
    }),
    universe: InvariantUniverseSchema,
    enforcement: EnforcementMechanismSchema,
    error_codes: Type.Array(Type.String({ minLength: 1 }), {
      minItems: 1,
      description: 'Expected error codes when invariant is violated.',
    }),
    reconciliation_failure_codes: Type.Optional(Type.Array(Type.String({ minLength: 1 }), {
      description: 'Error codes for reconciliation-detected violations.',
    })),
    severity: Type.Union([
      Type.Literal('critical'),
      Type.Literal('error'),
      Type.Literal('warning'),
    ]),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ConservationProperty',
    additionalProperties: false,
    description: 'Formalized conservation invariant with LTL temporal logic specification.',
  },
);

export type ConservationProperty = Static<typeof ConservationPropertySchema>;

/**
 * Registry of all conservation properties for an economic system.
 */
export const ConservationPropertyRegistrySchema = Type.Object(
  {
    registry_id: Type.String({ format: 'uuid' }),
    properties: Type.Array(ConservationPropertySchema, {
      minItems: 1,
      description: 'All conservation properties in this registry.',
    }),
    total_count: Type.Integer({
      minimum: 1,
      description: 'Must equal properties.length — drift guard.',
    }),
    coverage: Type.Record(Type.String(), Type.Integer({ minimum: 0 }), {
      description: 'Count of properties per universe (single_lot, account, platform, bilateral).',
    }),
    liveness_properties: Type.Array(LivenessPropertySchema, {
      description: 'Liveness properties proving forward progress (v6.0.0, FR-1).',
    }),
    liveness_count: Type.Integer({
      minimum: 0,
      description: 'Must equal liveness_properties.length — drift guard (v6.0.0).',
    }),
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'ConservationPropertyRegistry',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'Registry of conservation invariants with LTL specifications, enforcement classification, and liveness properties (v6.0.0).',
  },
);

export type ConservationPropertyRegistry = Static<typeof ConservationPropertyRegistrySchema>;

/**
 * Canonical 14 conservation properties extracted from arrakis.
 *
 * @see Issue #13 §1 — original arrakis conservation-properties.ts
 */
export const CANONICAL_CONSERVATION_PROPERTIES: readonly ConservationProperty[] = [
  {
    invariant_id: 'I-1',
    name: 'Lot balance non-negativity',
    description: 'Credit lot balance can never go negative.',
    ltl_formula: 'G(lot.balance >= 0)',
    universe: 'single_lot',
    enforcement: 'db_check',
    error_codes: ['LOT_BALANCE_NEGATIVE'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-2',
    name: 'Lot conservation',
    description: 'The sum of available, reserved, and consumed credits always equals the original allocation.',
    ltl_formula: 'G(lot.available + lot.reserved + lot.consumed == lot.original)',
    universe: 'single_lot',
    enforcement: 'db_check',
    error_codes: ['LOT_CONSERVATION_VIOLATED'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-3',
    name: 'Receivable bounded by reserved',
    description: 'Outstanding receivables cannot exceed reserved credit.',
    ltl_formula: 'G(lot.receivable <= lot.reserved)',
    universe: 'single_lot',
    enforcement: 'application',
    error_codes: ['RECEIVABLE_EXCEEDS_RESERVED'],
    severity: 'error',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-4',
    name: 'Platform conservation',
    description: 'Total minted credit equals the sum of all lot states across the platform.',
    ltl_formula: 'G(platform.total_minted == sum(lot.states))',
    universe: 'platform',
    enforcement: 'reconciliation',
    error_codes: ['PLATFORM_CONSERVATION_VIOLATED'],
    reconciliation_failure_codes: ['RECON_PLATFORM_MISMATCH'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-5',
    name: 'Budget monotonic decrease',
    description: 'While billing is active, budget can only decrease (spend, never gain).',
    ltl_formula: 'G(billing.active => F(budget.next <= budget.current))',
    universe: 'account',
    enforcement: 'application',
    error_codes: ['BUDGET_INCREASE_REJECTED'],
    severity: 'error',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-6',
    name: 'Idempotency',
    description: 'Every operation has a unique identity within its scope.',
    ltl_formula: 'G(unique(operation.id, operation.scope))',
    universe: 'platform',
    enforcement: 'db_unique',
    error_codes: ['DUPLICATE_OPERATION'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-7',
    name: 'Revenue rule total',
    description: 'Revenue distribution rules must sum to exactly 10000 basis points (100%).',
    ltl_formula: 'G(sum(revenue_rules.bps) == 10000)',
    universe: 'account',
    enforcement: 'application',
    error_codes: ['REVENUE_RULES_NOT_100_PERCENT'],
    severity: 'error',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-8',
    name: 'Terminal state absorption',
    description: 'Once a lot reaches a terminal state, it cannot transition further.',
    ltl_formula: 'G(lot.terminal => X(lot.state == lot.state))',
    universe: 'single_lot',
    enforcement: 'application',
    error_codes: ['TERMINAL_STATE_TRANSITION'],
    severity: 'error',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-9',
    name: 'Ledger entry uniqueness',
    description: 'Each ledger entry is unique per account, pool, and sequence number.',
    ltl_formula: 'G(unique(entry.account, entry.pool, entry.seq))',
    universe: 'platform',
    enforcement: 'db_unique',
    error_codes: ['DUPLICATE_LEDGER_ENTRY'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-10',
    name: 'Entry type taxonomy',
    description: 'Ledger entry types must belong to the closed set of valid types.',
    ltl_formula: 'G(entry.type in CLOSED_SET)',
    universe: 'platform',
    enforcement: 'db_check',
    error_codes: ['INVALID_ENTRY_TYPE'],
    severity: 'error',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-11',
    name: 'Reservation liveness',
    description: 'A pending reservation must eventually reach a terminal state.',
    ltl_formula: 'G(reservation.pending => F(reservation.terminal))',
    universe: 'single_lot',
    enforcement: 'application',
    error_codes: ['RESERVATION_STUCK'],
    severity: 'warning',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-12',
    name: 'Expiration liveness',
    description: 'An expired lot must eventually have its credits reclaimed.',
    ltl_formula: 'G(lot.expired => F(lot.reclaimed))',
    universe: 'single_lot',
    enforcement: 'application',
    error_codes: ['EXPIRED_LOT_NOT_RECLAIMED'],
    severity: 'warning',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-13',
    name: 'Treasury adequacy',
    description: 'Treasury balance must always cover outstanding obligations.',
    ltl_formula: 'G(treasury.balance >= sum(obligations))',
    universe: 'platform',
    enforcement: 'reconciliation',
    error_codes: ['TREASURY_INADEQUATE'],
    reconciliation_failure_codes: ['RECON_TREASURY_SHORTFALL'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
  {
    invariant_id: 'I-14',
    name: 'Transfer conservation',
    description: 'In any bilateral transfer, what the sender loses equals what the receiver gains.',
    ltl_formula: 'G(transfer => sender.loss == receiver.gain)',
    universe: 'bilateral',
    enforcement: 'application',
    error_codes: ['TRANSFER_CONSERVATION_VIOLATED'],
    severity: 'critical',
    contract_version: '5.5.0',
  },
] as const;
