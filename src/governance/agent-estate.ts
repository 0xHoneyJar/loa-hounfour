/**
 * `AgentEstate` — estate-as-container primitive.
 *
 * Binds a controller agent (the signer-of-record) to a `Keyring` (the
 * key material container) and a lifecycle `status`. Novel for
 * hounfour — no v8.4.0 precedent — and the foundation for the
 * cycle-005 `EstateTransition` / `TransitionReceipt` surface (which
 * carries handoff between estates, deferred per the cycle-005
 * commitment).
 *
 * The `keyring_id` foreign-keys to `Keyring.keyring_id` (Layer 2 of
 * the authority cascade); resolution is consumer-side per ADR-010.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @see KeyringSchema
 * @see AgentEstateStatusSchema
 * @since v8.5.0 (PR-A2.3)
 */
import { Type, type Static } from '@sinclair/typebox';
import { AgentEstateStatusSchema } from './agent-estate-status.js';

export const AgentEstateSchema = Type.Object(
  {
    estate_id: Type.String({
      format: 'uuid',
      description: 'Stable opaque identifier for this estate (UUID v4).',
    }),
    controller_agent_id: Type.String({
      pattern: '^[a-z][a-z0-9_-]{2,63}$',
      description: 'The agent that controls this estate (signer-of-record).',
    }),
    keyring_id: Type.String({
      format: 'uuid',
      description:
        'FK to Keyring.keyring_id — the cryptographic-material container backing this estate. Hounfour does not dereference; the consumer resolves it.',
    }),
    status: AgentEstateStatusSchema,
    created_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the estate was created.',
    }),
    updated_at: Type.String({
      format: 'date-time',
      description: 'ISO 8601 timestamp at which the estate was last updated (status change, controller change).',
    }),
    contract_version: Type.String({
      pattern: '^\\d+\\.\\d+\\.\\d+$',
      description: 'Hounfour contract version this estate was authored against.',
    }),
  },
  {
    $id: 'AgentEstate',
    additionalProperties: false,
    description:
      'Estate-as-container primitive: binds a controller_agent_id to a Keyring (Layer 2) and a lifecycle status. Foundation for the cycle-005 EstateTransition surface. State-machine validity is consumer-side per ADR-010.',
  },
);

export type AgentEstate = Static<typeof AgentEstateSchema>;
