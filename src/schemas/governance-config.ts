/**
 * Protocol governance configuration — the beginning of governance-configurable parameters.
 *
 * GovernanceConfig allows protocol parameters to be overridden from their
 * hardcoded defaults. In v5.3.0, this covers reservation tier minimums and
 * advisory warning thresholds. Future versions will add more parameters.
 *
 * This is NOT a runtime configuration file. It is a protocol-level schema
 * that defines the structure of governance parameters. How these parameters
 * are proposed, debated, and adopted is out of scope for v5.3.0.
 *
 * @see SPEC-V52-001 — Bridgebuilder Review III finding
 * @see RESERVATION_TIER_MAP — default values
 * @see ADVISORY_WARNING_THRESHOLD_PERCENT — default advisory threshold
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReservationTierSchema } from '../vocabulary/reservation-tier.js';

export const GovernanceConfigSchema = Type.Object(
  {
    governance_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Semver version tracking governance parameter changes independently of protocol version.',
    }),
    reservation_tiers: Type.Object(
      {
        self_declared: ReservationTierSchema,
        community_verified: ReservationTierSchema,
        protocol_certified: ReservationTierSchema,
      },
      {
        additionalProperties: false,
        description: 'Minimum reservation capacity (bps) per conformance level.',
      },
    ),
    advisory_warning_threshold_percent: Type.Integer({
      minimum: 0,
      maximum: 100,
      description: 'Percentage threshold for advisory near-floor warnings. Default: 20.',
    }),
    metadata: Type.Optional(Type.Record(Type.String(), Type.Unknown())),
  },
  {
    $id: 'GovernanceConfig',
    additionalProperties: false,
    description: 'Protocol governance parameters. Overrides hardcoded defaults when provided.',
  },
);

export type GovernanceConfig = Static<typeof GovernanceConfigSchema>;

/**
 * Default GovernanceConfig matching current hardcoded values.
 * Used as fallback when no explicit config is provided.
 */
export const DEFAULT_GOVERNANCE_CONFIG: GovernanceConfig = {
  governance_version: '1.0.0',
  reservation_tiers: {
    self_declared: 300,
    community_verified: 500,
    protocol_certified: 1000,
  },
  advisory_warning_threshold_percent: 20,
};
