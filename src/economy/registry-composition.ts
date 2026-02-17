/**
 * Registry Composition — cross-registry bridges, invariants, and exchange.
 *
 * Enables value transfer between independent economy registries with
 * formally specified invariants and settlement policies.
 *
 * @see SDD §2.5.1-2.5.3 — Registry Bridge, Invariants, Exchange Rate
 * @since v6.0.0
 */
import { Type, type Static } from '@sinclair/typebox';

// ---------------------------------------------------------------------------
// Bridge Enforcement Vocabulary
// ---------------------------------------------------------------------------

export const BridgeEnforcementSchema = Type.Union(
  [
    Type.Literal('atomic'),
    Type.Literal('eventual'),
    Type.Literal('manual'),
  ],
  {
    $id: 'BridgeEnforcement',
    description: 'How a bridge invariant is enforced: atomically, eventually, or manually.',
  },
);
export type BridgeEnforcement = Static<typeof BridgeEnforcementSchema>;

// ---------------------------------------------------------------------------
// Bridge Invariant
// ---------------------------------------------------------------------------

export const BridgeInvariantSchema = Type.Object(
  {
    invariant_id: Type.String({
      pattern: '^B-\\d{1,2}$',
      description: 'Unique invariant identifier (e.g., B-1, B-2).',
    }),
    name: Type.String({ minLength: 1 }),
    description: Type.String({ minLength: 1 }),
    ltl_formula: Type.String({
      minLength: 1,
      description: 'Linear temporal logic formula for the invariant.',
    }),
    enforcement: BridgeEnforcementSchema,
  },
  {
    $id: 'BridgeInvariant',
    additionalProperties: false,
    description: 'A formally specified invariant for a registry bridge.',
  },
);
export type BridgeInvariant = Static<typeof BridgeInvariantSchema>;

// ---------------------------------------------------------------------------
// Settlement Policy Vocabulary
// ---------------------------------------------------------------------------

export const SettlementPolicySchema = Type.Union(
  [
    Type.Literal('immediate'),
    Type.Literal('batched'),
    Type.Literal('netting'),
  ],
  {
    $id: 'SettlementPolicy',
    description: 'How cross-registry transfers are settled.',
  },
);
export type SettlementPolicy = Static<typeof SettlementPolicySchema>;

// ---------------------------------------------------------------------------
// Exchange Rate Spec
// ---------------------------------------------------------------------------

export const ExchangeRateTypeSchema = Type.Union(
  [
    Type.Literal('fixed'),
    Type.Literal('oracle'),
    Type.Literal('governance'),
  ],
  {
    $id: 'ExchangeRateType',
    description: 'How the exchange rate between registries is determined.',
  },
);
export type ExchangeRateType = Static<typeof ExchangeRateTypeSchema>;

export const ExchangeRateSpecSchema = Type.Object(
  {
    rate_type: ExchangeRateTypeSchema,
    value: Type.Optional(Type.String({
      pattern: '^\\d+(\\.\\d+)?$',
      description: 'Fixed rate value (required when rate_type is "fixed").',
    })),
    oracle_endpoint: Type.Optional(Type.String({
      format: 'uri',
      description: 'Oracle endpoint (required when rate_type is "oracle").',
    })),
    governance_proposal_required: Type.Boolean({
      default: false,
      description: 'Whether rate changes require a governance proposal.',
    }),
    staleness_threshold_seconds: Type.Integer({
      minimum: 0,
      default: 3600,
      description: 'Maximum age in seconds before the rate is considered stale.',
    }),
  },
  {
    $id: 'ExchangeRateSpec',
    additionalProperties: false,
    description: 'Specification for how exchange rates are determined and maintained.',
  },
);
export type ExchangeRateSpec = Static<typeof ExchangeRateSpecSchema>;

// ---------------------------------------------------------------------------
// Registry Bridge
// ---------------------------------------------------------------------------

export const RegistryBridgeSchema = Type.Object(
  {
    bridge_id: Type.String({ format: 'uuid' }),
    source_registry_id: Type.String({ format: 'uuid' }),
    target_registry_id: Type.String({ format: 'uuid' }),
    bridge_invariants: Type.Array(BridgeInvariantSchema, {
      minItems: 1,
      description: 'Invariants that must hold for this bridge.',
    }),
    exchange_rate: ExchangeRateSpecSchema,
    settlement: SettlementPolicySchema,
    contract_version: Type.String({ pattern: '^\\d+\\.\\d+\\.\\d+$' }),
  },
  {
    $id: 'RegistryBridge',
    additionalProperties: false,
    'x-cross-field-validated': true,
    description: 'A bridge enabling value transfer between two economy registries.',
  } as any,
);
export type RegistryBridge = Static<typeof RegistryBridgeSchema>;

// ---------------------------------------------------------------------------
// Canonical Bridge Invariants (S3-T2)
// ---------------------------------------------------------------------------

export const CANONICAL_BRIDGE_INVARIANTS: readonly BridgeInvariant[] = [
  {
    invariant_id: 'B-1',
    name: 'Cross-registry conservation',
    description: 'source.debit == target.credit * exchange_rate for every transfer',
    ltl_formula: 'G(transfer → source.debit == target.credit * rate)',
    enforcement: 'atomic',
  },
  {
    invariant_id: 'B-2',
    name: 'Bridge idempotency',
    description: 'Duplicate transfer requests produce the same result without double-crediting',
    ltl_formula: 'G(transfer(id) → X(¬transfer(id) ∨ same_result(id)))',
    enforcement: 'atomic',
  },
  {
    invariant_id: 'B-3',
    name: 'Settlement completeness',
    description: 'Every initiated transfer eventually settles or is explicitly cancelled',
    ltl_formula: 'G(initiated → F(settled ∨ cancelled))',
    enforcement: 'eventual',
  },
  {
    invariant_id: 'B-4',
    name: 'Exchange rate consistency',
    description: 'All transfers within a settlement batch use the same exchange rate snapshot',
    ltl_formula: 'G(batch → ∀t∈batch. t.rate == batch.rate_snapshot)',
    enforcement: 'atomic',
  },
] as const;
