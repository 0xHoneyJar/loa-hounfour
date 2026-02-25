/**
 * ContractNegotiation — runtime handshake for dynamic contract access.
 *
 * Model presents reputation state, receives allowed protocol surface.
 * Trust model: reputation MUST be server-derived or signed — self-assertion
 * is non-conformant. Replay protection via nonce + TTL.
 *
 * @see SDD §4.9.2 — ContractNegotiation Schema (FR-4.3, FR-4.5, IMP-003, SKP-005)
 * @since v8.0.0
 */
import { Type, type Static } from '@sinclair/typebox';
import { ReputationStateSchema } from '../governance/reputation-aggregate.js';
import { ProtocolSurfaceSchema } from './dynamic-contract.js';

/**
 * Assertion method — how the reputation state was determined.
 *
 * @governance protocol-fixed
 */
export const AssertionMethodSchema = Type.Union(
  [Type.Literal('server-derived'), Type.Literal('signed-attestation')],
  {
    description:
      'How the reputation_state was determined. '
      + 'server-derived: looked up from authoritative audit trail (recommended). '
      + 'signed-attestation: cryptographic proof from a trusted authority.',
  },
);

export type AssertionMethod = Static<typeof AssertionMethodSchema>;

/**
 * Runtime contract negotiation handshake.
 */
export const ContractNegotiationSchema = Type.Object(
  {
    negotiation_id: Type.String({ format: 'uuid' }),
    model_id: Type.String({ minLength: 1 }),
    reputation_state: ReputationStateSchema,
    assertion_method: AssertionMethodSchema,
    requested_surface: Type.Optional(ProtocolSurfaceSchema),
    granted_surface: ProtocolSurfaceSchema,
    negotiated_at: Type.String({ format: 'date-time' }),
    nonce: Type.String({
      minLength: 16,
      maxLength: 64,
      description: 'Replay protection nonce. Unique per negotiation.',
    }),
    expires_at: Type.String({
      format: 'date-time',
      description: 'Granted surface TTL. After expiry, re-negotiation required.',
    }),
  },
  {
    $id: 'ContractNegotiation',
    additionalProperties: false,
    description:
      'Runtime handshake for dynamic contract negotiation. '
      + 'Model presents reputation state, receives allowed protocol surface. '
      + 'Reputation MUST be server-derived or signed — self-assertion is non-conformant.',
  },
);

export type ContractNegotiation = Static<typeof ContractNegotiationSchema>;
