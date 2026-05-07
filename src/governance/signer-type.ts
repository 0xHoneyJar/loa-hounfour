/**
 * Classification of the entity that produced a signature.
 *
 * Distinct from `AgentType` (which classifies an `AgentIdentity`'s role
 * in the protocol). `SignerType` describes the *signer* side of a
 * `SignatureEnvelope` — the signing-entity kind that consumed a
 * `SignerEntry` from a `Keyring` to produce the signature.
 *
 * 8 substrate-agnostic members; consumers extend at their own
 * boundary with consumer-side tags rather than mutating this enum.
 *
 * @see ADR-010 — Class-vs-Policy Boundary
 * @since v8.5.0 (PR-A2.2)
 */
import { Type, type Static } from '@sinclair/typebox';

export const SignerTypeSchema = Type.Union(
  [
    Type.Literal('agent', { description: 'AI actor or autonomous software agent.' }),
    Type.Literal('human', { description: 'Real person signing in their personal capacity.' }),
    Type.Literal('organization', {
      description: 'Corporate / collective entity signing on behalf of itself.',
    }),
    Type.Literal('system', {
      description: 'Automated software process (build pipelines, schedulers, etc.).',
    }),
    Type.Literal('delegate', {
      description: 'Representative signing on behalf of a principal under delegation.',
    }),
    Type.Literal('oracle', {
      description: 'External data source attesting to off-protocol facts.',
    }),
    Type.Literal('witness', {
      description: 'Third party attesting to an event they observed but did not author.',
    }),
    Type.Literal('device', {
      description: 'Physical signing device (hardware security module, IoT sensor, etc.).',
    }),
  ],
  {
    $id: 'SignerType',
    description:
      'Classification of the entity that produced a signature. Paired with SignatureEnvelope.signer_type and SignerEntry.',
  },
);

export type SignerType = Static<typeof SignerTypeSchema>;
